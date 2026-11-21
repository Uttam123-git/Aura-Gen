
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { createApp } from "../src/server/index.js";
import { createLLMAdapter } from "../src/server/index.js";

async function withServer(generate, callback) {
  const server = createApp({ generate });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const base =
      `http://127.0.0.1:${server.address().port}`;

    await callback(base);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) =>
        error ? reject(error) : resolve()
      );
    });
  }
}

async function post(base, path, request) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ request }),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

const validCode = `
import React from "react";
import { ProgressBar } from "@auragen/ui";

export default function GeneratedUI() {
  return (
    <ProgressBar
      value={50}
      max={100}
      label="Progress"
    />
  );
}
`;

const invalidCode = validCode.replace(
  "value={50}",
  "value={150}"
);

const output = (code) =>
  JSON.stringify({
    componentName: "GeneratedUI",
    code,
    explanation: "Progress interface",
  });

test("Day 7: intent analysis works through HTTP", async () => {
  await withServer(
    createLLMAdapter({ mock: true }),
    async (base) => {
      const result = await post(
        base,
        "/api/analyze",
        "Show profile completion progress"
      );

      assert.equal(result.status, 200);

      assert.ok(
        result.body.components.includes("ProgressBar")
      );
    }
  );
});

test("Day 7: valid AI output passes full pipeline", async () => {
  await withServer(
    async () => output(validCode),
    async (base) => {
      const result = await post(
        base,
        "/api/generate",
        "Show profile completion progress"
      );

      assert.equal(result.status, 200);
      assert.equal(result.body.valid, true);
      assert.equal(result.body.attempts.length, 1);
    }
  );
});

test("Day 7: invalid JSX is repaired automatically", async () => {
  let calls = 0;

  await withServer(
    async () => {
      calls++;

      return output(
        calls === 1 ? invalidCode : validCode
      );
    },
    async (base) => {
      const result = await post(
        base,
        "/api/generate",
        "Show profile completion progress"
      );

      assert.equal(result.status, 200);
      assert.equal(result.body.valid, true);
      assert.equal(result.body.attempts.length, 2);
      assert.equal(calls, 2);
    }
  );
});

test("Day 7: permanently invalid output returns 422", async () => {
  await withServer(
    async () => output(invalidCode),
    async (base) => {
      const result = await post(
        base,
        "/api/generate",
        "Show profile completion progress"
      );

      assert.equal(result.status, 422);
      assert.equal(result.body.valid, false);
      assert.equal(result.body.attempts.length, 3);
    }
  );
});

test("Day 7: provider failure returns controlled error", async () => {
  await withServer(
    async () => {
      throw new Error("Simulated provider failure");
    },
    async (base) => {
      const result = await post(
        base,
        "/api/generate",
        "Show profile completion progress"
      );

      assert.equal(result.status, 502);
      assert.equal(
        result.body.error,
        "GENERATION_FAILED"
      );
    }
  );
});
