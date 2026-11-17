
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import {
  createApp,
  createLLMAdapter,
} from "../src/server/index.js";

// Start an isolated HTTP server for each test.
async function withServer(generate, fn) {
  const server = createApp({ generate });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    await fn(base);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

// Helper for JSON POST requests.
const post = (
  base,
  path,
  body,
  contentType = "application/json"
) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": contentType,
    },
    body:
      typeof body === "string"
        ? body
        : JSON.stringify(body),
  });

// TEST 1: Health endpoint
test("health endpoint reports service status", async () => {
  await withServer(
    createLLMAdapter({ mock: true }),
    async (base) => {
      const response = await fetch(`${base}/api/health`);

      assert.equal(response.status, 200);

      const result = await response.json();

      assert.equal(result.status, "ok");
    }
  );
});

// TEST 2: Intent analysis
test("analyze endpoint resolves intent", async () => {
  await withServer(
    createLLMAdapter({ mock: true }),
    async (base) => {
      const response = await post(
        base,
        "/api/analyze",
        {
          request: "Create a three-step registration form",
        }
      );

      assert.equal(response.status, 200);

      const result = await response.json();

      assert.ok(result.components.includes("Stepper"));
    }
  );
});

// TEST 3: Mock UI generation
test("generate endpoint returns validated mock response", async () => {
  await withServer(
    createLLMAdapter({ mock: true }),
    async (base) => {
      const response = await post(
        base,
        "/api/generate",
        {
          request: "A simple welcome page",
        }
      );

      const result = await response.json();

      assert.equal(
        response.status,
        200,
        JSON.stringify(result)
      );

      assert.equal(result.valid, true);
      assert.equal(result.output.componentName, "GeneratedUI");
    }
  );
});

// TEST 4: Malformed JSON and invalid requests
test(
  "rejects malformed JSON, missing requests, and wrong content type",
  async () => {
    await withServer(
      createLLMAdapter({ mock: true }),
      async (base) => {
        assert.equal(
          (await post(base, "/api/generate", "{bad")).status,
          400
        );

        assert.equal(
          (await post(base, "/api/generate", {})).status,
          400
        );

        assert.equal(
          (
            await post(
              base,
              "/api/generate",
              "hello",
              "text/plain"
            )
          ).status,
          415
        );
      }
    );
  }
);

// TEST 5: Invalid provider output
test(
  "reports validation failure when provider always produces invalid output",
  async () => {
    await withServer(
      async () => "{bad",
      async (base) => {
        const response = await post(
          base,
          "/api/generate",
          {
            request: "Create a form",
          }
        );

        const result = await response.json();

        assert.equal(response.status, 422);
        assert.equal(result.valid, false);
        assert.equal(result.attempts.length, 3);
      }
    );
  }
);

// TEST 6: Automatic generation repair
test(
  "repairs invalid output using another provider response",
  async () => {
    let count = 0;

    const mock = createLLMAdapter({ mock: true });

    await withServer(
      async (messages) =>
        ++count === 1
          ? "{bad"
          : mock(messages),
      async (base) => {
        const response = await post(
          base,
          "/api/generate",
          {
            request: "A welcome page",
          }
        );

        assert.equal(response.status, 200);

        const result = await response.json();

        assert.equal(result.attempts.length, 2);
      }
    );
  }
);

// TEST 7: HTTP method validation
test(
  "returns 405 for unsupported methods on known routes",
  async () => {
    await withServer(
      createLLMAdapter({ mock: true }),
      async (base) => {
        const response = await fetch(
          `${base}/api/analyze`
        );

        assert.equal(response.status, 405);
        assert.equal(
          response.headers.get("allow"),
          "POST"
        );

        const result = await response.json();

        assert.equal(
          result.error,
          "METHOD_NOT_ALLOWED"
        );
      }
    );
  }
);

// TEST 8: Unknown API route
test("returns 404 for unknown API endpoints", async () => {
  await withServer(
    createLLMAdapter({ mock: true }),
    async (base) => {
      const response = await fetch(
        `${base}/api/unknown`
      );

      assert.equal(response.status, 404);

      const result = await response.json();

      assert.equal(result.error, "NOT_FOUND");
    }
  );
});

// TEST 9: Reject unexpected request properties
test("rejects unexpected request properties", async () => {
  await withServer(
    createLLMAdapter({ mock: true }),
    async (base) => {
      const response = await post(
        base,
        "/api/analyze",
        {
          request: "Create a registration form",
          unexpected: true,
        }
      );

      assert.equal(response.status, 400);

      const result = await response.json();

      assert.equal(result.error, "INVALID_REQUEST");
    }
  );
});

// TEST 10: Reject oversized prompts
test("rejects oversized prompt text", async () => {
  await withServer(
    createLLMAdapter({ mock: true }),
    async (base) => {
      const response = await post(
        base,
        "/api/analyze",
        {
          request: "a".repeat(5001),
        }
      );

      assert.equal(response.status, 400);

      const result = await response.json();

      assert.equal(result.error, "INVALID_REQUEST");
    }
  );
});
