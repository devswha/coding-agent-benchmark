/**
 * MAGI Benchmark System - Type Definitions
 * Standalone benchmark types - no MAGI core dependencies
 */

/**
 * Problem category (mirrors MAGI core for compatibility)
 */
export type ProblemCategory =
  | "file_operation"
  | "code_execution"
  | "architecture"
  | "security"
  | "query"

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
  source?: string
}

export type BenchmarkCategory =
  | "code_generation"      // Generate code from description
  | "code_completion"      // Complete partial code
  | "bug_fixing"           // Fix bugs in code
  | "code_explanation"     // Explain code
  | "refactoring"          // Refactor code
  | "test_generation"      // Generate tests
  | "trinity_decision"     // Trinity Protocol decision quality
  | "task_completion"      // Multi-step task completion
  | "security"             // Security-related tasks

export interface ValidationResult {
  passed: boolean
  score: number           // 0-1 normalized score
  details?: string
  errors?: string[]
}

/**
 * Single benchmark run result
 */
export interface BenchmarkRunResult {
  caseId: string
  caseName: string
  category: BenchmarkCategory
  difficulty: string

  // Outcome
  passed: boolean
  score: number

  // Performance
  durationMs: number
  tokensUsed: number

  // Output
  output: string
  validationDetails?: string
  errors?: string[]

  // Trinity metrics (if applicable)
  trinityMetrics?: TrinityBenchmarkMetrics
}

/**
 * Trinity Protocol specific metrics
 */
export interface TrinityBenchmarkMetrics {
  deliberationTimeMs: number
  consensusReached: boolean
  advocateRecommendation?: string
  criticRecommendation?: string
  arbiterDecision?: string

  // Quality indicators
  advocateConfidence?: number
  criticConfidence?: number
  deadlockDetected: boolean
}

/**
 * Complete benchmark suite result
 */
export interface BenchmarkSuiteResult {
  suiteId: string
  suiteName: string
  timestamp: number
  durationMs: number

  // Summary
  totalCases: number
  passedCases: number
  failedCases: number
  skippedCases: number

  // Scores
  overallScore: number
  scoreByCategory: Record<BenchmarkCategory, CategoryScore>
  scoreByDifficulty: Record<string, number>

  // Performance
  totalTokensUsed: number
  avgTokensPerCase: number
  avgDurationMs: number

  // Individual results
  results: BenchmarkRunResult[]

  // Trinity specific (if applicable)
  trinityOverall?: TrinityOverallMetrics
}

export interface CategoryScore {
  score: number
  passed: number
  total: number
}

export interface TrinityOverallMetrics {
  avgDeliberationTimeMs: number
  consensusRate: number
  deadlockRate: number
  decisionDistribution: Record<string, number>
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

  // Model config
  modelOverride?: string

  // Trinity config
  enableTrinity: boolean
  forceTrinityReview: boolean
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

  // Scores
  overallScore: number
  passRate: number

  // Performance
  avgDurationMs: number
  totalTokens: number

  // Config
  modelUsed: string
  trinityEnabled: boolean

  // Metadata
  commitHash?: string
  notes?: string
}
