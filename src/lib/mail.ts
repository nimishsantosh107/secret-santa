import nodemailer from "nodemailer";
import type { DB } from "./db";

const TEXT = [
  "{{santa_name}}, you are Secret Santa for {{child_name}}.",
  "Email: {{child_email}}",
  "Phone: {{child_phone}}",
  "Address: {{child_address}}",
  "Wish: {{child_pref}}",
].join("\n");

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyText(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_m, key: string) =>
    (vars[key] ?? "").replace(/[\r\n]+/g, " "),
  );
}

export function applyHtml(template: string, vars: Record<string, string>) {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    safe[key] = escapeHtml(value).replace(/\n/g, "<br/>");
  }
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_m, key: string) => safe[key] ?? "");
}

function mailer() {
  const user = process.env.GMAIL_USER ?? "";
  const pass = (process.env.GMAIL_PASSWORD ?? "").replace(/\s+/g, "");
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_PASSWORD missing.");
  return {
    user,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    }),
  };
}

function varsFor(santaName: string, child: DB["participants"][number]) {
  return {
    santa_name: santaName,
    child_name: child.name,
    child_email: child.email,
    child_phone: child.phone,
    child_address: child.address,
    child_pref: child.preference,
  };
}

export async function sendOne(db: DB): Promise<boolean> {
  if (!db.mapping) throw new Error("Shuffle first.");
  const santaId = Object.keys(db.mapping).find((id) => db.status[id]?.email !== "sent");
  if (!santaId) return false;
  const childId = db.mapping[santaId];
  const santa = db.participants.find((p) => p.id === santaId);
  const child = db.participants.find((p) => p.id === childId);
  if (!santa || !child || !childId) throw new Error("Mapping points at a missing person.");

  const vars = varsFor(santa.name, child);
  const { user, transporter } = mailer();
  await transporter.sendMail({
    from: `"Secret Santa" <${user}>`,
    to: santa.email,
    subject: applyText(db.emailSubject, vars).replace(/[\r\n]+/g, " ").slice(0, 180),
    html: applyHtml(db.emailHtml, vars),
    text: applyText(TEXT, vars),
  });
  // ponytail: sent flag is written after SMTP accepts. A crash in that gap can
  // double-send on the next click. Upgrade: write a sending lock first.
  db.status[santaId] = { email: "sent" };
  return true;
}
