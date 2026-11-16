import "dotenv/config";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = Object.freeze({
  llmProvider: (process.env.LLM_PROVIDER ?? "mock").toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3",
  temperature: toNumber(process.env.LLM_TEMPERATURE, 0.2),
  maxAttempts: Math.max(1, toNumber(process.env.CODEGEN_MAX_ATTEMPTS, 3)),
  wsPort: toNumber(process.env.WS_PORT, 8080),
});
