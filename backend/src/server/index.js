
import "dotenv/config";

import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { analyzeIntent } from "../prompts/intentAnalyzer.js";
import { generateValidatedUI } from "../prompts/generationWorkflow.js";
import {
  fetchWithRetry,
  ProviderError,
} from "./providerRetry.js";

const MAX_BODY = 16 * 1024;
const MAX_REQUEST_LENGTH = 5000;
const MAX_REPAIRS = 2;

const ROUTES = new Map([
  ["/api/health", "GET"],
  ["/api/analyze", "POST"],
  ["/api/generate", "POST"],
]);

export function createApp({
  generate = createLLMAdapter(),
} = {}) {
  return createServer(async (req, res) => {
    const corsOrigin =
      process.env.AURAGEN_CORS_ORIGIN ||
      "http://localhost:5173";

    const send = (status, data) => {
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": corsOrigin,
        vary: "Origin",
      });

      res.end(JSON.stringify(data));
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": corsOrigin,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        vary: "Origin",
      });

      return res.end();
    }

    const path = new URL(
      req.url || "/",
      "http://localhost"
    ).pathname;

    if (!ROUTES.has(path)) {
      return send(404, {
        error: "NOT_FOUND",
        message: "The requested API endpoint does not exist",
      });
    }

    const allowedMethod = ROUTES.get(path);

    if (req.method !== allowedMethod) {
      res.setHeader("Allow", allowedMethod);

      return send(405, {
        error: "METHOD_NOT_ALLOWED",
        message: `Use ${allowedMethod} for ${path}`,
      });
    }

    if (path === "/api/health") {
      return send(200, {
        status: "ok",
        service: "auragen-backend",
      });
    }

    const contentType = (
      req.headers["content-type"] || ""
    ).toLowerCase();

    if (!/^application\/json(?:\s*;|$)/.test(contentType)) {
      return send(415, {
        error: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/json",
      });
    }

    try {
      const chunks = [];
      let bodySize = 0;

      for await (const chunk of req) {
        bodySize += chunk.length;

        if (bodySize > MAX_BODY) {
          return send(413, {
            error: "BODY_TOO_LARGE",
            message: "Request body exceeds the 16 KB limit",
          });
        }

        chunks.push(chunk);
      }

      let body;

      try {
        body = JSON.parse(
          Buffer.concat(chunks).toString("utf8")
        );
      } catch {
        return send(400, {
          error: "INVALID_JSON",
          message: "Request body must contain valid JSON",
        });
      }

      const validRequest =
        body !== null &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        typeof body.request === "string" &&
        body.request.trim().length > 0 &&
        body.request.length <= MAX_REQUEST_LENGTH &&
        Object.keys(body).every(
          (key) => key === "request"
        );

      if (!validRequest) {
        return send(400, {
          error: "INVALID_REQUEST",
          message:
            "Expected a JSON object containing only a nonempty request string of at most 5000 characters",
        });
      }

      if (path === "/api/analyze") {
        return send(
          200,
          analyzeIntent(body.request)
        );
      }

      const result = await generateValidatedUI(
        body.request,
        generate,
        { maxRepairs: MAX_REPAIRS }
      );

      return send(
        result.valid ? 200 : 422,
        result
      );
    } catch (error) {
      if (error instanceof ProviderError) {
        console.error(
          "AuraGen provider failure:",
          error.code,
          error.status ?? ""
        );

        return send(
          error.code === "PROVIDER_TIMEOUT" ? 504 : 502,
          {
            error: error.code,
            message:
              "AI generation is temporarily unavailable",
          }
        );
      }

      if (
        error instanceof TypeError ||
        error instanceof RangeError
      ) {
        return send(400, {
          error: "INVALID_REQUEST",
          message: error.message,
        });
      }

      console.error(
        "AuraGen request failure:",
        error instanceof Error
          ? error.message
          : String(error)
      );

      return send(502, {
        error: "GENERATION_FAILED",
        message:
          "Generation provider unavailable or returned an invalid response",
      });
    }
  });
}

export function createLLMAdapter({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.AURAGEN_MODEL || "gpt-4o-mini",
  mock = process.env.AURAGEN_MOCK === "1",
} = {}) {
  if (mock) {
    return async (messages) => {
      const request =
        messages.findLast(
          (message) => message.role === "user"
        )?.content || "UI preview";

      return JSON.stringify({
        componentName: "GeneratedUI",
        explanation:
          "Deterministic mock preview; no LLM was called.",
        code: `export default function GeneratedUI() { return <main><h1>AuraGen mock preview</h1><p>{${JSON.stringify(
          String(request).slice(0, 200)
        )}}</p></main>; }`,
      });
    };
  }

  return async (messages) => {
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Set it or enable AURAGEN_MOCK=1 for local tests."
      );
    }

    const response = await fetchWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          response_format: {
            type: "json_object",
          },
        }),
      }
    );

    const payload = await response.json();

    const content =
      payload.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      throw new Error(
        "Provider response missing message content"
      );
    }

    return content;
  };
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(
    process.env.PORT || 8000
  );

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("PORT must be 1..65535");
  }

  createApp().listen(
    port,
    "127.0.0.1",
    () => {
      console.log(
        `AuraGen API listening at http://127.0.0.1:${port}`
      );
    }
  );
}
