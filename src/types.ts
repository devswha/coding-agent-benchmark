/**
 * Coding Agent Benchmark System - Type Definitions
 *
 * Generic benchmark types for evaluating any AI coding agent.
 * Supports Claude Code, Cursor, Aider, OpenHands, Cline, etc.
 */

// Re-export shared types
import type {
  BenchmarkCategory as BenchmarkCategoryType,
  ToolCall,
  SubAgentCall,
  ExecutionTrace,
  ExecutionStats,
  CategoryScore,
  BenchmarkRunResult,
  BenchmarkSuiteResult,
  BenchmarkFile,
} from '../shared/types'

// Re-export as both type and value (for compatibility)
export type BenchmarkCategory = BenchmarkCategoryType
export type { ToolCall, SubAgentCall, ExecutionTrace, ExecutionStats, CategoryScore, BenchmarkRunResult, BenchmarkSuiteResult, BenchmarkFile }

/**
 * Benchmark test case definition
 */
export interface BenchmarkCase {
  id: string
  name: string
  description: string
  category: BenchmarkCategory
  difficulty: "easy" | "medium" | "hard"

  // Input
  prompt: string
  context?: string

  // Expected output
  expectedOutput?: string
  validationFn?: (output: string) => ValidationResult

  // Constraints
  maxTokens?: number
  timeoutMs?: number

  // Metadata
  tags?: string[]
  source?: string | BenchmarkSource

  // Execution-based validation (new)
  executionConfig?: ExecutionConfig
  testHarness?: TestHarness
  fileContext?: FileContext
  numSamples?: number  // For pass@k evaluation
}

export interface ValidationResult {
  passed: boolean
  score: number           // 0-1 normalized score
  details?: string
  errors?: string[]
}

/**
 * Execution configuration for code that needs to be run
 */
export interface ExecutionConfig {
  language: "python" | "typescript" | "javascript" | "go" | "rust"
  runtimeVersion?: string
  entryPoint: string
  supportingFiles?: Record<string, string>
  dependencies?: string[]
  env?: Record<string, string>
  timeoutMs?: number
  memoryLimitMb?: number
  allowNetwork?: boolean
}

/**
 * Test harness for validating code execution
 */
export interface TestHarness {
  type: "unit_test" | "assertion" | "stdout_match" | "custom"
  testCode: string
  expectedStdout?: string
  assertions?: TestAssertion[]
  setupCode?: string
  teardownCode?: string
  framework?: string
}

export interface TestAssertion {
  input: unknown[]
  expected: unknown
  comparison: "equals" | "deep_equals" | "contains" | "matches_regex" | "throws"
  tolerance?: number
}

export interface FileContext {
  files: Record<string, string>
  editableFiles: string[]
  repoUrl?: string
  repoRef?: string
}

export interface BenchmarkSource {
  dataset: "custom" | "humaneval" | "humaneval_plus" | "mbpp" | "mbpp_plus" | "swe_bench" | "swe_bench_lite" | "sealqa"
  originalId: string
  datasetVersion: string
  sourceUrl?: string
}

/**
 * Benchmark suite definition
 */
export interface BenchmarkSuite {
  id: string
  name: string
  description: string
  version: string

  cases: BenchmarkCase[]

  // Suite-level config
  defaultTimeout?: number
  parallelExecution?: boolean
  maxConcurrency?: number
}

/**
 * Benchmark runner configuration
 */
export interface BenchmarkConfig {
  // Execution
  maxConcurrency: number
  defaultTimeoutMs: number
  retryCount: number

  // Filtering
  categories?: BenchmarkCategory[]
  difficulties?: ("easy" | "medium" | "hard")[]
  tags?: string[]
  caseIds?: string[]

  // Output
  verbose: boolean
  outputDir: string
  saveResults: boolean

  // Legacy (kept for backwards compatibility, ignored)
  enableTrinity?: boolean
  forceTrinityReview?: boolean
}

/**
 * Comparison between benchmark runs
 */
export interface BenchmarkComparison {
  baselineRun: BenchmarkSuiteResult
  currentRun: BenchmarkSuiteResult

  // Deltas
  scoreDelta: number
  passRateDelta: number
  tokensDelta: number
  durationDelta: number

  // Regressions and improvements
  regressions: string[]      // Case IDs that regressed
  improvements: string[]     // Case IDs that improved
  unchanged: string[]        // Case IDs with same result
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  runId: string
  timestamp: number
  suiteId: string

  // Agent info
  agentName: string

  // Scores
  overallScore: number
  passRate: number

  // Performance
  avgDurationMs: number
  totalTokens: number

  // Metadata
  commitHash?: string
  notes?: string
}
