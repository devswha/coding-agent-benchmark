import { BaseCLIAgent } from "./base-cli-agent"

/**
 * OpenCode (naive) - Base version without plugins
 * Uses the opencode CLI in run mode for non-interactive execution.
 */
export class OpenCodeAgent extends BaseCLIAgent {
  readonly name = "OpenCode (naive)"
  protected readonly command = "opencode"

  protected buildArgs(prompt: string): string[] {
    return ["run", prompt]
  }
}
