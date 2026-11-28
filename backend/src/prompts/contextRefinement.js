
import { analyzeIntent } from "./intentAnalyzer.js";

const MAX_REQUEST_LENGTH = 5000;
const MAX_HISTORY_LENGTH = 10;

function normalize(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length > MAX_REQUEST_LENGTH) {
    throw new RangeError(`${name} exceeds maximum length`);
  }

  return normalized;
}

export function classifyRefinement(instruction) {
  const text = normalize(instruction, "Instruction");

  if (/^(start over|start fresh|reset|replace everything)\b/i.test(text)) {
    return "reset";
  }

  if (/^(remove|delete|exclude|omit|hide|without)\b/i.test(text)) {
    return "remove";
  }

  if (/^(add|include|insert|append)\b/i.test(text)) {
    return "add";
  }

  if (/^(change|replace|update|modify|convert|make)\b/i.test(text)) {
    return "modify";
  }

  return "extend";
}

export function createRefinementContext(request) {
  const originalRequest = normalize(request, "Request");

  return {
    version: 1,
    originalRequest,
    currentRequest: originalRequest,
    history: [],
    analysis: analyzeIntent(originalRequest)
  };
}

export function refineContext(context, instruction) {
  if (
    !context ||
    typeof context !== "object" ||
    !Array.isArray(context.history) ||
    !Number.isInteger(context.version) ||
    context.version < 1
  ) {
    throw new TypeError("Invalid refinement context");
  }

  const previousRequest = normalize(
    context.currentRequest,
    "Current request"
  );

  const originalRequest = normalize(
    context.originalRequest,
    "Original request"
  );

  const refinement = normalize(instruction, "Instruction");
  const operation = classifyRefinement(refinement);

  let currentRequest;

  if (operation === "reset") {
    currentRequest = refinement
      .replace(
        /^(start over|start fresh|reset|replace everything)\s*[:.,-]?\s*/i,
        ""
      )
      .trim();

    if (!currentRequest) {
      throw new TypeError(
        "Reset requires a new interface description"
      );
    }
  } else {
    currentRequest =
      `${previousRequest}\n` +
      `Latest refinement (${operation}): ${refinement}. ` +
      "Apply the latest instruction where it conflicts " +
      "with previous requirements.";
  }

  if (currentRequest.length > MAX_REQUEST_LENGTH) {
    throw new RangeError(
      "Refined request exceeds maximum length"
    );
  }

  const history = [
    ...context.history,
    {
      version: context.version + 1,
      operation,
      instruction: refinement,
      previousRequest
    }
  ].slice(-MAX_HISTORY_LENGTH);

  return {
    version: context.version + 1,
    originalRequest,
    currentRequest,
    history,
    analysis: analyzeIntent(currentRequest),
    lastOperation: operation
  };
}

export function getRefinementSummary(context) {
  if (!context || !Array.isArray(context.history)) {
    throw new TypeError("Invalid refinement context");
  }

  return {
    version: context.version,
    retainedHistoryCount: context.history.length,
    originalRequest: context.originalRequest,
    currentRequest: context.currentRequest,
    lastOperation: context.lastOperation ?? null,
    recommendedComponents:
      context.analysis?.components ?? [],
    strategy: "context-aware-prompt-refinement"
  };
}
