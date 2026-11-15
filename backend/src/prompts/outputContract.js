import { validateJSX } from "./jsxValidator.js";
import { listComponentNames } from "../design-system/index.js";

export const OUTPUT_SCHEMA_VERSION = "1.0.0";
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*$/;
const forbidden = [
  { code: "DANGEROUS_HTML", pattern: /\bdangerouslySetInnerHTML\b/ },
  { code: "DYNAMIC_EXECUTION", pattern: /\b(?:eval|Function)\s*\(/ },
  { code: "DYNAMIC_IMPORT", pattern: /\bimport\s*\(/ },
];

export function validateGeneration(raw, { allowedComponents } = {}) {
  const diagnostics = [];
  let output;
  try {
    output = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { valid: false, output: null, diagnostics: [{ code: "INVALID_JSON", message: "Response must be valid JSON" }] };
  }
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return { valid: false, output: null, diagnostics: [{ code: "INVALID_SHAPE", message: "Response must be a JSON object" }] };
  }
  if (typeof output.componentName !== "string" || !COMPONENT_NAME.test(output.componentName)) {
    diagnostics.push({ code: "INVALID_COMPONENT_NAME", message: "componentName must be a PascalCase identifier" });
  }
  if (typeof output.explanation !== "string" || !output.explanation.trim()) {
    diagnostics.push({ code: "INVALID_EXPLANATION", message: "explanation must be a nonempty string" });
  }
  if (typeof output.code !== "string" || !output.code.trim()) {
    diagnostics.push({ code: "INVALID_CODE", message: "code must be a nonempty string" });
  } else {
    if (output.code.length > 100000) diagnostics.push({ code: "CODE_TOO_LONG", message: "Generated code exceeds 100000 characters" });
    for (const rule of forbidden) if (rule.pattern.test(output.code)) diagnostics.push({ code: rule.code, message: `Disallowed code pattern: ${rule.code}` });
    const supported = new Set(allowedComponents ?? listComponentNames());
    const importPattern = /import\s*{([^}]+)}\s*from\s*["']@auragen\/ui["']/g;
    for (const match of output.code.matchAll(importPattern)) {
      for (const spec of match[1].split(",")) {
        const imported = spec.trim().split(/\s+as\s+/)[0].trim();
        if (!supported.has(imported)) diagnostics.push({ code: "UNSUPPORTED_COMPONENT", message: `Component not allowed: ${imported}` });
      }
    }
  }
  if (
    typeof output.code === "string" &&
    output.code.trim() &&
    output.code.length <= 100000
  ) {
    const astResult = validateJSX(output.code, { allowedComponents });
    diagnostics.push(...astResult.diagnostics);
  }

  return { valid: diagnostics.length === 0, output, diagnostics };
}
// This is a fast response-contract check, NOT an AST parser, JSX compiler, or security sandbox.
