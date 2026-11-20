
import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchWithRetry,
  ProviderError,
} from "../src/server/providerRetry.js";

const url = "https://example.test/provider";

const options = {
  method: "POST",
  body: JSON.stringify({
    request: "Create a login form",
  }),
};

test(
  "hanging provider request terminates with timeout",
  async () => {
    let calls = 0;
    let aborted = false;

    await assert.rejects(
      fetchWithRetry(url, options, {
        maxAttempts: 3,
        timeoutMs: 20,
        fetchImpl: async (_, config) => {
          calls++;

          config.signal.addEventListener(
            "abort",
            () => {
              aborted = true;
            },
            { once: true }
          );

          return new Promise(() => {});
        },
      }),
      (error) =>
        error instanceof ProviderError &&
        error.code === "PROVIDER_TIMEOUT"
    );

    assert.equal(calls, 1);
    assert.equal(aborted, true);
  }
);

test(
  "successful provider response avoids timeout",
  async () => {
    const response = await fetchWithRetry(
      url,
      options,
      {
        timeoutMs: 1000,
        fetchImpl: async () =>
          new Response("success", {
            status: 200,
          }),
      }
    );

    assert.equal(response.status, 200);
    assert.equal(
      await response.text(),
      "success"
    );
  }
);

test(
  "HTTP 401 fails without retries or timeout",
  async () => {
    let calls = 0;

    await assert.rejects(
      fetchWithRetry(url, options, {
        timeoutMs: 1000,
        fetchImpl: async () => {
          calls++;

          return new Response(
            "unauthorized",
            { status: 401 }
          );
        },
      }),
      (error) =>
        error instanceof ProviderError &&
        error.status === 401
    );

    assert.equal(calls, 1);
  }
);

test(
  "HTTP 503 retries with exponential backoff",
  async () => {
    let calls = 0;
    const delays = [];

    const response = await fetchWithRetry(
      url,
      options,
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        timeoutMs: 1000,
        sleepImpl: async (delay) => {
          delays.push(delay);
        },
        fetchImpl: async () => {
          calls++;

          return new Response("result", {
            status: calls < 3 ? 503 : 200,
          });
        },
      }
    );

    assert.equal(response.status, 200);
    assert.equal(calls, 3);

    assert.deepEqual(
      delays,
      [100, 200]
    );
  }
);
