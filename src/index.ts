/**
 * Coding Agent Benchmark System
 *
 * A generic benchmark framework for evaluating AI coding agents.
 * Supports any agent that implements the Agent interface.
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
  ValidationResult,
  LeaderboardEntry,
  CategoryScore,
} from "./types"

// Agent interface
export type {
  Agent,
  AgentConfig,
  AgentResponse,
  CLIAgentConfig,
  AgentFactory,
} from "./agent"
export { AgentRegistry, agentRegistry } from "./agent"

// Runner
export { BenchmarkRunner, runBenchmark } from "./runner"

// Benchmark Suites
export { codeGenerationSuite } from "./suites/code-generation"
export { taskCompletionSuite } from "./suites/task-completion"
export { securitySuite } from "./suites/security"
export { sealQASuite, createSealQASuite } from "./suites/sealqa"

// New modules
export * from "./importers"
export * from "./validators"
export * from "./datasets"
export * from "./execution"

// Agent Implementations
export {
  BaseCLIAgent,
  ClaudeCodeAgent,
  ClaudeCodeSisyphusAgent,
  OpenCodeAgent,
  OpenCodeOhMyOpenCodeAgent,
  agents,
  type AgentKey,
} from "./agents"

// All suites combined
import { codeGenerationSuite } from "./suites/code-generation"
import { taskCompletionSuite } from "./suites/task-completion"
import { securitySuite } from "./suites/security"
import { sealQASuite } from "./suites/sealqa"
import type { BenchmarkSuite } from "./types"

export const ALL_SUITES: BenchmarkSuite[] = [
  codeGenerationSuite,
  taskCompletionSuite,
  securitySuite,
  sealQASuite,
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
  agent: import("./agent").Agent,
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
    await runner.runSuite(suite, agent)
  } finally {
    runner.cleanup()
  }
}

/**
 * Run all benchmark suites
 */
export async function runAllBenchmarks(
  agent: import("./agent").Agent,
  options?: {
    verbose?: boolean
  }
): Promise<void> {
  const { BenchmarkRunner } = await import("./runner")

  console.log("\n" + "=".repeat(60))
  console.log("RUNNING ALL BENCHMARKS")
  console.log(`Agent: ${agent.name}`)
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
      await runner.runSuite(suite, agent)
    }
  } finally {
    runner.cleanup()
  }

  console.log("\n" + "=".repeat(60))
  console.log("ALL BENCHMARKS COMPLETE")
  console.log("=".repeat(60))
}
