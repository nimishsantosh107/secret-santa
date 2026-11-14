import assert from "node:assert/strict";
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

console.log("shuffle ok");
