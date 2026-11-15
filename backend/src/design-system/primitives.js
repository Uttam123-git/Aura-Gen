/**
 * AuraGen Design System — Primitive Component Specifications
 *
 * These are component contracts for the AI prompt system.
 * They describe supported React JSX components; they do not
 * implement or render the components themselves.
 *
 * Each specification includes:
 * - Component name and purpose
 * - Supported props and defaults
 * - Accessibility requirements
 * - Example JSX
 */

const defineComponent = (definition) => {
  return Object.freeze({
    ...definition,
    props: Object.freeze(definition.props),
    accessibility: Object.freeze([...definition.accessibility]),
  });
};

export const Button = defineComponent({
  name: "Button",
  category: "primitive",

  description:
    "Interactive button for actions, submissions, and navigation triggers.",

  props: {
    variant: {
      type: "string",
      values: ["primary", "secondary", "danger"],
      default: "primary",
    },
    size: {
      type: "string",
      values: ["sm", "md", "lg"],
      default: "md",
    },
    type: {
      type: "string",
      values: ["button", "submit", "reset"],
      default: "button",
    },
    disabled: {
      type: "boolean",
      default: false,
    },
    onClick: {
      type: "function",
      optional: true,
    },
    children: {
      type: "ReactNode",
      required: true,
    },
  },

  accessibility: [
    "Use a native button element.",
    "Provide meaningful visible button text.",
    "Use type='button' unless form submission is intended.",
    "Preserve keyboard activation using Enter and Space.",
    "Use the disabled attribute when interaction is unavailable.",
    "Maintain a visible keyboard focus indicator.",
  ],

  example: `<Button variant="primary" size="md" type="submit">
  Continue
</Button>`,
});

export const Label = defineComponent({
  name: "Label",
  category: "primitive",

  description:
    "Accessible label that identifies a form control.",

  props: {
    htmlFor: {
      type: "string",
      required: true,
    },
    required: {
      type: "boolean",
      default: false,
    },
    children: {
      type: "ReactNode",
      required: true,
    },
  },

  accessibility: [
    "Associate the label with a matching form control ID.",
    "Use a native label element.",
    "Do not use placeholder text as a substitute for a label.",
    "Indicate required fields visually and programmatically.",
  ],

  example: `<Label htmlFor="email" required>
  Email address
</Label>`,
});

export const TextInput = defineComponent({
  name: "TextInput",
  category: "primitive",

  description:
    "Single-line text input for collecting user information.",

  props: {
    id: {
      type: "string",
      required: true,
    },
    name: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      values: ["text", "email", "password", "tel", "url", "search"],
      default: "text",
    },
    placeholder: {
      type: "string",
      optional: true,
    },
    value: {
      type: "string",
      optional: true,
    },
    onChange: {
      type: "function",
      optional: true,
    },
    required: {
      type: "boolean",
      default: false,
    },
    disabled: {
      type: "boolean",
      default: false,
    },
    error: {
      type: "string",
      optional: true,
    },
  },

  accessibility: [
    "Provide a unique ID matching the associated Label htmlFor.",
    "Use an appropriate HTML input type.",
    "Expose validation errors using aria-invalid.",
    "Associate error text using aria-describedby.",
    "Preserve keyboard navigation and visible focus styles.",
    "Never rely only on placeholder text to identify the field.",
  ],

  example: `<Label htmlFor="email" required>
  Email address
</Label>
<TextInput
  id="email"
  name="email"
  type="email"
  placeholder="you@example.com"
  required
/>`,
});

export const primitiveComponents = Object.freeze({
  Button,
  Label,
  TextInput,
});

export default primitiveComponents;
