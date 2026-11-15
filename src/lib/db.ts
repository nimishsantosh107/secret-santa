import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connection } from "next/server";
import type { EmailFlag, PublicState } from "./types";
import type { Pair } from "./shuffle";

export type Participant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  preference: string;
};

type PairStatus = {
  email: EmailFlag;
};

export type DB = {
  closed: boolean;
  participants: Participant[];
  exclusions: Pair[];
  /** santaId -> childId. Returned only by the host API. */
  mapping: Record<string, string> | null;
  status: Record<string, PairStatus>;
  emailSubject: string;
  emailHtml: string;
};

// ponytail: Vercel runs from read-only /var/task, so the list lives in /tmp.
// Ceiling: one warm server; a cold start drops the file. Upgrade: a shared store.
function dataDir() {
  // Bracket access so the build does not bake in a missing VERCEL value.
  const onVercel = process.env["VERCEL"];
  return onVercel
    ? path.join(os.tmpdir(), "secret-santa")
    : path.join(process.cwd(), "data");
}

export const paths = {
  db: path.join(dataDir(), "db.json"),
};

let practicePath: string | null = null;

/** Practice list file. Same disk as the real list. */
export async function testDbPath() {
  if (practicePath) return practicePath;
  await connection();
  practicePath = path.join(dataDir(), "test.json");
  return practicePath;
}

function isPractice(file: string) {
  const base = path.basename(file);
  return base === "test.json";
}

export const DEFAULT_SUBJECT = "{{santa_name}}, you are someone's Secret Santa";

export const DEFAULT_HTML = `<div style="margin:0;padding:24px;background:#07140f;color:#f7f3ea;">
  <div style="max-width:560px;margin:0 auto;border:2px solid #f0c14a;padding:20px;">
    <p style="margin:0;font-family:Georgia,serif;letter-spacing:3px;color:#e23b3b;font-size:12px;">SECRET SANTA</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.15;margin:10px 0 12px;color:#f0c14a;">{{santa_name}}, you drew a name.</h1>
    <p style="font-family:Georgia,serif;font-size:16px;line-height:1.5;margin:0 0 12px;">You are Secret Santa for one person. They do not know it is you. The group does not know. Buy the gift, wrap it, and deliver it without a hint.</p>
    <div style="border:2px solid #1d7a45;padding:14px;margin:12px 0;">
      <p style="margin:0 0 8px;font-family:Georgia,serif;letter-spacing:2px;color:#8fd6b0;">THEIR NOTE</p>
      <p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.55;">
        Name: {{child_name}}<br/>
        Email: {{child_email}}<br/>
        Phone: {{child_phone}}<br/>
        Drop spot: {{child_address}}<br/>
        Wish: {{child_pref}}
      </p>
    </div>
    <p style="font-family:Georgia,serif;font-size:16px;line-height:1.5;margin:0;">Do not reply-all. Do not spoil the draw.</p>
  </div>
</div>`;

function blank(): DB {
  return {
    closed: false,
    participants: [],
    exclusions: [],
    mapping: null,
    status: {},
    emailSubject: DEFAULT_SUBJECT,
    emailHtml: DEFAULT_HTML,
  };
}

/** Same shape readDb writes. Null when the value is not a database. */
export function normalizeDb(parsed: unknown): DB | null {
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Partial<DB>;
  const people = row.participants;
  if (!Array.isArray(people)) return null;
  const base = blank();
  const rawStatus = row.status && typeof row.status === "object" ? row.status : {};
  const status: DB["status"] = {};
  for (const [id, item] of Object.entries(rawStatus)) {
    const email = (item as { email?: unknown } | null)?.email;
    status[id] = { email: email === "sent" ? "sent" : "pending" };
  }
  let mapping: DB["mapping"] = null;
  if (row.mapping && typeof row.mapping === "object") mapping = row.mapping;
  return {
    closed: Boolean(row.closed),
    participants: people.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      address: p.address,
      preference: p.preference,
    })),
    exclusions: Array.isArray(row.exclusions) ? row.exclusions : [],
    mapping,
    status,
    emailSubject: row.emailSubject || base.emailSubject,
    emailHtml: (row.emailHtml || base.emailHtml)
      .replaceAll("{{image}}", "")
      .replace(/<p[^>]*>If a poster (?:came with this letter|rode along)[\s\S]*?<\/p>\s*/gi, ""),
  };
}

export function readDbSync(file = paths.db): DB {
  if (!fs.existsSync(file)) return blank();
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // A half-written practice file should not block login. The host route reseeds it.
    if (isPractice(file)) return blank();
    throw new Error(`${path.basename(file)} is corrupt. Fix it or delete it.`);
  }
  const db = normalizeDb(parsed);
  if (!db) {
    if (isPractice(file)) return blank();
    throw new Error(`${path.basename(file)} is corrupt. Fix it or delete it.`);
  }
  return db;
}

/** Reads after the request arrives, so the file is not frozen at build time. */
export async function readDb(file = paths.db): Promise<DB> {
  await connection();
  return readDbSync(file);
}

function writeDb(db: DB, file = paths.db) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  // Windows rename will not replace an existing file.
  try {
    fs.unlinkSync(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  fs.renameSync(tmp, file);
}

// ponytail: one in-process queue per file. Two overlapping writes cannot
// clobber that file in this process. Ceiling: one Node process. Upgrade: SQLite.
const queues = new Map<string, Promise<unknown>>();

export function updateDb<T>(fn: (db: DB) => Promise<T> | T, file = paths.db): Promise<T> {
  const prev = queues.get(file) ?? Promise.resolve();
  const job = prev.then(async () => {
    const db = readDbSync(file);
    const result = await fn(db);
    writeDb(db, file);
    return result;
  });
  queues.set(
    file,
    job.then(
      () => undefined,
      () => undefined,
    ),
  );
  return job;
}

export function toPublic(db: DB): PublicState {
  const mapped = Boolean(db.mapping);
  return {
    closed: db.closed || mapped,
    mapped,
    participants: db.participants.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      address: p.address,
      preference: p.preference,
      mail: mapped ? (db.status[p.id]?.email ?? "pending") : null,
    })),
    exclusions: db.exclusions,
    mapping: db.mapping,
    emailSubject: db.emailSubject,
    emailHtml: db.emailHtml,
  };
}

