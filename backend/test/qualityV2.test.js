import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJSX } from '../src/prompts/jsxValidator.js';

const wrap = (body, imports = 'import { ProgressBar } from "@auragen/ui";') => `${imports}\nexport default function Demo(){return (${body});}`;
const codes = result => result.diagnostics.map(item => item.code);

test('accepts valid progress component', () => assert.equal(validateJSX(wrap('<ProgressBar value={60} max={100} label="Loading" />')).valid, true));
test('rejects value exceeding max', () => assert.ok(codes(validateJSX(wrap('<ProgressBar value={150} max={100} label="Loading" />'))).includes('COMPONENT_CONSTRAINT')));
test('rejects malformed JSX', () => assert.ok(codes(validateJSX(wrap('<ProgressBar>'))).includes('JSX_SYNTAX')));
test('rejects unknown prop', () => assert.ok(codes(validateJSX(wrap('<ProgressBar value={20} label="Loading" magic="x" />'))).includes('UNKNOWN_PROP')));
test('rejects missing required prop', () => assert.ok(codes(validateJSX(wrap('<ProgressBar max={100} label="Loading" />'))).includes('MISSING_REQUIRED_PROP')));
test('rejects unsupported import', () => assert.ok(codes(validateJSX(wrap('<Imaginary />', 'import { Imaginary } from "@auragen/ui";'))).includes('UNSUPPORTED_COMPONENT')));
test('rejects unsupported enum', () => assert.ok(codes(validateJSX(wrap('<ChatBubble role="robot">Hi</ChatBubble>', 'import { ChatBubble } from "@auragen/ui";'))).includes('INVALID_ENUM')));
test('rejects dangerous HTML prop', () => assert.ok(codes(validateJSX(wrap('<div dangerouslySetInnerHTML={{__html:"x"}} />'))).includes('DANGEROUS_HTML')));
test('rejects dynamic eval', () => assert.ok(codes(validateJSX('export default function Demo(){eval("x");return null;}')).includes('DYNAMIC_EXECUTION')));
test('rejects unapproved external import', () => assert.ok(codes(validateJSX('import x from "evil-package"; export default function Demo(){return null;}')).includes('UNAPPROVED_IMPORT')));
test('flags reference frontend TextInput label mismatch', () => assert.ok(codes(validateJSX(wrap('<TextInput id="email" />', 'import { TextInput } from "@auragen/ui";'))).includes('FRONTEND_COMPATIBILITY')));
test('rejects JSX spread because prop contract cannot be statically verified', () => assert.ok(codes(validateJSX(wrap('<ProgressBar {...props} />'))).includes('UNVERIFIABLE_SPREAD')));
