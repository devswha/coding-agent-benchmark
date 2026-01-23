import { BaseCLIAgent } from "./base-cli-agent"

/**
 * OpenCode + Sisyphus plugin
 * Uses the opencode CLI with "ultrawork" keyword to activate Sisyphus plugin.
 * Repository: https://github.com/devswha/oh-my-ssalsyphus
 */
export class OpenCodeSisyphusAgent extends BaseCLIAgent {
  readonly name = "OpenCode + Sisyphus"
  protected readonly command = "opencode"

  protected buildArgs(prompt: string): string[] {
    // Prefix with "ultrawork: " to activate Sisyphus plugin
    const activatedPrompt = `ultrawork: ${prompt}`
    return ["run", activatedPrompt]
  }
}
