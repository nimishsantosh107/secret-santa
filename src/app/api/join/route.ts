import { randomBytes } from "node:crypto";
import { readDb, updateDb } from "@/lib/db";
import { readPerson } from "@/lib/person";

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

  const person = readPerson({
    name: field(form, "name"),
    email: field(form, "email"),
    phone: field(form, "phone"),
    address: field(form, "address"),
    preference: field(form, "preference"),
  });
  if ("error" in person) return json({ error: person.error }, 400);

  try {
    const result = await updateDb(async (db): Promise<{ error?: string; updated?: boolean }> => {
      if (db.closed || db.mapping) return { error: "Submissions are closed." };
      const existing = db.participants.find((p) => p.email === person.email);
      const next = {
        id: existing?.id ?? randomBytes(9).toString("base64url"),
        ...person,
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
