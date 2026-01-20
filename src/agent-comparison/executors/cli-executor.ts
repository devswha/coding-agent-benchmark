/**
 * CLI Executor for Claude Code
 *
 * Executes Claude Code (and Claude Code + Sisyphus) via subprocess,
 * enabling real CLI agent behavior benchmarking.
 */

import { spawn, type ChildProcess } from "child_process"
import { writeFile, mkdir, rm } from "fs/promises"
import { join, dirname } from "path"
import { tmpdir } from "os"
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
import type { WorkspaceManager, Workspace, WorkspaceState } from "../workspace/types"

/**
 * Configuration for CLI executor
 */
export interface CLIExecutorConfig {
  /** Agent type (ClaudeCode or ClaudeCodeSisyphus) */
  agentType: AgentType.ClaudeCode | AgentType.ClaudeCodeSisyphus

  /** Path to claude CLI executable */
  cliPath?: string

  /** Model to use (e.g., 'sonnet', 'opus') */
  model?: string

  /** Maximum tokens for response */
  maxTokens?: number

  /** CLAUDE.md content to inject for Sisyphus mode */
  claudeMdContent?: string

  /** Workspace manager for file tracking */
  workspaceManager?: WorkspaceManager

  /** Enable verbose logging */
  verbose?: boolean

  /** Additional CLI arguments */
  additionalArgs?: string[]
}

/**
 * Default Sisyphus CLAUDE.md content (minimal version for benchmarking)
 */
const DEFAULT_SISYPHUS_CLAUDE_MD = `# Sisyphus Mode (Benchmark)

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

/**
 * CLI Executor - runs Claude Code via subprocess
 */
export class CLIExecutor implements AgentExecutor {
  readonly agentType: AgentType.ClaudeCode | AgentType.ClaudeCodeSisyphus
  readonly displayName: string

  private config: CLIExecutorConfig
  private currentProcess: ChildProcess | null = null
  private tempHomePath: string | null = null

  constructor(config: CLIExecutorConfig) {
    this.config = config
    this.agentType = config.agentType
    this.displayName =
      config.agentType === AgentType.ClaudeCode
        ? "Claude Code"
        : "Claude Code + Sisyphus"
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

      // Setup Sisyphus if needed
      if (this.agentType === AgentType.ClaudeCodeSisyphus) {
        await this.setupSisyphusEnvironment(options.workingDir)
      }

      // Build the prompt
      const prompt = this.buildPrompt(task)

      // Execute Claude CLI
      const result = await this.executeCLI(
        prompt,
        workspace?.path || options.workingDir,
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
      const tokensUsed = estimateTokens(result.output)

      return {
        success: result.exitCode === 0,
        output: result.output,
        durationMs,
        tokensUsed,
        filesChanged,
        exitCode: result.exitCode,
        error: result.exitCode !== 0 ? result.stderr || "Non-zero exit code" : undefined,
        metadata: {
          stderr: result.stderr,
          agentType: this.agentType,
        },
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      if (this.config.verbose) {
        console.error(`[CLIExecutor] Error executing task ${task.id}:`, error)
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
      // Cleanup temp home directory
      if (this.tempHomePath) {
        await this.cleanupTempHome()
      }

      // Cleanup workspace if it was created
      if (this.config.workspaceManager && workspace) {
        await this.config.workspaceManager.cleanup(workspace)
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const cliPath = this.config.cliPath || "claude"
      return new Promise((resolve) => {
        const proc = spawn(cliPath, ["--version"], {
          shell: true,
          stdio: "pipe",
        })

        proc.on("close", (code) => {
          resolve(code === 0)
        })

        proc.on("error", () => {
          resolve(false)
        })

        // Timeout check
        setTimeout(() => {
          proc.kill()
          resolve(false)
        }, 5000)
      })
    } catch {
      return false
    }
  }

  async cleanup(): Promise<void> {
    // Kill any running process
    if (this.currentProcess) {
      this.currentProcess.kill("SIGKILL")
      this.currentProcess = null
    }

    // Cleanup temp home
    await this.cleanupTempHome()
  }

  getInfo(): ExecutorInfo {
    return {
      agentType: this.agentType,
      displayName: this.displayName,
      available: true, // Will be checked properly via isAvailable()
      config: {
        cliPath: this.config.cliPath || "claude",
        model: this.config.model,
        hasSisyphus: this.agentType === AgentType.ClaudeCodeSisyphus,
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

    // Add completion signal for easier parsing
    prompt += "\n\nWhen done, output: TASK_COMPLETE"

    return prompt
  }

  /**
   * Execute Claude CLI with the given prompt
   */
  private async executeCLI(
    prompt: string,
    workingDir: string,
    timeoutMs: number,
    abortSignal?: AbortSignal
  ): Promise<{ output: string; stderr: string; exitCode: number }> {
    const cliPath = this.config.cliPath || "claude"

    // Build arguments - use -p flag to pass prompt directly
    const args: string[] = [
      "--print", // Non-interactive mode
      "--output-format", "text", // Text output
      "--dangerously-skip-permissions", // Skip permission dialogs for benchmarking
      "-p", prompt, // Pass prompt using -p flag
    ]

    // Add model if specified
    if (this.config.model) {
      args.push("--model", this.config.model)
    }

    // Add max tokens if specified
    if (this.config.maxTokens) {
      args.push("--max-budget-usd", String(this.config.maxTokens / 100000)) // Rough estimate
    }

    // Add additional args
    if (this.config.additionalArgs) {
      args.push(...this.config.additionalArgs)
    }

    return new Promise((resolve, reject) => {
      // Check if already aborted
      if (abortSignal?.aborted) {
        reject(new Error("Execution cancelled"))
        return
      }

      // Build environment
      const env = { ...process.env }

      // If Sisyphus mode, set up the temp home with CLAUDE.md
      if (this.tempHomePath) {
        env.HOME = this.tempHomePath
        env.USERPROFILE = this.tempHomePath
      }

      // Spawn the process without shell to avoid escaping issues
      this.currentProcess = spawn(cliPath, args, {
        cwd: workingDir,
        env,
        shell: false, // Don't use shell to avoid escaping issues
        stdio: ["ignore", "pipe", "pipe"], // Ignore stdin
      })

      let stdout = ""
      let stderr = ""

      this.currentProcess.stdout?.on("data", (data) => {
        stdout += data.toString()
        if (this.config.verbose) {
          process.stdout.write(data)
        }
      })

      this.currentProcess.stderr?.on("data", (data) => {
        stderr += data.toString()
      })

      // Setup abort listener
      const abortHandler = () => {
        this.currentProcess?.kill("SIGKILL")
        reject(new Error("Execution cancelled"))
      }
      abortSignal?.addEventListener("abort", abortHandler, { once: true })

      // Setup timeout
      const timeoutId = setTimeout(() => {
        abortSignal?.removeEventListener("abort", abortHandler)
        this.currentProcess?.kill("SIGKILL")
        reject(new Error(`Execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.currentProcess.on("close", (code) => {
        clearTimeout(timeoutId)
        abortSignal?.removeEventListener("abort", abortHandler)
        this.currentProcess = null

        resolve({
          output: stdout,
          stderr,
          exitCode: code || 0,
        })
      })

      this.currentProcess.on("error", (error) => {
        clearTimeout(timeoutId)
        abortSignal?.removeEventListener("abort", abortHandler)
        this.currentProcess = null
        reject(error)
      })
    })
  }

  /**
   * Setup temporary home directory with Sisyphus CLAUDE.md
   * Preserves authentication from the real home directory
   */
  private async setupSisyphusEnvironment(workingDir: string): Promise<void> {
    const { copyFile, access, constants } = await import("fs/promises")
    const { homedir } = await import("os")

    // Create temp home directory
    this.tempHomePath = join(tmpdir(), `claude-benchmark-sisyphus-${Date.now()}`)
    const claudeDir = join(this.tempHomePath, ".claude")

    await mkdir(claudeDir, { recursive: true })

    // Write CLAUDE.md for Sisyphus
    const claudeMdContent = this.config.claudeMdContent || DEFAULT_SISYPHUS_CLAUDE_MD
    await writeFile(join(claudeDir, "CLAUDE.md"), claudeMdContent, "utf-8")

    // Copy authentication files from real home directory
    const realHome = homedir()
    const realClaudeDir = join(realHome, ".claude")
    const authFiles = [".credentials.json", "settings.json", "settings.local.json"]

    for (const file of authFiles) {
      const srcPath = join(realClaudeDir, file)
      const dstPath = join(claudeDir, file)
      try {
        await access(srcPath, constants.R_OK)
        await copyFile(srcPath, dstPath)
        if (this.config.verbose) {
          console.log(`[CLIExecutor] Copied auth file: ${file}`)
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    if (this.config.verbose) {
      console.log(`[CLIExecutor] Created Sisyphus environment at ${this.tempHomePath}`)
    }
  }

  /**
   * Clean up temporary home directory
   */
  private async cleanupTempHome(): Promise<void> {
    if (this.tempHomePath) {
      try {
        await rm(this.tempHomePath, { recursive: true, force: true })
        if (this.config.verbose) {
          console.log(`[CLIExecutor] Cleaned up temp home: ${this.tempHomePath}`)
        }
      } catch (error) {
        if (this.config.verbose) {
          console.warn(`[CLIExecutor] Failed to cleanup temp home:`, error)
        }
      }
      this.tempHomePath = null
    }
  }
}

/**
 * Create a Claude Code executor
 */
export function createClaudeCodeExecutor(
  config?: Partial<Omit<CLIExecutorConfig, "agentType">>
): CLIExecutor {
  return new CLIExecutor({
    ...config,
    agentType: AgentType.ClaudeCode,
  })
}

/**
 * Create a Claude Code + Sisyphus executor
 */
export function createClaudeCodeSisyphusExecutor(
  config?: Partial<Omit<CLIExecutorConfig, "agentType">>
): CLIExecutor {
  return new CLIExecutor({
    ...config,
    agentType: AgentType.ClaudeCodeSisyphus,
  })
}
