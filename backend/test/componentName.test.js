import test from "node:test";
import assert from "node:assert/strict";
import { validateGeneration } from "../src/prompts/outputContract.js";

const makeResponse = (componentName, exportedName) => ({
  componentName,
  explanation: "A simple accessible React component",
  code: `export default function ${exportedName}() {
    return <form><label>Email<input type="email" /></label></form>;
  }`,
});

test("rejects mismatched default export names", () => {
  const result = validateGeneration(
    makeResponse("LoginForm", "RegistrationForm")
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.code === "COMPONENT_NAME_MISMATCH"
    )
  );
});

test("accepts matching default export names", () => {
  const result = validateGeneration(
    makeResponse("LoginForm", "LoginForm")
  );

  assert.equal(result.valid, true);
});

test("rejects mismatched names supplied as JSON", () => {
  const response = JSON.stringify(
    makeResponse("ProfileForm", "LoginForm")
  );

  const result = validateGeneration(response);

  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.code === "COMPONENT_NAME_MISMATCH"
    )
  );
});
