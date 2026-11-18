
import test from "node:test";
import assert from "node:assert/strict";

import {
  selectFewShotExamples,
  buildGenerationMessages,
  buildRepairMessages,
} from "../src/prompts/fewShot.js";

test("progress requests select only progress examples", () => {
  const result = buildGenerationMessages(
    "Show profile completion progress"
  );

  assert.deepEqual(result.examples, ["progress"]);
  assert.ok(
    result.allowedComponents.includes("ProgressBar")
  );
});

test("registration requests exclude unrelated examples", () => {
  const result = buildGenerationMessages(
    "Create a registration form"
  );

  assert.deepEqual(result.examples, ["form"]);
  assert.ok(!result.examples.includes("chat"));
  assert.ok(!result.examples.includes("progress"));
});

test("combined requests select matching examples", () => {
  const result = buildGenerationMessages(
    "Create a registration form with a progress bar"
  );

  assert.deepEqual(
    result.examples,
    ["progress", "form"]
  );
});

test("unknown intents do not introduce irrelevant examples", () => {
  assert.deepEqual(
    selectFewShotExamples(["unknown"], 2),
    []
  );
});

test("zero example limit produces no examples", () => {
  const result = buildGenerationMessages(
    "Create a registration form",
    { exampleLimit: 0 }
  );

  assert.deepEqual(result.examples, []);
  assert.equal(result.messages.length, 2);
});

test("repair messages exclude few-shot examples", () => {
  const result = buildRepairMessages(
    "Create a registration form",
    "{bad",
    [{ message: "Invalid JSON" }]
  );

  assert.deepEqual(result.examples, []);
  assert.equal(result.messages.length, 3);
  assert.match(
    result.messages.at(-1).content,
    /Invalid JSON/
  );
});

test("invalid example limits are rejected", () => {
  assert.throws(
    () => selectFewShotExamples(["form"], -1),
    RangeError
  );

  assert.throws(
    () => selectFewShotExamples(["form"], 4),
    RangeError
  );
});
