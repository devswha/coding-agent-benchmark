/**
 * Shared Type Definitions
 *
 * Common types used by both backend and dashboard.
 * Single source of truth to prevent type drift.
 */

export type BenchmarkCategory =
  | "code_generation"
  | "code_completion"
  | "bug_fixing"
  | "code_explanation"
  | "refactoring"
  | "test_generation"
  | "task_completion"
  | "security"
  | "debugging"
  | "documentation"
  | "qa_reasoning"

export interface ToolCall {
  type: 'read' | 'write' | 'bash' | 'glob' | 'grep' | 'edit' | 'search' | 'unknown'
  target?: string
  timestamp?: number
  durationMs?: number
  result?: 'success' | 'error' | 'unknown'
}

export interface SubAgentCall {
  agentType: string
  model?: string
  taskDescription?: string
  timestamp?: number
}

export interface ExecutionTrace {
  toolCalls: ToolCall[]
  subAgentCalls: SubAgentCall[]
  reasoningSteps?: string[]
  delegationDetected: boolean
  rawPatterns: string[]
}

export interface ExecutionStats {
  totalToolCalls: number
  toolCallsByType: Record<string, number>
  totalSubAgentCalls: number
  subAgentsByType: Record<string, number>
  delegationRate: number
  avgToolCallsPerCase: number
}

export interface CategoryScore {
  score: number
  passed: number
  total: number
}

export interface BenchmarkRunResult {
  caseId: string
  caseName: string
  category: BenchmarkCategory
  difficulty: string
  passed: boolean
  score: number
  durationMs: number
  tokensUsed: number
  output: string
  validationDetails?: string
  errors?: string[]
  filesModified?: string[]
  metadata?: {
    exitCode?: number
    timedOut?: boolean
    stderr?: string
    error?: boolean
    executionTrace?: ExecutionTrace
    inputPrompt?: string
    [key: string]: unknown
  }
}

export interface BenchmarkSuiteResult {
  suiteId: string
  suiteName: string
  timestamp: number
  durationMs: number
  agentName?: string
  totalCases: number
  passedCases: number
  failedCases: number
  skippedCases: number
  overallScore: number
  scoreByCategory: Record<BenchmarkCategory, CategoryScore>
  scoreByDifficulty: Record<string, number>
  executionStats?: ExecutionStats
  totalTokensUsed: number
  avgTokensPerCase: number
  avgDurationMs: number
  results: BenchmarkRunResult[]
}

export interface BenchmarkFile {
  filename: string
  data: BenchmarkSuiteResult
}
