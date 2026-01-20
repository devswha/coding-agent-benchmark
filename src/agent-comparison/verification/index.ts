/**
 * Result Verification System
 *
 * Verifies that agents performed actual work, not just described it.
 * Supports multiple verification strategies for different task types.
 */

import { access, readFile } from "fs/promises"
import { join } from "path"
import { exec } from "child_process"
import { promisify } from "util"
import type { ExecutionResult, FileChange } from "../executors/types"
import type { Workspace } from "../workspace/types"

const execAsync = promisify(exec)

/**
 * Verification result
 */
export interface VerificationResult {
  /** Overall verification passed */
  passed: boolean

  /** Score from 0-1 */
  score: number

  /** Individual check results */
  checks: VerificationCheck[]

  /** Summary of verification */
  summary: string
}

/**
 * Individual verification check
 */
export interface VerificationCheck {
  /** Name of the check */
  name: string

  /** Whether this check passed */
  passed: boolean

  /** Optional score for this check */
  score?: number

  /** Details about the check result */
  details?: string
}

/**
 * Verification strategy types
 */
export type VerificationStrategy =
  | "output_pattern" // Check output contains patterns
  | "file_exists" // Check files were created
  | "file_content" // Check file contents
  | "syntax_valid" // Check code compiles/parses
  | "test_passes" // Run tests and check results
  | "composite" // Multiple strategies combined

/**
 * Configuration for verification
 */
export interface VerificationConfig {
  /** Strategy to use */
  strategy: VerificationStrategy

  /** Patterns to match in output (for output_pattern) */
  patterns?: string[]

  /** Required patterns that must all be present */
  requiredPatterns?: string[]

  /** Expected files (for file_exists/file_content) */
  expectedFiles?: string[]

  /** File content patterns (for file_content) */
  filePatterns?: Record<string, string[]>

  /** Test command to run (for test_passes) */
  testCommand?: string

  /** Sub-configs for composite strategy */
  subConfigs?: VerificationConfig[]

  /** Weight for composite scoring */
  weight?: number
}

/**
 * Verifier interface
 */
export interface Verifier {
  verify(
    result: ExecutionResult,
    workspace: Workspace | undefined,
    config: VerificationConfig
  ): Promise<VerificationResult>
}

/**
 * Pattern Verifier - checks output contains required patterns
 */
export class PatternVerifier implements Verifier {
  async verify(
    result: ExecutionResult,
    _workspace: Workspace | undefined,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const checks: VerificationCheck[] = []
    const output = result.output.toLowerCase()

    // Check required patterns (all must be present)
    if (config.requiredPatterns) {
      for (const pattern of config.requiredPatterns) {
        const regex = new RegExp(pattern, "i")
        const passed = regex.test(result.output)
        checks.push({
          name: `Required pattern: ${pattern}`,
          passed,
          details: passed ? "Pattern found" : "Pattern not found",
        })
      }
    }

    // Check optional patterns (bonus if present)
    if (config.patterns) {
      for (const pattern of config.patterns) {
        const regex = new RegExp(pattern, "i")
        const passed = regex.test(result.output)
        checks.push({
          name: `Pattern: ${pattern}`,
          passed,
          score: passed ? 1 : 0,
          details: passed ? "Pattern found" : "Pattern not found",
        })
      }
    }

    const passed = checks.filter((c) => c.name.startsWith("Required")).every((c) => c.passed)
    const score = checks.length > 0 ? checks.filter((c) => c.passed).length / checks.length : 1

    return {
      passed,
      score,
      checks,
      summary: passed
        ? `All required patterns found (${checks.filter((c) => c.passed).length}/${checks.length} total)`
        : `Missing required patterns`,
    }
  }
}

/**
 * File Exists Verifier - checks expected files were created
 */
export class FileExistsVerifier implements Verifier {
  async verify(
    result: ExecutionResult,
    workspace: Workspace | undefined,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const checks: VerificationCheck[] = []

    if (!workspace) {
      return {
        passed: false,
        score: 0,
        checks: [],
        summary: "No workspace provided for file verification",
      }
    }

    if (!config.expectedFiles) {
      return {
        passed: true,
        score: 1,
        checks: [],
        summary: "No expected files specified",
      }
    }

    for (const file of config.expectedFiles) {
      const filePath = join(workspace.path, file)
      let exists = false

      try {
        await access(filePath)
        exists = true
      } catch {
        exists = false
      }

      // Also check if file was in the changes
      const inChanges = result.filesChanged.some(
        (c) => c.path === file && (c.type === "created" || c.type === "modified")
      )

      checks.push({
        name: `File exists: ${file}`,
        passed: exists || inChanges,
        details: exists ? "File exists" : inChanges ? "File created" : "File not found",
      })
    }

    const passed = checks.every((c) => c.passed)
    const score = checks.length > 0 ? checks.filter((c) => c.passed).length / checks.length : 1

    return {
      passed,
      score,
      checks,
      summary: passed
        ? `All expected files found (${checks.length})`
        : `Missing files: ${checks.filter((c) => !c.passed).map((c) => c.name).join(", ")}`,
    }
  }
}

/**
 * File Content Verifier - checks file contents match patterns
 */
export class FileContentVerifier implements Verifier {
  async verify(
    _result: ExecutionResult,
    workspace: Workspace | undefined,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const checks: VerificationCheck[] = []

    if (!workspace) {
      return {
        passed: false,
        score: 0,
        checks: [],
        summary: "No workspace provided for content verification",
      }
    }

    if (!config.filePatterns) {
      return {
        passed: true,
        score: 1,
        checks: [],
        summary: "No file patterns specified",
      }
    }

    for (const [file, patterns] of Object.entries(config.filePatterns)) {
      const filePath = join(workspace.path, file)

      try {
        const content = await readFile(filePath, "utf-8")

        for (const pattern of patterns) {
          const regex = new RegExp(pattern, "i")
          const passed = regex.test(content)
          checks.push({
            name: `${file} contains: ${pattern}`,
            passed,
            details: passed ? "Pattern found in file" : "Pattern not found in file",
          })
        }
      } catch (error) {
        checks.push({
          name: `${file} readable`,
          passed: false,
          details: `Could not read file: ${error}`,
        })
      }
    }

    const passed = checks.every((c) => c.passed)
    const score = checks.length > 0 ? checks.filter((c) => c.passed).length / checks.length : 1

    return {
      passed,
      score,
      checks,
      summary: passed ? `All file content checks passed` : `Some content checks failed`,
    }
  }
}

/**
 * Syntax Verifier - checks code compiles/parses
 */
export class SyntaxVerifier implements Verifier {
  async verify(
    _result: ExecutionResult,
    workspace: Workspace | undefined,
    _config: VerificationConfig
  ): Promise<VerificationResult> {
    if (!workspace) {
      return {
        passed: false,
        score: 0,
        checks: [],
        summary: "No workspace provided for syntax verification",
      }
    }

    const checks: VerificationCheck[] = []

    // Try TypeScript check
    try {
      await execAsync("npx tsc --noEmit", {
        cwd: workspace.path,
        timeout: 30000,
      })
      checks.push({
        name: "TypeScript compilation",
        passed: true,
        details: "No TypeScript errors",
      })
    } catch (error: unknown) {
      // Check if it's just "no tsconfig" vs actual errors
      const stderr = (error as { stderr?: string })?.stderr || ""
      if (stderr.includes("Could not find a valid") || stderr.includes("tsconfig")) {
        checks.push({
          name: "TypeScript compilation",
          passed: true,
          score: 0.5,
          details: "No TypeScript config found (skipped)",
        })
      } else {
        checks.push({
          name: "TypeScript compilation",
          passed: false,
          details: `TypeScript errors: ${stderr.slice(0, 200)}`,
        })
      }
    }

    const passed = checks.every((c) => c.passed)
    const score = checks.length > 0
      ? checks.reduce((sum, c) => sum + (c.score ?? (c.passed ? 1 : 0)), 0) / checks.length
      : 1

    return {
      passed,
      score,
      checks,
      summary: passed ? "Syntax verification passed" : "Syntax errors found",
    }
  }
}

/**
 * Test Verifier - runs tests and checks results
 */
export class TestVerifier implements Verifier {
  async verify(
    _result: ExecutionResult,
    workspace: Workspace | undefined,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    if (!workspace) {
      return {
        passed: false,
        score: 0,
        checks: [],
        summary: "No workspace provided for test verification",
      }
    }

    const testCommand = config.testCommand || "npm test"
    const checks: VerificationCheck[] = []

    try {
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: workspace.path,
        timeout: 120000, // 2 minute timeout for tests
      })

      // Parse test output for pass/fail counts
      const passMatch = stdout.match(/(\d+)\s*(?:passing|passed)/i)
      const failMatch = stdout.match(/(\d+)\s*(?:failing|failed)/i)

      const passing = passMatch ? parseInt(passMatch[1]) : 0
      const failing = failMatch ? parseInt(failMatch[1]) : 0

      checks.push({
        name: "Test execution",
        passed: failing === 0,
        score: failing === 0 ? 1 : passing / (passing + failing),
        details: `${passing} passing, ${failing} failing`,
      })
    } catch (error: unknown) {
      const exitError = error as { code?: number; stderr?: string }
      checks.push({
        name: "Test execution",
        passed: false,
        score: 0,
        details: `Tests failed with exit code ${exitError.code || "unknown"}: ${(exitError.stderr || "").slice(0, 200)}`,
      })
    }

    const passed = checks.every((c) => c.passed)
    const score = checks.length > 0
      ? checks.reduce((sum, c) => sum + (c.score ?? (c.passed ? 1 : 0)), 0) / checks.length
      : 1

    return {
      passed,
      score,
      checks,
      summary: passed ? "All tests passed" : "Some tests failed",
    }
  }
}

/**
 * Composite Verifier - combines multiple verification strategies
 */
export class CompositeVerifier implements Verifier {
  private verifiers: Map<VerificationStrategy, Verifier>

  constructor() {
    this.verifiers = new Map([
      ["output_pattern", new PatternVerifier()],
      ["file_exists", new FileExistsVerifier()],
      ["file_content", new FileContentVerifier()],
      ["syntax_valid", new SyntaxVerifier()],
      ["test_passes", new TestVerifier()],
    ])
  }

  async verify(
    result: ExecutionResult,
    workspace: Workspace | undefined,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    if (!config.subConfigs || config.subConfigs.length === 0) {
      return {
        passed: true,
        score: 1,
        checks: [],
        summary: "No sub-configs for composite verification",
      }
    }

    const allChecks: VerificationCheck[] = []
    let totalScore = 0
    let totalWeight = 0
    let allPassed = true

    for (const subConfig of config.subConfigs) {
      const verifier = this.verifiers.get(subConfig.strategy)
      if (!verifier) {
        allChecks.push({
          name: `Unknown strategy: ${subConfig.strategy}`,
          passed: false,
          details: "No verifier found for this strategy",
        })
        continue
      }

      const subResult = await verifier.verify(result, workspace, subConfig)

      allChecks.push(...subResult.checks)

      const weight = subConfig.weight ?? 1
      totalScore += subResult.score * weight
      totalWeight += weight

      if (!subResult.passed) {
        allPassed = false
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 1

    return {
      passed: allPassed,
      score: finalScore,
      checks: allChecks,
      summary: allPassed
        ? `All verification strategies passed (score: ${(finalScore * 100).toFixed(1)}%)`
        : `Some verification strategies failed (score: ${(finalScore * 100).toFixed(1)}%)`,
    }
  }
}

/**
 * Create a verifier for the given strategy
 */
export function createVerifier(strategy: VerificationStrategy): Verifier {
  switch (strategy) {
    case "output_pattern":
      return new PatternVerifier()
    case "file_exists":
      return new FileExistsVerifier()
    case "file_content":
      return new FileContentVerifier()
    case "syntax_valid":
      return new SyntaxVerifier()
    case "test_passes":
      return new TestVerifier()
    case "composite":
      return new CompositeVerifier()
    default:
      return new PatternVerifier()
  }
}

/**
 * Verify execution result with the given configuration
 */
export async function verifyResult(
  result: ExecutionResult,
  workspace: Workspace | undefined,
  config: VerificationConfig
): Promise<VerificationResult> {
  const verifier = createVerifier(config.strategy)
  return verifier.verify(result, workspace, config)
}
