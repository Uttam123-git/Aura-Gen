
/**
 * AuraGen provider retry utility.
 *
 * Retries transient HTTP failures using exponential backoff.
 * Each attempt has its own timeout.
 */

const RETRYABLE_STATUS = new Set([
  429, 500, 502, 503, 504,
]);

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class ProviderError extends Error {
  constructor(message, {
    status = null,
    code = "PROVIDER_ERROR",
  } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
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
    throw new TypeError("fetchImpl must be a function");
  }

  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 5
  ) {
    throw new RangeError("maxAttempts must be 1..5");
  }

  if (
    !Number.isFinite(baseDelayMs) ||
    baseDelayMs < 0
  ) {
    throw new RangeError("baseDelayMs must be nonnegative");
  }

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new RangeError("timeoutMs must be positive");
  }

  if (typeof sleepImpl !== "function") {
    throw new TypeError("sleepImpl must be a function");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: controller.signal,
      });

      if (response.ok) {
        return response;
      }

      const error = new ProviderError(
        `Provider HTTP ${response.status}`,
        {
          status: response.status,
          code: "PROVIDER_HTTP_ERROR",
        }
      );

      const shouldRetry =
        RETRYABLE_STATUS.has(response.status) &&
        attempt < maxAttempts;

      if (!shouldRetry) {
        throw error;
      }
    } catch (error) {
      // HTTP errors have already been classified.
      if (error instanceof ProviderError) {
        if (
          !RETRYABLE_STATUS.has(error.status) ||
          attempt === maxAttempts
        ) {
          throw error;
        }
      } else if (controller.signal.aborted) {
        throw new ProviderError(
          "Provider request timed out",
          { code: "PROVIDER_TIMEOUT" }
        );
      } else {
        // Network errors may be transient.
        if (attempt === maxAttempts) {
          throw new ProviderError(
            "Provider network request failed",
            { code: "PROVIDER_NETWORK_ERROR" }
          );
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    const delay = baseDelayMs * 2 ** (attempt - 1);
    await sleepImpl(delay);
  }

  throw new ProviderError(
    "Provider retry attempts exhausted"
  );
}
