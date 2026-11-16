import { IMPORT_SOURCE, listComponentNames } from "../design-system/index.js";

const ALLOWED_MODULES = new Set(["react", IMPORT_SOURCE]);
const MAX_SOURCE_LENGTH = 20_000;

const FORBIDDEN_PATTERNS = [
  [/\beval\s*\(/, "eval() is not allowed"],
  [/\bnew\s+Function\b/, "the Function constructor is not allowed"],
  [/dangerouslySetInnerHTML/, "dangerouslySetInnerHTML is not allowed"],
  [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/, "network access is not allowed"],
  [/\b(?:localStorage|sessionStorage|indexedDB)\b/, "browser storage is not allowed"],
  [/\bdocument\.(?:cookie|write)\b/, "document.cookie / document.write are not allowed"],
  [/\b(?:window\.location|location\.href)\b/, "navigation is not allowed"],
  [/\bimport\s*\(/, "dynamic import() is not allowed"],
  [/\brequire\s*\(/, "require() is not allowed"],
  [/<script\b/i, "<script> tags are not allowed"],
  [/<style\b/i, "<style> tags are not allowed"],
];

const IMPORT_STATEMENT = /^\s*import\s+([^;]*?)\s+from\s+["']([^"']+)["']\s*;?/gm;
const SIDE_EFFECT_IMPORT = /^\s*import\s+["']([^"']+)["']\s*;?/gm;

function parseImportClause(clause) {
  const names = [];
  const named = clause.match(/\{([^}]*)\}/);
  const withoutNamed = clause.replace(/\{[^}]*\}/, "");
  const defaultName = withoutNamed.split(",")[0]?.trim();
  if (defaultName && !defaultName.startsWith("*")) names.push({ imported: "default", local: defaultName });
  const namespace = withoutNamed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespace) names.push({ imported: "*", local: namespace[1] });
  if (named) {
    for (const part of named[1].split(",")) {
      const [imported, local] = part.trim().split(/\s+as\s+/);
      if (imported) names.push({ imported, local: local ?? imported });
    }
  }
  return names;
}

export function validateGeneratedCode(code) {
  const errors = [];
  if (typeof code !== "string" || code.trim() === "") return { valid: false, errors: ["Source code is empty"] };
  if (code.length > MAX_SOURCE_LENGTH) errors.push(`Source is longer than ${MAX_SOURCE_LENGTH} characters`);

  for (const [pattern, message] of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) errors.push(message);
  }

  const known = new Set(listComponentNames());
  const available = new Set();

  for (const match of code.matchAll(SIDE_EFFECT_IMPORT)) {
    errors.push(`Side-effect import of "${match[1]}" is not allowed`);
  }
  for (const match of code.matchAll(IMPORT_STATEMENT)) {
    const [, clause, source] = match;
    if (!ALLOWED_MODULES.has(source)) {
      errors.push(`Import from "${source}" is not allowed; use only "react" and "${IMPORT_SOURCE}"`);
      continue;
    }
    for (const { imported, local } of parseImportClause(clause)) {
      available.add(local);
      if (source === IMPORT_SOURCE && !known.has(imported)) {
        errors.push(`"${imported}" does not exist in ${IMPORT_SOURCE}`);
      }
    }
  }

  const defaultExports = code.match(/\bexport\s+default\b/g) ?? [];
  if (defaultExports.length !== 1) errors.push("The file must contain exactly one default export (the component)");

  for (const match of code.matchAll(/\b(?:function|const|let|class)\s+([A-Z][A-Za-z0-9_$]*)/g)) {
    available.add(match[1]);
  }
  const reported = new Set();
  for (const match of code.matchAll(/<([A-Z][A-Za-z0-9_$]*)(?:\.[A-Za-z0-9_$]+)*/g)) {
    const root = match[1];
    if (!available.has(root) && !reported.has(root)) {
      reported.add(root);
      errors.push(`<${root}> is used but never imported or defined`);
    }
  }

  return { valid: errors.length === 0, errors };
}
