import { config } from "../config.js";
import { createModel } from "../llm/modelFactory.js";
import { createCodeGenChain } from "./codeGenChain.js";
import { extractCode } from "./extractCode.js";
import { validateGeneratedCode } from "./outputCheck.js";

export class GenerationError extends Error {
  constructor(message, attempts) {
    super(message);
    this.name = "GenerationError";

    this.attempts = attempts;
  }
}

export async function generateComponent(context, { model = createModel(), maxAttempts = config.maxAttempts } = {}) {
  const chain = createCodeGenChain(model);
  const attempts = [];
  let previousCode;
  let errors;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const reply = await chain.invoke({ context, previousCode, errors });

    let code;
    try {
      code = extractCode(reply);
    } catch (error) {
      errors = [error.message];
      attempts.push({ attempt, valid: false, errors });
      continue;
    }

    const result = validateGeneratedCode(code);
    attempts.push({ attempt, valid: result.valid, errors: result.errors });
    if (result.valid) return { code, attempts };

    previousCode = code;
    errors = result.errors;
  }

  throw new GenerationError(`No valid component after ${maxAttempts} attempt(s)`, attempts);
}
