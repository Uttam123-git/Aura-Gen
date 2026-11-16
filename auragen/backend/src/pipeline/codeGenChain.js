import { RunnableLambda } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildSystemPrompt } from "../prompts/systemPrompt.js";
import { buildFewShotMessages, buildRepairPrompt, buildUserPrompt } from "../prompts/fewShot.js";

export function createCodeGenChain(model) {
  const system = new SystemMessage(buildSystemPrompt());

  const toMessages = RunnableLambda.from(({ context, previousCode, errors }) => {
    const messages = [system, ...buildFewShotMessages(), new HumanMessage(buildUserPrompt(context))];
    if (previousCode && errors?.length) {
      messages.push(new AIMessage("```jsx\n" + previousCode + "\n```"), new HumanMessage(buildRepairPrompt(errors)));
    }
    return messages;
  });

  return toMessages.pipe(model).pipe(new StringOutputParser());
}
