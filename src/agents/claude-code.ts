import { BaseCLIAgent } from "./base-cli-agent"

/**
 * Claude Code (naive) - Base version without plugins
 * Uses the claude CLI in print mode for non-interactive execution.
 */
export class ClaudeCodeAgent extends BaseCLIAgent {
  readonly name = "Claude Code (naive)"
  protected readonly command = "claude"

  protected buildArgs(prompt: string): string[] {
    return [
      "--dangerously-skip-permissions",
      "-p",
      prompt,
    ]
  }
}
