import test from "node:test";
import assert from "node:assert/strict";
import { extractCode } from "../src/pipeline/extractCode.js";

test("extracts code from a jsx fence and ignores surrounding chatter", () => {
  const reply = "Sure!\n\n```jsx\nexport default function A() { return null; }\n```\nHope that helps.";
  assert.equal(extractCode(reply), "export default function A() { return null; }");
});

test("accepts js, javascript and unlabeled fences", () => {
  for (const label of ["js", "javascript", ""]) {
    assert.equal(extractCode("```" + label + "\nconst a = 1;\n```"), "const a = 1;");
  }
});

test("recovers code from an unterminated fence (truncated stream)", () => {
  assert.equal(extractCode("```jsx\nconst a = 1;\n"), "const a = 1;");
});

test("returns the whole reply when there is no fence", () => {
  assert.equal(extractCode("  const a = 1;  "), "const a = 1;");
});

test("throws on empty input", () => {
  assert.throws(() => extractCode("   "), /empty/);
  assert.throws(() => extractCode(undefined), /empty/);
  assert.throws(() => extractCode("```jsx\n```"), /empty code block/);
});
