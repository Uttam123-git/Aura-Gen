/** AuraGen AST-based JSX contract diagnostics. Static analysis, not a sandbox. */
import { parse } from '@babel/parser';
import { getComponent, listComponentNames } from '../design-system/index.js';

const BUILTIN = new Set(['Fragment', 'Suspense', 'StrictMode']);
const PROHIBITED_GLOBALS = new Set(['eval', 'Function']);
const PROHIBITED_MODULES = new Set(['child_process', 'node:child_process', 'fs', 'node:fs', 'vm', 'node:vm']);
const VALID_NAME = /^[A-Z][A-Za-z0-9]*$/;
const diag = (code, message, node) => ({ code, message, ...(node?.loc ? { line: node.loc.start.line, column: node.loc.start.column + 1 } : {}) });

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visitor(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'extra' || key === 'tokens' || key === 'comments') continue;
    if (Array.isArray(value)) value.forEach(item => walk(item, visitor));
    else if (value && typeof value === 'object') walk(value, visitor);
  }
}

function staticValue(attribute) {
  if (!attribute || attribute.type !== 'JSXAttribute') return { known: false };
  if (attribute.value === null) return { known: true, value: true };
  if (attribute.value.type === 'StringLiteral') return { known: true, value: attribute.value.value };
  if (attribute.value.type !== 'JSXExpressionContainer') return { known: false };
  const expr = attribute.value.expression;
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral'].includes(expr.type)) return { known: true, value: expr.value };
  if (expr.type === 'UnaryExpression' && expr.operator === '-' && expr.argument.type === 'NumericLiteral') return { known: true, value: -expr.argument.value };
  return { known: false };
}

function jsxName(node) {
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXMemberExpression') return `${jsxName(node.object)}.${jsxName(node.property)}`;
  return '';
}

export function validateJSX(code, { allowedComponents } = {}) {
  if (typeof code !== 'string' || !code.trim()) return { valid: false, diagnostics: [diag('INVALID_CODE', 'Nonempty JavaScript/JSX source is required')] };
  if (code.length > 100000) return { valid: false, diagnostics: [diag('CODE_TOO_LONG', 'Source exceeds 100000 characters')] };
  let ast;
  try { ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] }); }
  catch (error) { return { valid: false, diagnostics: [diag('JSX_SYNTAX', error.message, error.loc ? { loc: { start: error.loc } } : undefined)] }; }
  const diagnostics = [];
  const supported = new Set(listComponentNames());
  const allowed = new Set(allowedComponents ?? [...supported]);
  const imports = new Map();
  const declared = new Set();
  let hasDefaultExport = false;
  walk(ast.program, node => {
    if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name);
    if (node.type === 'ClassDeclaration' && node.id) declared.add(node.id.name);
    if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier') declared.add(node.id.name);
    if (node.type === 'ExportDefaultDeclaration') hasDefaultExport = true;
    if (node.type === 'ImportDeclaration') {
      const source = node.source.value;
      if (PROHIBITED_MODULES.has(source)) diagnostics.push(diag('FORBIDDEN_MODULE', `Import from ${source} is prohibited`, node));
      for (const spec of node.specifiers) {
        const local = spec.local.name;
        if (source === '@auragen/ui') {
          if (spec.type !== 'ImportSpecifier') diagnostics.push(diag('UNSUPPORTED_IMPORT_STYLE', 'Use named imports from @auragen/ui', spec));
          else {
            const imported = spec.imported.name ?? spec.imported.value;
            imports.set(local, imported);
            if (!supported.has(imported) || !allowed.has(imported)) diagnostics.push(diag('UNSUPPORTED_COMPONENT', `Component not allowed: ${imported}`, spec));
          }
        } else if (source !== 'react' && source !== 'react/jsx-runtime') {
          diagnostics.push(diag('UNAPPROVED_IMPORT', `External import not approved: ${source}`, node));
        }
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && PROHIBITED_GLOBALS.has(node.callee.name)) diagnostics.push(diag('DYNAMIC_EXECUTION', `${node.callee.name} is prohibited`, node));
    if (node.type === 'ImportExpression' || (node.type === 'CallExpression' && node.callee.type === 'Import')) diagnostics.push(diag('DYNAMIC_IMPORT', 'Dynamic import is prohibited', node));
    if (node.type === 'JSXAttribute' && node.name?.name === 'dangerouslySetInnerHTML') diagnostics.push(diag('DANGEROUS_HTML', 'dangerouslySetInnerHTML is prohibited', node));
    if (node.type !== 'JSXOpeningElement') return;
    const name = jsxName(node.name);
    if (!VALID_NAME.test(name)) return;
    if (BUILTIN.has(name)) return;
    const imported = imports.get(name);
    if (!imported) {
      if (!declared.has(name)) diagnostics.push(diag('UNRESOLVED_COMPONENT', `JSX component ${name} is not declared or imported`, node));
      return;
    }
    const contract = getComponent(imported);
    if (!contract || !allowed.has(imported)) return;
    const attrs = new Map();
    let spread = false;
    for (const attr of node.attributes) {
      if (attr.type === 'JSXSpreadAttribute') { spread = true; diagnostics.push(diag('UNVERIFIABLE_SPREAD', `Cannot verify spread props on ${imported}`, attr)); continue; }
      const key = attr.name?.name;
      if (typeof key !== 'string') continue;
      if (attrs.has(key)) diagnostics.push(diag('DUPLICATE_PROP', `Duplicate ${imported}.${key}`, attr));
      attrs.set(key, attr);
      if (!(key in contract.props) && key !== 'key' && key !== 'ref') diagnostics.push(diag('UNKNOWN_PROP', `${imported} does not document prop ${key}`, attr));
    }
    if (!spread) for (const [prop, spec] of Object.entries(contract.props)) {
      if (spec.required && prop !== 'children' && !attrs.has(prop)) diagnostics.push(diag('MISSING_REQUIRED_PROP', `${imported}.${prop} is required`, node));
    }
    for (const [prop, attr] of attrs) {
      const spec = contract.props[prop];
      if (!spec) continue;
      const value = staticValue(attr);
      if (!value.known) continue;
      if (spec.values && !spec.values.includes(value.value)) diagnostics.push(diag('INVALID_ENUM', `${imported}.${prop}: unsupported value ${JSON.stringify(value.value)}`, attr));
      if (spec.type === 'number' && typeof value.value !== 'number') diagnostics.push(diag('INVALID_PROP_TYPE', `${imported}.${prop} must be a number`, attr));
      if (spec.type === 'boolean' && typeof value.value !== 'boolean') diagnostics.push(diag('INVALID_PROP_TYPE', `${imported}.${prop} must be a boolean`, attr));
    }
    if (imported === 'ProgressBar') {
      const value = staticValue(attrs.get('value'));
      const max = attrs.has('max') ? staticValue(attrs.get('max')) : { known: true, value: 100 };
      if (max.known && (typeof max.value !== 'number' || !Number.isFinite(max.value) || max.value <= 0)) diagnostics.push(diag('COMPONENT_CONSTRAINT', 'ProgressBar.max must be a positive finite number', node));
      if (value.known && typeof value.value === 'number' && (!Number.isFinite(value.value) || value.value < 0 || (max.known && typeof max.value === 'number' && value.value > max.value))) diagnostics.push(diag('COMPONENT_CONSTRAINT', `ProgressBar.value ${value.value} must be between 0 and max ${max.value}`, node));
    }
    if (imported === 'Stepper') {
      const step = staticValue(attrs.get('currentStep'));
      if (step.known && (!Number.isInteger(step.value) || step.value < 0)) diagnostics.push(diag('COMPONENT_CONSTRAINT', 'Stepper.currentStep must be a nonnegative integer', node));
    }
    if (imported === 'TextInput' && !attrs.has('label')) {
      // Our registry documents a separate Label, while the reference frontend expects label.
      // Flag the integration uncertainty rather than pretending a standalone Label is enough.
      diagnostics.push(diag('FRONTEND_COMPATIBILITY', 'Reference frontend TextInput expects a label prop; reconcile the shared component API', node));
    }
  });
  if (!hasDefaultExport) diagnostics.push(diag('MISSING_DEFAULT_EXPORT', 'Generated module must have a default export'));
  return { valid: diagnostics.length === 0, diagnostics };
}
