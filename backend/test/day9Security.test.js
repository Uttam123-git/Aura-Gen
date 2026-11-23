
import test from "node:test";
import assert from "node:assert/strict";

import {
  validateGeneration,
} from "../src/prompts/outputContract.js";

const wrap = (code, componentName = "GeneratedUI") =>
  JSON.stringify({
    componentName,
    code,
    explanation: "Security regression test",
  });

const validCode = `
import React from "react";
import { ProgressBar } from "@auragen/ui";

export default function GeneratedUI() {
  return (
    <ProgressBar
      value={50}
      max={100}
      label="Loading"
    />
  );
}
`;

function expectRejected(code, expectedDiagnostic) {
  const result = validateGeneration(
    wrap(code)
  );

  assert.equal(result.valid, false);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === expectedDiagnostic
    ),
    `Expected ${expectedDiagnostic}; received ${
      JSON.stringify(result.diagnostics)
    }`
  );
}

test("Day 9: approved JSX passes validation", () => {
  const result = validateGeneration(
    wrap(validCode)
  );

  assert.equal(
    result.valid,
    true,
    JSON.stringify(result.diagnostics)
  );
});

test("Day 9: rejects dangerous HTML injection", () => {
  expectRejected(
    `export default function GeneratedUI() {
      return <div dangerouslySetInnerHTML={{
        __html: "<script>alert(1)</script>"
      }} />;
    }`,
    "DANGEROUS_HTML"
  );
});

test("Day 9: rejects dynamic eval execution", () => {
  expectRejected(
    `export default function GeneratedUI() {
      eval("alert(1)");
      return <main>Unsafe</main>;
    }`,
    "DYNAMIC_EXECUTION"
  );
});

test("Day 9: rejects unauthorized imports", () => {
  expectRejected(
    `import helper from "untrusted-package";
     export default function GeneratedUI() {
       return <main>Unsafe import</main>;
     }`,
    "UNAPPROVED_IMPORT"
  );
});

test("Day 9: rejects unsupported UI components", () => {
  expectRejected(
    `import { ImaginaryWidget } from "@auragen/ui";
     export default function GeneratedUI() {
       return <ImaginaryWidget />;
     }`,
    "UNSUPPORTED_COMPONENT"
  );
});

test("Day 9: rejects mismatched default export", () => {
  expectRejected(
    `export default function WrongName() {
       return <main>Hello</main>;
     }`,
    "COMPONENT_NAME_MISMATCH"
  );
});

test("Day 9: rejects malformed JSON", () => {
  const result = validateGeneration(
    "{invalid-json"
  );

  assert.equal(result.valid, false);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "INVALID_JSON"
    )
  );
});

test("Day 9: rejects oversized generated source", () => {
  const result = validateGeneration(
    wrap("x".repeat(100001))
  );

  assert.equal(result.valid, false);

  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "CODE_TOO_LONG"
    )
  );
});
