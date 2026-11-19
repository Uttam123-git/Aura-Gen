
import test from "node:test";
import assert from "node:assert/strict";

import {
  createLLMAdapter,
} from "../src/server/index.js";

/**
 * Replace fetch temporarily to simulate provider responses.
 * No external API calls or API keys are required.
 */
async function withMockFetch(handler, callback) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = handler;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const messages = [
  {
    role: "user",
    content: "Create a registration form",
  },
];

test("provider adapter sends correct API request", async () => {
  let capturedUrl;
  let capturedOptions;

  await withMockFetch(
    async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"componentName":"GeneratedUI"}',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }
      );
    },
    async () => {
      const generate = createLLMAdapter({
        apiKey: "test-key-not-real",
        model: "test-model",
        mock: false,
      });

      const result = await generate(messages);

      assert.equal(
        result,
        '{"componentName":"GeneratedUI"}'
      );
    }
  );

  assert.equal(
    capturedUrl,
    "https://api.openai.com/v1/chat/completions"
  );

  assert.equal(
    capturedOptions.method,
    "POST"
  );

  assert.equal(
    capturedOptions.headers.authorization,
    "Bearer test-key-not-real"
  );

  const payload = JSON.parse(capturedOptions.body);

  assert.equal(payload.model, "test-model");
  assert.deepEqual(payload.messages, messages);
  assert.equal(payload.response_format.type, "json_object");
});

test("provider adapter rejects HTTP 429", async () => {
  await withMockFetch(
    async () => new Response(
      JSON.stringify({ error: "Rate limited" }),
      { status: 429 }
    ),
    async () => {
      const generate = createLLMAdapter({
        apiKey: "test-key-not-real",
        mock: false,
      });

      await assert.rejects(
        generate(messages),
        /Provider HTTP 429/
      );
    }
  );
});

test("provider adapter rejects HTTP 503", async () => {
  await withMockFetch(
    async () => new Response(
      JSON.stringify({ error: "Unavailable" }),
      { status: 503 }
    ),
    async () => {
      const generate = createLLMAdapter({
        apiKey: "test-key-not-real",
        mock: false,
      });

      await assert.rejects(
        generate(messages),
        /Provider HTTP 503/
      );
    }
  );
});

test("provider adapter rejects missing message content", async () => {
  await withMockFetch(
    async () => new Response(
      JSON.stringify({
        choices: [{ message: {} }],
      }),
      { status: 200 }
    ),
    async () => {
      const generate = createLLMAdapter({
        apiKey: "test-key-not-real",
        mock: false,
      });

      await assert.rejects(
        generate(messages),
        /missing message content/
      );
    }
  );
});

test("provider adapter rejects malformed provider JSON", async () => {
  await withMockFetch(
    async () => new Response(
      "{invalid-json",
      { status: 200 }
    ),
    async () => {
      const generate = createLLMAdapter({
        apiKey: "test-key-not-real",
        mock: false,
      });

      await assert.rejects(
        generate(messages),
        SyntaxError
      );
    }
  );
});

test("provider adapter requires credentials in real mode", async () => {
  const generate = createLLMAdapter({
    apiKey: "",
    mock: false,
  });

  await assert.rejects(
    generate(messages),
    /OPENAI_API_KEY is not configured/
  );
});

test("mock mode never calls external provider", async () => {
  await withMockFetch(
    async () => {
      throw new Error("External fetch must not occur");
    },
    async () => {
      const generate = createLLMAdapter({
        mock: true,
      });

      const result = JSON.parse(
        await generate(messages)
      );

      assert.equal(
        result.componentName,
        "GeneratedUI"
      );

      assert.match(
        result.explanation,
        /mock preview/
      );
    }
  );
});
