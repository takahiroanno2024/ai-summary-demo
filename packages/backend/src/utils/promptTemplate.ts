import fs from 'fs';
import path from 'path';

export class PromptTemplate {
  private static templateCache: Map<string, string> = new Map();
  private static templateDir = path.resolve(__dirname, '../../src/config/prompt-templates');

  static getDefaultPrompt(templateName: string): string {
    const cachedTemplate = this.templateCache.get(templateName);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    const templatePath = path.join(this.templateDir, `${templateName}.txt`);
    const template = fs.readFileSync(templatePath, 'utf-8');
    this.templateCache.set(templateName, template);
    return template;
  }

  private static replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;

    // Handle context_block special case
    if ('context' in variables) {
      const contextBlock = variables.context ? `背景情報:
"""
${variables.context}
"""

` : '';
      result = result.replace('$context_block', contextBlock);
    }

    // Replace all other variables
    for (const [key, value] of Object.entries(variables)) {
      if (key === 'context') continue; // Skip context as it's handled above
      const regex = new RegExp(`\\$${key}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  static generate(
    templateNameOrCustomPrompt: string,
    variables: Record<string, string>,
    isCustomPrompt: boolean = false
  ): string {
    const template = isCustomPrompt ? templateNameOrCustomPrompt : this.getDefaultPrompt(templateNameOrCustomPrompt);
    return this.replaceVariables(template, variables);
  }
}