/**
 * MAGI Benchmark Metrics Collection and Analysis
 */

import type {
  BenchmarkSuiteResult,
  BenchmarkRunResult,
  BenchmarkComparison,
  LeaderboardEntry,
  TrinityOverallMetrics,
} from "./types"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"

const METRICS_DIR = "./benchmark/metrics"
const LEADERBOARD_FILE = "leaderboard.json"

/**
 * Calculate detailed metrics from benchmark results
 */
export function calculateDetailedMetrics(result: BenchmarkSuiteResult) {
  const results = result.results

  return {
    // Basic stats
    passRate: result.passedCases / result.totalCases,
    avgScore: result.overallScore,
    medianScore: calculateMedian(results.map(r => r.score)),
    stdDevScore: calculateStdDev(results.map(r => r.score)),

    // Performance
    avgDuration: result.avgDurationMs,
    medianDuration: calculateMedian(results.map(r => r.durationMs)),
    p95Duration: calculatePercentile(results.map(r => r.durationMs), 95),
    p99Duration: calculatePercentile(results.map(r => r.durationMs), 99),

    // Token usage
    avgTokens: result.avgTokensPerCase,
    totalTokens: result.totalTokensUsed,
    tokensPerScore: result.totalTokensUsed / (result.overallScore || 0.01),

    // Category breakdown
    categoryPerformance: Object.entries(result.scoreByCategory).map(([cat, score]) => ({
      category: cat,
      ...score,
      passRate: score.passed / score.total,
    })),

    // Difficulty breakdown
    difficultyPerformance: Object.entries(result.scoreByDifficulty).map(([diff, score]) => ({
      difficulty: diff,
      score,
    })),

    // Error analysis
    errorRate: results.filter(r => r.errors && r.errors.length > 0).length / results.length,
    commonErrors: groupErrors(results),

    // Trinity specific
    trinityMetrics: result.trinityOverall,
  }
}

/**
 * Compare two benchmark runs
 */
export function compareBenchmarkRuns(
  baseline: BenchmarkSuiteResult,
  current: BenchmarkSuiteResult
): BenchmarkComparison {
  const baseResults = new Map(baseline.results.map(r => [r.caseId, r]))
  const currResults = new Map(current.results.map(r => [r.caseId, r]))

  const regressions: string[] = []
  const improvements: string[] = []
  const unchanged: string[] = []

  for (const [caseId, currResult] of currResults) {
    const baseResult = baseResults.get(caseId)
    if (!baseResult) continue

    if (currResult.passed && !baseResult.passed) {
      improvements.push(caseId)
    } else if (!currResult.passed && baseResult.passed) {
      regressions.push(caseId)
    } else {
      unchanged.push(caseId)
    }
  }

  return {
    baselineRun: baseline,
    currentRun: current,
    scoreDelta: current.overallScore - baseline.overallScore,
    passRateDelta: (current.passedCases / current.totalCases) - (baseline.passedCases / baseline.totalCases),
    tokensDelta: current.totalTokensUsed - baseline.totalTokensUsed,
    durationDelta: current.durationMs - baseline.durationMs,
    regressions,
    improvements,
    unchanged,
  }
}

/**
 * Format comparison as readable report
 */
export function formatComparisonReport(comparison: BenchmarkComparison): string {
  const lines: string[] = []

  lines.push("=" .repeat(60))
  lines.push("BENCHMARK COMPARISON REPORT")
  lines.push("=".repeat(60))
  lines.push("")

  lines.push(`Baseline: ${comparison.baselineRun.suiteName} @ ${new Date(comparison.baselineRun.timestamp).toISOString()}`)
  lines.push(`Current:  ${comparison.currentRun.suiteName} @ ${new Date(comparison.currentRun.timestamp).toISOString()}`)
  lines.push("")

  lines.push("SUMMARY")
  lines.push("-".repeat(40))
  lines.push(`Score Change:     ${formatDelta(comparison.scoreDelta * 100, "%")}`)
  lines.push(`Pass Rate Change: ${formatDelta(comparison.passRateDelta * 100, "%")}`)
  lines.push(`Token Change:     ${formatDelta(comparison.tokensDelta)} tokens`)
  lines.push(`Duration Change:  ${formatDelta(comparison.durationDelta / 1000, "s")}`)
  lines.push("")

  if (comparison.regressions.length > 0) {
    lines.push(`REGRESSIONS (${comparison.regressions.length})`)
    lines.push("-".repeat(40))
    for (const id of comparison.regressions) {
      lines.push(`  - ${id}`)
    }
    lines.push("")
  }

  if (comparison.improvements.length > 0) {
    lines.push(`IMPROVEMENTS (${comparison.improvements.length})`)
    lines.push("-".repeat(40))
    for (const id of comparison.improvements) {
      lines.push(`  + ${id}`)
    }
    lines.push("")
  }

  lines.push(`Unchanged: ${comparison.unchanged.length} cases`)
  lines.push("")
  lines.push("=".repeat(60))

  return lines.join("\n")
}

/**
 * Save result to leaderboard
 */
export async function saveToLeaderboard(
  result: BenchmarkSuiteResult,
  modelUsed: string,
  trinityEnabled: boolean,
  commitHash?: string,
  notes?: string
): Promise<void> {
  await mkdir(METRICS_DIR, { recursive: true })

  const entry: LeaderboardEntry = {
    runId: `${result.suiteId}-${result.timestamp}`,
    timestamp: result.timestamp,
    suiteId: result.suiteId,
    overallScore: result.overallScore,
    passRate: result.passedCases / result.totalCases,
    avgDurationMs: result.avgDurationMs,
    totalTokens: result.totalTokensUsed,
    modelUsed,
    trinityEnabled,
    commitHash,
    notes,
  }

  const leaderboardPath = join(METRICS_DIR, LEADERBOARD_FILE)
  let leaderboard: LeaderboardEntry[] = []

  try {
    const data = await readFile(leaderboardPath, "utf-8")
    leaderboard = JSON.parse(data)
  } catch {
    // File doesn't exist, start fresh
  }

  leaderboard.push(entry)

  // Sort by score descending
  leaderboard.sort((a, b) => b.overallScore - a.overallScore)

  await writeFile(leaderboardPath, JSON.stringify(leaderboard, null, 2))
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  suiteId?: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const leaderboardPath = join(METRICS_DIR, LEADERBOARD_FILE)

  try {
    const data = await readFile(leaderboardPath, "utf-8")
    let leaderboard: LeaderboardEntry[] = JSON.parse(data)

    if (suiteId) {
      leaderboard = leaderboard.filter(e => e.suiteId === suiteId)
    }

    return leaderboard.slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Format leaderboard as table
 */
export function formatLeaderboard(entries: LeaderboardEntry[]): string {
  if (entries.length === 0) {
    return "No leaderboard entries found."
  }

  const lines: string[] = []
  lines.push("=".repeat(80))
  lines.push("BENCHMARK LEADERBOARD")
  lines.push("=".repeat(80))
  lines.push("")

  lines.push(
    "Rank".padEnd(6) +
    "Score".padEnd(10) +
    "Pass%".padEnd(8) +
    "Tokens".padEnd(10) +
    "Model".padEnd(20) +
    "Date"
  )
  lines.push("-".repeat(80))

  entries.forEach((entry, i) => {
    lines.push(
      `#${i + 1}`.padEnd(6) +
      `${(entry.overallScore * 100).toFixed(1)}%`.padEnd(10) +
      `${(entry.passRate * 100).toFixed(1)}%`.padEnd(8) +
      `${entry.totalTokens.toLocaleString()}`.padEnd(10) +
      entry.modelUsed.slice(0, 18).padEnd(20) +
      new Date(entry.timestamp).toLocaleDateString()
    )
  })

  lines.push("")
  lines.push("=".repeat(80))

  return lines.join("\n")
}

/**
 * Generate Trinity Protocol specific report
 */
export function formatTrinityReport(metrics: TrinityOverallMetrics | undefined): string {
  if (!metrics) {
    return "No Trinity Protocol metrics available."
  }

  const lines: string[] = []
  lines.push("=".repeat(50))
  lines.push("TRINITY PROTOCOL METRICS")
  lines.push("=".repeat(50))
  lines.push("")

  lines.push(`Consensus Rate:       ${(metrics.consensusRate * 100).toFixed(1)}%`)
  lines.push(`Deadlock Rate:        ${(metrics.deadlockRate * 100).toFixed(1)}%`)
  lines.push(`Avg Deliberation:     ${metrics.avgDeliberationTimeMs.toFixed(0)}ms`)
  lines.push("")

  lines.push("Decision Distribution:")
  for (const [decision, count] of Object.entries(metrics.decisionDistribution)) {
    lines.push(`  ${decision}: ${count}`)
  }

  lines.push("")
  lines.push("=".repeat(50))

  return lines.join("\n")
}

// Helper functions

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squareDiffs = values.map(v => Math.pow(v - mean, 2))
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length)
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function groupErrors(results: BenchmarkRunResult[]): Record<string, number> {
  const errorCounts: Record<string, number> = {}

  for (const result of results) {
    if (result.errors) {
      for (const error of result.errors) {
        // Normalize error message
        const normalized = error.slice(0, 50)
        errorCounts[normalized] = (errorCounts[normalized] || 0) + 1
      }
    }
  }

  return errorCounts
}

function formatDelta(value: number, suffix: string = ""): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}${suffix}`
}
