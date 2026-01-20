/**
 * Agent Comparison Report Generation
 *
 * Generate human-readable reports from agent comparison results
 */

import type {
  AgentType,
  SimpleAgentComparisonReport,
  LeaderboardData,
  AgentLeaderboardEntry,
  ComparisonMatrix,
  ImprovementSuggestion,
  CapabilityScore,
  CategoryWinner,
  MetricDeltas,
  CapabilityType,
} from "./types"
import type { BenchmarkCategory, BenchmarkSuiteResult, CategoryScore as BenchmarkCategoryScore } from "../types"

/**
 * Generate comprehensive comparison report from multiple agent benchmark results
 */
export function generateComparisonReport(
  results: Map<AgentType, BenchmarkSuiteResult>
): SimpleAgentComparisonReport {
  const agents = Array.from(results.keys())

  // Calculate category winners
  const categoryWinners = calculateCategoryWinners(results)

  // Calculate metric deltas
  const metricDeltas = calculateMetricDeltas(results)

  // Calculate capability scores
  const capabilityScores = calculateCapabilityScores(results)

  // Determine overall winner
  const { winner, justification } = determineOverallWinner(
    results,
    categoryWinners,
    capabilityScores
  )

  return {
    timestamp: Date.now(),
    comparisonId: `cmp-${Date.now()}`,
    agents,
    results,
    overallWinner: winner,
    winnerJustification: justification,
    categoryWinners,
    metricDeltas,
    capabilityScores,
  }
}

/**
 * Calculate winners for each benchmark category
 */
function calculateCategoryWinners(
  results: Map<AgentType, BenchmarkSuiteResult>
): Map<BenchmarkCategory, CategoryWinner> {
  const winners = new Map<BenchmarkCategory, CategoryWinner>()

  // Get all unique categories from all results
  const categories = new Set<BenchmarkCategory>()
  for (const result of results.values()) {
    Object.keys(result.scoreByCategory).forEach((cat) =>
      categories.add(cat as BenchmarkCategory)
    )
  }

  // For each category, find the winner
  for (const category of categories) {
    const scores = new Map<AgentType, number>()

    for (const [agent, result] of results.entries()) {
      const categoryScore = result.scoreByCategory[category]?.score ?? 0
      scores.set(agent, categoryScore)
    }

    // Find winner
    const sortedScores = Array.from(scores.entries()).sort(
      (a, b) => b[1] - a[1]
    )

    if (sortedScores.length > 0) {
      const [winner, winnerScore] = sortedScores[0]
      const secondPlace = sortedScores[1]?.[1] ?? 0
      const margin =
        secondPlace > 0 ? ((winnerScore - secondPlace) / secondPlace) * 100 : 100

      winners.set(category, {
        category,
        winner,
        scores,
        margin,
      })
    }
  }

  return winners
}

/**
 * Calculate metric deltas relative to best performer
 */
function calculateMetricDeltas(
  results: Map<AgentType, BenchmarkSuiteResult>
): Map<AgentType, MetricDeltas> {
  const deltas = new Map<AgentType, MetricDeltas>()

  // Find best in each metric
  let bestScore = 0
  let bestPassRate = 0
  let leastTokens = Infinity
  let shortestDuration = Infinity

  for (const result of results.values()) {
    bestScore = Math.max(bestScore, result.overallScore)
    const passRate = result.totalCases > 0 ? result.passedCases / result.totalCases : 0
    bestPassRate = Math.max(bestPassRate, passRate)
    leastTokens = Math.min(leastTokens, result.totalTokensUsed)
    shortestDuration = Math.min(shortestDuration, result.avgDurationMs)
  }

  // Calculate deltas for each agent
  for (const [agent, result] of results.entries()) {
    const passRate = result.totalCases > 0 ? result.passedCases / result.totalCases : 0

    const scoreDelta = bestScore > 0 ? ((result.overallScore - bestScore) / bestScore) * 100 : 0
    const passRateDelta = bestPassRate > 0 ? ((passRate - bestPassRate) / bestPassRate) * 100 : 0
    const tokensDelta = leastTokens > 0 && leastTokens !== Infinity
      ? ((result.totalTokensUsed - leastTokens) / leastTokens) * 100 : 0
    const durationDelta = shortestDuration > 0 && shortestDuration !== Infinity
      ? ((result.avgDurationMs - shortestDuration) / shortestDuration) * 100 : 0

    // Efficiency: score per 1k tokens
    const efficiency = result.totalTokensUsed > 0 ? (result.overallScore / result.totalTokensUsed) * 1000 : 0
    const bestEfficiency = leastTokens > 0 && leastTokens !== Infinity ? (bestScore / leastTokens) * 1000 : 0
    const efficiencyDelta = bestEfficiency > 0 ? ((efficiency - bestEfficiency) / bestEfficiency) * 100 : 0

    deltas.set(agent, {
      scoreDelta,
      passRateDelta,
      tokensDelta,
      durationDelta,
      efficiencyDelta,
    })
  }

  return deltas
}

/**
 * Calculate capability scores for each agent
 */
export function calculateCapabilityScores(
  results: Map<AgentType, BenchmarkSuiteResult>
): Map<AgentType, CapabilityScore[]> {
  const scores = new Map<AgentType, CapabilityScore[]>()

  for (const [agent, result] of results.entries()) {
    const capabilities: CapabilityScore[] = []

    // Multi-agent orchestration (if Trinity metrics available)
    if (result.trinityOverall) {
      capabilities.push({
        capability: "multi_agent_orchestration",
        score: result.trinityOverall.consensusRate * 100,
        confidence: 0.9,
        evidence: [
          `Consensus rate: ${(result.trinityOverall.consensusRate * 100).toFixed(1)}%`,
          `Deadlock rate: ${(result.trinityOverall.deadlockRate * 100).toFixed(1)}%`,
        ],
      })
    }

    // Planning quality (based on trinity_decision category)
    const planningCategory = result.scoreByCategory["trinity_decision"]
    if (planningCategory) {
      capabilities.push({
        capability: "planning_quality",
        score: planningCategory.score * 100,
        confidence: 0.85,
        evidence: [
          `Trinity decisions: ${planningCategory.passed}/${planningCategory.total} passed`,
        ],
      })
    }

    // Code generation
    const codeGenCategory = result.scoreByCategory["code_generation"]
    if (codeGenCategory) {
      capabilities.push({
        capability: "code_generation",
        score: codeGenCategory.score * 100,
        confidence: 0.9,
        evidence: [
          `Code gen: ${codeGenCategory.passed}/${codeGenCategory.total} passed`,
        ],
      })
    }

    // Task completion
    const taskCategory = result.scoreByCategory["task_completion"]
    if (taskCategory) {
      capabilities.push({
        capability: "task_completion",
        score: taskCategory.score * 100,
        confidence: 0.9,
        evidence: [
          `Task completion: ${taskCategory.passed}/${taskCategory.total} passed`,
        ],
      })
    }

    // Error recovery (based on bug_fixing category)
    const bugFixCategory = result.scoreByCategory["bug_fixing"]
    if (bugFixCategory) {
      capabilities.push({
        capability: "error_recovery",
        score: bugFixCategory.score * 100,
        confidence: 0.8,
        evidence: [
          `Bug fixing: ${bugFixCategory.passed}/${bugFixCategory.total} passed`,
        ],
      })
    }

    // Token efficiency
    const efficiency = result.totalTokensUsed > 0 ? (result.overallScore / result.totalTokensUsed) * 1000 : 0
    const maxEfficiency = Math.max(
      ...Array.from(results.values()).map(
        (r) => r.totalTokensUsed > 0 ? (r.overallScore / r.totalTokensUsed) * 1000 : 0
      )
    )
    capabilities.push({
      capability: "token_efficiency",
      score: maxEfficiency > 0 ? (efficiency / maxEfficiency) * 100 : 0,
      confidence: 0.95,
      evidence: [
        `Efficiency: ${efficiency.toFixed(2)} score per 1k tokens`,
        `Total tokens: ${result.totalTokensUsed.toLocaleString()}`,
      ],
    })

    // Speed
    const minDuration = Math.min(
      ...Array.from(results.values()).map((r) => r.avgDurationMs)
    )
    capabilities.push({
      capability: "speed",
      score: result.avgDurationMs > 0 ? (minDuration / result.avgDurationMs) * 100 : 0,
      confidence: 0.95,
      evidence: [
        `Avg duration: ${result.avgDurationMs.toFixed(0)}ms`,
        `Total time: ${(result.durationMs / 1000).toFixed(1)}s`,
      ],
    })

    // Consistency (based on variance in scores)
    const categoryScores = Object.values(result.scoreByCategory).map(
      (c: BenchmarkCategoryScore) => c.score
    )
    const avgCategoryScore = categoryScores.length > 0
      ? categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length
      : 0
    const variance = categoryScores.length > 0
      ? categoryScores.reduce((sum, s) => sum + Math.pow(s - avgCategoryScore, 2), 0) / categoryScores.length
      : 0
    const stdDev = Math.sqrt(variance)
    const consistencyScore = Math.max(0, 100 - stdDev * 100)
    capabilities.push({
      capability: "consistency",
      score: consistencyScore,
      confidence: 0.8,
      evidence: [
        `Std dev: ${(stdDev * 100).toFixed(1)}%`,
        `Category scores: ${categoryScores.map((s) => (s * 100).toFixed(0)).join(", ")}`,
      ],
    })

    scores.set(agent, capabilities)
  }

  return scores
}

/**
 * Determine overall winner with justification
 */
function determineOverallWinner(
  results: Map<AgentType, BenchmarkSuiteResult>,
  categoryWinners: Map<BenchmarkCategory, CategoryWinner>,
  capabilityScores: Map<AgentType, CapabilityScore[]>
): { winner: AgentType; justification: string } {
  // Score each agent based on multiple factors
  const agentScores = new Map<AgentType, number>()

  for (const agent of results.keys()) {
    let score = 0

    // Factor 1: Overall benchmark score (40%)
    const result = results.get(agent)!
    score += result.overallScore * 0.4

    // Factor 2: Category wins (30%)
    const categoryWinCount = Array.from(categoryWinners.values()).filter(
      (w) => w.winner === agent
    ).length
    score += categoryWinners.size > 0 ? (categoryWinCount / categoryWinners.size) * 0.3 : 0

    // Factor 3: Average capability score (30%)
    const capabilities = capabilityScores.get(agent) ?? []
    const avgCapability = capabilities.length > 0
      ? capabilities.reduce((sum, c) => sum + c.score, 0) / capabilities.length
      : 0
    score += (avgCapability / 100) * 0.3

    agentScores.set(agent, score)
  }

  // Find winner
  const sortedAgents = Array.from(agentScores.entries()).sort(
    (a, b) => b[1] - a[1]
  )
  const [winner, winnerScore] = sortedAgents[0]

  // Build justification
  const result = results.get(winner)!
  const categoryWinCount = Array.from(categoryWinners.values()).filter(
    (w) => w.winner === winner
  ).length
  const capabilities = capabilityScores.get(winner) ?? []
  const topCapabilities = capabilities
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const passRatePercent = result.totalCases > 0 ? ((result.passedCases / result.totalCases) * 100).toFixed(1) : "0.0"
  const justification = [
    `Overall score: ${(result.overallScore * 100).toFixed(1)}%`,
    `Pass rate: ${passRatePercent}%`,
    `Category wins: ${categoryWinCount}/${categoryWinners.size}`,
    `Top capabilities: ${topCapabilities.map((c) => c.capability).join(", ")}`,
  ].join(" | ")

  return { winner, justification }
}

/**
 * Format comparison report as markdown
 */
export function formatComparisonReport(report: SimpleAgentComparisonReport): string {
  const lines: string[] = []

  // Header
  lines.push("# Agent Comparison Report")
  lines.push("")
  lines.push(`**Date:** ${new Date(report.timestamp).toISOString()}`)
  lines.push(`**Comparison ID:** ${report.comparisonId}`)
  lines.push("")

  // Overall Winner
  lines.push("## 🏆 Overall Winner")
  lines.push("")
  lines.push(`**${report.overallWinner}**`)
  lines.push("")
  lines.push(`*${report.winnerJustification}*`)
  lines.push("")

  // Leaderboard
  lines.push("## 📊 Leaderboard")
  lines.push("")
  lines.push("| Rank | Agent | Score | Pass Rate | Tokens | Avg Duration |")
  lines.push("|------|-------|-------|-----------|--------|--------------|")

  const leaderboard = generateLeaderboard(report)
  for (const entry of leaderboard.agents) {
    lines.push(
      `| ${entry.rank} | ${entry.agent} | ${entry.overallScore.toFixed(2)} | ${entry.passRate.toFixed(1)}% | ${entry.totalTokens} | ${entry.avgDurationMs.toFixed(0)}ms |`
    )
  }
  lines.push("")

  // Category Winners
  lines.push("## 🎯 Category Winners")
  lines.push("")
  for (const [category, winner] of report.categoryWinners) {
    lines.push(`### ${category}`)
    lines.push("")
    lines.push(`**Winner:** ${winner.winner} (margin: ${winner.margin.toFixed(1)}%)`)
    lines.push("")
    lines.push("| Agent | Score |")
    lines.push("|-------|-------|")
    for (const [agent, score] of winner.scores) {
      const isWinner = agent === winner.winner
      lines.push(`| ${isWinner ? "**" + agent + "**" : agent} | ${score.toFixed(2)} |`)
    }
    lines.push("")
  }

  // Metric Deltas
  lines.push("## 📈 Performance Deltas (vs. Best)")
  lines.push("")
  lines.push("| Agent | Score Δ | Pass Rate Δ | Tokens Δ | Duration Δ | Efficiency Δ |")
  lines.push("|-------|---------|-------------|----------|------------|--------------|")

  for (const agent of report.agents) {
    const deltas = report.metricDeltas.get(agent)!
    const formatDelta = (d: number) => {
      const sign = d > 0 ? "+" : ""
      return `${sign}${d.toFixed(1)}%`
    }

    lines.push(
      `| ${agent} | ${formatDelta(deltas.scoreDelta)} | ${formatDelta(deltas.passRateDelta)} | ${formatDelta(deltas.tokensDelta)} | ${formatDelta(deltas.durationDelta)} | ${formatDelta(deltas.efficiencyDelta)} |`
    )
  }
  lines.push("")

  // Capability Scores
  lines.push("## 💪 Capability Breakdown")
  lines.push("")

  const matrix = generateComparisonMatrix(report)
  lines.push("| Capability | " + matrix.agents.join(" | ") + " |")
  lines.push("|------------|" + matrix.agents.map(() => "-------").join("|") + "|")

  const capabilities = matrix.metrics
  for (let i = 0; i < capabilities.length; i++) {
    const row = [capabilities[i]]
    for (let j = 0; j < matrix.agents.length; j++) {
      row.push(matrix.data[j][i].toFixed(0))
    }
    lines.push("| " + row.join(" | ") + " |")
  }
  lines.push("")

  // Improvement Suggestions
  const suggestions = generateImprovementSuggestions(report)
  if (suggestions.length > 0) {
    lines.push("## 💡 Improvement Suggestions")
    lines.push("")

    for (const suggestion of suggestions) {
      const priority = suggestion.priority === "high" ? "🔴" : suggestion.priority === "medium" ? "🟡" : "🟢"
      lines.push(`### ${priority} ${suggestion.agent}`)
      lines.push("")
      lines.push(`**Weakness:** ${suggestion.weakness}`)
      lines.push(`**Suggestion:** ${suggestion.suggestion}`)
      lines.push("")
    }
  }

  return lines.join("\n")
}

/**
 * Generate leaderboard from comparison report
 */
export function generateLeaderboard(report: SimpleAgentComparisonReport): LeaderboardData {
  const entries: AgentLeaderboardEntry[] = []

  for (const agent of report.agents) {
    const result = report.results.get(agent)!
    const deltas = report.metricDeltas.get(agent)!
    const capabilities = report.capabilityScores.get(agent) || []

    const passRate = result.totalCases > 0 ? (result.passedCases / result.totalCases) * 100 : 0
    const efficiency = result.totalTokensUsed > 0 ? (result.overallScore / result.totalTokensUsed) * 1000 : 0

    // Calculate category scores
    const categoryScores: Record<BenchmarkCategory, number> = {} as any
    for (const [category, score] of Object.entries(result.scoreByCategory)) {
      categoryScores[category as BenchmarkCategory] = score.score
    }

    // Assign badges
    const badges: string[] = []
    if (agent === report.overallWinner) {
      badges.push("🏆 Overall Winner")
    }

    // Check for category wins
    for (const [category, winner] of report.categoryWinners) {
      if (winner.winner === agent) {
        badges.push(`🎯 Best ${category}`)
      }
    }

    // Performance badges
    if (deltas.tokensDelta <= 0) {
      badges.push("⚡ Most Token Efficient")
    }
    if (deltas.durationDelta <= 0) {
      badges.push("🚀 Fastest")
    }
    if (deltas.efficiencyDelta >= -5) {
      badges.push("💎 High Efficiency")
    }

    entries.push({
      agent,
      rank: 0, // Will be set after sorting
      overallScore: result.overallScore,
      passRate,
      avgDurationMs: result.avgDurationMs,
      totalTokens: result.totalTokensUsed,
      efficiency,
      categoryScores,
      capabilities,
      badges,
    })
  }

  // Sort by overall score and assign ranks
  entries.sort((a, b) => b.overallScore - a.overallScore)
  entries.forEach((entry, index) => {
    entry.rank = index + 1
  })

  return {
    agents: entries,
    lastUpdated: report.timestamp,
    comparisonId: report.comparisonId,
  }
}

/**
 * Generate comparison matrix for visualization
 */
export function generateComparisonMatrix(report: SimpleAgentComparisonReport): ComparisonMatrix {
  const agents = report.agents
  const capabilities = [
    "code_generation",
    "task_completion",
    "planning_quality",
    "token_efficiency",
    "speed",
    "consistency",
  ]

  const data: number[][] = []

  for (const agent of agents) {
    const agentCapabilities = report.capabilityScores.get(agent) || []
    const row: number[] = []

    for (const capability of capabilities) {
      const score = agentCapabilities.find((c) => c.capability === capability)?.score ?? 0
      row.push(score)
    }

    data.push(row)
  }

  return {
    agents,
    metrics: capabilities,
    data,
  }
}

/**
 * Generate improvement suggestions based on weaknesses
 */
export function generateImprovementSuggestions(report: SimpleAgentComparisonReport): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = []

  for (const agent of report.agents) {
    const capabilities = report.capabilityScores.get(agent) || []

    // Find weakest capability
    let weakest: CapabilityScore | null = null
    for (const capability of capabilities) {
      if (!weakest || capability.score < weakest.score) {
        weakest = capability
      }
    }

    if (weakest && weakest.score < 70) {
      const priority = weakest.score < 50 ? "high" : weakest.score < 60 ? "medium" : "low"

      const suggestionMap: Record<string, string> = {
        code_generation: "Improve code generation by training on more diverse code examples and patterns",
        task_completion: "Enhance task completion by improving planning and step-by-step execution",
        planning_quality: "Improve planning by implementing better decomposition and dependency analysis",
        token_efficiency: "Optimize token usage by reducing redundancy and improving context management",
        speed: "Improve speed by optimizing inference pipeline and reducing latency",
        consistency: "Enhance consistency by improving context retention and decision-making stability",
        multi_agent_orchestration: "Improve orchestration by refining agent coordination and communication protocols",
        error_recovery: "Enhance error recovery by implementing better failure detection and retry mechanisms",
      }

      suggestions.push({
        agent,
        weakness: weakest.capability,
        suggestion: suggestionMap[weakest.capability] || "Consider targeted improvements in this area",
        priority,
      })
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return suggestions
}

/**
 * Format comparison report as markdown for documentation
 */
export function formatMarkdownReport(report: SimpleAgentComparisonReport): string {
  const lines: string[] = []

  // Header
  lines.push("# Agent Comparison Report")
  lines.push("")
  lines.push(`**Generated:** ${new Date(report.timestamp).toISOString()}  `)
  lines.push(`**Comparison ID:** ${report.comparisonId}`)
  lines.push("")

  // Overall winner
  lines.push("## Overall Winner")
  lines.push("")
  lines.push(`**🏆 ${report.overallWinner.toUpperCase()}**`)
  lines.push("")
  lines.push(report.winnerJustification)
  lines.push("")

  // Overall metrics
  lines.push("## Overall Metrics")
  lines.push("")
  lines.push("| Agent | Score | Pass Rate | Tokens | Avg Duration | Efficiency |")
  lines.push("|-------|-------|-----------|--------|--------------|------------|")

  for (const agent of report.agents) {
    const result = report.results.get(agent)!
    const delta = report.metricDeltas.get(agent)!

    const formatDelta = (d: number) => {
      if (Math.abs(d) < 0.1) return "(-)"
      const sign = d > 0 ? "+" : ""
      return `(${sign}${d.toFixed(1)}%)`
    }

    const passRatePercent = result.totalCases > 0 ? ((result.passedCases / result.totalCases) * 100).toFixed(1) : "0.0"
    const efficiencyValue = result.totalTokensUsed > 0 ? ((result.overallScore / result.totalTokensUsed) * 1000).toFixed(2) : "0.00"
    lines.push(
      `| ${agent} | ${(result.overallScore * 100).toFixed(1)}% ${formatDelta(delta.scoreDelta)} | ${passRatePercent}% ${formatDelta(delta.passRateDelta)} | ${(result.totalTokensUsed / 1000).toFixed(1)}k ${formatDelta(delta.tokensDelta)} | ${result.avgDurationMs.toFixed(0)}ms ${formatDelta(delta.durationDelta)} | ${efficiencyValue} ${formatDelta(delta.efficiencyDelta)} |`
    )
  }
  lines.push("")

  // Category winners
  lines.push("## Category Winners")
  lines.push("")
  for (const [category, winner] of report.categoryWinners.entries()) {
    lines.push(`**${category}:** ${winner.winner} (margin: ${winner.margin.toFixed(1)}%)`)

    const scoresStr = Array.from(winner.scores.entries())
      .map(([agent, score]) => `${agent}: ${(score * 100).toFixed(1)}%`)
      .join(", ")
    lines.push(`- ${scoresStr}`)
    lines.push("")
  }

  // Capability comparison
  lines.push("## Capability Comparison")
  lines.push("")
  lines.push(
    `| Capability | ${report.agents.join(" | ")} |`
  )
  lines.push(
    `|------------|${report.agents.map(() => "---").join("|")}|`
  )

  const capabilities: CapabilityType[] = [
    "code_generation",
    "task_completion",
    "error_recovery",
    "planning_quality",
    "token_efficiency",
    "speed",
    "consistency",
  ]

  for (const capability of capabilities) {
    const scores = report.agents.map((agent) => {
      const agentCapabilities = report.capabilityScores.get(agent) ?? []
      const capScore = agentCapabilities.find((c) => c.capability === capability)
      return capScore ? `${capScore.score.toFixed(1)}` : "N/A"
    })

    lines.push(
      `| ${capability.replace(/_/g, " ")} | ${scores.join(" | ")} |`
    )
  }
  lines.push("")

  return lines.join("\n")
}

/**
 * Generate leaderboard data for frontend display
 */
export function generateLeaderboardData(
  report: SimpleAgentComparisonReport
): LeaderboardData {
  const entries: AgentLeaderboardEntry[] = []

  // Calculate rankings based on overall score
  const sortedAgents = Array.from(report.results.entries())
    .sort((a, b) => b[1].overallScore - a[1].overallScore)
    .map(([agent]) => agent)

  for (let i = 0; i < sortedAgents.length; i++) {
    const agent = sortedAgents[i]
    const result = report.results.get(agent)!
    const capabilities = report.capabilityScores.get(agent) ?? []

    // Determine badges
    const badges = determineBadges(
      agent,
      result,
      capabilities,
      report.categoryWinners
    )

    // Extract category scores
    const categoryScores: Record<BenchmarkCategory, number> = {} as any
    for (const [category, score] of Object.entries(result.scoreByCategory)) {
      categoryScores[category as BenchmarkCategory] = score.score
    }

    entries.push({
      agent,
      rank: i + 1,
      overallScore: result.overallScore,
      passRate: result.totalCases > 0 ? result.passedCases / result.totalCases : 0,
      avgDurationMs: result.avgDurationMs,
      totalTokens: result.totalTokensUsed,
      efficiency: result.totalTokensUsed > 0 ? (result.overallScore / result.totalTokensUsed) * 1000 : 0,
      categoryScores,
      capabilities,
      badges,
    })
  }

  return {
    agents: entries,
    lastUpdated: report.timestamp,
    comparisonId: report.comparisonId,
  }
}

/**
 * Determine badges for an agent based on performance
 */
function determineBadges(
  agent: AgentType,
  result: BenchmarkSuiteResult,
  capabilities: CapabilityScore[],
  categoryWinners: Map<BenchmarkCategory, CategoryWinner>
): string[] {
  const badges: string[] = []

  // Category champion badges
  const categoryWins = Array.from(categoryWinners.entries()).filter(
    ([_, winner]) => winner.winner === agent
  )

  if (categoryWins.length >= 3) {
    badges.push("🏆 All-Rounder")
  }

  for (const [category] of categoryWins) {
    if (category === "code_generation") badges.push("💻 Code Champion")
    if (category === "bug_fixing") badges.push("🐛 Bug Slayer")
    if (category === "trinity_decision") badges.push("🤝 Trinity Master")
    if (category === "security") badges.push("🔒 Security Expert")
  }

  // Capability badges
  for (const cap of capabilities) {
    if (cap.score >= 90) {
      if (cap.capability === "speed") badges.push("⚡ Speed Demon")
      if (cap.capability === "token_efficiency") badges.push("💎 Token Efficient")
      if (cap.capability === "consistency") badges.push("🎯 Consistent")
    }
  }

  // Overall performance badges
  if (result.overallScore >= 0.9) {
    badges.push("⭐ Excellence")
  }

  if (result.passedCases === result.totalCases) {
    badges.push("✨ Perfect Score")
  }

  return badges
}

/**
 * Export comparison report to JSON
 */
export function exportComparisonJSON(report: SimpleAgentComparisonReport): string {
  // Convert Maps to objects for JSON serialization
  const serializable = {
    timestamp: report.timestamp,
    comparisonId: report.comparisonId,
    agents: report.agents,
    results: Object.fromEntries(report.results),
    overallWinner: report.overallWinner,
    winnerJustification: report.winnerJustification,
    categoryWinners: Object.fromEntries(
      Array.from(report.categoryWinners.entries()).map(([category, winner]) => [
        category,
        {
          ...winner,
          scores: Object.fromEntries(winner.scores),
        },
      ])
    ),
    metricDeltas: Object.fromEntries(report.metricDeltas),
    capabilityScores: Object.fromEntries(report.capabilityScores),
    significanceTests: report.significanceTests
      ? Object.fromEntries(report.significanceTests)
      : undefined,
  }

  return JSON.stringify(serializable, null, 2)
}

/**
 * Save comparison report to file
 */
export async function saveComparisonReport(
  report: SimpleAgentComparisonReport,
  outputDir: string
): Promise<void> {
  const fs = await import("fs/promises")
  const path = await import("path")

  await fs.mkdir(outputDir, { recursive: true })

  // Save markdown report
  const markdown = formatComparisonReport(report)
  const mdPath = path.join(outputDir, `comparison-${report.comparisonId}.md`)
  await fs.writeFile(mdPath, markdown, "utf-8")

  // Save JSON data
  const json = exportComparisonJSON(report)
  const jsonPath = path.join(outputDir, `comparison-${report.comparisonId}.json`)
  await fs.writeFile(jsonPath, json, "utf-8")

  console.log(`\n✓ Comparison report saved to ${outputDir}`)
}
