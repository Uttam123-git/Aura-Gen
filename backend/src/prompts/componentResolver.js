import { getComponent, listComponentNames } from "../design-system/index.js";

const dependencies = Object.freeze({
  TextInput: ["Label"],
  SelectField: ["Label"],
  Stepper: ["Button"],
});

export function resolveComponents(recommended = []) {
  if (!Array.isArray(recommended)) throw new TypeError("recommended must be an array");
  const supported = new Set(listComponentNames());
  const resolved = new Set();
  function visit(name) {
    if (!supported.has(name) || !getComponent(name)) throw new RangeError(`Unsupported component: ${name}`);
    if (resolved.has(name)) return;
    resolved.add(name);
    for (const dependency of dependencies[name] ?? []) visit(dependency);
  }
  for (const name of recommended) visit(name);
  return [...resolved];
}
