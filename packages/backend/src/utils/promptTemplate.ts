import fs from "node:fs";
import path from "node:path";

const templateCache: Map<string, string> = new Map();
const templateDir = path.resolve(
  __dirname,
  "../../src/config/prompt-templates",
);

function getDefaultPrompt(templateName: string): string {
  const cachedTemplate = templateCache.get(templateName);
  if (cachedTemplate) {
    return cachedTemplate;
  }

  const templatePath = path.join(templateDir, `${templateName}.txt`);
  const template = fs.readFileSync(templatePath, "utf-8");
  templateCache.set(templateName, template);
  return template;
}

function replaceVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;

  // Handle context_block special case
  if ("context" in variables) {
    const contextBlock = variables.context
      ? `背景情報:
"""
${variables.context}
"""

`
      : "";
    result = result.replace("$context_block", contextBlock);
  }

  // Replace all other variables
  for (const [key, value] of Object.entries(variables)) {
    if (key === "context") continue; // Skip context as it's handled above
    const regex = new RegExp(`\\$${key}`, "g");
    result = result.replace(regex, value);
  }

  return result;
}

export function generate(
  templateNameOrCustomPrompt: string,
  variables: Record<string, string>,
  isCustomPrompt = false,
): string {
  const template = isCustomPrompt
    ? templateNameOrCustomPrompt
    : getDefaultPrompt(templateNameOrCustomPrompt);
  return replaceVariables(template, variables);
}

export const PromptTemplate = {
  generate,
  getDefaultPrompt,
};
