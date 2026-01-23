import { BaseCLIAgent } from "./base-cli-agent"

/**
 * Claude Code + Sisyphus plugin
 * Uses the claude CLI with "ultrawork" keyword to activate oh-my-claude-sisyphus plugin.
 */
export class ClaudeCodeSisyphusAgent extends BaseCLIAgent {
  readonly name = "Claude Code + Sisyphus"
  protected readonly command = "claude"

  protected buildArgs(prompt: string): string[] {
    // Prefix with "ultrawork: " to activate sisyphus plugin
    const activatedPrompt = `ultrawork: ${prompt}`
    return [
      "--dangerously-skip-permissions",
      "-p",
      activatedPrompt,
    ]
  }
}
