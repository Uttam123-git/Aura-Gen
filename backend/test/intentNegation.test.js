
import test from "node:test";
import assert from "node:assert/strict";

import { analyzeIntent } from "../src/prompts/intentAnalyzer.js";

test("excludes explicitly negated progress", () => {
  const result = analyzeIntent(
    "Create a registration form, but don't add a progress bar"
  );

  assert.ok(result.components.includes("TextInput"));
  assert.ok(!result.components.includes("ProgressBar"));
});

test("supports requests without chat", () => {
  const result = analyzeIntent(
    "Create a dashboard without chat"
  );

  assert.ok(result.components.includes("Card"));
  assert.ok(!result.components.includes("ChatBubble"));
});

test("preserves positive progress requests", () => {
  const result = analyzeIntent(
    "Create a progress bar"
  );

  assert.ok(result.components.includes("ProgressBar"));
});

test("supports positive mentions after a negated sentence", () => {
  const result = analyzeIntent(
    "Don't add a progress bar. Show progress instead."
  );

  assert.ok(result.components.includes("ProgressBar"));
});
