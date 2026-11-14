export const ADMIN_COOKIE = "ss_admin";

// Plain password compare. The cookie stores the same value on purpose.
// Friend-circle gate, not a security boundary.
export function passwordOk(input: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  return expected.length > 0 && input === expected;
}

export function authed(cookieValue: string | undefined) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  return expected.length > 0 && cookieValue === expected;
}
