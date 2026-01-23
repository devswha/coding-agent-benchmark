import { execSync, spawn, type ChildProcess } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { ExecutionConfig, TestHarness } from '../types'

export interface PythonExecutionResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  testsRun?: number
  testsPassed?: number
  testsFailed?: number
}

/**
 * Python code execution runner.
 *
 * Security notes (fixes #3):
 * - Each execution uses its own isolated temp directory
 * - Timeout is enforced via execSync timeout option
 * - Memory limits noted but require OS-level enforcement (ulimit/cgroups)
 * - Network isolation noted but requires OS-level enforcement (namespaces)
 * - For production use, consider wrapping in Docker containers
 */
export class PythonRunner {
  private pythonPath: string = 'python3'

  constructor() {
    // Try to find python
    try {
      execSync('python3 --version', { stdio: 'pipe' })
      this.pythonPath = 'python3'
    } catch {
      try {
        execSync('python --version', { stdio: 'pipe' })
        this.pythonPath = 'python'
      } catch {
        console.warn('[PythonRunner] Python not found in PATH')
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      execSync(`${this.pythonPath} --version`, { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }

  async execute(
    code: string,
    config: ExecutionConfig,
    harness?: TestHarness
  ): Promise<PythonExecutionResult> {
    const workDir = join(tmpdir(), `py-exec-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const startTime = Date.now()

    try {
      mkdirSync(workDir, { recursive: true })

      // Write solution file
      writeFileSync(join(workDir, config.entryPoint), code)

      // Write test file if provided
      if (harness?.testCode) {
        writeFileSync(join(workDir, 'test_solution.py'), harness.testCode)
      }

      // Install dependencies if specified
      if (config.dependencies?.length) {
        try {
          execSync(`${this.pythonPath} -m pip install ${config.dependencies.join(' ')}`, {
            cwd: workDir,
            timeout: 60000,
            stdio: 'pipe'
          })
        } catch {
          // Continue even if pip install fails
        }
      }

      // Build command based on harness type
      let command: string
      if (harness?.framework === 'pytest') {
        command = `${this.pythonPath} -m pytest -v test_solution.py`
      } else if (harness?.testCode) {
        command = `${this.pythonPath} test_solution.py`
      } else {
        command = `${this.pythonPath} ${config.entryPoint}`
      }

      // Log security config if present (for documentation purposes)
      if (config.memoryLimitMb) {
        console.warn(`[PythonRunner] Memory limit ${config.memoryLimitMb}MB requested but requires OS-level enforcement (ulimit/cgroups)`)
      }
      if (config.allowNetwork === false) {
        console.warn('[PythonRunner] Network isolation requested but requires OS-level enforcement (network namespaces)')
      }

      // Execute with timeout enforcement
      const result = execSync(command, {
        cwd: workDir,
        timeout: config.timeoutMs ?? 30000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
        env: { ...process.env, ...config.env }
      })

      return {
        success: true,
        stdout: result,
        stderr: '',
        exitCode: 0,
        durationMs: Date.now() - startTime
      }
    } catch (error: unknown) {
      const execError = error as {
        stdout?: Buffer | string
        stderr?: Buffer | string
        status?: number
        message?: string
      }
      return {
        success: false,
        stdout: execError.stdout?.toString() ?? '',
        stderr: execError.stderr?.toString() ?? '',
        exitCode: execError.status ?? 1,
        durationMs: Date.now() - startTime
      }
    } finally {
      // Cleanup
      try {
        rmSync(workDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  // Parse pytest output for test counts
  parsePytestOutput(output: string): { run: number, passed: number, failed: number } {
    const match = output.match(/(\d+) passed|(\d+) failed|(\d+) error/g)
    let passed = 0, failed = 0

    if (match) {
      for (const m of match) {
        if (m.includes('passed')) passed = parseInt(m)
        if (m.includes('failed') || m.includes('error')) failed += parseInt(m)
      }
    }

    return { run: passed + failed, passed, failed }
  }
}

export const pythonRunner = new PythonRunner()
