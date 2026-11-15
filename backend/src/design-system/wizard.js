/**
 * AuraGen Design System — Wizard and Conversation Components
 *
 * Declarative contracts for AI-generated React interfaces.
 */

const defineComponent = (definition) =>
  Object.freeze({
    ...definition,
    props: Object.freeze(definition.props),
    accessibility: Object.freeze([...definition.accessibility]),
  });

export const Stepper = defineComponent({
  name: "Stepper",
  category: "navigation",
  description: "Displays progress through a sequence of steps.",

  props: {
    steps: { type: "array", required: true },
    currentStep: { type: "number", required: true },
    orientation: {
      type: "string",
      values: ["horizontal", "vertical"],
      default: "horizontal",
    },
  },

  constraints: [
    "steps must be a nonempty array.",
    "Each step must have a unique id and readable label.",
    "currentStep must be an integer between 0 and steps.length - 1.",
    "The component is informational unless navigation handlers are explicitly supported.",
  ],

  accessibility: [
    "Use an ordered list to represent the sequence.",
    "Expose the current step with aria-current='step'.",
    "Do not rely on color alone to indicate progress.",
    "Support narrow screens without horizontal overflow.",
  ],

  example: `<Stepper
  steps={[
    { id: "account", label: "Account" },
    { id: "profile", label: "Profile" },
    { id: "review", label: "Review" }
  ]}
  currentStep={1}
/>`,
});

export const ProgressBar = defineComponent({
  name: "ProgressBar",
  category: "feedback",
  description: "Displays measurable progress toward completion.",

  props: {
    value: { type: "number", required: true },
    max: { type: "number", default: 100 },
    label: { type: "string", required: true },
    showValue: { type: "boolean", default: true },
  },

  constraints: [
    "value must be a finite number greater than or equal to zero.",
    "max must be a finite number greater than zero.",
    "value must not exceed max.",
  ],

  accessibility: [
    "Use role='progressbar' or a native progress element.",
    "Expose aria-valuemin, aria-valuemax, and aria-valuenow.",
    "Provide an accessible label describing the operation.",
    "Do not communicate progress using color alone.",
  ],

  example: `<ProgressBar
  value={60}
  max={100}
  label="Profile completion"
/>`,
});

export const ChatBubble = defineComponent({
  name: "ChatBubble",
  category: "conversation",
  description: "Displays a single message in a conversational UI.",

  props: {
    role: {
      type: "string",
      values: ["user", "assistant", "system"],
      required: true,
    },
    children: { type: "ReactNode", required: true },
    timestamp: { type: "string", optional: true },
    status: {
      type: "string",
      values: ["sending", "sent", "error"],
      optional: true,
    },
  },

  constraints: [
    "Message content must be rendered as text or safe React elements.",
    "Never inject untrusted message content using dangerouslySetInnerHTML.",
    "Timestamps must not be fabricated when absent.",
  ],

  accessibility: [
    "Identify the message sender using readable text.",
    "Preserve logical reading order.",
    "Ensure sufficient text contrast.",
    "Avoid announcing the entire conversation repeatedly.",
  ],

  example: `<ChatBubble role="assistant">
  How can I help you today?
</ChatBubble>`,
});

export const wizardComponents = Object.freeze({
  Stepper,
  ProgressBar,
  ChatBubble,
});

export default wizardComponents;
