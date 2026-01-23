import { execFileSync, spawn } from "child_process"
import type { Agent, AgentConfig, AgentResponse } from "../agent"

/**
 * Error type for execFileSync errors
 */
interface ExecFileError extends Error {
  stdout?: Buffer | string
  stderr?: Buffer | string
  status?: number
  killed?: boolean
}

/**
 * Abstract base class for CLI-based coding agents.
 * Wraps command-line tools like claude, opencode, etc.
 */
export abstract class BaseCLIAgent implements Agent {
  abstract readonly name: string
  protected abstract readonly command: string
  protected abstract buildArgs(prompt: string): string[]

  protected buildEnv(): Record<string, string> {
    return {}
  }

  async execute(prompt: string, config?: AgentConfig): Promise<AgentResponse> {
    const startTime = Date.now()
    const timeoutMs = config?.timeoutMs ?? 120000 // Default 2 minutes
    const workingDir = config?.workingDir ?? process.cwd()

    const args = this.buildArgs(prompt)
    const env = { ...process.env, ...this.buildEnv() }

    try {
      // Use execFileSync with array args to prevent command injection (fixes #1)
      const output = execFileSync(this.command, args, {
        cwd: workingDir,
        env,
        timeout: timeoutMs,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      })

      const durationMs = Date.now() - startTime
      return {
        content: output.trim(),
        durationMs,
        metadata: {
          exitCode: 0,
        },
      }
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime
      const error = err as ExecFileError

      // Check if it was a timeout
      const errorStdout = typeof error.stdout === 'string' ? error.stdout : error.stdout?.toString()
      if (error.killed) {
        return {
          content: errorStdout || `[Timeout after ${timeoutMs}ms]`,
          durationMs,
          metadata: {
            exitCode: error.status,
            timedOut: true,
            stderr: error.stderr?.slice(0, 1000),
          },
        }
      }

      // Return any output we got, even on error
      const stdout = typeof error.stdout === 'string' ? error.stdout : error.stdout?.toString()
      if (stdout) {
        return {
          content: stdout.trim(),
          durationMs,
          metadata: {
            exitCode: error.status,
            stderr: error.stderr?.slice(0, 1000),
          },
        }
      }

      const stderr = typeof error.stderr === 'string' ? error.stderr : error.stderr?.toString()
      return {
        content: stderr || error.message || `[Exit code: ${error.status}]`,
        durationMs,
        metadata: {
          exitCode: error.status,
          error: true,
          stderr: error.stderr?.slice(0, 1000),
        },
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      // Use platform-specific command (fixes #17)
      const command = process.platform === 'win32' ? 'where' : 'which'
      const proc = spawn(command, [this.command])
      proc.on("close", (code) => {
        resolve(code === 0)
      })
      proc.on("error", () => {
        resolve(false)
      })
    })
  }
}
