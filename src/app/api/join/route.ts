import { randomBytes } from "node:crypto";
import { readDb, updateDb } from "@/lib/db";

export const maxDuration = 30;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const db = await readDb();
  return json({ closed: db.closed || Boolean(db.mapping) });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Could not read the form." }, 400);
  }

  const name = field(form, "name");
  const email = field(form, "email").toLowerCase();
  const phone = field(form, "phone");
  const address = field(form, "address");
  const preference = field(form, "preference");

  if (!name || !email || !phone || !address || !preference) {
    return json({ error: "Fill every field." }, 400);
  }
  if (name.length > 80) return json({ error: "Name is too long." }, 400);
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Email looks wrong." }, 400);
  }
  if (phone.length > 40) return json({ error: "Phone is too long." }, 400);
  if (address.length > 500) return json({ error: "Address is too long." }, 400);
  if (preference.length > 1000) return json({ error: "Gift preference is too long." }, 400);

  try {
    const result = await updateDb(async (db): Promise<{ error?: string; updated?: boolean }> => {
      if (db.closed || db.mapping) return { error: "Submissions are closed." };
      const existing = db.participants.find((p) => p.email === email);
      const next = {
        id: existing?.id ?? randomBytes(9).toString("base64url"),
        name,
        email,
        phone,
        address,
        preference,
      };
      if (existing) Object.assign(existing, next);
      else db.participants.push(next);
      return { updated: Boolean(existing) };
    });
    if (result.error) return json({ error: result.error }, 400);
    return json({ ok: true, updated: Boolean(result.updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save.";
    return json({ error: message }, 500);
  }
}
