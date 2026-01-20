/**
 * Agent Comparison Runner
 *
 * Compares different agent backends (MAGI vs Claude Code vs Claude Code + Sisyphus)
 * using real execution via the AgentExecutor interface.
 */

import type {
  AgentType,
  AgentComparisonConfig,
  AgentComparisonResult,
  AgentComparisonReport,
} from "./types"
import type {
  BenchmarkSuite,
  BenchmarkCase,
  BenchmarkSuiteResult,
  BenchmarkRunResult,
  BenchmarkCategory,
  CategoryScore,
} from "../types"
import type { AgentExecutor, ExecutionResult, ExecutionOptions } from "./executors/types"
import type { VerificationConfig, VerificationResult } from "./verification"
import { createWorkspaceManager, type WorkspaceManager } from "./workspace/manager"
import { verifyResult } from "./verification"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { AgentType as AgentTypeEnum, AgentCapability, DEFAULT_AGENT_CONFIGS } from "./types"
import { MAGIExecutor } from "./executors/magi-executor"
import { CLIExecutor, createClaudeCodeExecutor, createClaudeCodeSisyphusExecutor } from "./executors/cli-executor"
import { loadMagiIntegration, type MagiSystemInterface } from "../magi-integration"

// MagiSystem type for backwards compatibility
type MagiSystem = MagiSystemInterface

/**
 * Extended benchmark case with verification config
 */
export interface ExtendedBenchmarkCase extends BenchmarkCase {
  verification?: VerificationConfig
  templatePath?: string
}

/**
 * Extended config with execution mode
 */
export interface ExtendedAgentComparisonConfig extends AgentComparisonConfig {
  /** Use real CLI execution instead of simulated API calls */
  useRealExecution?: boolean

  /** Workspace templates directory */
  templatesDir?: string

  /** Model to use for CLI agents */
  cliModel?: string
}

const DEFAULT_CONFIG: ExtendedAgentComparisonConfig = {
  verbose: false,
  outputDir: "./benchmark/results/agent-comparison",
  saveResults: true,
  defaultTimeoutMs: 120000, // 2 minutes for real execution
  retryCount: 1,
  parallelExecution: false,
  useRealExecution: true,
  templatesDir: "./benchmark/test-projects",
}

export class AgentComparisonRunner {
  private config: ExtendedAgentComparisonConfig
  private executors: Map<AgentType, AgentExecutor> = new Map()
  private workspaceManager: WorkspaceManager | null = null

  // Legacy fields for backwards compatibility
  private magi: MagiSystem | null = null
  private claudeModel: any = null

  constructor(config: Partial<ExtendedAgentComparisonConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize systems for comparison
   */
  async initialize(): Promise<void> {
    // Create workspace manager
    this.workspaceManager = createWorkspaceManager({
      templatesDir: this.config.templatesDir,
    })

    if (this.config.useRealExecution) {
      await this.initializeRealExecutors()
    } else {
      await this.initializeLegacyMode()
    }

    console.log("[AgentComparison] Systems initialized")
    console.log(`[AgentComparison] Mode: ${this.config.useRealExecution ? "Real Execution" : "Simulated (Legacy)"}`)
  }

  /**
   * Initialize real executors for actual CLI/MAGI execution
   */
  private async initializeRealExecutors(): Promise<void> {
    // Create MAGI executor with integration layer
    const integration = await loadMagiIntegration()

    const magiExecutor = new MAGIExecutor({
      createMagiSystem: async (workingDir: string) => {
        if (!integration) {
          throw new Error("MAGI package not installed")
        }
        return integration.createSystem()
      },
      workspaceManager: this.workspaceManager!,
      verbose: this.config.verbose,
    })

    // Check availability and add if available
    if (integration && await magiExecutor.isAvailable()) {
      this.executors.set(AgentTypeEnum.MAGI, magiExecutor)
      console.log("[AgentComparison] MAGI executor: available")
    } else {
      console.warn("[AgentComparison] MAGI executor: not available (install magi package)")
    }

    // Create Claude Code executor
    const claudeCodeExecutor = createClaudeCodeExecutor({
      model: this.config.cliModel,
      workspaceManager: this.workspaceManager!,
      verbose: this.config.verbose,
    })

    if (await claudeCodeExecutor.isAvailable()) {
      this.executors.set(AgentTypeEnum.ClaudeCode, claudeCodeExecutor)
      console.log("[AgentComparison] Claude Code executor: available")
    } else {
      console.warn("[AgentComparison] Claude Code executor: not available (claude CLI not found)")
    }

    // Create Claude Code + Sisyphus executor
    const sisyphusExecutor = createClaudeCodeSisyphusExecutor({
      model: this.config.cliModel,
      workspaceManager: this.workspaceManager!,
      verbose: this.config.verbose,
    })

    if (await sisyphusExecutor.isAvailable()) {
      this.executors.set(AgentTypeEnum.ClaudeCodeSisyphus, sisyphusExecutor)
      console.log("[AgentComparison] Claude Code + Sisyphus executor: available")
    } else {
      console.warn("[AgentComparison] Claude Code + Sisyphus executor: not available")
    }
  }

  /**
   * Initialize legacy mode (simulated API calls)
   */
  private async initializeLegacyMode(): Promise<void> {
    const integration = await loadMagiIntegration()
    if (!integration) {
      throw new Error("MAGI package not installed. Install with: bun add magi")
    }
    this.magi = await integration.createSystem()
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): AgentType[] {
    if (this.config.useRealExecution) {
      return Array.from(this.executors.keys())
    }
    return [AgentTypeEnum.MAGI, AgentTypeEnum.ClaudeCode, AgentTypeEnum.ClaudeCodeSisyphus]
  }

  /**
   * Run comparison across multiple agent types
   */
  async runComparison(
    suite: BenchmarkSuite,
    agents?: AgentType[]
  ): Promise<AgentComparisonResult> {
    if (this.executors.size === 0 && !this.magi && !this.claudeModel) {
      await this.initialize()
    }

    // Use available agents if not specified
    const agentsToRun = agents || this.getAvailableAgents()

    console.log(`\n[AgentComparison] Starting comparison for suite: ${suite.name}`)
    console.log(`[AgentComparison] Agents: ${agentsToRun.join(", ")}`)

    const results = new Map<AgentType, BenchmarkSuiteResult>()

    for (const agent of agentsToRun) {
      console.log(`\n[AgentComparison] Running benchmarks for: ${agent}`)
      const result = await this.runSingleAgent(suite, agent)
      results.set(agent, result)
    }

    const report = this.compareResults(results)

    const comparisonResult: AgentComparisonResult = {
      suiteId: suite.id,
      suiteName: suite.name,
      timestamp: Date.now(),
      agents: agentsToRun,
      results,
      report,
    }

    if (this.config.saveResults) {
      await this.saveComparisonResults(comparisonResult)
    }

    this.printComparisonReport(comparisonResult)
    return comparisonResult
  }

  /**
   * Run benchmark suite for a single agent type
   */
  async runSingleAgent(
    suite: BenchmarkSuite,
    agent: AgentType
  ): Promise<BenchmarkSuiteResult> {
    const startTime = Date.now()
    const results: BenchmarkRunResult[] = []

    console.log(`  Cases: ${suite.cases.length}`)

    for (let i = 0; i < suite.cases.length; i++) {
      const testCase = suite.cases[i] as ExtendedBenchmarkCase
      try {
        const result = await this.runCaseWithAgent(testCase, agent, suite.defaultTimeout)
        results.push(result)

        if (this.config.verbose) {
          const status = result.passed ? "✓" : "✗"
          console.log(`  ${status} [${i + 1}/${suite.cases.length}] ${testCase.name}`)
        }
      } catch (error) {
        console.error(`  ✗ Error in case ${testCase.id}:`, error)
        results.push(this.createErrorResult(testCase, error))
      }
    }

    const durationMs = Date.now() - startTime
    return this.aggregateResults(suite, results, durationMs, agent)
  }

  /**
   * Run a single case with specific agent type
   */
  private async runCaseWithAgent(
    testCase: ExtendedBenchmarkCase,
    agent: AgentType,
    suiteTimeout?: number
  ): Promise<BenchmarkRunResult> {
    const timeout = testCase.timeoutMs || suiteTimeout || this.config.defaultTimeoutMs
    const startTime = Date.now()

    try {
      let response: string
      let filesChanged: string[] = []
      let executionResult: ExecutionResult | undefined

      if (this.config.useRealExecution) {
        // Use new executor infrastructure
        const executor = this.executors.get(agent)
        if (!executor) {
          throw new Error(`No executor available for agent: ${agent}`)
        }

        // Create workspace for the test
        const workspace = await this.workspaceManager!.createWorkspace(testCase.templatePath)

        try {
          const options: ExecutionOptions = {
            workingDir: workspace.path,
            timeoutMs: timeout,
            verbose: this.config.verbose,
          }

          executionResult = await executor.execute(testCase, options)
          response = executionResult.output
          filesChanged = executionResult.filesChanged.map(f => f.path)

          // Run verification if configured
          if (testCase.verification) {
            const verificationResult = await verifyResult(
              executionResult,
              workspace,
              testCase.verification
            )

            // Combine validation results
            const baseValidation = this.validateOutput(testCase, response)
            const combinedScore = (baseValidation.score + verificationResult.score) / 2

            return {
              caseId: testCase.id,
              caseName: testCase.name,
              category: testCase.category,
              difficulty: testCase.difficulty,
              passed: baseValidation.passed && verificationResult.passed,
              score: combinedScore,
              durationMs: executionResult.durationMs,
              tokensUsed: executionResult.tokensUsed,
              output: response,
              validationDetails: `${baseValidation.details || ""}\nVerification: ${verificationResult.summary}`,
              errors: [
                ...(baseValidation.errors || []),
                ...(verificationResult.checks.filter(c => !c.passed).map(c => c.name)),
              ],
            }
          }
        } finally {
          await this.workspaceManager!.cleanup(workspace)
        }
      } else {
        // Legacy mode: simulated execution
        response = await this.runWithLegacyMode(testCase, agent, timeout)
      }

      const durationMs = executionResult?.durationMs || (Date.now() - startTime)
      const validation = this.validateOutput(testCase, response)

      return {
        caseId: testCase.id,
        caseName: testCase.name,
        category: testCase.category,
        difficulty: testCase.difficulty,
        passed: validation.passed,
        score: validation.score,
        durationMs,
        tokensUsed: executionResult?.tokensUsed || this.estimateTokens(testCase.prompt, response),
        output: response,
        validationDetails: validation.details,
        errors: validation.errors,
      }
    } catch (error) {
      return this.createErrorResult(testCase, error, Date.now() - startTime)
    }
  }

  /**
   * Run with legacy mode (simulated API calls)
   */
  private async runWithLegacyMode(
    testCase: BenchmarkCase,
    agent: AgentType,
    timeout: number
  ): Promise<string> {
    switch (agent) {
      case AgentTypeEnum.MAGI:
        return this.runWithMagiLegacy(testCase, timeout)
      case AgentTypeEnum.ClaudeCode:
        return this.runWithClaudeCodeLegacy(testCase, timeout)
      case AgentTypeEnum.ClaudeCodeSisyphus:
        return this.runWithClaudeCodeSisyphusLegacy(testCase, timeout)
      default:
        throw new Error(`Unknown agent type: ${agent}`)
    }
  }

  /**
   * Legacy: Run with MAGI system
   */
  private async runWithMagiLegacy(testCase: BenchmarkCase, timeout: number): Promise<string> {
    const response = await Promise.race([
      this.magi!.processMessage(testCase.prompt),
      this.createTimeoutPromise(timeout),
    ])
    return response.content
  }

  /**
   * Legacy: Run with simulated Claude Code (direct model call)
   */
  private async runWithClaudeCodeLegacy(testCase: BenchmarkCase, timeout: number): Promise<string> {
    const systemPrompt = `You are Claude Code, an AI coding assistant.
You help with coding tasks, debugging, and software development.
Be direct, precise, and focus on solving the problem.`

    const response = await Promise.race([
      this.callModel(systemPrompt, testCase.prompt),
      this.createTimeoutPromise(timeout),
    ])
    return response
  }

  /**
   * Legacy: Run with simulated Claude Code + Sisyphus (enhanced prompts)
   */
  private async runWithClaudeCodeSisyphusLegacy(
    testCase: BenchmarkCase,
    timeout: number
  ): Promise<string> {
    const systemPrompt = `You are Claude Code with Sisyphus orchestration capabilities.

## Core Behaviors

1. **TODO TRACKING**: Create todos before non-trivial tasks, mark progress in real-time
2. **SMART DELEGATION**: Delegate complex/specialized work to subagents
3. **PARALLEL EXECUTION**: Run independent tasks concurrently when beneficial
4. **PERSISTENCE**: Continue until todo list is empty

Be direct, precise, and orchestrate effectively.`

    const response = await Promise.race([
      this.callModel(systemPrompt, testCase.prompt),
      this.createTimeoutPromise(timeout),
    ])
    return response
  }

  /**
   * Call the model directly (for legacy mode)
   */
  private async callModel(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.claudeModel.generate([
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ])

      return response.text || response.content || ""
    } catch (error) {
      throw new Error(`Model call failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Compare results from different agents
   */
  compareResults(results: Map<AgentType, BenchmarkSuiteResult>): AgentComparisonReport {
    const agents = Array.from(results.keys())

    const aggregateStats = this.calculateAggregateStats(agents, results)
    const capabilityComparison = this.calculateCapabilityComparison(agents, results)
    const categoryAnalysis = this.calculateCategoryAnalysis(agents, results)
    const deltas = this.calculateDeltas(agents, results)
    const recommendations = this.generateRecommendations(agents, results, capabilityComparison)
    const insights = this.generateInsights(agents, results, aggregateStats, categoryAnalysis)

    const taskComparisons: any[] = []

    return {
      metadata: {
        generatedAt: Date.now(),
        benchmarkVersion: "2.0.0", // Updated version for new executor infrastructure
        taskCount: results.values().next().value?.totalCases || 0,
        agentsCompared: agents,
      },
      taskComparisons,
      aggregateStats,
      capabilityComparison,
      categoryAnalysis,
      deltas,
      recommendations,
      insights,
    }
  }

  /**
   * Calculate aggregate statistics
   */
  private calculateAggregateStats(
    agents: AgentType[],
    results: Map<AgentType, BenchmarkSuiteResult>
  ) {
    const winsByAgent: Record<AgentType, number> = {} as any
    const avgTimeMs: Record<AgentType, number> = {} as any
    const avgTokens: Record<AgentType, number> = {} as any
    const avgQuality: Record<AgentType, number> = {} as any
    const successRate: Record<AgentType, number> = {} as any
    const tokenEfficiency: Record<AgentType, number> = {} as any
    const timeEfficiency: Record<AgentType, number> = {} as any

    let overallWinner: AgentType | "tie" = "tie"
    let bestScore = -1

    for (const agent of agents) {
      const result = results.get(agent)!
      const passRate = result.totalCases > 0 ? result.passedCases / result.totalCases : 0
      const efficiency = result.totalTokensUsed > 0 ? result.overallScore / (result.totalTokensUsed / 1000) : 0

      avgTimeMs[agent] = result.avgDurationMs
      avgTokens[agent] = result.avgTokensPerCase
      avgQuality[agent] = result.overallScore
      successRate[agent] = passRate
      tokenEfficiency[agent] = efficiency
      timeEfficiency[agent] = result.avgDurationMs > 0 ? result.overallScore / (result.avgDurationMs / 1000) : 0

      if (result.overallScore > bestScore) {
        bestScore = result.overallScore
        overallWinner = agent
      }
    }

    for (const agent of agents) {
      winsByAgent[agent] = 0
    }

    return {
      overallWinner,
      winsByAgent,
      avgTimeMs,
      avgTokens,
      avgQuality,
      successRate,
      tokenEfficiency,
      timeEfficiency,
    }
  }

  /**
   * Calculate capability comparison
   */
  private calculateCapabilityComparison(
    agents: AgentType[],
    _results: Map<AgentType, BenchmarkSuiteResult>
  ) {
    const supportedCapabilities: Record<AgentType, AgentCapability[]> = {} as any
    const avgCapabilityScores: Record<string, Record<AgentType, number>> = {}
    const uniqueCapabilities: Record<AgentType, AgentCapability[]> = {} as any

    for (const agent of agents) {
      const config = DEFAULT_AGENT_CONFIGS[agent]
      supportedCapabilities[agent] = config?.enabledCapabilities || []
      uniqueCapabilities[agent] = []
    }

    return {
      supportedCapabilities,
      avgCapabilityScores,
      uniqueCapabilities,
    }
  }

  /**
   * Calculate category analysis
   */
  private calculateCategoryAnalysis(
    agents: AgentType[],
    results: Map<AgentType, BenchmarkSuiteResult>
  ) {
    const categories: BenchmarkCategory[] = []
    const bestByCategory: Record<string, AgentType> = {}
    const performanceByCategory: Record<string, Record<AgentType, number>> = {}

    const allCategories = new Set<BenchmarkCategory>()
    for (const result of results.values()) {
      Object.keys(result.scoreByCategory).forEach(cat =>
        allCategories.add(cat as BenchmarkCategory)
      )
    }

    categories.push(...allCategories)

    for (const category of allCategories) {
      performanceByCategory[category] = {} as any
      let bestScore = -1
      let bestAgent: AgentType = agents[0]

      for (const agent of agents) {
        const result = results.get(agent)!
        const score = result.scoreByCategory[category]?.score || 0
        performanceByCategory[category][agent] = score

        if (score > bestScore) {
          bestScore = score
          bestAgent = agent
        }
      }

      bestByCategory[category] = bestAgent
    }

    return {
      categories,
      bestByCategory,
      performanceByCategory,
    }
  }

  /**
   * Calculate deltas between agents
   */
  private calculateDeltas(agents: AgentType[], results: Map<AgentType, BenchmarkSuiteResult>) {
    const calculateDelta = (a: BenchmarkSuiteResult, b: BenchmarkSuiteResult) => {
      const aPassRate = a.totalCases > 0 ? a.passedCases / a.totalCases : 0
      const bPassRate = b.totalCases > 0 ? b.passedCases / b.totalCases : 0

      return {
        timeImprovement: b.avgDurationMs > 0 ? ((b.avgDurationMs - a.avgDurationMs) / b.avgDurationMs) * 100 : 0,
        tokenImprovement: b.totalTokensUsed > 0 ? ((b.totalTokensUsed - a.totalTokensUsed) / b.totalTokensUsed) * 100 : 0,
        qualityImprovement: b.overallScore > 0 ? ((a.overallScore - b.overallScore) / b.overallScore) * 100 : 0,
        successRateImprovement: bPassRate > 0 ? ((aPassRate - bPassRate) / bPassRate) * 100 : 0,
      }
    }

    const magiResult = results.get(AgentTypeEnum.MAGI)
    const claudeCodeResult = results.get(AgentTypeEnum.ClaudeCode)
    const sisyphusResult = results.get(AgentTypeEnum.ClaudeCodeSisyphus)

    const defaultDelta = {
      timeImprovement: 0,
      tokenImprovement: 0,
      qualityImprovement: 0,
      successRateImprovement: 0,
    }

    return {
      magiVsClaudeCode: magiResult && claudeCodeResult ? calculateDelta(magiResult, claudeCodeResult) : defaultDelta,
      magiVsSisyphus: magiResult && sisyphusResult ? calculateDelta(magiResult, sisyphusResult) : defaultDelta,
      sisyphusVsClaudeCode: sisyphusResult && claudeCodeResult ? calculateDelta(sisyphusResult, claudeCodeResult) : defaultDelta,
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    agents: AgentType[],
    results: Map<AgentType, BenchmarkSuiteResult>,
    _capabilityComparison: any
  ) {
    const useCases: Record<AgentType, string[]> = {} as any
    const strengths: Record<AgentType, string[]> = {} as any
    const weaknesses: Record<AgentType, string[]> = {} as any

    for (const agent of agents) {
      const result = results.get(agent)!

      useCases[agent] = []
      if (result.overallScore > 0.8) {
        useCases[agent].push("Complex multi-step tasks")
      }
      if (result.avgDurationMs < 10000) {
        useCases[agent].push("Time-sensitive operations")
      }

      strengths[agent] = []
      if (result.overallScore > 0.7) {
        strengths[agent].push("High task completion rate")
      }

      weaknesses[agent] = []
      if (result.avgDurationMs > 15000) {
        weaknesses[agent].push("Slower response times")
      }
    }

    return { useCases, strengths, weaknesses }
  }

  /**
   * Generate insights
   */
  private generateInsights(
    agents: AgentType[],
    results: Map<AgentType, BenchmarkSuiteResult>,
    aggregateStats: any,
    _categoryAnalysis: any
  ): string[] {
    const insights: string[] = []

    const winner = aggregateStats.overallWinner
    insights.push(`${winner} achieved the highest overall score`)

    for (const agent of agents) {
      const result = results.get(agent)!
      const passRate = result.totalCases > 0 ? (result.passedCases / result.totalCases * 100).toFixed(1) : "0"
      insights.push(`${agent}: ${passRate}% pass rate, ${result.avgDurationMs.toFixed(0)}ms avg duration`)
    }

    // Add execution mode insight
    insights.push(`Execution mode: ${this.config.useRealExecution ? "Real CLI execution" : "Simulated API calls"}`)

    return insights
  }

  /**
   * Validate output
   */
  private validateOutput(
    testCase: BenchmarkCase,
    output: string
  ): { passed: boolean; score: number; details?: string; errors?: string[] } {
    if (testCase.validationFn) {
      return testCase.validationFn(output)
    }

    if (testCase.expectedOutput) {
      const normalizedOutput = output.trim().toLowerCase()
      const normalizedExpected = testCase.expectedOutput.trim().toLowerCase()

      if (normalizedOutput.includes(normalizedExpected)) {
        return { passed: true, score: 1.0 }
      }

      const similarity = this.calculateSimilarity(normalizedOutput, normalizedExpected)
      return {
        passed: similarity > 0.8,
        score: similarity,
        details: `Similarity: ${(similarity * 100).toFixed(1)}%`,
      }
    }

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
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * Estimate token usage
   */
  private estimateTokens(input: string, output: string): number {
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
   * Aggregate results
   */
  private aggregateResults(
    suite: BenchmarkSuite,
    results: BenchmarkRunResult[],
    totalDurationMs: number,
    agent: AgentType
  ): BenchmarkSuiteResult {
    const passed = results.filter(r => r.passed)
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0)

    const scoreByCategory: Record<BenchmarkCategory, CategoryScore> = {} as any
    const categories = [...new Set(results.map(r => r.category))]
    for (const cat of categories) {
      const catResults = results.filter(r => r.category === cat)
      const catPassed = catResults.filter(r => r.passed)
      scoreByCategory[cat] = {
        score: catResults.length > 0 ? catResults.reduce((sum, r) => sum + r.score, 0) / catResults.length : 0,
        passed: catPassed.length,
        total: catResults.length,
      }
    }

    const scoreByDifficulty: Record<string, number> = {}
    const difficulties = [...new Set(results.map(r => r.difficulty))]
    for (const diff of difficulties) {
      const diffResults = results.filter(r => r.difficulty === diff)
      scoreByDifficulty[diff] = diffResults.length > 0 ? diffResults.reduce((sum, r) => sum + r.score, 0) / diffResults.length : 0
    }

    return {
      suiteId: `${suite.id}-${agent}`,
      suiteName: `${suite.name} (${agent})`,
      timestamp: Date.now(),
      durationMs: totalDurationMs,
      totalCases: results.length,
      passedCases: passed.length,
      failedCases: results.length - passed.length,
      skippedCases: suite.cases.length - results.length,
      overallScore: results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0,
      scoreByCategory,
      scoreByDifficulty,
      totalTokensUsed: totalTokens,
      avgTokensPerCase: results.length > 0 ? totalTokens / results.length : 0,
      avgDurationMs: results.length > 0 ? totalDurationMs / results.length : 0,
      results,
    }
  }

  /**
   * Save comparison results
   */
  private async saveComparisonResults(result: AgentComparisonResult): Promise<void> {
    try {
      await mkdir(this.config.outputDir, { recursive: true })
      const filename = `comparison-${result.suiteId}-${result.timestamp}.json`
      const filepath = join(this.config.outputDir, filename)

      const serializable = {
        ...result,
        results: Object.fromEntries(result.results),
      }

      await writeFile(filepath, JSON.stringify(serializable, null, 2))
      console.log(`[AgentComparison] Results saved to ${filepath}`)
    } catch (error) {
      console.error("[AgentComparison] Failed to save results:", error)
    }
  }

  /**
   * Print comparison report
   */
  private printComparisonReport(result: AgentComparisonResult): void {
    console.log("\n" + "=".repeat(70))
    console.log(`AGENT COMPARISON: ${result.suiteName}`)
    console.log("=".repeat(70))

    console.log("\n🏆 WINNER:", result.report.aggregateStats.overallWinner.toString().toUpperCase())

    console.log("\n📊 OVERALL SCORES:")
    for (const [agent, score] of Object.entries(result.report.aggregateStats.avgQuality)) {
      console.log(`  ${agent}: ${((score as number) * 100).toFixed(1)}%`)
    }

    console.log("\n⚡ TOKEN EFFICIENCY:")
    for (const [agent, eff] of Object.entries(result.report.aggregateStats.tokenEfficiency)) {
      console.log(`  ${agent}: ${(eff as number).toFixed(3)} score per 1K tokens`)
    }

    console.log("\n💡 KEY INSIGHTS:")
    for (const insight of result.report.insights) {
      console.log(`  • ${insight}`)
    }

    console.log("\n" + "=".repeat(70))
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    // Cleanup executors
    for (const executor of this.executors.values()) {
      executor.cleanup()
    }
    this.executors.clear()

    // Cleanup workspace manager
    if (this.workspaceManager) {
      this.workspaceManager.cleanupOld()
    }

    // Legacy cleanup
    if (this.magi) {
      this.magi.cleanup()
      this.magi = null
    }
  }
}

/**
 * Quick comparison helper
 */
export async function compareAgents(
  suite: BenchmarkSuite,
  agents?: AgentType[],
  config?: Partial<ExtendedAgentComparisonConfig>
): Promise<AgentComparisonResult> {
  const runner = new AgentComparisonRunner(config)
  try {
    return await runner.runComparison(suite, agents)
  } finally {
    runner.cleanup()
  }
}
