
import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluatePrompt,
  buildPromptQualityFeedback,
} from "../src/prompts/promptIntelligence.js";

const detailedRequest =
  "Create a responsive registration form for students with email, password, validation and submit button.";

test("detailed prompts receive maximum quality score", () => {
  const result = evaluatePrompt(detailedRequest);

  assert.equal(result.score, 100);
  assert.equal(result.level, "excellent");
  assert.equal(result.readyForGeneration, true);
});

test("vague prompts receive low quality scores", () => {
  const result = evaluatePrompt("Create a page");

  assert.equal(result.score, 20);
  assert.equal(result.level, "poor");
  assert.equal(result.readyForGeneration, false);
});

test("missing requirements produce suggestions", () => {
  const result = evaluatePrompt("Create a page");

  assert.ok(result.missing.includes("audience"));
  assert.ok(result.missing.includes("behavior"));
  assert.ok(result.suggestions.length > 0);
});

test("quality scoring integrates intent analysis", () => {
  const result = evaluatePrompt(
    "Create a registration form"
  );

  assert.ok(result.intents.includes("form"));

  assert.ok(
    result.recommendedComponents.includes("TextInput")
  );
});

test("quality score remains within valid boundaries", () => {
  const requests = [
    "Hello",
    "Create a page",
    "Create a registration form",
    detailedRequest,
  ];

  for (const request of requests) {
    const result = evaluatePrompt(request);

    assert.ok(result.score >= 0);
    assert.ok(result.score <= 100);
  }
});

test("empty requests are rejected", () => {
  assert.throws(
    () => evaluatePrompt(""),
    TypeError
  );
});

test("invalid input types are rejected", () => {
  assert.throws(
    () => evaluatePrompt(null),
    TypeError
  );
});

test("quality feedback supports weak requests", () => {
  const result = buildPromptQualityFeedback(
    "Create a page"
  );

  assert.equal(result.readyForGeneration, false);
  assert.match(result.message, /additional requirements/);
});

test("quality scoring is deterministic", () => {
  assert.deepEqual(
    evaluatePrompt(detailedRequest),
    evaluatePrompt(detailedRequest)
  );
});

test("score breakdown matches total score", () => {
  const result = evaluatePrompt(detailedRequest);

  const total = Object.values(result.breakdown)
    .reduce((sum, item) => sum + item.score, 0);

  assert.equal(total, result.score);
});
