export const MOCK_COMPONENT_CODE = `import React, { useState } from "react";
import { Card, Stepper, ProgressBar, ChatBubble, TextInput, Button } from "@auragen/ui";

export default function SimplifiedWizard({ onSubmit }) {
  const steps = ["About you", "Your income"];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ fullName: "", annualIncome: "" });

  const update = (key) => (event) => setValues({ ...values, [key]: event.target.value });
  const isLast = step === steps.length - 1;

  return (
    <Card title="Let's finish this together">
      <Stepper steps={steps} current={step} />
      <ProgressBar value={((step + 1) / steps.length) * 100} label="Progress" />
      {step === 0 ? (
        <div className="space-y-4">
          <ChatBubble from="assistant">First, what name should we put on the application?</ChatBubble>
          <TextInput id="fullName" label="Full name" value={values.fullName} onChange={update("fullName")} />
        </div>
      ) : (
        <div className="space-y-4">
          <ChatBubble from="assistant">Thanks! Roughly how much do you earn in a year?</ChatBubble>
          <TextInput
            id="annualIncome"
            label="Annual income"
            type="number"
            value={values.annualIncome}
            onChange={update("annualIncome")}
            hint="Before tax"
          />
        </div>
      )}
      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <Button onClick={() => (isLast ? onSubmit?.(values) : setStep(step + 1))}>{isLast ? "Submit" : "Continue"}</Button>
      </div>
    </Card>
  );
}
`;

export const MOCK_MODEL_REPLY = "Here is the simplified wizard.\n\n```jsx\n" + MOCK_COMPONENT_CODE + "```\n";
