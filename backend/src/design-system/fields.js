/**
 * AuraGen Design System — Form and Feedback Components
 *
 * Declarative contracts for AI-generated React interfaces.
 * These specifications describe the supported component API.
 * Actual React implementations must satisfy these contracts.
 */

const defineComponent = (definition) =>
  Object.freeze({
    ...definition,
    props: Object.freeze(definition.props),
    accessibility: Object.freeze([...definition.accessibility]),
  });

export const SelectField = defineComponent({
  name: "SelectField",
  category: "form",
  description: "Accessible dropdown for selecting one option.",

  props: {
    id: { type: "string", required: true },
    name: { type: "string", required: true },
    options: { type: "array", required: true },
    value: { type: "string", optional: true },
    onChange: { type: "function", optional: true },
    required: { type: "boolean", default: false },
    disabled: { type: "boolean", default: false },
    error: { type: "string", optional: true },
  },

  accessibility: [
    "Associate the field with a visible Label.",
    "Each option must have a unique value and readable label.",
    "Support keyboard navigation using native select behavior.",
    "Expose invalid state using aria-invalid.",
    "Associate validation messages using aria-describedby.",
  ],

  example: `<Label htmlFor="country">Country</Label>
<SelectField
  id="country"
  name="country"
  options={[
    { value: "in", label: "India" },
    { value: "us", label: "United States" }
  ]}
/>`,
});

export const Checkbox = defineComponent({
  name: "Checkbox",
  category: "form",
  description: "Boolean input for consent and independent selections.",

  props: {
    id: { type: "string", required: true },
    name: { type: "string", required: true },
    checked: { type: "boolean", default: false },
    onChange: { type: "function", optional: true },
    disabled: { type: "boolean", default: false },
    required: { type: "boolean", default: false },
    children: { type: "ReactNode", required: true },
  },

  accessibility: [
    "Use a native checkbox input.",
    "Provide a visible associated label.",
    "Support keyboard toggling using Space.",
    "Expose required state programmatically.",
    "Do not use a checkbox for mutually exclusive choices.",
  ],

  example: `<Checkbox id="terms" name="terms" required>
  I agree to the terms and conditions
</Checkbox>`,
});

export const Card = defineComponent({
  name: "Card",
  category: "layout",
  description: "Container for grouping related content.",

  props: {
    title: { type: "string", optional: true },
    variant: {
      type: "string",
      values: ["default", "outlined", "elevated"],
      default: "default",
    },
    children: { type: "ReactNode", required: true },
  },

  accessibility: [
    "Use semantic section or article markup when appropriate.",
    "Maintain logical heading hierarchy.",
    "Do not make noninteractive cards keyboard-focusable.",
    "Ensure content remains readable on small screens.",
  ],

  example: `<Card title="Account details" variant="outlined">
  <p>Manage your profile information.</p>
</Card>`,
});

export const Alert = defineComponent({
  name: "Alert",
  category: "feedback",
  description: "Communicates important status or validation feedback.",

  props: {
    variant: {
      type: "string",
      values: ["info", "success", "warning", "error"],
      default: "info",
    },
    title: { type: "string", optional: true },
    children: { type: "ReactNode", required: true },
  },

  accessibility: [
    "Use role='alert' for urgent messages requiring immediate announcement.",
    "Use role='status' for nonurgent informational updates.",
    "Do not communicate meaning using color alone.",
    "Provide readable text describing the issue or result.",
  ],

  example: `<Alert variant="success" title="Saved">
  Your changes were saved successfully.
</Alert>`,
});

export const fieldComponents = Object.freeze({
  SelectField,
  Checkbox,
  Card,
  Alert,
});

export default fieldComponents;
