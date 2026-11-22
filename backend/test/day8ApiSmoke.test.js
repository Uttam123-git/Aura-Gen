
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

async function post(base, path, request) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ request }),
  });
}

test("Day 8: health endpoint is reachable", async () => {
  await withServer(async (base) => {
    const response = await fetch(
      `${base}/api/health`
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.status, "ok");
    assert.equal(
      body.service,
      "auragen-backend"
    );
  });
});

test("Day 8: frontend can analyze UI requests", async () => {
  await withServer(async (base) => {
    const response = await post(
      base,
      "/api/analyze",
      "Create a three-step registration form"
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.ok(
      body.components.includes("Stepper")
    );
  });
});

test("Day 8: frontend can request mock UI generation", async () => {
  await withServer(async (base) => {
    const response = await post(
      base,
      "/api/generate",
      "Create a welcome page"
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.valid, true);
    assert.equal(
      typeof body.output.code,
      "string"
    );
    assert.ok(body.output.code.length > 0);
  });
});

test("Day 8: browser preflight is supported", async () => {
  await withServer(async (base) => {
    const response = await fetch(
      `${base}/api/generate`,
      {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "POST",
          "access-control-request-headers":
            "content-type",
        },
      }
    );

    assert.equal(response.status, 204);

    assert.match(
      response.headers.get(
        "access-control-allow-methods"
      ),
      /POST/
    );

    assert.equal(
      response.headers.get(
        "access-control-allow-origin"
      ),
      process.env.AURAGEN_CORS_ORIGIN ||
        "http://localhost:5173"
    );
  });
});
