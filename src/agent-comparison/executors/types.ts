/**
 * Agent Executor Types
 *
 * Abstract interface for executing different agents (MAGI, Claude Code, Claude Code + Sisyphus)
 * in a uniform way, enabling fair benchmark comparisons.
 */

import type { AgentType } from "../types"
import type { BenchmarkCase } from "../../types"

/**
 * Options for agent execution
 */
export interface ExecutionOptions {
  /** Working directory for the execution */
  workingDir: string

  /** Timeout in milliseconds */
  timeoutMs: number

  /** Enable verbose logging */
  verbose?: boolean

  /** Maximum tokens to use */
  maxTokens?: number

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal

  /** Environment variables to set */
  env?: Record<string, string>
}

/**
 * Test results from running test suite
 */
export interface TestResults {
  /** Number of tests that passed */
  passed: number

  /** Number of tests that failed */
  failed: number

  /** Number of tests that were skipped */
  skipped?: number

  /** Raw test output */
  output?: string
}

/**
 * File change information
 */
export interface FileChange {
  /** Path relative to workspace */
  path: string

  /** Type of change */
  type: "created" | "modified" | "deleted"

  /** Lines added (for created/modified) */
  linesAdded?: number

  /** Lines removed (for modified/deleted) */
  linesRemoved?: number
}

/**
 * Result of an agent execution
 */
export interface ExecutionResult {
  /** Whether the execution completed without errors */
  success: boolean

  /** Raw output from the agent */
  output: string

  /** Execution duration in milliseconds */
  durationMs: number

  /** Estimated tokens used */
  tokensUsed: number

  /** List of files changed during execution */
  filesChanged: FileChange[]

  /** Test results if tests were run */
  testResults?: TestResults

  /** Error message if execution failed */
  error?: string

  /** Error stack trace */
  errorStack?: string

  /** Exit code (for CLI-based executors) */
  exitCode?: number

  /** Whether the execution was cancelled */
  cancelled?: boolean

  /** Agent-specific metadata */
  metadata?: Record<string, unknown>
}

/**
 * Abstract interface for agent executors
 *
 * Implementations:
 * - MAGIExecutor: Wraps existing MAGI system
 * - CLIExecutor: Executes Claude Code via subprocess
 */
export interface AgentExecutor {
  /** Type of agent this executor handles */
  readonly agentType: AgentType

  /** Human-readable name */
  readonly displayName: string

  /**
   * Execute a benchmark task
   *
   * @param task - The benchmark case to execute
   * @param options - Execution options
   * @returns Execution result
   */
  execute(task: BenchmarkCase, options: ExecutionOptions): Promise<ExecutionResult>

  /**
   * Check if the executor is available (dependencies met)
   * @returns true if the executor can be used
   */
  isAvailable(): Promise<boolean>

  /**
   * Clean up any resources used by the executor
   */
  cleanup(): Promise<void>

  /**
   * Get executor configuration info
   */
  getInfo(): ExecutorInfo
}

/**
 * Information about an executor
 */
export interface ExecutorInfo {
  /** Agent type */
  agentType: AgentType

  /** Human-readable name */
  displayName: string

  /** Version string */
  version?: string

  /** Whether the executor is available */
  available: boolean

  /** Why the executor is unavailable (if applicable) */
  unavailableReason?: string

  /** Configuration details */
  config?: Record<string, unknown>
}

/**
 * Configuration for creating executors
 */
export interface ExecutorConfig {
  /** Agent type to create executor for */
  agentType: AgentType

  /** Enable verbose logging */
  verbose?: boolean

  /** Default timeout in milliseconds */
  defaultTimeoutMs?: number

  /** Model to use (for MAGI) */
  model?: string

  /** Path to claude CLI (for CLI executors) */
  cliPath?: string

  /** Path to CLAUDE.md content (for Sisyphus) */
  claudeMdPath?: string

  /** CLAUDE.md content to inject (for Sisyphus) */
  claudeMdContent?: string
}

/**
 * Factory function type for creating executors
 */
export type ExecutorFactory = (config: ExecutorConfig) => Promise<AgentExecutor>

/**
 * Default execution options
 */
export const DEFAULT_EXECUTION_OPTIONS: Partial<ExecutionOptions> = {
  timeoutMs: 120_000, // 2 minutes
  verbose: false,
  maxTokens: 8192,
}

/**
 * Estimate token count from text
 * Rough approximation: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Create an empty execution result for failed/cancelled executions
 */
export function createFailedResult(error: string, durationMs: number = 0): ExecutionResult {
  return {
    success: false,
    output: "",
    durationMs,
    tokensUsed: 0,
    filesChanged: [],
    error,
  }
}

/**
 * Create a cancelled execution result
 */
export function createCancelledResult(durationMs: number): ExecutionResult {
  return {
    success: false,
    output: "",
    durationMs,
    tokensUsed: 0,
    filesChanged: [],
    cancelled: true,
    error: "Execution cancelled",
  }
}
