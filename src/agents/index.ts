export { BaseCLIAgent } from "./base-cli-agent"
export { ClaudeCodeAgent } from "./claude-code"
export { ClaudeCodeSisyphusAgent } from "./claude-code-sisyphus"
export { ClaudeCodeOMCAgent } from "./claude-code-omc"
export { OpenCodeAgent } from "./opencode"
export { OpenCodeOhMyOpenCodeAgent } from "./opencode-ohmyopencode"
export { OpenCodeSisyphusAgent } from "./opencode-sisyphus"

import { agentRegistry } from "../agent"
import { ClaudeCodeAgent } from "./claude-code"
import { ClaudeCodeSisyphusAgent } from "./claude-code-sisyphus"
import { ClaudeCodeOMCAgent } from "./claude-code-omc"
import { OpenCodeAgent } from "./opencode"
import { OpenCodeOhMyOpenCodeAgent } from "./opencode-ohmyopencode"
import { OpenCodeSisyphusAgent } from "./opencode-sisyphus"

// Register all agents with the registry
agentRegistry.register("claude-naive", () => new ClaudeCodeAgent())
agentRegistry.register("claude-sisyphus", () => new ClaudeCodeSisyphusAgent())
agentRegistry.register("claude-omc", () => new ClaudeCodeOMCAgent())
agentRegistry.register("opencode-naive", () => new OpenCodeAgent())
agentRegistry.register("opencode-ohmyopencode", () => new OpenCodeOhMyOpenCodeAgent())
agentRegistry.register("opencode-sisyphus", () => new OpenCodeSisyphusAgent())

// Convenience map for accessing agents by key
export const agents = {
  "claude-naive": ClaudeCodeAgent,
  "claude-sisyphus": ClaudeCodeSisyphusAgent,
  "claude-omc": ClaudeCodeOMCAgent,
  "opencode-naive": OpenCodeAgent,
  "opencode-ohmyopencode": OpenCodeOhMyOpenCodeAgent,
  "opencode-sisyphus": OpenCodeSisyphusAgent,
} as const

export type AgentKey = keyof typeof agents
