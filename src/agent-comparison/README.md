# Agent Comparison Report Module

This module generates comprehensive comparison reports for agent benchmarks.

## Features

- **Comparison Report Generation**: Create detailed reports comparing multiple agents
- **Capability Scoring**: Evaluate agents across multiple dimensions (code generation, planning, efficiency, etc.)
- **Category Analysis**: Determine winners per benchmark category
- **Metric Deltas**: Calculate performance differences relative to best performer
- **Leaderboard Generation**: Create ranked lists with badges and achievements
- **Multiple Output Formats**: Text, Markdown, and JSON

## Exported Functions

### Core Functions

#### `generateComparisonReport(results: Map<AgentType, BenchmarkSuiteResult>): SimpleAgentComparisonReport`

Generate comprehensive comparison report from multiple agent benchmark results.

**Returns:**
- Overall winner with justification
- Category winners
- Metric deltas (relative to best)
- Capability scores for each agent

#### `calculateCapabilityScores(results: Map<AgentType, BenchmarkSuiteResult>): Map<AgentType, CapabilityScore[]>`

Calculate capability scores for each agent across multiple dimensions:
- `multi_agent_orchestration` - Multi-agent coordination ability
- `planning_quality` - Planning and decision-making
- `code_generation` - Code generation quality
- `task_completion` - Task completion rate
- `error_recovery` - Error handling and recovery
- `token_efficiency` - Tokens used per unit of quality
- `speed` - Average execution speed
- `consistency` - Variance in performance

### Formatting Functions

#### `formatComparisonReport(report: SimpleAgentComparisonReport): string`

Format comparison report as human-readable text with:
- Overall winner section
- Metrics comparison table
- Category winners breakdown
- Capability comparison matrix
- Detailed agent statistics

#### `formatMarkdownReport(report: SimpleAgentComparisonReport): string`

Generate markdown report for documentation with:
- Markdown tables
- Category breakdowns
- Metric deltas with visual indicators

### Leaderboard Functions

#### `generateLeaderboardData(report: SimpleAgentComparisonReport): LeaderboardData`

Generate leaderboard data suitable for frontend display with:
- Agent rankings
- Overall scores and metrics
- Achievement badges
- Category scores

#### `generateLeaderboard(report: SimpleAgentComparisonReport): LeaderboardData`

Alias for `generateLeaderboardData`.

### Visualization Functions

#### `generateComparisonMatrix(report: SimpleAgentComparisonReport): ComparisonMatrix`

Generate comparison matrix for visualization libraries (charts, heatmaps).

Returns:
```typescript
{
  agents: AgentType[],
  metrics: string[],
  data: number[][]  // [agent_idx][metric_idx]
}
```

#### `generateImprovementSuggestions(report: SimpleAgentComparisonReport): ImprovementSuggestion[]`

Generate actionable improvement suggestions for each agent based on weaknesses.

### Export Functions

#### `exportComparisonJSON(report: SimpleAgentComparisonReport): string`

Export comparison report as JSON string (Maps converted to objects for serialization).

## Usage Example

```typescript
import {
  generateComparisonReport,
  formatComparisonReport,
  formatMarkdownReport,
  generateLeaderboardData,
  type AgentType,
  type BenchmarkSuiteResult,
} from "./agent-comparison"

// Run benchmarks and collect results
const results = new Map<AgentType, BenchmarkSuiteResult>()
results.set("claude", claudeResults)
results.set("gpt4", gpt4Results)
results.set("magi-trinity", magiResults)

// Generate comparison report
const report = generateComparisonReport(results)

// Format as text
const textReport = formatComparisonReport(report)
console.log(textReport)

// Format as markdown
const markdown = formatMarkdownReport(report)
await writeFile("comparison-report.md", markdown)

// Generate leaderboard for frontend
const leaderboard = generateLeaderboardData(report)
res.json(leaderboard)
```

## Report Structure

### SimpleAgentComparisonReport

```typescript
interface SimpleAgentComparisonReport {
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
```

### CategoryWinner

```typescript
interface CategoryWinner {
  category: BenchmarkCategory
  winner: AgentType
  scores: Map<AgentType, number>
  margin: number  // Percentage advantage over second place
}
```

### MetricDeltas

All deltas are percentages relative to best performer:

```typescript
interface MetricDeltas {
  scoreDelta: number        // Overall score difference
  passRateDelta: number     // Pass rate difference
  tokensDelta: number       // Token usage difference
  durationDelta: number     // Speed difference
  efficiencyDelta: number   // Score per token difference
}
```

### CapabilityScore

```typescript
interface CapabilityScore {
  capability: CapabilityType
  score: number        // 0-100
  confidence: number   // 0-1
  evidence: string[]   // Supporting evidence
}
```

## Badges

Agents can earn badges based on performance:

- 🏆 **All-Rounder** - Winner in 3+ categories
- 💻 **Code Champion** - Best at code generation
- 🐛 **Bug Slayer** - Best at bug fixing
- 🤝 **Trinity Master** - Best at multi-agent decisions
- 🔒 **Security Expert** - Best at security tasks
- ⚡ **Speed Demon** - Speed score ≥ 90
- 💎 **Token Efficient** - Token efficiency ≥ 90
- 🎯 **Consistent** - Consistency score ≥ 90
- ⭐ **Excellence** - Overall score ≥ 90%
- ✨ **Perfect Score** - 100% pass rate

## Output Examples

### Text Report

```
================================================================================
AGENT COMPARISON REPORT
Generated: 2026-01-20T08:30:00.000Z
Comparison ID: cmp-1737363000000
================================================================================

OVERALL WINNER
--------------------------------------------------------------------------------
Winner: MAGI-TRINITY
Reason: Overall score: 89.5% | Pass rate: 87.3% | Category wins: 4/6 | Top capabilities: planning_quality, multi_agent_orchestration, consistency

OVERALL METRICS
--------------------------------------------------------------------------------
Agent           Score           Pass Rate       Tokens          Duration        Efficiency
claude          85.2% (-4.8%)   82.1% (-6.0%)   45.2k (+15.3%)  1250ms (+8.2%)  1.88 (-18.2%)
gpt4            88.1% (-1.6%)   85.7% (-1.8%)   42.1k (+7.4%)   1180ms (+2.1%)  2.09 (-8.7%)
magi-trinity    89.5% (-)       87.3% (-)       39.2k (-)       1156ms (-)      2.29 (-)
```

### Markdown Report

See [example-comparison-report.md](./examples/example-comparison-report.md)

## Integration

This module works with the benchmark system defined in `../types.ts` and expects `BenchmarkSuiteResult` objects containing:

- Overall scores and metrics
- Category-wise breakdown
- Trinity protocol metrics (if applicable)
- Token usage and duration data

## Future Enhancements

- Statistical significance testing
- Historical trend analysis
- Cost analysis (token cost per task)
- Multi-run variance analysis
- Interactive visualizations
- PDF report generation
