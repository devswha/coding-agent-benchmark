/**
 * Benchmark Runner
 *
 * Executes benchmark suites against any coding agent.
 * Agent-agnostic design allows testing Claude Code, Cursor, Aider, etc.
 */

import type {
  BenchmarkSuite,
  BenchmarkCase,
  BenchmarkConfig,
  BenchmarkRunResult,
  BenchmarkSuiteResult,
  CategoryScore,
  BenchmarkCategory,
} from "./types"
import type { Agent, AgentConfig, AgentResponse } from "./agent"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const DEFAULT_CONFIG: BenchmarkConfig = {
  maxConcurrency: 3,
  defaultTimeoutMs: 60000,
  retryCount: 1,
  verbose: false,
  outputDir: "./results",
  saveResults: true,
  enableTrinity: false,
  forceTrinityReview: false,
}

export class BenchmarkRunner {
  private config: BenchmarkConfig
  private agent: Agent | null = null

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Set the agent to benchmark
   */
  setAgent(agent: Agent): void {
    this.agent = agent
  }

  /**
   * Run a complete benchmark suite
   */
  async runSuite(suite: BenchmarkSuite, agent?: Agent): Promise<BenchmarkSuiteResult> {
    const targetAgent = agent || this.agent
    if (!targetAgent) {
      throw new Error("No agent configured. Call setAgent() or pass agent to runSuite().")
    }

    const startTime = Date.now()
    console.log(`\n[Benchmark] Starting suite: ${suite.name}`)
    console.log(`[Benchmark] Agent: ${targetAgent.name}`)
    console.log(`[Benchmark] Total cases: ${suite.cases.length}`)

    // Filter cases based on config
    const filteredCases = this.filterCases(suite.cases)
    console.log(`[Benchmark] Filtered cases: ${filteredCases.length}`)

    // Run cases
    const results: BenchmarkRunResult[] = []
    let completedCount = 0

    for (const testCase of filteredCases) {
      try {
        const result = await this.runCase(testCase, targetAgent, suite.defaultTimeout)
        results.push(result)
        completedCount++

        if (this.config.verbose) {
          const status = result.passed ? "✓" : "✗"
          console.log(`  ${status} [${completedCount}/${filteredCases.length}] ${testCase.name} (${result.score.toFixed(2)})`)
        }
      } catch (error) {
        console.error(`  ✗ Error in case ${testCase.id}:`, error)
        results.push(this.createErrorResult(testCase, error))
      }
    }

    const endTime = Date.now()
    const suiteResult = this.aggregateResults(suite, results, endTime - startTime, targetAgent.name)

    // Save results
    if (this.config.saveResults) {
      await this.saveResults(suiteResult)
    }

    this.printSummary(suiteResult)
    return suiteResult
  }

  /**
   * Run a single benchmark case
   */
  async runCase(
    testCase: BenchmarkCase,
    agent: Agent,
    suiteTimeout?: number
  ): Promise<BenchmarkRunResult> {
    const timeout = testCase.timeoutMs || suiteTimeout || this.config.defaultTimeoutMs
    const startTime = Date.now()

    try {
      // Execute through agent
      const response = await Promise.race([
        agent.execute(testCase.prompt, { timeoutMs: timeout }),
        this.createTimeoutPromise(timeout),
      ])

      const durationMs = response.durationMs || (Date.now() - startTime)

      // Validate output
      const validation = this.validateOutput(testCase, response.content)

      return {
        caseId: testCase.id,
        caseName: testCase.name,
        category: testCase.category,
        difficulty: testCase.difficulty,
        passed: validation.passed,
        score: validation.score,
        durationMs,
        tokensUsed: response.tokensUsed || this.estimateTokens(testCase.prompt, response.content),
        output: response.content,
        validationDetails: validation.details,
        errors: validation.errors,
      }
    } catch (error) {
      return this.createErrorResult(testCase, error, Date.now() - startTime)
    }
  }

  /**
   * Filter cases based on config
   */
  private filterCases(cases: BenchmarkCase[]): BenchmarkCase[] {
    return cases.filter(c => {
      if (this.config.categories && !this.config.categories.includes(c.category)) {
        return false
      }
      if (this.config.difficulties && !this.config.difficulties.includes(c.difficulty)) {
        return false
      }
      if (this.config.caseIds && !this.config.caseIds.includes(c.id)) {
        return false
      }
      if (this.config.tags && this.config.tags.length > 0) {
        if (!c.tags || !this.config.tags.some(t => c.tags!.includes(t))) {
          return false
        }
      }
      return true
    })
  }

  /**
   * Validate benchmark output
   */
  private validateOutput(
    testCase: BenchmarkCase,
    output: string
  ): { passed: boolean; score: number; details?: string; errors?: string[] } {
    // Custom validation function
    if (testCase.validationFn) {
      return testCase.validationFn(output)
    }

    // Expected output matching
    if (testCase.expectedOutput) {
      const normalizedOutput = output.trim().toLowerCase()
      const normalizedExpected = testCase.expectedOutput.trim().toLowerCase()

      if (normalizedOutput.includes(normalizedExpected)) {
        return { passed: true, score: 1.0 }
      }

      // Partial match scoring
      const similarity = this.calculateSimilarity(normalizedOutput, normalizedExpected)
      return {
        passed: similarity > 0.8,
        score: similarity,
        details: `Similarity: ${(similarity * 100).toFixed(1)}%`,
      }
    }

    // Default: check for non-empty, reasonable response
    if (output && output.length > 10) {
      return { passed: true, score: 0.5, details: "No validation criteria - basic check passed" }
    }

    return {
      passed: false,
      score: 0,
      errors: ["Empty or invalid response"],
    }
  }

  /**
   * Calculate string similarity (Jaccard)
   */
  private calculateSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/))
    const setB = new Set(b.split(/\s+/))
    const intersection = new Set([...setA].filter(x => setB.has(x)))
    const union = new Set([...setA, ...setB])
    return intersection.size / union.size
  }

  /**
   * Estimate token usage
   */
  private estimateTokens(input: string, output: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil((input.length + output.length) / 4)
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    })
  }

  /**
   * Create error result
   */
  private createErrorResult(
    testCase: BenchmarkCase,
    error: unknown,
    durationMs: number = 0
  ): BenchmarkRunResult {
    return {
      caseId: testCase.id,
      caseName: testCase.name,
      category: testCase.category,
      difficulty: testCase.difficulty,
      passed: false,
      score: 0,
      durationMs,
      tokensUsed: 0,
      output: "",
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }

  /**
   * Aggregate results into suite result
   */
  private aggregateResults(
    suite: BenchmarkSuite,
    results: BenchmarkRunResult[],
    totalDurationMs: number,
    agentName: string
  ): BenchmarkSuiteResult {
    const passed = results.filter(r => r.passed)
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0)

    // Score by category
    const scoreByCategory: Record<BenchmarkCategory, CategoryScore> = {} as any
    const categories = [...new Set(results.map(r => r.category))]
    for (const cat of categories) {
      const catResults = results.filter(r => r.category === cat)
      const catPassed = catResults.filter(r => r.passed)
      scoreByCategory[cat] = {
        score: catResults.reduce((sum, r) => sum + r.score, 0) / catResults.length,
        passed: catPassed.length,
        total: catResults.length,
      }
    }

    // Score by difficulty
    const scoreByDifficulty: Record<string, number> = {}
    const difficulties = [...new Set(results.map(r => r.difficulty))]
    for (const diff of difficulties) {
      const diffResults = results.filter(r => r.difficulty === diff)
      scoreByDifficulty[diff] = diffResults.reduce((sum, r) => sum + r.score, 0) / diffResults.length
    }

    return {
      suiteId: suite.id,
      suiteName: suite.name,
      timestamp: Date.now(),
      durationMs: totalDurationMs,
      totalCases: results.length,
      passedCases: passed.length,
      failedCases: results.length - passed.length,
      skippedCases: suite.cases.length - results.length,
      overallScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      scoreByCategory,
      scoreByDifficulty,
      totalTokensUsed: totalTokens,
      avgTokensPerCase: totalTokens / results.length,
      avgDurationMs: totalDurationMs / results.length,
      results,
      agentName,
    }
  }

  /**
   * Save results to file
   */
  private async saveResults(result: BenchmarkSuiteResult): Promise<void> {
    try {
      await mkdir(this.config.outputDir, { recursive: true })
      const agentSlug = (result.agentName || "unknown").toLowerCase().replace(/\s+/g, "-")
      const filename = `${result.suiteId}-${agentSlug}-${result.timestamp}.json`
      const filepath = join(this.config.outputDir, filename)
      await writeFile(filepath, JSON.stringify(result, null, 2))
      console.log(`[Benchmark] Results saved to ${filepath}`)
    } catch (error) {
      console.error("[Benchmark] Failed to save results:", error)
    }
  }

  /**
   * Print summary
   */
  private printSummary(result: BenchmarkSuiteResult): void {
    console.log("\n" + "=".repeat(60))
    console.log(`BENCHMARK RESULTS: ${result.suiteName}`)
    console.log(`Agent: ${result.agentName || "Unknown"}`)
    console.log("=".repeat(60))
    console.log(`\nOverall Score: ${(result.overallScore * 100).toFixed(1)}%`)
    console.log(`Pass Rate: ${result.passedCases}/${result.totalCases} (${((result.passedCases / result.totalCases) * 100).toFixed(1)}%)`)
    console.log(`Total Duration: ${(result.durationMs / 1000).toFixed(1)}s`)
    console.log(`Total Tokens: ${result.totalTokensUsed.toLocaleString()}`)

    console.log("\nBy Category:")
    for (const [cat, score] of Object.entries(result.scoreByCategory)) {
      console.log(`  ${cat}: ${(score.score * 100).toFixed(1)}% (${score.passed}/${score.total})`)
    }

    console.log("\nBy Difficulty:")
    for (const [diff, score] of Object.entries(result.scoreByDifficulty)) {
      console.log(`  ${diff}: ${(score * 100).toFixed(1)}%`)
    }

    console.log("\n" + "=".repeat(60))
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.agent = null
  }
}

/**
 * Quick benchmark run helper
 */
export async function runBenchmark(
  suite: BenchmarkSuite,
  agent: Agent,
  config?: Partial<BenchmarkConfig>
): Promise<BenchmarkSuiteResult> {
  const runner = new BenchmarkRunner(config)
  try {
    return await runner.runSuite(suite, agent)
  } finally {
    runner.cleanup()
  }
}
