import { execSync, type ExecSyncOptions } from 'child_process'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { ExecutionConfig, TestHarness, ValidationResult } from '../types'

export interface ExecutionResult {
  passed: boolean
  score: number
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  testsRun?: number
  testsPassed?: number
  testsFailed?: number
  errors?: string[]
}

/**
 * Execution validator that runs code in isolated temp directories.
 * Note: This executes untrusted code - consider using Docker for production.
 *
 * Security notes (fixes #2):
 * - Each validation uses its own temp directory (no shared state)
 * - Temp directories are cleaned up after execution
 * - For production use, consider wrapping execution in Docker containers
 */
export class ExecutionValidator {
  /**
   * Validate code by executing it against a test harness.
   * Each call creates its own isolated temp directory (fixes #7 race condition).
   */
  async validate(
    code: string,
    config: ExecutionConfig,
    harness: TestHarness
  ): Promise<ValidationResult> {
    // Create a local workDir for this validation (fixes #7 - no shared state)
    const workDir = join(tmpdir(), `benchmark-${Date.now()}-${Math.random().toString(36).slice(2)}`)

    try {
      // Create temp directory
      mkdirSync(workDir, { recursive: true })

      // Write solution file
      writeFileSync(join(workDir, config.entryPoint), code)

      // Write test file if provided
      if (harness.testCode) {
        const testFile = config.language === 'python' ? 'test_solution.py' : 'test_solution.ts'
        writeFileSync(join(workDir, testFile), harness.testCode)
      }

      // Write supporting files
      if (config.supportingFiles) {
        for (const [filename, content] of Object.entries(config.supportingFiles)) {
          writeFileSync(join(workDir, filename), content)
        }
      }

      // Execute based on language
      const result = await this.execute(workDir, config, harness)

      return {
        passed: result.passed,
        score: result.score,
        details: result.stdout,
        errors: result.errors
      }
    } catch (error) {
      return {
        passed: false,
        score: 0,
        details: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    } finally {
      // Cleanup temp directory
      this.cleanup(workDir)
    }
  }

  /**
   * Execute code in the given work directory.
   * @param workDir - Isolated temp directory for this execution
   */
  private async execute(workDir: string, config: ExecutionConfig, harness: TestHarness): Promise<ExecutionResult> {
    const startTime = Date.now()
    const timeout = config.timeoutMs ?? 30000

    const execOptions: ExecSyncOptions = {
      cwd: workDir,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      encoding: 'utf-8',
      env: { ...process.env, ...config.env }
    }

    try {
      let command: string

      switch (config.language) {
        case 'python':
          command = harness.framework === 'pytest'
            ? 'python -m pytest -v test_solution.py'
            : `python ${config.entryPoint}`
          break
        case 'typescript':
          command = `bun test test_solution.ts`
          break
        case 'javascript':
          command = `node ${config.entryPoint}`
          break
        case 'go':
          command = `go run ${config.entryPoint}`
          break
        case 'rust':
          // For Rust, we need to compile first, then run
          command = `rustc ${config.entryPoint} -o solution && ./solution`
          break
        default:
          throw new Error(`Unsupported language: ${config.language}`)
      }

      const stdout = execSync(command, execOptions) as string

      return {
        passed: true,
        score: 1,
        stdout,
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
        passed: false,
        score: 0,
        stdout: execError.stdout?.toString() ?? '',
        stderr: execError.stderr?.toString() ?? '',
        exitCode: execError.status ?? 1,
        durationMs: Date.now() - startTime,
        errors: [execError.message ?? 'Unknown error']
      }
    }
  }

  /**
   * Cleanup temp directory
   */
  private cleanup(workDir: string): void {
    if (workDir) {
      try {
        rmSync(workDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export const executionValidator = new ExecutionValidator()
