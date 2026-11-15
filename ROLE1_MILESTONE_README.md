# AuraGen Role 1 — milestone overlay

This overlay **adds** five files to your existing repository. It does not replace the existing design system or prompt builder. Review the changes before committing.

## Install
Extract into the root of your existing `Aura-Gen` checkout (the ZIP contains `backend/...` paths).

## Verify
From the repository root:

```powershell
node --test backend/test/role1.test.js
node backend/test/role1.benchmark.js
npm --prefix backend test
```

Only commit if all checks pass. Do not overwrite existing files if the ZIP extractor reports a conflict; inspect the difference first.

## Limitations
- Component specs are documentation; actual `@auragen/ui` React components are not provided here.
- JSON validation is a lightweight contract check. It does not parse JSX with an AST, compile React, sandbox generated code, or guarantee security.
- Intent detection is heuristic; negation and nuanced semantics are not yet handled.
- Example selection does not guarantee examples use only the requested allowed component subset. The frontend integration contract still needs validation.
- This package does not touch teammate-owned LLM, pipeline, or server code.
