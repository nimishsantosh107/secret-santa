export const TEST_EMAIL = "nimishsantosh107@gmail.com";

const names = ["Alex", "Blair", "Casey", "Drew", "Ellis", "Fran", "Gray", "Harper"];

export const testRoster: {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  preference: string;
}[] = names.map((name) => ({
  id: `test-${name.toLowerCase()}`,
  name,
  email: TEST_EMAIL,
  phone: "555-0199",
  address: "1 Test Street",
  preference: `${name} would like a small test gift.`,
}));

/** Alex and Blair cannot be Santa for each other. */
export const testExclusions = [{ a: "test-alex", b: "test-blair" }];

type SeedTarget = {
  closed: boolean;
  participants: (typeof testRoster)[number][];
  exclusions: { a: string; b: string }[];
  mapping: Record<string, string> | null;
  status: Record<string, { email: "pending" | "sent" }>;
  emailSubject: string;
  emailHtml: string;
};

export function applyTestSeed(
  db: SeedTarget,
  templates: { emailSubject: string; emailHtml: string },
) {
  db.closed = false;
  db.participants = testRoster.map((person) => ({ ...person }));
  db.exclusions = testExclusions.map((pair) => ({ ...pair }));
  db.mapping = null;
  db.status = {};
  db.emailSubject = templates.emailSubject;
  db.emailHtml = templates.emailHtml;
}
