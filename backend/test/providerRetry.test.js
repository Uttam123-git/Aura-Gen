
import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchWithRetry,
  ProviderError,
} from "../src/server/providerRetry.js";

const url = "https://example.test/provider";

const options = {
  method: "POST",
  body: JSON.stringify({ request: "test" }),
};

const noDelay = async () => {};

test("succeeds immediately without retry", async () => {
  let calls = 0;

  const response = await fetchWithRetry(url, options, {
    fetchImpl: async () => {
      calls++;
      return new Response("ok", { status: 200 });
    },
    sleepImpl: noDelay,
  });

  assert.equal(response.status, 200);
  assert.equal(calls, 1);
});

test("retries HTTP 429 and succeeds", async () => {
  let calls = 0;
  const delays = [];

  const response = await fetchWithRetry(url, options, {
    fetchImpl: async () => {
      calls++;

      return new Response("result", {
        status: calls < 3 ? 429 : 200,
      });
    },
    sleepImpl: async (ms) => {
      delays.push(ms);
    },
  });

  assert.equal(response.status, 200);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [250, 500]);
});

test("retries HTTP 503 until attempt limit", async () => {
  let calls = 0;

  await assert.rejects(
    fetchWithRetry(url, options, {
      fetchImpl: async () => {
        calls++;
        return new Response("unavailable", {
          status: 503,
        });
      },
      sleepImpl: noDelay,
    }),
    (error) =>
      error instanceof ProviderError &&
      error.status === 503
  );

  assert.equal(calls, 3);
});

test("does not retry HTTP 401", async () => {
  let calls = 0;

  await assert.rejects(
    fetchWithRetry(url, options, {
      fetchImpl: async () => {
        calls++;
        return new Response("unauthorized", {
          status: 401,
        });
      },
      sleepImpl: noDelay,
    }),
    /Provider HTTP 401/
  );

  assert.equal(calls, 1);
});

test("retries transient network failures", async () => {
  let calls = 0;

  const response = await fetchWithRetry(url, options, {
    fetchImpl: async () => {
      calls++;

      if (calls < 3) {
        throw new Error("Temporary connection failure");
      }

      return new Response("ok", {
        status: 200,
      });
    },
    sleepImpl: noDelay,
  });

  assert.equal(response.status, 200);
  assert.equal(calls, 3);
});

test("rejects invalid retry configuration", async () => {
  await assert.rejects(
    fetchWithRetry(url, options, {
      maxAttempts: 0,
    }),
    RangeError
  );
});
