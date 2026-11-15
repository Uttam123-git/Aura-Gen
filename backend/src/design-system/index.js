/**
 * AuraGen Design System Registry
 *
 * Single source of truth for AI-supported UI components.
 */

import designTokens from "./tokens.js";
import { primitiveComponents } from "./primitives.js";
import { fieldComponents } from "./fields.js";
import { wizardComponents } from "./wizard.js";

export const IMPORT_SOURCE = "@auragen/ui";

const componentGroups = {
  ...primitiveComponents,
  ...fieldComponents,
  ...wizardComponents,
};

const entries = Object.entries(componentGroups);

const names = entries.map(([name]) => name);

if (new Set(names).size !== names.length) {
  throw new Error("Duplicate component names detected");
}

for (const [name, component] of entries) {
  if (!component || component.name !== name) {
    throw new Error(`Invalid component definition: ${name}`);
  }

  if (!component.props || typeof component.props !== "object") {
    throw new Error(`Missing props specification: ${name}`);
  }

  if (!Array.isArray(component.accessibility)) {
    throw new Error(`Missing accessibility specification: ${name}`);
  }
}

export const componentLibrary = Object.freeze(
  entries.map(([, component]) => component)
);

const componentMap = new Map(entries);

export function listComponentNames() {
  return [...componentMap.keys()];
}

export function getComponent(name) {
  return componentMap.get(name) ?? null;
}

export function renderLibraryForPrompt() {
  return componentLibrary
    .map((component) => {
      const props = Object.entries(component.props)
        .map(([name, specification]) => {
          const required = specification.required ? "required" : "optional";
          const type = specification.type ?? "unknown";

          const values = specification.values
            ? `; allowed: ${specification.values.join(", ")}`
            : "";

          return `  - ${name}: ${type} (${required}${values})`;
        })
        .join("\n");

      const accessibility = component.accessibility
        .map((rule) => `  - ${rule}`)
        .join("\n");

      const constraints = (component.constraints ?? [])
        .map((rule) => `  - ${rule}`)
        .join("\n");

      return [
        `Component: ${component.name}`,
        `Category: ${component.category ?? "general"}`,
        `Description: ${component.description}`,
        "Props:",
        props,
        "Accessibility:",
        accessibility,
        ...(constraints ? ["Constraints:", constraints] : []),
        "Example:",
        component.example,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export function getDesignSystemManifest() {
  return {
    version: "1.0.0",
    importSource: IMPORT_SOURCE,
    tokens: designTokens,
    components: componentLibrary,
  };
}

export { designTokens };
