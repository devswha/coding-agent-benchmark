import { BaseCLIAgent } from "./base-cli-agent"

/**
 * Claude Code + Oh-My-ClaudeCode (OMC) plugin
 * Uses the claude CLI with "ultrawork" keyword to activate oh-my-claudecode plugin.
 * Repository: https://github.com/Yeachan-Heo/oh-my-claudecode
 */
export class ClaudeCodeOMCAgent extends BaseCLIAgent {
  readonly name = "OmC"
  protected readonly command = "claude"

  protected buildArgs(prompt: string): string[] {
    // Prefix with "ultrawork: " to activate oh-my-claudecode plugin
    const activatedPrompt = `ultrawork: ${prompt}`
    return [
      "--dangerously-skip-permissions",
      "-p",
      activatedPrompt,
    ]
  }
}
