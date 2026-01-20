/**
 * Agent Configuration System
 *
 * Manages per-agent configurations for benchmark execution.
 */

import { readFile } from "fs/promises"
import { join } from "path"
import { AgentType } from "../types"

/**
 * Configuration for a specific agent
 */
export interface AgentConfig {
  /** Agent type identifier */
  agentType: AgentType

  /** Whether this agent is enabled for benchmarking */
  enabled: boolean

  /** Human-readable display name */
  displayName: string

  /** Description of the agent */
  description: string

  /** Path to claude CLI (for CLI-based agents) */
  cliPath?: string

  /** Path to CLAUDE.md content file (for Sisyphus) */
  claudeMdPath?: string

  /** CLAUDE.md content to inject (for Sisyphus) */
  claudeMdContent?: string

  /** Model settings */
  modelSettings?: {
    model: string
    maxTokens: number
    temperature: number
  }

  /** Additional CLI arguments */
  additionalCliArgs?: string[]

  /** Environment variables to set */
  env?: Record<string, string>

  /** Execution timeout in milliseconds */
  defaultTimeoutMs?: number
}

/**
 * Default configurations for each agent type
 */
export const DEFAULT_AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  [AgentType.MAGI]: {
    agentType: AgentType.MAGI,
    enabled: true,
    displayName: "MAGI",
    description: "Trinity Protocol with 3 orchestrators (Melchior, Balthasar, Caspar)",
    modelSettings: {
      model: "claude-sonnet-4-20250514",
      maxTokens: 8192,
      temperature: 0.7,
    },
    defaultTimeoutMs: 180000, // 3 minutes
  },

  [AgentType.ClaudeCode]: {
    agentType: AgentType.ClaudeCode,
    enabled: true,
    displayName: "Claude Code",
    description: "Baseline single-agent Claude Code capabilities",
    cliPath: "claude",
    modelSettings: {
      model: "sonnet",
      maxTokens: 8192,
      temperature: 0.7,
    },
    additionalCliArgs: ["--dangerously-skip-permissions"],
    defaultTimeoutMs: 120000, // 2 minutes
  },

  [AgentType.ClaudeCodeSisyphus]: {
    agentType: AgentType.ClaudeCodeSisyphus,
    enabled: true,
    displayName: "Claude Code + Sisyphus",
    description: "Claude Code with Sisyphus multi-agent orchestration",
    cliPath: "claude",
    claudeMdPath: join(process.cwd(), "benchmark", "configs", "sisyphus-claude-md.txt"),
    modelSettings: {
      model: "sonnet",
      maxTokens: 8192,
      temperature: 0.7,
    },
    additionalCliArgs: ["--dangerously-skip-permissions"],
    defaultTimeoutMs: 300000, // 5 minutes (longer for multi-step tasks)
  },
}

/**
 * Load CLAUDE.md content for Sisyphus configuration
 */
export async function loadSisyphusClaudeMd(): Promise<string> {
  const config = DEFAULT_AGENT_CONFIGS[AgentType.ClaudeCodeSisyphus]

  if (config.claudeMdContent) {
    return config.claudeMdContent
  }

  if (config.claudeMdPath) {
    try {
      return await readFile(config.claudeMdPath, "utf-8")
    } catch (error) {
      console.warn(
        `[AgentConfig] Failed to load Sisyphus CLAUDE.md from ${config.claudeMdPath}:`,
        error
      )
    }
  }

  // Return inline fallback
  return `# Sisyphus Mode (Benchmark)

You are operating with Sisyphus plugin for benchmarking.

## Core Behaviors
1. **TODO TRACKING**: Create todos before non-trivial tasks
2. **PERSISTENCE**: Continue until task is complete
3. **VERIFICATION**: Verify work before declaring completion

## Task Completion
- Break tasks into steps
- Mark progress as you work
- Verify completion criteria are met
`
}

/**
 * Get configuration for a specific agent type
 */
export function getAgentConfig(agentType: AgentType): AgentConfig {
  return DEFAULT_AGENT_CONFIGS[agentType]
}

/**
 * Get all enabled agent configurations
 */
export function getEnabledAgentConfigs(): AgentConfig[] {
  return Object.values(DEFAULT_AGENT_CONFIGS).filter((config) => config.enabled)
}

/**
 * Check if an agent type is enabled
 */
export function isAgentEnabled(agentType: AgentType): boolean {
  return DEFAULT_AGENT_CONFIGS[agentType]?.enabled ?? false
}

/**
 * Get agent display names for UI
 */
export function getAgentDisplayNames(): Record<AgentType, string> {
  const names: Record<AgentType, string> = {} as any
  for (const [type, config] of Object.entries(DEFAULT_AGENT_CONFIGS)) {
    names[type as AgentType] = config.displayName
  }
  return names
}
