import test from "node:test";
import assert from "node:assert/strict";
import { listComponentNames, getComponent } from "../src/design-system/index.js";
import { analyzeIntent } from "../src/prompts/intentAnalyzer.js";
import { buildSystemPrompt } from "../src/prompts/systemPrompt.js";
import { resolveComponents } from "../src/prompts/componentResolver.js";
import { validateGeneration } from "../src/prompts/outputContract.js";
import { selectFewShotExamples, buildGenerationMessages, buildRepairMessages } from "../src/prompts/fewShot.js";

test("registry exposes ten named components", () => {
  assert.equal(listComponentNames().length, 10);
  for (const name of listComponentNames()) assert.equal(getComponent(name).name, name);
});
test("intent analyzer detects numeric and written steps", () => {
  for (const phrase of ["3-step registration", "three-step registration", "five steps registration", "10-step wizard"]) {
    assert.ok(analyzeIntent(phrase).components.includes("Stepper"), phrase);
  }
});
test("resolver includes label dependency and rejects unknown components", () => {
  assert.deepEqual(resolveComponents(["TextInput"]), ["TextInput", "Label"]);
  assert.throws(() => resolveComponents(["Imaginary"]), RangeError);
});
test("dynamic prompt exposes component constraints", () => {
  const prompt = buildSystemPrompt("Create a registration form");
  assert.ok(prompt.systemPrompt.includes("OUTPUT CONTRACT:"));
  assert.ok(prompt.allowedComponents.includes("TextInput"));
});
test("few-shot examples are selected by intent", () => {
  assert.equal(selectFewShotExamples(["progress"], 1)[0].id, "progress");
  const result = buildGenerationMessages("Create a registration form");
  assert.equal(result.messages[0].role, "system");
  assert.equal(result.messages.at(-1).role, "user");
  assert.ok(result.examples.includes("form"));
});
test("repair messages contain validation diagnostics", () => {
  const result = buildRepairMessages("Create a registration form", "bad response", [{ message: "Missing label" }]);
  assert.match(result.messages.at(-1).content, /Missing label/);
});
test("response contract accepts valid JSON and rejects malformed JSON", () => {
  const valid = JSON.stringify({ componentName: "Sample", code: "export default function Sample() { return null; }", explanation: "Sample" });
  assert.equal(validateGeneration(valid).valid, true);
  assert.equal(validateGeneration("not json").diagnostics[0].code, "INVALID_JSON");
});
test("response contract flags disallowed imports and dangerous patterns", () => {
  const result = validateGeneration({ componentName: "Bad", code: 'import { Imaginary } from "@auragen/ui"; eval("x")', explanation: "Bad" });
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(({ code }) => code === "UNSUPPORTED_COMPONENT"));
  assert.ok(result.diagnostics.some(({ code }) => code === "DYNAMIC_EXECUTION"));
});
