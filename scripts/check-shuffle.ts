import assert from "node:assert/strict";
import { readPerson } from "../src/lib/person";
import { cleanExclusions, derange } from "../src/lib/shuffle";

const ids = ["a", "b", "c", "d"];
const excl = [{ a: "a", b: "b" }];

for (let i = 0; i < 20; i++) {
  const map = derange(ids, excl, Math.random, 1000);
  assert.ok(map, "expected a mapping");
  assert.deepEqual(Object.keys(map).sort(), [...ids].sort());
  assert.deepEqual(Object.values(map).sort(), [...ids].sort());
  for (const id of ids) assert.notEqual(map[id], id);
  assert.notEqual(map.a, "b");
  assert.notEqual(map.b, "a");
}

assert.equal(derange(["a", "b"], [{ a: "a", b: "b" }], Math.random, 30), null);
assert.equal(derange(["solo"], [], Math.random, 5), null);

const cleaned = cleanExclusions(["a", "b", "c"], [
  { a: "b", b: "a" },
  { a: "a", b: "b" },
  { a: "a", b: "a" },
  { a: "nope", b: "a" },
]);
assert.deepEqual(cleaned, [{ a: "a", b: "b" }]);

const ok = readPerson({
  name: "Ada",
  email: "Ada@Example.com",
  phone: "555",
  address: "1 Lane",
  preference: "books",
});
assert.equal("error" in ok ? "" : ok.email, "ada@example.com");
const empty = readPerson({ name: "", email: "a@b.c", phone: "1", address: "x", preference: "y" });
const badEmail = readPerson({ name: "A", email: "not-an-email", phone: "1", address: "x", preference: "y" });
assert.equal("error" in empty && empty.error, "Fill every field.");
assert.equal("error" in badEmail && badEmail.error, "Email looks wrong.");

console.log("shuffle ok");
