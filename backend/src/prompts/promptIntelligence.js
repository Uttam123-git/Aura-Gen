
import { analyzeIntent } from "./intentAnalyzer.js";

const QUALITY_RULES = [
  {
    name: "objective",
    weight: 20,
    pattern: /\b(create|build|design|generate|develop|show)\b/i,
    suggestion: "Describe the interface you want to create.",
  },
  {
    name: "audience",
    weight: 15,
    pattern: /\b(users?|customers?|students?|admins?|employees?|patients?|developers?|teachers?)\b/i,
    suggestion: "Specify the target audience.",
  },
  {
    name: "components",
    weight: 20,
    pattern: /\b(form|button|input|dashboard|card|table|dropdown|checkbox|navigation|chart|progress)\b/i,
    suggestion: "Specify the required UI components.",
  },
  {
    name: "behavior",
    weight: 20,
    pattern: /\b(submit|validation|validate|filter|search|sort|select|upload|download|update|navigate)\b/i,
    suggestion: "Explain the expected user interactions.",
  },
  {
    name: "design",
    weight: 15,
    pattern: /\b(responsive|modern|minimal|dark|light|mobile|accessible|layout|color|theme)\b/i,
    suggestion: "Specify layout, styling or accessibility requirements.",
  },
  {
    name: "detail",
    weight: 10,
    pattern: /(?:\S+\s+){11,}\S+/,
    suggestion: "Provide more specific interface requirements.",
  },
];

export function evaluatePrompt(request) {
  const analysis = analyzeIntent(request);
  const normalized = analysis.request
    .replace(/\s+/g, " ")
    .trim();

  let score = 0;
  const strengths = [];
  const missing = [];
  const suggestions = [];
  const breakdown = {};

  for (const rule of QUALITY_RULES) {
    const matched = rule.pattern.test(normalized);

    breakdown[rule.name] = {
      matched,
      score: matched ? rule.weight : 0,
      maxScore: rule.weight,
    };

    if (matched) {
      score += rule.weight;
      strengths.push(rule.name);
    } else {
      missing.push(rule.name);
      suggestions.push(rule.suggestion);
    }
  }

  const level =
    score >= 80
      ? "excellent"
      : score >= 60
        ? "good"
        : score >= 40
          ? "moderate"
          : "poor";

  return {
    score,
    maxScore: 100,
    level,
    readyForGeneration: score >= 60,
    strengths,
    missing,
    suggestions,
    breakdown,
    intents: analysis.intents,
    recommendedComponents: analysis.components,
    strategy: "weighted-heuristic-scoring",
  };
}

export function buildPromptQualityFeedback(request) {
  const evaluation = evaluatePrompt(request);

  if (evaluation.readyForGeneration) {
    return {
      ...evaluation,
      message:
        "The request contains sufficient UI requirements.",
    };
  }

  return {
    ...evaluation,
    message:
      "The request would benefit from additional requirements.",
  };
}

export default evaluatePrompt;
