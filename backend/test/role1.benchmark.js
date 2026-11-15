import { analyzeIntent } from "../src/prompts/intentAnalyzer.js";
const cases = [
  ["Create a three-step registration form", ["Stepper", "TextInput", "Button"]],
  ["Show profile completion progress", ["ProgressBar"]],
  ["Create a chat interface", ["ChatBubble"]],
  ["Add a consent checkbox", ["Checkbox"]],
  ["Create a dashboard summary", ["Card"]],
  ["Create a country dropdown", ["SelectField"]],
];
let passed = 0;
for (const [request, expected] of cases) {
  const actual = analyzeIntent(request).components;
  const ok = expected.every((name) => actual.includes(name));
  passed += Number(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${request}: ${actual.join(", ")}`);
}
console.log(`Intent benchmark: ${passed}/${cases.length} cases passed`);
if (passed !== cases.length) process.exitCode = 1;
