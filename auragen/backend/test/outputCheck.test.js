import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneratedCode } from "../src/pipeline/outputCheck.js";
import { MOCK_COMPONENT_CODE } from "../src/llm/mockResponse.js";

const wrap = (body) =>
  `import React from "react";\nimport { Card } from "@auragen/ui";\n\nexport default function X() {\n${body}\n}\n`;

test("the bundled mock component passes validation", () => {
  const result = validateGeneratedCode(MOCK_COMPONENT_CODE);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("rejects empty source", () => {
  assert.equal(validateGeneratedCode("").valid, false);
});

test("rejects imports from modules outside the allow-list", () => {
  const code = `import axios from "axios";\nexport default function X() { return null; }`;
  assert.match(validateGeneratedCode(code).errors.join(), /axios/);
});

test("rejects components that do not exist in the UI kit", () => {
  const code = `import { Modal } from "@auragen/ui";\nexport default function X() { return <Modal />; }`;
  assert.match(validateGeneratedCode(code).errors.join(), /"Modal" does not exist/);
});

test("rejects unsafe constructs", () => {
  const cases = {
    "eval(": "eval('1')",
    network: "fetch('/api')",
    storage: "localStorage.getItem('a')",
    html: "const p = { dangerouslySetInnerHTML: { __html: 'x' } };",
    "dynamic import": "import('x')",
  };
  for (const [name, snippet] of Object.entries(cases)) {
    const result = validateGeneratedCode(wrap(`${snippet};\nreturn <Card>hi</Card>;`));
    assert.equal(result.valid, false, `${name} should be rejected`);
  }
});

test("rejects a missing or duplicated default export", () => {
  const none = `import React from "react";\nfunction X() { return null; }`;
  assert.match(validateGeneratedCode(none).errors.join(), /default export/);
  const two = `export default function A() { return null; }\nexport default function B() { return null; }`;
  assert.match(validateGeneratedCode(two).errors.join(), /default export/);
});

test("rejects JSX tags that are neither imported nor defined", () => {
  const code = `import React from "react";\nexport default function X() { return <Ghost />; }`;
  assert.match(validateGeneratedCode(code).errors.join(), /<Ghost>/);
});

test("allows locally defined helper components", () => {
  const code = `import React from "react";\nfunction Row() { return <div />; }\nexport default function X() { return <Row />; }`;
  assert.equal(validateGeneratedCode(code).valid, true);
});
