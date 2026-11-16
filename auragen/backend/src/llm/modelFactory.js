import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { config } from "../config.js";
import { MOCK_MODEL_REPLY } from "./mockResponse.js";

export function createModel(overrides = {}) {
  const settings = { ...config, ...overrides };

  switch (settings.llmProvider) {
    case "openai": {
      if (!settings.openaiApiKey) {
        throw new Error("LLM_PROVIDER=openai requires OPENAI_API_KEY to be set");
      }
      return new ChatOpenAI({
        model: settings.openaiModel,
        temperature: settings.temperature,
        apiKey: settings.openaiApiKey,
      });
    }
    case "ollama":
      return new ChatOllama({
        baseUrl: settings.ollamaBaseUrl,
        model: settings.ollamaModel,
        temperature: settings.temperature,
      });
    case "mock":
      return new FakeListChatModel({ responses: settings.mockResponses ?? [MOCK_MODEL_REPLY] });
    default:
      throw new Error(`Unsupported LLM provider: ${settings.llmProvider}`);
  }
}
