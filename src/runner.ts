/**
 * MAGI Benchmark Runner
 * Executes benchmark suites and collects results
 *
 * This runner can work in two modes:
 * 1. With MAGI installed: Full integration with MAGI system
 * 2. Standalone: Test case definition only (no execution)
 */

import type {
  BenchmarkSuite,
  BenchmarkCase,
  BenchmarkConfig,
  BenchmarkRunResult,
  BenchmarkSuiteResult,
  TrinityBenchmarkMetrics,
  CategoryScore,
  BenchmarkCategory,
} from "./types"
import { loadMagiIntegration, type MagiSystemInterface } from "./magi-integration"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const DEFAULT_CONFIG: BenchmarkConfig = {
  maxConcurrency: 3,
  defaultTimeoutMs: 60000,
  retryCount: 1,
  verbose: false,
  outputDir: "./results",
  saveResults: true,
  enableTrinity: true,
  forceTrinityReview: false,
}

export class BenchmarkRunner {
  private config: BenchmarkConfig
  private magi: MagiSystemInterface | null = null

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize MAGI system for benchmarking
   * Requires MAGI to be installed as a peer dependency
   */
  async initialize(): Promise<void> {
    const integration = await loadMagiIntegration()

    if (!integration) {
      throw new Error(
        "MAGI package not found. Install with: bun add magi\n" +
        "Or run benchmarks from within the MAGI repository."
      )
    }

    // Use environment variables for model configuration
    const unifiedModel = process.env.MAGI_UNIFIED_MODEL

    this.magi = await integration.createSystem({
      enableTrinity: this.config.enableTrinity,
      ...(unifiedModel ? {
        models: {
          melchior: { provider: "anthropic", model: unifiedModel },
          balthasar: { provider: "anthropic", model: unifiedModel },
          caspar: { provider: "anthropic", model: unifiedModel },
        }
      } : {})
    })

    console.log("[Benchmark] MAGI system initialized")
  }

  /**
   * Run a complete benchmark suite
   */
  async runSuite(suite: BenchmarkSuite): Promise<BenchmarkSuiteResult> {
    if (!this.magi) {
      await this.initialize()
    }

    const startTime = Date.now()
    console.log(`\n[Benchmark] Starting suite: ${suite.name}`)
    console.log(`[Benchmark] Total cases: ${suite.cases.length}`)

    // Filter cases based on config
    const filteredCases = this.filterCases(suite.cases)
    console.log(`[Benchmark] Filtered cases: ${filteredCases.length}`)

    // Run cases
    const results: BenchmarkRunResult[] = []
    let completedCount = 0

    for (const testCase of filteredCases) {
      try {
        const result = await this.runCase(testCase, suite.defaultTimeout)
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
    const suiteResult = this.aggregateResults(suite, results, endTime - startTime)

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
    suiteTimeout?: number
  ): Promise<BenchmarkRunResult> {
    const timeout = testCase.timeoutMs || suiteTimeout || this.config.defaultTimeoutMs
    const startTime = Date.now()

    try {
      // Process message through MAGI
      const response = await Promise.race([
        this.magi!.processMessage(testCase.prompt),
        this.createTimeoutPromise(timeout),
      ])

      const durationMs = Date.now() - startTime

      // Validate output
      const validation = this.validateOutput(testCase, response.content)

      // Extract Trinity metrics if deliberation occurred
      const trinityMetrics = response.deliberation
        ? this.extractTrinityMetrics(response.deliberation, durationMs)
        : undefined

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
        trinityMetrics,
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
   * Extract Trinity Protocol metrics from deliberation
   */
  private extractTrinityMetrics(
    deliberation: {
      timeMs: number
      advocateRecommendation?: string
      criticRecommendation?: string
      arbiterDecision?: string
      advocateConfidence?: number
      criticConfidence?: number
      deadlockDetected?: boolean
    },
    totalDurationMs: number
  ): TrinityBenchmarkMetrics {
    return {
      deliberationTimeMs: deliberation.timeMs || totalDurationMs,
      consensusReached: deliberation.arbiterDecision === "approve",
      advocateRecommendation: deliberation.advocateRecommendation,
      criticRecommendation: deliberation.criticRecommendation,
      arbiterDecision: deliberation.arbiterDecision,
      advocateConfidence: deliberation.advocateConfidence,
      criticConfidence: deliberation.criticConfidence,
      deadlockDetected: deliberation.deadlockDetected ?? false,
    }
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
    totalDurationMs: number
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

    // Trinity overall metrics
    const trinityResults = results.filter(r => r.trinityMetrics)
    const trinityOverall = trinityResults.length > 0
      ? {
          avgDeliberationTimeMs: trinityResults.reduce((sum, r) => sum + (r.trinityMetrics?.deliberationTimeMs || 0), 0) / trinityResults.length,
          consensusRate: trinityResults.filter(r => r.trinityMetrics?.consensusReached).length / trinityResults.length,
          deadlockRate: trinityResults.filter(r => r.trinityMetrics?.deadlockDetected).length / trinityResults.length,
          decisionDistribution: this.countDecisions(trinityResults),
        }
      : undefined

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
      trinityOverall,
    }
  }

  /**
   * Count decision distribution
   */
  private countDecisions(results: BenchmarkRunResult[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const r of results) {
      const decision = r.trinityMetrics?.arbiterDecision || "unknown"
      counts[decision] = (counts[decision] || 0) + 1
    }
    return counts
  }

  /**
   * Save results to file
   */
  private async saveResults(result: BenchmarkSuiteResult): Promise<void> {
    try {
      await mkdir(this.config.outputDir, { recursive: true })
      const filename = `${result.suiteId}-${result.timestamp}.json`
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

    if (result.trinityOverall) {
      console.log("\nTrinity Protocol Metrics:")
      console.log(`  Consensus Rate: ${(result.trinityOverall.consensusRate * 100).toFixed(1)}%`)
      console.log(`  Deadlock Rate: ${(result.trinityOverall.deadlockRate * 100).toFixed(1)}%`)
      console.log(`  Avg Deliberation Time: ${result.trinityOverall.avgDeliberationTimeMs.toFixed(0)}ms`)
    }

    console.log("\n" + "=".repeat(60))
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.magi) {
      this.magi.cleanup()
      this.magi = null
    }
  }

  /**
   * Check if MAGI is available
   */
  static async isMAGIAvailable(): Promise<boolean> {
    const integration = await loadMagiIntegration()
    return integration?.isAvailable() ?? false
  }
}

/**
 * Quick benchmark run helper
 */
export async function runBenchmark(
  suite: BenchmarkSuite,
  config?: Partial<BenchmarkConfig>
): Promise<BenchmarkSuiteResult> {
  const runner = new BenchmarkRunner(config)
  try {
    return await runner.runSuite(suite)
  } finally {
    runner.cleanup()
  }
}
