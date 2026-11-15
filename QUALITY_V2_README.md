# AuraGen Role 1 — Quality Engine v2

## Scope
Additive AST-based JSX validator with 12 regression tests. Does not overwrite existing Role 1 files or touch teammate directories.

## Install
From the official repository root:

```powershell
npm.cmd --prefix backend install @babel/parser@^7.28.0 --save
```

## Verify
```powershell
node --test backend/test/qualityV2.test.js
npm.cmd --prefix backend test
```

## API
```js
import { validateJSX } from './backend/src/prompts/jsxValidator.js';
const result = validateJSX('import { ProgressBar } from "@auragen/ui"; export default function App(){ return <ProgressBar value={150} max={100} label="Loading" />; }');
console.log(result.valid, result.diagnostics);
```

## Limitations
- This is **static AST analysis**, not a security sandbox or runtime execution.
- Dynamic expressions cannot always be resolved; spread props are rejected as unverifiable.
- Local function components may be declared and used, but their behavior is not verified.
- Current backend registry and reference frontend UI kit have API differences (notably TextInput and SelectField labels). The validator flags a TextInput mismatch, but does not establish complete frontend compatibility.
- Existing `outputContract.js` does not yet invoke `validateJSX`; integration should be a separate, tested change once the team agrees on the contract.
- Regex-only checks in the existing output validator remain a first-pass check, not a security boundary.
