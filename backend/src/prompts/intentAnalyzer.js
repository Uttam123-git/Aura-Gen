
/**
 * AuraGen Intent Analyzer
 *
 * Lightweight, deterministic component recommendations.
 * Supports local negation detection for explicitly excluded UI features.
 *
 * This is a heuristic planning aid, not an LLM or semantic parser.
 */

import { listComponentNames } from "../design-system/index.js";

const intentRules = Object.freeze([
  {
    intent: "multi_step",
    patterns: [
      /\bmulti[\s-]?step\b/i,
      /\bwizard\b/i,
      /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]?steps?\b/i,
    ],
    components: ["Stepper", "Button"],
  },
  {
    intent: "progress",
    patterns: [
      /\bprogress\b/i,
      /\bcompletion\b/i,
      /\bpercentage\b/i,
    ],
    components: ["ProgressBar"],
  },
  {
    intent: "form",
    patterns: [
      /\bform\b/i,
      /\bregistration\b/i,
      /\bsign[\s-]?up\b/i,
    ],
    components: ["Label", "TextInput", "Button"],
  },
  {
    intent: "selection",
    patterns: [
      /\bdropdown\b/i,
      /\bselect\b/i,
      /\bchoose\b/i,
    ],
    components: ["SelectField"],
  },
  {
    intent: "agreement",
    patterns: [
      /\bcheckbox\b/i,
      /\bconsent\b/i,
      /\bagree\b/i,
      /\bterms\b/i,
    ],
    components: ["Checkbox"],
  },
  {
    intent: "conversation",
    patterns: [
      /\bchat\b/i,
      /\bconversation\b/i,
      /\bmessages?\b/i,
    ],
    components: ["ChatBubble", "TextInput", "Button"],
  },
  {
    intent: "feedback",
    patterns: [
      /\balert\b/i,
      /\bwarning\b/i,
      /\berror message\b/i,
    ],
    components: ["Alert"],
  },
  {
    intent: "content",
    patterns: [
      /\bcard\b/i,
      /\bdashboard\b/i,
      /\bsummary\b/i,
    ],
    components: ["Card"],
  },
]);

/**
 * Determines whether a keyword match is preceded by a
 * nearby negative instruction in the same clause.
 *
 * This is intentionally heuristic, not full semantic analysis.
 */
function isNegated(text, match) {
  const prefix = text.slice(
    Math.max(0, match.index - 65),
    match.index
  );

  const clause = prefix.split(/[.,;!?\n]/).at(-1);

  return /\b(?:do not|don't|dont|without|no|exclude|avoid|omit|skip|remove)\b(?:\s+\S+){0,5}\s*$/i.test(
    clause
  );
}

/**
 * Returns true when at least one non-negated keyword
 * matches the requested UI feature.
 */
function hasPositiveMatch(text, patterns) {
  return patterns.some((pattern) => {
    const regex = new RegExp(pattern.source, "gi");

    return [...text.matchAll(regex)].some(
      (match) => !isNegated(text, match)
    );
  });
}

/**
 * Analyzes a natural-language UI request and recommends
 * supported AuraGen components.
 */
export function analyzeIntent(request) {
  if (typeof request !== "string" || !request.trim()) {
    throw new TypeError("A nonempty UI request is required");
  }

  const text = request.trim();

  if (text.length > 5000) {
    throw new RangeError(
      "UI request exceeds the 5000-character limit"
    );
  }

  const detectedIntents = [];
  const recommendedComponents = new Set();

  for (const rule of intentRules) {
    if (hasPositiveMatch(text, rule.patterns)) {
      detectedIntents.push(rule.intent);

      for (const component of rule.components) {
        recommendedComponents.add(component);
      }
    }
  }

  const supportedComponents = new Set(
    listComponentNames()
  );

  const components = [...recommendedComponents].filter(
    (name) => supportedComponents.has(name)
  );

  return {
    request: text,
    intents: detectedIntents,
    components,
    matched: detectedIntents.length > 0,
    strategy: "deterministic-keyword-rules",
  };
}

export default analyzeIntent;
