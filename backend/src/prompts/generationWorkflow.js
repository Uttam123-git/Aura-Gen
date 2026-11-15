/** Role 1 generation workflow. Caller supplies an LLM adapter; no provider credentials here. */
import { buildGenerationMessages, buildRepairMessages } from "./fewShot.js";
import { validateGeneration } from "./outputContract.js";

export async function generateValidatedUI(request, generate, { maxRepairs = 2, exampleLimit = 2 } = {}) {
  if (typeof generate !== "function") throw new TypeError("generate must be an async LLM adapter function");
  if (!Number.isInteger(maxRepairs) || maxRepairs < 0 || maxRepairs > 3) throw new RangeError("maxRepairs must be 0..3");
  const initial = buildGenerationMessages(request, { exampleLimit });
  const attempts = [];
  let messages = initial.messages;
  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    const response = await generate(messages);
    if (typeof response !== "string") throw new TypeError("LLM adapter must return response text");
    const result = validateGeneration(response, { allowedComponents: initial.allowedComponents });
    attempts.push({ valid: result.valid, diagnostics: result.diagnostics });
    if (result.valid) return { valid: true, output: result.output, attempts };
    if (attempt < maxRepairs) {
      messages = buildRepairMessages(request, response, result.diagnostics).messages;
    }
  }
  return { valid: false, output: null, attempts };
}
