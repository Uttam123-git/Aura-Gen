import test from "node:test";
import assert from "node:assert/strict";
import { RunnableLambda } from "@langchain/core/runnables";
import { AIMessage } from "@langchain/core/messages";
import { createModel } from "../src/llm/modelFactory.js";
import { MOCK_COMPONENT_CODE, MOCK_MODEL_REPLY } from "../src/llm/mockResponse.js";
import { GenerationError, generateComponent } from "../src/pipeline/generateComponent.js";
import sample from "../scripts/sampleFriction.json" with { type: "json" };

const BAD_REPLY =
  "```jsx\nimport React from 'react';\nexport default function Bad() { fetch('/leak'); return null; }\n```";

test("returns valid code on the first attempt", async () => {
  const model = createModel({ llmProvider: "mock" });
  const { code, attempts } = await generateComponent(sample, { model, maxAttempts: 3 });
  assert.equal(code, MOCK_COMPONENT_CODE.trim());
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].valid, true);
});

test("repairs a rejected attempt on the second try", async () => {
  const model = createModel({ llmProvider: "mock", mockResponses: [BAD_REPLY, MOCK_MODEL_REPLY] });
  const { attempts } = await generateComponent(sample, { model, maxAttempts: 3 });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].valid, false);
  assert.match(attempts[0].errors.join(), /network access/);
  assert.equal(attempts[1].valid, true);
});

test("the retry sends the rejected code and its errors back to the model", async () => {
  const replies = [BAD_REPLY, MOCK_MODEL_REPLY];
  const seen = [];
  const model = RunnableLambda.from(async (messages) => {
    seen.push(messages);
    return new AIMessage(replies.shift());
  });
  await generateComponent(sample, { model, maxAttempts: 2 });

  assert.equal(seen.length, 2);
  const retry = seen[1];
  const last = String(retry.at(-1).content);
  assert.match(last, /rejected by the automated checks/);
  assert.match(last, /network access/);
  assert.match(String(retry.at(-2).content), /function Bad/);
});

test("throws a GenerationError carrying every attempt when nothing validates", async () => {
  const model = createModel({ llmProvider: "mock", mockResponses: [BAD_REPLY] });
  await assert.rejects(
    () => generateComponent(sample, { model, maxAttempts: 2 }),
    (error) => error instanceof GenerationError && error.attempts.length === 2,
  );
});

test("rejects incomplete context before calling the model", async () => {
  const model = createModel({ llmProvider: "mock" });
  await assert.rejects(() => generateComponent({}, { model }), /fieldId/);
});
