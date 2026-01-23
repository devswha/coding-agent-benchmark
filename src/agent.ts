/**
 * Generic Agent Interface
 *
 * Interface for any AI coding agent to implement for benchmarking.
 * This allows testing Claude Code, Cursor, Aider, OpenHands, MAGI, etc.
 */

export interface AgentResponse {
  /** The agent's text response */
  content: string

  /** Token usage (if available) */
  tokensUsed?: number

  /** Execution time in ms */
  durationMs?: number

  /** Files modified by the agent */
  filesModified?: string[]

  /** Any additional metadata */
  metadata?: Record<string, unknown>
}

export interface AgentConfig {
  /** Agent name for identification (optional for execute calls) */
  name?: string

  /** Working directory for the agent */
  workingDir?: string

  /** Timeout in milliseconds */
  timeoutMs?: number

  /** Additional agent-specific configuration */
  options?: Record<string, unknown>
}

/**
 * Agent interface that any coding agent can implement
 */
export interface Agent {
  /** Agent identifier */
  readonly name: string

  /** Initialize the agent */
  initialize?(config?: AgentConfig): Promise<void>

  /** Execute a task/prompt */
  execute(prompt: string, config?: AgentConfig): Promise<AgentResponse>

  /** Check if agent is available/configured */
  isAvailable(): Promise<boolean>

  /** Cleanup resources */
  cleanup?(): Promise<void>
}

/**
 * CLI-based agent executor
 * Wraps command-line tools like claude, cursor, aider, etc.
 */
export interface CLIAgentConfig extends AgentConfig {
  /** CLI command to invoke */
  command: string

  /** Command arguments template */
  argsTemplate?: string[]

  /** Environment variables */
  env?: Record<string, string>
}

/**
 * Factory function type for creating agents
 */
export type AgentFactory = (config: AgentConfig) => Agent

/**
 * Registry of available agents
 */
export class AgentRegistry {
  private agents: Map<string, AgentFactory> = new Map()

  register(name: string, factory: AgentFactory): void {
    this.agents.set(name, factory)
  }

  get(name: string): AgentFactory | undefined {
    return this.agents.get(name)
  }

  list(): string[] {
    return Array.from(this.agents.keys())
  }

  /**
   * Create and initialize an agent.
   * Errors during initialization are caught and logged (fixes #5).
   */
  async createAgent(name: string, config?: AgentConfig): Promise<Agent | null> {
    const factory = this.agents.get(name)
    if (!factory) return null

    const agent = factory({ name, ...config })
    if (agent.initialize) {
      try {
        await agent.initialize(config)
      } catch (error) {
        console.error(`[AgentRegistry] Failed to initialize agent "${name}":`, error)
        return null
      }
    }
    return agent
  }
}

/** Global agent registry */
export const agentRegistry = new AgentRegistry()
