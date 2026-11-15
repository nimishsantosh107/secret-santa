import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, authed, passwordOk } from "@/lib/auth";
import { DEFAULT_HTML, DEFAULT_SUBJECT, normalizeDb, paths, readDb, testDbPath, toPublic, updateDb } from "@/lib/db";
import { sendOne, sendTest } from "@/lib/mail";
import { readPerson } from "@/lib/person";
import { cleanExclusions, derange } from "@/lib/shuffle";
import { applyTestSeed } from "@/lib/test-roster";

export const maxDuration = 60;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

type Body = {
  action?: string;
  password?: string;
  closed?: boolean;
  exclusions?: { a?: string; b?: string }[];
  emailSubject?: string;
  emailHtml?: string;
  to?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  preference?: string;
  backup?: unknown;
};

type Result = { error?: string; processed?: boolean };

function testMode(request: NextRequest) {
  return request.nextUrl.searchParams.get("test") === "1";
}

async function dbFile(test: boolean) {
  return test ? testDbPath() : paths.db;
}

const testTemplates = { emailSubject: DEFAULT_SUBJECT, emailHtml: DEFAULT_HTML };

async function ensureTest(file: string) {
  // readDb waits for the request before touching the file. A sync read here
  // aborts the response under cacheComponents, and the browser reports it as
  // "Unexpected end of JSON input".
  const current = await readDb(file);
  if (current.participants.length > 0 || current.mapping) return;
  await updateDb((db) => {
    if (db.participants.length > 0 || db.mapping) return;
    applyTestSeed(db, testTemplates);
  }, file);
}

export async function GET(request: NextRequest) {
  if (!authed(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return json({ error: "Nope." }, 401);
  }
  try {
    const test = testMode(request);
    const file = await dbFile(test);
    if (test) await ensureTest(file);
    return json({ state: toPublic(await readDb(file)) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed.";
    return json({ error: message.slice(0, 300) }, 500);
  }
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "Bad body." }, 400);
  }

  if (body.action === "login") {
    const password = String(body.password ?? "");
    if (!passwordOk(password)) return json({ error: "Nope." }, 401);
    const jar = await cookies();
    jar.set(ADMIN_COOKIE, password, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return json({ ok: true });
  }

  if (body.action === "logout") {
    const jar = await cookies();
    jar.delete(ADMIN_COOKIE);
    return json({ ok: true });
  }

  if (!authed(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return json({ error: "Nope." }, 401);
  }

  const test = testMode(request);
  const file = await dbFile(test);
  if (test && body.action !== "reset" && body.action !== "import") await ensureTest(file);

  if (body.action === "reset") {
    if (!test) return json({ error: "Unknown action." }, 400);
    await updateDb((db) => {
      applyTestSeed(db, testTemplates);
    }, file);
    return json({ ok: true, state: toPublic(await readDb(file)) });
  }

  if (body.action === "test") {
    const to = String(body.to ?? "").trim();
    if (to.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return json({ error: "Need a real email address." }, 400);
    }
    const subject = String(body.emailSubject ?? "").slice(0, 200);
    const html = String(body.emailHtml ?? "").slice(0, 20000);
    if (!subject.trim() || !html.trim()) {
      return json({ error: "Subject and HTML are required." }, 400);
    }
    try {
      await sendTest(to, subject, html);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed.";
      return json({ error: message.slice(0, 300) }, 500);
    }
    return json({ ok: true, state: toPublic(await readDb(file)) });
  }

  if (body.action === "export") {
    try {
      return json({ ok: true, backup: await readDb(file) });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed.";
      return json({ error: message.slice(0, 300) }, 500);
    }
  }

  if (body.action === "import") {
    const next = normalizeDb(body.backup);
    if (!next) return json({ error: "That file is not a secret-santa backup." }, 400);
    try {
      await updateDb((db) => {
        db.closed = next.closed;
        db.participants = next.participants;
        db.exclusions = next.exclusions;
        db.mapping = next.mapping;
        db.status = next.status;
        db.emailSubject = next.emailSubject;
        db.emailHtml = next.emailHtml;
      }, file);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed.";
      return json({ error: message.slice(0, 300) }, 500);
    }
    return json({ ok: true, state: toPublic(await readDb(file)) });
  }

  try {
    const known = new Set(["close", "exclusions", "shuffle", "email", "templates", "participant"]);
    if (!body.action || !known.has(body.action)) {
      return json({ error: "Unknown action." }, 400);
    }
    const action = body.action;

    const result = await updateDb(async (db): Promise<Result> => {
      if (action === "close") {
        if (db.mapping) return { error: "Mapping exists. Form stays shut." };
        db.closed = Boolean(body.closed);
        return {};
      }
      if (action === "exclusions") {
        if (db.mapping) return { error: "Mapping locked." };
        const raw = Array.isArray(body.exclusions) ? body.exclusions : [];
        db.exclusions = cleanExclusions(
          db.participants.map((p) => p.id),
          raw.map((e) => ({ a: String(e?.a ?? ""), b: String(e?.b ?? "") })),
        );
        return {};
      }
      if (action === "shuffle") {
        if (db.participants.length < 2) return { error: "Need at least 2 people." };
        const map = derange(
          db.participants.map((p) => p.id),
          db.exclusions,
        );
        if (!map) {
          return {
            error: "No mapping found with these exclusions. Drop a pair, or try again.",
          };
        }
        db.mapping = map;
        db.closed = true;
        db.status = {};
        for (const id of Object.keys(map)) {
          db.status[id] = { email: "pending" };
        }
        return {};
      }
      if (action === "email") {
        if (!db.mapping) return { error: "Shuffle first." };
        return { processed: await sendOne(db) };
      }
      if (action === "participant") {
        const fields = readPerson(body);
        if ("error" in fields) return fields;
        const person = db.participants.find((p) => p.id === String(body.id ?? ""));
        if (!person) return { error: "That person is not on the list." };
        if (!test) {
          const taken = db.participants.some((p) => p.email === fields.email && p.id !== person.id);
          if (taken) return { error: "That email is already on the list." };
        }
        person.name = fields.name;
        person.email = fields.email;
        person.phone = fields.phone;
        person.address = fields.address;
        person.preference = fields.preference;
        return {};
      }
      if (action !== "templates") return { error: "Unknown action." };
      const subject = String(body.emailSubject ?? "").slice(0, 200);
      const html = String(body.emailHtml ?? "").slice(0, 20000);
      if (!subject.trim() || !html.trim()) {
        return { error: "Subject and HTML are required." };
      }
      db.emailSubject = subject;
      db.emailHtml = html;
      return {};
    }, file);

    if (result.error) return json({ error: result.error }, 400);
    return json({
      ok: true,
      state: toPublic(await readDb(file)),
      processed: Boolean(result.processed),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed.";
    return json({ error: message.slice(0, 300) }, 500);
  }
}
