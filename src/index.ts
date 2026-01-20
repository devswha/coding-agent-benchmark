/**
 * MAGI Benchmark System
 * Performance evaluation for the MAGI multi-orchestrator AI coding agent
 */

// Types
export type {
  BenchmarkCase,
  BenchmarkCategory,
  BenchmarkConfig,
  BenchmarkSuite,
  BenchmarkSuiteResult,
  BenchmarkRunResult,
  BenchmarkComparison,
  TrinityBenchmarkMetrics,
  TrinityOverallMetrics,
  ValidationResult,
  LeaderboardEntry,
  CategoryScore,
  ProblemCategory,
} from "./types"

// MAGI Integration
export {
  loadMagiIntegration,
  isMagiAvailable,
  type MagiSystemInterface,
  type MagiIntegration,
} from "./magi-integration"

// Runner
export { BenchmarkRunner, runBenchmark } from "./runner"

// Metrics
export {
  calculateDetailedMetrics,
  compareBenchmarkRuns,
  formatComparisonReport,
  saveToLeaderboard,
  getLeaderboard,
  formatLeaderboard,
  formatTrinityReport,
} from "./metrics"

// Agent Comparison
export * from "./agent-comparison"

// Benchmark Suites
export { codeGenerationSuite } from "./suites/code-generation"
export { trinityProtocolSuite } from "./suites/trinity-protocol"
export { taskCompletionSuite } from "./suites/task-completion"
export { agentComparisonSuite } from "./suites/agent-comparison"

// All suites combined
import { codeGenerationSuite } from "./suites/code-generation"
import { trinityProtocolSuite } from "./suites/trinity-protocol"
import { taskCompletionSuite } from "./suites/task-completion"
import { agentComparisonSuite } from "./suites/agent-comparison"
import type { BenchmarkSuite } from "./types"

export const ALL_SUITES: BenchmarkSuite[] = [
  codeGenerationSuite,
  trinityProtocolSuite,
  taskCompletionSuite,
  agentComparisonSuite,
]

/**
 * Get suite by ID
 */
export function getSuiteById(id: string): BenchmarkSuite | undefined {
  return ALL_SUITES.find(s => s.id === id)
}

/**
 * List all available suites
 */
export function listSuites(): Array<{ id: string; name: string; description: string; caseCount: number }> {
  return ALL_SUITES.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    caseCount: s.cases.length,
  }))
}

/**
 * Quick benchmark runner for CLI
 */
export async function quickBenchmark(
  suiteId: string,
  options?: {
    verbose?: boolean
    categories?: string[]
    difficulties?: ("easy" | "medium" | "hard")[]
  }
): Promise<void> {
  const suite = getSuiteById(suiteId)
  if (!suite) {
    console.error(`Unknown suite: ${suiteId}`)
    console.log("Available suites:")
    for (const s of listSuites()) {
      console.log(`  - ${s.id}: ${s.name} (${s.caseCount} cases)`)
    }
    return
  }

  const { BenchmarkRunner } = await import("./runner")
  const runner = new BenchmarkRunner({
    verbose: options?.verbose ?? true,
    categories: options?.categories as any,
    difficulties: options?.difficulties,
    saveResults: true,
  })

  try {
    await runner.runSuite(suite)
  } finally {
    runner.cleanup()
  }
}

/**
 * Run all benchmark suites
 */
export async function runAllBenchmarks(
  options?: {
    verbose?: boolean
    parallel?: boolean
  }
): Promise<void> {
  const { BenchmarkRunner } = await import("./runner")

  console.log("\n" + "=".repeat(60))
  console.log("RUNNING ALL MAGI BENCHMARKS")
  console.log("=".repeat(60))
  console.log(`\nTotal suites: ${ALL_SUITES.length}`)
  console.log(`Total cases: ${ALL_SUITES.reduce((sum, s) => sum + s.cases.length, 0)}`)
  console.log("")

  const runner = new BenchmarkRunner({
    verbose: options?.verbose ?? true,
    saveResults: true,
  })

  try {
    for (const suite of ALL_SUITES) {
      console.log(`\n>>> Starting suite: ${suite.name}`)
      await runner.runSuite(suite)
    }
  } finally {
    runner.cleanup()
  }

  console.log("\n" + "=".repeat(60))
  console.log("ALL BENCHMARKS COMPLETE")
  console.log("=".repeat(60))
}
