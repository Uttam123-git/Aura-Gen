
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyRefinement,
  createRefinementContext,
  refineContext,
  getRefinementSummary
} from "../src/prompts/contextRefinement.js";

test("creates initial refinement context", () => {
  const context = createRefinementContext(
    "Create a registration form"
  );

  assert.equal(context.version, 1);
  assert.equal(context.history.length, 0);
  assert.ok(context.analysis);
});

test("classifies addition instructions", () => {
  assert.equal(
    classifyRefinement("Add a progress indicator"),
    "add"
  );
});

test("classifies removal instructions", () => {
  assert.equal(
    classifyRefinement("Remove the checkbox"),
    "remove"
  );
});

test("classifies modification instructions", () => {
  assert.equal(
    classifyRefinement("Change the button color"),
    "modify"
  );
});

test("classifies general follow-up instructions", () => {
  assert.equal(
    classifyRefinement("The interface should be responsive"),
    "extend"
  );
});

test("preserves previous requirements during refinement", () => {
  const initial = createRefinementContext(
    "Create a registration form"
  );

  const updated = refineContext(
    initial,
    "Add a progress indicator"
  );

  assert.match(updated.currentRequest, /registration form/);
  assert.match(updated.currentRequest, /progress indicator/);
  assert.equal(updated.version, 2);
  assert.equal(updated.lastOperation, "add");
});

test("recalculates intent after refinement", () => {
  const initial = createRefinementContext(
    "Create a registration form"
  );

  const updated = refineContext(
    initial,
    "Add a progress indicator"
  );

  assert.ok(
    updated.analysis.components.includes("ProgressBar")
  );
});

test("supports resetting interface requirements", () => {
  const initial = createRefinementContext(
    "Create a registration form"
  );

  const updated = refineContext(
    initial,
    "Start over: Create a chat interface"
  );

  assert.equal(updated.lastOperation, "reset");
  assert.equal(
    updated.currentRequest,
    "Create a chat interface"
  );
});

test("does not mutate the original context", () => {
  const initial = createRefinementContext(
    "Create a registration form"
  );

  refineContext(initial, "Add a checkbox");

  assert.equal(initial.version, 1);
  assert.equal(initial.history.length, 0);
});

test("rejects empty refinement instructions", () => {
  const context = createRefinementContext(
    "Create a registration form"
  );

  assert.throws(
    () => refineContext(context, " "),
    TypeError
  );
});

test("rejects oversized requests", () => {
  assert.throws(
    () => createRefinementContext("x".repeat(5001)),
    RangeError
  );
});

test("rejects invalid refinement context", () => {
  assert.throws(
    () => refineContext(null, "Add a button"),
    TypeError
  );
});

test("returns structured refinement summary", () => {
  const initial = createRefinementContext(
    "Create a registration form"
  );

  const updated = refineContext(
    initial,
    "Add a checkbox"
  );

  const summary = getRefinementSummary(updated);

  assert.equal(summary.version, 2);
  assert.equal(summary.retainedHistoryCount, 1);
  assert.equal(summary.lastOperation, "add");
  assert.equal(
    summary.strategy,
    "context-aware-prompt-refinement"
  );
});

test("limits retained refinement history", () => {
  let context = createRefinementContext("Create a form");

  for (let i = 0; i < 12; i++) {
    context = refineContext(
      context,
      `Reset: Create form ${i}`
    );
  }

  assert.equal(context.history.length, 10);
  assert.equal(context.version, 13);
});
