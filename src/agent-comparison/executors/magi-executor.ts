/**
 * MAGI Executor
 *
 * Wraps the existing MagiSystem to implement the AgentExecutor interface,
 * enabling MAGI to be benchmarked alongside other agents.
 */

import type { BenchmarkCase } from "../../types"
import { AgentType } from "../types"
import type {
  AgentExecutor,
  ExecutionOptions,
  ExecutionResult,
  ExecutorInfo,
  FileChange,
} from "./types"
import { estimateTokens, createFailedResult, DEFAULT_EXECUTION_OPTIONS } from "./types"
import type { MagiSystemInterface } from "../../magi-integration"
import type { WorkspaceManager, Workspace, WorkspaceState } from "../workspace/types"

// Type alias for backwards compatibility
type MagiSystem = MagiSystemInterface

/**
 * Configuration for MAGI executor
 */
export interface MAGIExecutorConfig {
  /** Function to create a MAGI system instance */
  createMagiSystem: (workingDir: string) => Promise<MagiSystem>

  /** Workspace manager for file tracking */
  workspaceManager?: WorkspaceManager

  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * MAGI Executor - benchmarks the MAGI system using the AgentExecutor interface
 */
export class MAGIExecutor implements AgentExecutor {
  readonly agentType = AgentType.MAGI
  readonly displayName = "MAGI"

  private config: MAGIExecutorConfig
  private currentMagi: MagiSystem | null = null

  constructor(config: MAGIExecutorConfig) {
    this.config = config
  }

  async execute(task: BenchmarkCase, options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now()
    const mergedOptions = { ...DEFAULT_EXECUTION_OPTIONS, ...options }

    let workspace: Workspace | undefined
    let initialState: WorkspaceState | undefined

    try {
      // Create workspace snapshot if workspace manager is available
      if (this.config.workspaceManager) {
        workspace = await this.config.workspaceManager.createWorkspace()
        initialState = await this.config.workspaceManager.snapshotState(workspace)
      }

      // Create MAGI system instance
      const workingDir = workspace?.path || options.workingDir
      this.currentMagi = await this.config.createMagiSystem(workingDir)

      // Build the prompt from the benchmark case
      const prompt = this.buildPrompt(task)

      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => this.currentMagi!.processMessage(prompt),
        mergedOptions.timeoutMs,
        mergedOptions.abortSignal
      )

      const durationMs = Date.now() - startTime

      // Calculate file changes if workspace manager is available
      let filesChanged: FileChange[] = []
      if (this.config.workspaceManager && workspace && initialState) {
        const diff = await this.config.workspaceManager.diffState(workspace, initialState)
        filesChanged = diff
      }

      // Estimate tokens from output
      const tokensUsed = result.tokensUsed || estimateTokens(result.content)

      return {
        success: true,
        output: result.content,
        durationMs,
        tokensUsed,
        filesChanged,
        metadata: {
          deliberation: result.deliberation,
          hasDeliberation: !!result.deliberation,
          decision: result.deliberation?.arbiterDecision,
        },
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      if (this.config.verbose) {
        console.error(`[MAGIExecutor] Error executing task ${task.id}:`, error)
      }

      return {
        success: false,
        output: "",
        durationMs,
        tokensUsed: 0,
        filesChanged: [],
        error: errorMessage,
        errorStack,
      }
    } finally {
      // Cleanup MAGI session
      if (this.currentMagi) {
        this.currentMagi.cleanup()
        this.currentMagi = null
      }

      // Cleanup workspace if it was created
      if (this.config.workspaceManager && workspace) {
        await this.config.workspaceManager.cleanup(workspace)
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    // MAGI is always available if we have a factory function
    return !!this.config.createMagiSystem
  }

  async cleanup(): Promise<void> {
    if (this.currentMagi) {
      this.currentMagi.cleanup()
      this.currentMagi = null
    }
  }

  getInfo(): ExecutorInfo {
    return {
      agentType: this.agentType,
      displayName: this.displayName,
      version: "1.0.0",
      available: !!this.config.createMagiSystem,
      config: {
        hasWorkspaceManager: !!this.config.workspaceManager,
        verbose: this.config.verbose,
      },
    }
  }

  /**
   * Build prompt from benchmark case
   */
  private buildPrompt(task: BenchmarkCase): string {
    let prompt = task.prompt

    if (task.context) {
      prompt = `Context:\n${task.context}\n\nTask:\n${prompt}`
    }

    return prompt
  }

  /**
   * Execute a function with timeout and optional abort signal
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Check if already aborted
      if (abortSignal?.aborted) {
        reject(new Error("Execution cancelled"))
        return
      }

      // Setup abort listener
      const abortHandler = () => {
        reject(new Error("Execution cancelled"))
      }
      abortSignal?.addEventListener("abort", abortHandler, { once: true })

      // Setup timeout
      const timeoutId = setTimeout(() => {
        abortSignal?.removeEventListener("abort", abortHandler)
        reject(new Error(`Execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      // Execute the function
      fn()
        .then((result) => {
          clearTimeout(timeoutId)
          abortSignal?.removeEventListener("abort", abortHandler)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          abortSignal?.removeEventListener("abort", abortHandler)
          reject(error)
        })
    })
  }
}

/**
 * Create a MAGI executor with the given configuration
 */
export function createMAGIExecutor(config: MAGIExecutorConfig): MAGIExecutor {
  return new MAGIExecutor(config)
}
