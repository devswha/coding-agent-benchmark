/**
 * Agent Comparison Benchmark Types
 *
 * Compares MAGI vs Claude Code vs Claude Code + oh-my-claude-sisyphus
 * across various dimensions and capabilities.
 */

import type { BenchmarkCategory, BenchmarkSuiteResult } from "../types"

/**
 * Agent types being compared
 */
export enum AgentType {
  /** MAGI system with Trinity orchestrators */
  MAGI = "MAGI",

  /** Stock Claude Code without plugins */
  ClaudeCode = "ClaudeCode",

  /** Claude Code with oh-my-claude-sisyphus plugin */
  ClaudeCodeSisyphus = "ClaudeCodeSisyphus",
}

/**
 * Capabilities that agents may or may not support
 */
export enum AgentCapability {
  // Core capabilities
  BASIC_TASK_COMPLETION = "basic_task_completion",
  MULTI_STEP_PLANNING = "multi_step_planning",
  ERROR_RECOVERY = "error_recovery",
  CODE_GENERATION = "code_generation",
  CODE_ANALYSIS = "code_analysis",

  // Multi-agent capabilities
  MULTI_AGENT_COORDINATION = "multi_agent_coordination",
  SUBAGENT_DELEGATION = "subagent_delegation",
  PARALLEL_EXECUTION = "parallel_execution",
  BACKGROUND_TASKS = "background_tasks",

  // MAGI-specific
  TRINITY_PROTOCOL = "trinity_protocol",
  UNANIMOUS_VOTING = "unanimous_voting",
  MULTI_PERSPECTIVE_ANALYSIS = "multi_perspective_analysis",
  DEADLOCK_RESOLUTION = "deadlock_resolution",

  // Sisyphus-specific
  PROMETHEUS_PLANNING = "prometheus_planning",
  ORACLE_DEBUGGING = "oracle_debugging",
  RALPH_LOOP = "ralph_loop",
  DEEPINIT_INDEXING = "deepinit_indexing",
  TODO_TRACKING = "todo_tracking",
  ULTRAWORK_MODE = "ultrawork_mode",
  MAGIC_KEYWORDS = "magic_keywords",

  // Advanced features
  CONTEXT_PERSISTENCE = "context_persistence",
  HIERARCHICAL_DOCUMENTATION = "hierarchical_documentation",
  SELF_HEALING = "self_healing",
}

/**
 * Configuration for benchmarking a specific agent
 */
export interface AgentBenchmarkConfig {
  type: AgentType
  displayName: string
  model: {
    primary: string
    fallback?: string
    temperature?: number
    maxTokens?: number
  }
  config: Record<string, unknown>
  enabledCapabilities: AgentCapability[]
  systemPrompt?: string
}

/**
 * Score for a specific capability (detailed version with support flag)
 */
export interface DetailedCapabilityScore {
  capability: AgentCapability
  supported: boolean
  score: number
  assessment?: string
  example?: {
    task: string
    result: string
    timeMs: number
    tokensUsed: number
  }
}

/**
 * Score for a specific capability (report generation version)
 */
export interface CapabilityScore {
  capability: CapabilityType
  score: number
  confidence: number
  evidence: string[]
}

/**
 * Results from benchmarking a single agent on a single task
 */
export interface AgentTaskResult {
  agentType: AgentType
  taskId: string
  completed: boolean
  timeMs: number
  tokensUsed: number
  apiCalls: number
  quality: {
    coherence: number
    accuracy: number
    codeQuality?: number
    errorHandling: number
  }
  taskMetrics: {
    steps: number
    errorsEncountered: number
    errorsRecovered: number
    retries: number
  }
  agentSpecificMetrics: {
    trinityVotes?: {
      total: number
      unanimous: number
      deadlocks: number
    }
    subagentUsage?: {
      total: number
      byType: Record<string, number>
      parallel: number
    }
    orchestratorStats?: {
      melchior: { calls: number; tokensUsed: number }
      balthasar: { calls: number; tokensUsed: number }
      caspar: { calls: number; tokensUsed: number }
    }
  }
  capabilityScores: DetailedCapabilityScore[]
  error?: {
    message: string
    stack?: string
    recoverable: boolean
  }
  output: string
  timestamp: number
}

/**
 * Comparison results between agents for a single task
 */
export interface TaskComparisonResult {
  taskId: string
  taskDescription: string
  results: Map<AgentType, AgentTaskResult>
  winner: AgentType | "tie"
  comparison: {
    timeEfficiency: Record<AgentType, number>
    tokenEfficiency: Record<AgentType, number>
    qualityScore: Record<AgentType, number>
  }
  notableDifferences: string[]
}

/**
 * Delta metrics between two agents
 */
export interface DeltaMetrics {
  timeImprovement: number
  tokenImprovement: number
  qualityImprovement: number
  successRateImprovement: number
}

/**
 * Comprehensive comparison report
 */
export interface AgentComparisonReport {
  metadata: {
    generatedAt: number
    benchmarkVersion: string
    taskCount: number
    agentsCompared: AgentType[]
  }
  taskComparisons: TaskComparisonResult[]
  aggregateStats: {
    overallWinner: AgentType | "tie"
    winsByAgent: Record<AgentType, number>
    avgTimeMs: Record<AgentType, number>
    avgTokens: Record<AgentType, number>
    avgQuality: Record<AgentType, number>
    successRate: Record<AgentType, number>
    tokenEfficiency: Record<AgentType, number>
    timeEfficiency: Record<AgentType, number>
  }
  capabilityComparison: {
    supportedCapabilities: Record<AgentType, AgentCapability[]>
    avgCapabilityScores: Record<string, Record<AgentType, number>>
    uniqueCapabilities: Record<AgentType, AgentCapability[]>
  }
  categoryAnalysis: {
    categories: BenchmarkCategory[]
    bestByCategory: Record<string, AgentType>
    performanceByCategory: Record<string, Record<AgentType, number>>
  }
  deltas: {
    magiVsClaudeCode: DeltaMetrics
    magiVsSisyphus: DeltaMetrics
    sisyphusVsClaudeCode: DeltaMetrics
  }
  recommendations: {
    useCases: Record<AgentType, string[]>
    strengths: Record<AgentType, string[]>
    weaknesses: Record<AgentType, string[]>
  }
  insights: string[]
}

/**
 * Full agent comparison result including raw results and report
 */
export interface AgentComparisonResult {
  suiteId: string
  suiteName: string
  timestamp: number
  agents: AgentType[]
  results: Map<AgentType, BenchmarkSuiteResult>
  report: AgentComparisonReport
}

/**
 * Comparison runner configuration
 */
export interface AgentComparisonConfig {
  verbose: boolean
  outputDir: string
  saveResults: boolean
  defaultTimeoutMs: number
  retryCount: number
  parallelExecution?: boolean
}

/**
 * Category winner information
 */
export interface CategoryWinner {
  category: BenchmarkCategory
  winner: AgentType
  scores: Map<AgentType, number>
  margin: number
}

/**
 * Metric deltas relative to best performer
 */
export interface MetricDeltas {
  scoreDelta: number
  passRateDelta: number
  tokensDelta: number
  durationDelta: number
  efficiencyDelta: number
}

/**
 * Capability types for report generation (string-based for flexibility)
 */
export type CapabilityType =
  | "multi_agent_orchestration"
  | "planning_quality"
  | "code_generation"
  | "task_completion"
  | "error_recovery"
  | "token_efficiency"
  | "speed"
  | "consistency"

/**
 * Statistical significance test result
 */
export interface SignificanceResult {
  metric: string
  pValue: number
  isSignificant: boolean
  confidenceLevel: number
}

/**
 * Leaderboard data for frontend display
 */
export interface LeaderboardData {
  agents: AgentLeaderboardEntry[]
  lastUpdated: number
  comparisonId: string
}

/**
 * Agent leaderboard entry
 */
export interface AgentLeaderboardEntry {
  agent: AgentType
  rank: number
  overallScore: number
  passRate: number
  avgDurationMs: number
  totalTokens: number
  efficiency: number
  categoryScores: Record<BenchmarkCategory, number>
  capabilities: CapabilityScore[]
  badges: string[]
}

/**
 * Comparison matrix for visualization
 */
export interface ComparisonMatrix {
  agents: AgentType[]
  metrics: string[]
  data: number[][]
}

/**
 * Improvement suggestion for an agent
 */
export interface ImprovementSuggestion {
  agent: AgentType
  weakness: CapabilityType
  suggestion: string
  priority: "high" | "medium" | "low"
}

/**
 * Simple agent comparison report (for new report generation functions)
 */
export interface SimpleAgentComparisonReport {
  timestamp: number
  comparisonId: string
  agents: AgentType[]
  results: Map<AgentType, BenchmarkSuiteResult>
  overallWinner: AgentType
  winnerJustification: string
  categoryWinners: Map<BenchmarkCategory, CategoryWinner>
  metricDeltas: Map<AgentType, MetricDeltas>
  capabilityScores: Map<AgentType, CapabilityScore[]>
  significanceTests?: Map<string, SignificanceResult>
}

/**
 * Default agent configurations
 */
export const DEFAULT_AGENT_CONFIGS: Record<AgentType, Partial<AgentBenchmarkConfig>> = {
  [AgentType.MAGI]: {
    displayName: "MAGI",
    enabledCapabilities: [
      AgentCapability.BASIC_TASK_COMPLETION,
      AgentCapability.CODE_GENERATION,
      AgentCapability.TRINITY_PROTOCOL,
      AgentCapability.UNANIMOUS_VOTING,
      AgentCapability.MULTI_PERSPECTIVE_ANALYSIS,
      AgentCapability.DEADLOCK_RESOLUTION,
    ],
  },
  [AgentType.ClaudeCode]: {
    displayName: "Claude Code (Baseline)",
    enabledCapabilities: [
      AgentCapability.BASIC_TASK_COMPLETION,
      AgentCapability.CODE_GENERATION,
      AgentCapability.CODE_ANALYSIS,
    ],
  },
  [AgentType.ClaudeCodeSisyphus]: {
    displayName: "Claude Code + Sisyphus",
    enabledCapabilities: [
      AgentCapability.BASIC_TASK_COMPLETION,
      AgentCapability.CODE_GENERATION,
      AgentCapability.CODE_ANALYSIS,
      AgentCapability.MULTI_AGENT_COORDINATION,
      AgentCapability.SUBAGENT_DELEGATION,
      AgentCapability.PARALLEL_EXECUTION,
      AgentCapability.PROMETHEUS_PLANNING,
      AgentCapability.ORACLE_DEBUGGING,
      AgentCapability.RALPH_LOOP,
      AgentCapability.TODO_TRACKING,
      AgentCapability.ULTRAWORK_MODE,
      AgentCapability.MAGIC_KEYWORDS,
      AgentCapability.CONTEXT_PERSISTENCE,
    ],
  },
}
