
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import {
  createApp,
  createLLMAdapter,
} from "../src/server/index.js";

async function withServer(callback) {
  const server = createApp({
    generate: createLLMAdapter({ mock: true }),
  });

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

test("Day 10: unknown routes return controlled errors", async () => {
  await withServer(async (base) => {
    const response = await fetch(
      `${base}/api/unknown`
    );

    assert.equal(response.status, 404);

    const body = await response.json();

    assert.equal(body.error, "NOT_FOUND");
  });
});

test("Day 10: unsupported HTTP methods are rejected", async () => {
  await withServer(async (base) => {
    const response = await fetch(
      `${base}/api/generate`
    );

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
  });
});

test("Day 10: empty generation requests are rejected", async () => {
  await withServer(async (base) => {
    const response = await fetch(
      `${base}/api/generate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          request: "   ",
        }),
      }
    );

    assert.equal(response.status, 400);

    const body = await response.json();

    assert.equal(body.error, "INVALID_REQUEST");
  });
});

test("Day 10: unexpected request fields are rejected", async () => {
  await withServer(async (base) => {
    const response = await fetch(
      `${base}/api/generate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          request: "Create a dashboard",
          unexpected: true,
        }),
      }
    );

    assert.equal(response.status, 400);

    const body = await response.json();

    assert.equal(body.error, "INVALID_REQUEST");
  });
});

test("Day 10: oversized prompts are rejected", async () => {
  await withServer(async (base) => {
    const response = await fetch(
      `${base}/api/generate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          request: "a".repeat(5001),
        }),
      }
    );

    assert.equal(response.status, 400);

    const body = await response.json();

    assert.equal(body.error, "INVALID_REQUEST");
  });
});
