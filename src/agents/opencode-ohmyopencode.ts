import { BaseCLIAgent } from "./base-cli-agent"

/**
 * OpenCode + Oh-My-OpenCode plugin
 * Uses the opencode CLI with "ultrawork" keyword to activate oh-my-opencode plugin.
 */
export class OpenCodeOhMyOpenCodeAgent extends BaseCLIAgent {
  readonly name = "OmO"
  protected readonly command = "opencode"

  protected buildArgs(prompt: string): string[] {
    // Prefix with "ultrawork: " to activate oh-my-opencode plugin
    const activatedPrompt = `ultrawork: ${prompt}`
    return ["run", activatedPrompt]
  }
}
