const FENCED = /```(?:jsx|tsx|javascript|js)?[^\n]*\n([\s\S]*?)```/i;
const UNCLOSED_FENCE = /```(?:jsx|tsx|javascript|js)?[^\n]*\n([\s\S]*)$/i;

export function extractCode(reply) {
  if (typeof reply !== "string" || reply.trim() === "") {
    throw new Error("The model returned an empty reply");
  }
  const match = reply.match(FENCED) ?? reply.match(UNCLOSED_FENCE);
  const code = (match ? match[1] : reply).trim();
  if (code === "") throw new Error("The model reply contained an empty code block");
  return code;
}
