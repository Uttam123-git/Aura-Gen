#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { config } from "../src/config.js";
import { GenerationError, generateComponent } from "../src/pipeline/generateComponent.js";

const DEFAULT_INPUT = fileURLToPath(new URL("./sampleFriction.json", import.meta.url));

const { values } = parseArgs({
  options: {
    input: { type: "string", short: "i", default: DEFAULT_INPUT },
    out: { type: "string", short: "o" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`Usage: npm run generate -- [--input friction.json] [--out Wizard.jsx]

Generates a wizard component for a friction event using the provider set in
LLM_PROVIDER (currently "${config.llmProvider}"; mock | openai | ollama).`);
  process.exit(0);
}

try {
  const context = JSON.parse(await readFile(values.input, "utf8"));
  console.error(`[generate] provider=${config.llmProvider} input=${values.input}`);

  const { code, attempts } = await generateComponent(context);

  for (const { attempt, valid, errors } of attempts) {
    console.error(`[generate] attempt ${attempt}: ${valid ? "valid" : "rejected - " + errors.join("; ")}`);
  }
  if (values.out) {
    await writeFile(values.out, code + "\n", "utf8");
    console.error(`[generate] wrote ${values.out}`);
  } else {
    console.log(code);
  }
} catch (error) {
  if (error instanceof GenerationError) {
    for (const { attempt, errors } of error.attempts) {
      console.error(`[generate] attempt ${attempt} rejected: ${errors.join("; ")}`);
    }
  }
  console.error(`[generate] failed: ${error.message}`);
  process.exit(1);
}
