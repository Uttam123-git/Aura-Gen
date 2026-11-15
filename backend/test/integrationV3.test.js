import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneration } from "../src/prompts/outputContract.js";
import { generateValidatedUI } from "../src/prompts/generationWorkflow.js";

const code = 'import React from "react"; import { ProgressBar } from "@auragen/ui"; export default function App() { return <ProgressBar value={50} max={100} label="Loading" />; }';
const invalidCode = code.replace('value={50}', 'value={150}');
const json = (source) => JSON.stringify({ componentName: "App", code: source, explanation: "Progress display" });

test("unified validator accepts valid JSX and rejects invalid numeric constraints", () => {
  assert.equal(validateGeneration(json(code)).valid, true);
  const result = validateGeneration(json(invalidCode));
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some(d => d.code === "COMPONENT_CONSTRAINT"));
});

test("workflow repairs invalid generation using diagnostics", async () => {
  let calls = 0;
  const result = await generateValidatedUI("Show profile completion progress", async messages => {
    calls++;
    if (calls === 2) assert.ok(messages.at(-1).content.includes("ProgressBar.value"));
    return calls === 1 ? json(invalidCode) : json(code);
  });
  assert.equal(result.valid, true);
  assert.equal(calls, 2);
  assert.equal(result.attempts.length, 2);
});

test("workflow returns failure after repair budget", async () => {
  const result = await generateValidatedUI("Show profile completion progress", async () => json(invalidCode), { maxRepairs: 1 });
  assert.equal(result.valid, false);
  assert.equal(result.attempts.length, 2);
});
