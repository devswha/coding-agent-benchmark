/**
 * Agent Comparison System
 *
 * Compare MAGI against other AI coding agents on standardized benchmarks
 */

// Export all types
export type {
  AgentType,
  AgentComparisonReport,
  SimpleAgentComparisonReport,
  CategoryWinner,
  MetricDeltas,
  CapabilityScore,
  DetailedCapabilityScore,
  CapabilityType,
  SignificanceResult,
  LeaderboardData,
  AgentLeaderboardEntry,
  ComparisonMatrix,
  ImprovementSuggestion,
} from "./types"

// Export runner
export { AgentComparisonRunner } from "./runner"

// Export report functions
export {
  formatComparisonReport,
  generateLeaderboard,
  generateComparisonMatrix,
  generateImprovementSuggestions,
  exportComparisonJSON,
  saveComparisonReport,
  generateComparisonReport,
  calculateCapabilityScores,
  formatMarkdownReport,
  generateLeaderboardData,
} from "./report"
