
import test from "node:test";
import assert from "node:assert/strict";

import { buildSystemPrompt } from "../src/prompts/systemPrompt.js";
import { buildGenerationMessages } from "../src/prompts/fewShot.js";
import { listComponentNames } from "../src/design-system/index.js";

test("dropdown prompts include the Label dependency", () => {
  const result = buildSystemPrompt(
    "Create a dropdown for selecting a country"
  );

  assert.ok(
    result.allowedComponents.includes("SelectField")
  );

  assert.ok(
    result.allowedComponents.includes("Label")
  );

  assert.match(
    result.systemPrompt,
    /Component: SelectField/
  );

  assert.match(
    result.systemPrompt,
    /Component: Label/
  );
});

test("stepper prompts include the Button dependency", () => {
  const result = buildSystemPrompt(
    "Create a three-step wizard"
  );

  assert.ok(
    result.allowedComponents.includes("Stepper")
  );

  assert.ok(
    result.allowedComponents.includes("Button")
  );

  assert.match(
    result.systemPrompt,
    /Component: Button/
  );
});

test("component dependencies are not duplicated", () => {
  const result = buildSystemPrompt(
    "Create a registration form with a country dropdown"
  );

  const components = result.allowedComponents;

  assert.equal(
    components.length,
    new Set(components).size
  );

  assert.ok(components.includes("Label"));
  assert.ok(components.includes("TextInput"));
  assert.ok(components.includes("SelectField"));
  assert.ok(components.includes("Button"));
});

test("unknown intent exposes the complete registry", () => {
  const result = buildSystemPrompt(
    "Create a simple welcome page"
  );

  assert.deepEqual(
    new Set(result.allowedComponents),
    new Set(listComponentNames())
  );
});

test("generation messages retain resolved dependencies", () => {
  const result = buildGenerationMessages(
    "Create a country dropdown"
  );

  assert.ok(
    result.allowedComponents.includes("Label")
  );

  assert.ok(
    result.allowedComponents.includes("SelectField")
  );

  assert.match(
    result.messages[0].content,
    /Component: Label/
  );
});
