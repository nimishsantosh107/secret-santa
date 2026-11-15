export type PersonFields = {
  name: string;
  email: string;
  phone: string;
  address: string;
  preference: string;
};

/** Same limits as the join form. Returns an error string or the cleaned fields. */
export function readPerson(input: Partial<PersonFields>): { error: string } | PersonFields {
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").trim();
  const address = String(input.address ?? "").trim();
  const preference = String(input.preference ?? "").trim();
  if (!name || !email || !phone || !address || !preference) return { error: "Fill every field." };
  if (name.length > 80) return { error: "Name is too long." };
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Email looks wrong." };
  }
  if (phone.length > 40) return { error: "Phone is too long." };
  if (address.length > 500) return { error: "Address is too long." };
  if (preference.length > 1000) return { error: "Gift preference is too long." };
  return { name, email, phone, address, preference };
}
