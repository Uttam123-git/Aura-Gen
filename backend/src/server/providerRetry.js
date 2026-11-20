
/**
 * AuraGen provider retry and timeout utility.
 *
 * Supports:
 * - Bounded retries for transient HTTP failures
 * - Exponential backoff
 * - Explicit per-attempt timeouts
 * - AbortSignal cancellation
 * - Controlled provider errors
 */

const RETRYABLE_STATUS = new Set([
  429, 500, 502, 503, 504,
]);

const sleep = (milliseconds) =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );

export class ProviderError extends Error {
  constructor(
    message,
    {
      status = null,
      code = "PROVIDER_ERROR",
    } = {}
  ) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
  }
}

async function fetchWithTimeout(
  fetchImpl,
  url,
  options,
  timeoutMs
) {
  const controller = new AbortController();

  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();

      reject(
        new ProviderError(
          "Provider request timed out",
          { code: "PROVIDER_TIMEOUT" }
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve().then(() =>
        fetchImpl(url, {
          ...options,
          signal: controller.signal,
        })
      ),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWithRetry(
  url,
  options,
  {
    fetchImpl = globalThis.fetch,
    maxAttempts = 3,
    baseDelayMs = 250,
    timeoutMs = 30000,
    sleepImpl = sleep,
  } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError(
      "fetchImpl must be a function"
    );
  }

  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 5
  ) {
    throw new RangeError(
      "maxAttempts must be 1..5"
    );
  }

  if (
    !Number.isFinite(baseDelayMs) ||
    baseDelayMs < 0
  ) {
    throw new RangeError(
      "baseDelayMs must be nonnegative"
    );
  }

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new RangeError(
      "timeoutMs must be positive"
    );
  }

  if (typeof sleepImpl !== "function") {
    throw new TypeError(
      "sleepImpl must be a function"
    );
  }

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      const response = await fetchWithTimeout(
        fetchImpl,
        url,
        options,
        timeoutMs
      );

      if (response.ok) {
        return response;
      }

      throw new ProviderError(
        `Provider HTTP ${response.status}`,
        {
          status: response.status,
          code: "PROVIDER_HTTP_ERROR",
        }
      );
    } catch (error) {
      if (error instanceof ProviderError) {
        // Timeout errors should terminate immediately.
        if (error.code === "PROVIDER_TIMEOUT") {
          throw error;
        }

        const retryable =
          RETRYABLE_STATUS.has(error.status);

        if (
          !retryable ||
          attempt === maxAttempts
        ) {
          throw error;
        }
      } else if (attempt === maxAttempts) {
        throw new ProviderError(
          "Provider network request failed",
          { code: "PROVIDER_NETWORK_ERROR" }
        );
      }

      const delay =
        baseDelayMs * 2 ** (attempt - 1);

      await sleepImpl(delay);
    }
  }

  throw new ProviderError(
    "Provider retry attempts exhausted"
  );
}
