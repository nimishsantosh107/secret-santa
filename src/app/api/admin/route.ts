import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, authed, passwordOk } from "@/lib/auth";
import { readDb, toPublic, updateDb } from "@/lib/db";
import { sendOne, sendTest } from "@/lib/mail";
import { cleanExclusions, derange } from "@/lib/shuffle";

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
};

type Result = { error?: string; processed?: boolean };

export async function GET(request: NextRequest) {
  if (!authed(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return json({ error: "Nope." }, 401);
  }
  return json({ state: toPublic(await readDb()) });
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
    return json({ ok: true, state: toPublic(await readDb()) });
  }

  try {
    const known = new Set(["close", "exclusions", "shuffle", "email", "templates"]);
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
        if (db.mapping) return { error: "Already shuffled." };
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
      if (action !== "templates") return { error: "Unknown action." };
      const subject = String(body.emailSubject ?? "").slice(0, 200);
      const html = String(body.emailHtml ?? "").slice(0, 20000);
      if (!subject.trim() || !html.trim()) {
        return { error: "Subject and HTML are required." };
      }
      db.emailSubject = subject;
      db.emailHtml = html;
      return {};
    });

    if (result.error) return json({ error: result.error }, 400);
    return json({
      ok: true,
      state: toPublic(await readDb()),
      processed: Boolean(result.processed),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed.";
    return json({ error: message.slice(0, 300) }, 500);
  }
}
