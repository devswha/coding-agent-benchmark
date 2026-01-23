import { useMemo, useState } from 'react'
import { BenchmarkFile, BenchmarkRunResult } from '../types'
import { ExecutionTraceView, groupToolCallsByType } from './ExecutionTraceView'
import type { ExecutionTrace } from '../types'
import { safeDivide, normalizeScore } from '@shared/utils'

interface AnalysisViewProps {
  benchmarks: BenchmarkFile[]
}

// Output pattern types for classification
type OutputPattern = 'direct_code' | 'delegation' | 'orchestration_overhead' | 'timeout' | 'empty' | 'unknown'

// Failure reason types
type FailureReason = 'no_code_in_output' | 'timeout' | 'pattern_mismatch' | 'missing_function' | 'runtime_error' | 'unknown'

interface AgentStats {
  agentName: string
  score: number
  passRate: number
  avgDuration: number
  totalTokens: number
  efficiency: number
  totalCases: number
  passedCases: number
}

interface OutputClassification {
  pattern: OutputPattern
  confidence: number
  indicators: string[]
}

interface FailureAnalysis {
  reason: FailureReason
  count: number
  percentage: number
  examples: string[]
}

// Wrapper function: prefer executionTrace when available, fallback to classifyOutput
function getOutputClassification(result: BenchmarkRunResult): OutputClassification {
  // If executionTrace is available, use it as source of truth
  if (result.metadata?.executionTrace) {
    const trace = result.metadata.executionTrace as ExecutionTrace

    // Map trace to classification
    if (trace.delegationDetected) {
      return {
        pattern: trace.subAgentCalls.length > 2 ? 'orchestration_overhead' : 'delegation',
        confidence: 0.95,
        indicators: [
          `${trace.subAgentCalls.length} sub-agent calls detected`,
          ...trace.rawPatterns.slice(0, 3),
        ],
      }
    }

    if (trace.toolCalls.length > 0) {
      return {
        pattern: 'direct_code',
        confidence: 0.9,
        indicators: [
          `${trace.toolCalls.length} tool calls detected`,
          ...Object.entries(groupToolCallsByType(trace.toolCalls))
            .map(([type, calls]) => `${calls.length}x ${type}`)
        ],
      }
    }
  }

  // Fallback to existing pattern-based classification
  return classifyOutput(result.output)
}

// Classify output patterns to understand agent behavior
function classifyOutput(output: string): OutputClassification {
  if (!output || output.trim().length === 0) {
    return { pattern: 'empty', confidence: 1.0, indicators: ['Empty output'] }
  }

  const indicators: string[] = []
  let pattern: OutputPattern = 'unknown'
  let confidence = 0.5

  // Check for delegation patterns (Task JSON, subagent calls)
  const delegationPatterns = [
    /subagent_type/i,
    /Task\s*\(/,
    /"type"\s*:\s*"task"/i,
    /delegat(e|ing|ion)/i,
    /executor-low|executor-high|architect|designer/i,
    /oh-my-claudecode:/i,
  ]

  const delegationMatches = delegationPatterns.filter(p => p.test(output))
  if (delegationMatches.length > 0) {
    indicators.push(`Delegation keywords found: ${delegationMatches.length} patterns`)
    pattern = 'delegation'
    confidence = Math.min(0.5 + delegationMatches.length * 0.15, 0.95)
  }

  // Check for orchestration overhead (multiple sub-agent calls, excessive planning)
  const orchestrationPatterns = [
    /spawning\s+(agent|task)/i,
    /parallel\s+execution/i,
    /orchestrat(e|ing|ion)/i,
    /planning\s+session/i,
    /architect.*verify/i,
  ]

  const orchestrationMatches = orchestrationPatterns.filter(p => p.test(output))
  if (orchestrationMatches.length >= 2) {
    indicators.push(`Orchestration overhead: ${orchestrationMatches.length} patterns`)
    pattern = 'orchestration_overhead'
    confidence = Math.min(0.6 + orchestrationMatches.length * 0.1, 0.9)
  }

  // Check for direct code output (actual code patterns)
  const codePatterns = [
    /^(def|function|class|const|let|var|import|export|public|private)\s+/m,
    /\{[\s\S]*\}/,
    /=>\s*\{/,
    /return\s+/,
    /if\s*\(.*\)\s*\{/,
    /for\s*\(.*\)\s*\{/,
  ]

  const codeMatches = codePatterns.filter(p => p.test(output))
  if (codeMatches.length >= 2 && delegationMatches.length === 0) {
    indicators.push(`Direct code patterns: ${codeMatches.length} found`)
    pattern = 'direct_code'
    confidence = Math.min(0.5 + codeMatches.length * 0.12, 0.95)
  }

  // Check for timeout indicators
  if (/timeout|timed?\s*out|exceeded\s+time/i.test(output)) {
    indicators.push('Timeout indicator found')
    pattern = 'timeout'
    confidence = 0.9
  }

  if (indicators.length === 0) {
    indicators.push('No clear pattern detected')
  }

  return { pattern, confidence, indicators }
}

// Analyze failure reasons from results
function analyzeFailureReason(result: BenchmarkRunResult): FailureReason {
  const { output, errors } = result

  // Check errors array first
  if (errors && errors.length > 0) {
    const errorText = errors.join(' ').toLowerCase()
    if (errorText.includes('timeout')) return 'timeout'
    if (errorText.includes('pattern') || errorText.includes('match')) return 'pattern_mismatch'
    if (errorText.includes('function') || errorText.includes('missing')) return 'missing_function'
    if (errorText.includes('runtime') || errorText.includes('exception')) return 'runtime_error'
  }

  // Analyze output
  if (!output || output.trim().length === 0) {
    return 'no_code_in_output'
  }

  const classification = classifyOutput(output)
  if (classification.pattern === 'delegation' || classification.pattern === 'orchestration_overhead') {
    return 'no_code_in_output'
  }

  if (classification.pattern === 'timeout') {
    return 'timeout'
  }

  // Default to pattern mismatch if output exists but test failed
  return 'pattern_mismatch'
}

// Get pattern display info
function getPatternInfo(pattern: OutputPattern): { label: string; color: string; description: string } {
  switch (pattern) {
    case 'direct_code':
      return {
        label: 'Direct Code Output',
        color: 'text-green-400 bg-green-400/10',
        description: 'Agent outputs actual code directly - ideal behavior'
      }
    case 'delegation':
      return {
        label: 'Delegation Output',
        color: 'text-yellow-400 bg-yellow-400/10',
        description: 'Agent outputs task delegation instead of code - problematic for simple tasks'
      }
    case 'orchestration_overhead':
      return {
        label: 'Orchestration Overhead',
        color: 'text-orange-400 bg-orange-400/10',
        description: 'Excessive sub-agent calls and planning - adds latency without value'
      }
    case 'timeout':
      return {
        label: 'Timeout',
        color: 'text-red-400 bg-red-400/10',
        description: 'Agent exceeded time limit'
      }
    case 'empty':
      return {
        label: 'Empty Output',
        color: 'text-slate-400 bg-slate-400/10',
        description: 'No output produced'
      }
    default:
      return {
        label: 'Unknown',
        color: 'text-slate-400 bg-slate-400/10',
        description: 'Pattern could not be classified'
      }
  }
}

// Get failure reason display info
function getFailureReasonInfo(reason: FailureReason): { label: string; color: string; description: string } {
  switch (reason) {
    case 'no_code_in_output':
      return {
        label: 'No Code in Output',
        color: 'text-red-400',
        description: 'Output contains task delegation or orchestration instead of actual code'
      }
    case 'timeout':
      return {
        label: 'Timeout',
        color: 'text-orange-400',
        description: 'Agent took too long to respond'
      }
    case 'pattern_mismatch':
      return {
        label: 'Pattern Mismatch',
        color: 'text-yellow-400',
        description: 'Code was output but did not match expected patterns'
      }
    case 'missing_function':
      return {
        label: 'Missing Function',
        color: 'text-purple-400',
        description: 'Expected function name not found in output'
      }
    case 'runtime_error':
      return {
        label: 'Runtime Error',
        color: 'text-red-500',
        description: 'Code produced runtime errors during validation'
      }
    default:
      return {
        label: 'Unknown',
        color: 'text-slate-400',
        description: 'Failure reason could not be determined'
      }
  }
}

export function AnalysisView({ benchmarks }: AnalysisViewProps) {
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  // Deduplicate benchmarks - keep only latest run per agent
  const dedupedBenchmarks = useMemo((): BenchmarkFile[] => {
    const byAgent = new Map<string, BenchmarkFile>()

    benchmarks.forEach(b => {
      const agentName = b.data.agentName || b.filename
      const existing = byAgent.get(agentName)

      if (!existing) {
        byAgent.set(agentName, b)
      } else {
        // Keep the one with more recent timestamp (from filename or data)
        const existingTime = new Date(existing.data.timestamp || existing.filename).getTime()
        const currentTime = new Date(b.data.timestamp || b.filename).getTime()

        if (currentTime > existingTime || isNaN(existingTime)) {
          byAgent.set(agentName, b)
        }
      }
    })

    return Array.from(byAgent.values())
  }, [benchmarks])

  // Calculate agent statistics
  const agentStats = useMemo((): AgentStats[] => {
    return dedupedBenchmarks.map(b => {
      const data = b.data
      const passRate = safeDivide(data.passedCases, data.totalCases) * 100
      const efficiency = safeDivide(normalizeScore(data.overallScore), data.totalTokensUsed / 1000)

      return {
        agentName: data.agentName || b.filename,
        score: normalizeScore(data.overallScore),
        passRate,
        avgDuration: data.avgDurationMs / 1000,
        totalTokens: data.totalTokensUsed,
        efficiency,
        totalCases: data.totalCases,
        passedCases: data.passedCases
      }
    }).sort((a, b) => b.score - a.score)
  }, [dedupedBenchmarks])

  // Find common test cases across all agents for comparison
  const commonCases = useMemo(() => {
    if (dedupedBenchmarks.length < 2) return []

    const casesByAgent = new Map<string, Map<string, BenchmarkRunResult>>()
    dedupedBenchmarks.forEach(b => {
      const agentName = b.data.agentName || b.filename
      const casesMap = new Map<string, BenchmarkRunResult>()
      b.data.results.forEach(r => casesMap.set(r.caseId, r))
      casesByAgent.set(agentName, casesMap)
    })

    // Find cases present in all agents
    const firstAgent = dedupedBenchmarks[0].data.results.map(r => r.caseId)
    const common = firstAgent.filter(caseId =>
      Array.from(casesByAgent.values()).every(cases => cases.has(caseId))
    )

    return common.slice(0, 10) // Limit to 10 for display
  }, [dedupedBenchmarks])

  // Analyze failure reasons per agent
  const failureAnalysisByAgent = useMemo(() => {
    const analysis = new Map<string, FailureAnalysis[]>()

    dedupedBenchmarks.forEach(b => {
      const agentName = b.data.agentName || b.filename
      const failedResults = b.data.results.filter(r => !r.passed)
      const reasonCounts = new Map<FailureReason, { count: number; examples: string[] }>()

      failedResults.forEach(r => {
        const reason = analyzeFailureReason(r)
        const existing = reasonCounts.get(reason) || { count: 0, examples: [] }
        existing.count++
        if (existing.examples.length < 3) {
          existing.examples.push(r.caseName)
        }
        reasonCounts.set(reason, existing)
      })

      const failureAnalysis: FailureAnalysis[] = Array.from(reasonCounts.entries())
        .map(([reason, data]) => ({
          reason,
          count: data.count,
          percentage: safeDivide(data.count, failedResults.length) * 100,
          examples: data.examples
        }))
        .sort((a, b) => b.count - a.count)

      analysis.set(agentName, failureAnalysis)
    })

    return analysis
  }, [dedupedBenchmarks])

  // Generate insights based on analysis
  const insights = useMemo(() => {
    const insightsList: { title: string; description: string; severity: 'info' | 'warning' | 'success' }[] = []

    if (agentStats.length < 2) {
      return [{ title: 'Need More Data', description: 'Load multiple benchmark results to see comparative analysis.', severity: 'info' as const }]
    }

    const bestAgent = agentStats[0]
    const worstAgent = agentStats[agentStats.length - 1]
    const scoreDiff = bestAgent.score - worstAgent.score

    // Score difference insight
    if (scoreDiff > 20) {
      insightsList.push({
        title: 'Significant Performance Gap',
        description: `${bestAgent.agentName} outperforms ${worstAgent.agentName} by ${scoreDiff.toFixed(1)} percentage points. This suggests fundamental differences in how these agents approach tasks.`,
        severity: 'warning'
      })
    }

    // Efficiency analysis
    const mostEfficient = [...agentStats].sort((a, b) => b.efficiency - a.efficiency)[0]
    const leastEfficient = [...agentStats].sort((a, b) => a.efficiency - b.efficiency)[0]

    if (mostEfficient.agentName !== leastEfficient.agentName) {
      insightsList.push({
        title: 'Token Efficiency Varies',
        description: `${mostEfficient.agentName} achieves ${mostEfficient.efficiency.toFixed(2)} score per 1K tokens, while ${leastEfficient.agentName} achieves only ${leastEfficient.efficiency.toFixed(2)}. More tokens don't always mean better results.`,
        severity: 'info'
      })
    }

    // Delegation pattern analysis
    dedupedBenchmarks.forEach(b => {
      const agentName = b.data.agentName || b.filename
      const delegationCount = b.data.results.filter(r => {
        const classification = getOutputClassification(r)
        return classification.pattern === 'delegation' || classification.pattern === 'orchestration_overhead'
      }).length

      const delegationRate = safeDivide(delegationCount, b.data.results.length) * 100

      if (delegationRate > 30) {
        insightsList.push({
          title: `${agentName} Over-Delegates`,
          description: `${delegationRate.toFixed(0)}% of outputs contain delegation patterns instead of direct code. For simple code generation tasks, this adds overhead without benefit.`,
          severity: 'warning'
        })
      }
    })

    // Duration analysis
    const fastestAgent = [...agentStats].sort((a, b) => a.avgDuration - b.avgDuration)[0]
    const slowestAgent = [...agentStats].sort((a, b) => b.avgDuration - a.avgDuration)[0]

    if (slowestAgent.avgDuration > fastestAgent.avgDuration * 2) {
      insightsList.push({
        title: 'Speed vs Quality Trade-off',
        description: `${slowestAgent.agentName} takes ${(slowestAgent.avgDuration / fastestAgent.avgDuration).toFixed(1)}x longer than ${fastestAgent.agentName}. Check if the extra time translates to better scores.`,
        severity: 'info'
      })
    }

    // Best performer recognition
    if (bestAgent.score >= 80) {
      insightsList.push({
        title: `${bestAgent.agentName} Leads`,
        description: `With ${bestAgent.score.toFixed(1)}% overall score and ${bestAgent.passRate.toFixed(1)}% pass rate, ${bestAgent.agentName} demonstrates strong benchmark performance.`,
        severity: 'success'
      })
    }

    return insightsList
  }, [agentStats, dedupedBenchmarks])

  if (benchmarks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        No benchmark data available for analysis
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Deep Analysis</h2>
        <p className="text-slate-400">Understanding why agents perform differently</p>
      </div>

      {/* Section 1: Agent Comparison Table */}
      <section className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Agent Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-3 px-4">Agent</th>
                <th className="text-right py-3 px-4">Score</th>
                <th className="text-right py-3 px-4">Pass Rate</th>
                <th className="text-right py-3 px-4">Avg Duration</th>
                <th className="text-right py-3 px-4">Total Tokens</th>
                <th className="text-right py-3 px-4">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {agentStats.map((agent, idx) => (
                <tr
                  key={agent.agentName}
                  className={`border-b border-slate-700/50 ${idx === 0 ? 'bg-green-500/5' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <span className="text-green-400 text-xs">BEST</span>}
                      <span className="font-medium text-white">{agent.agentName}</span>
                    </div>
                  </td>
                  <td className={`text-right py-3 px-4 font-medium ${
                    agent.score >= 80 ? 'text-green-400' :
                    agent.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {agent.score.toFixed(1)}%
                  </td>
                  <td className="text-right py-3 px-4 text-slate-300">
                    {agent.passedCases}/{agent.totalCases} ({agent.passRate.toFixed(0)}%)
                  </td>
                  <td className="text-right py-3 px-4 text-slate-300">
                    {agent.avgDuration.toFixed(2)}s
                  </td>
                  <td className="text-right py-3 px-4 text-slate-400">
                    {agent.totalTokens.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={agent.efficiency >= 1 ? 'text-green-400' : 'text-slate-400'}>
                      {agent.efficiency.toFixed(2)}
                    </span>
                    <span className="text-slate-500 text-xs ml-1">score/1K tok</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section: Execution Statistics Summary */}
      <section className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Execution Statistics</h3>
        <p className="text-slate-400 text-sm mb-4">
          Aggregate tool usage and delegation patterns per agent
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-3 px-4">Agent</th>
                <th className="text-right py-3 px-4">Tool Calls</th>
                <th className="text-right py-3 px-4">Avg/Case</th>
                <th className="text-right py-3 px-4">Sub-Agents</th>
                <th className="text-right py-3 px-4">Delegation Rate</th>
                <th className="text-left py-3 px-4">Top Tools</th>
              </tr>
            </thead>
            <tbody>
              {dedupedBenchmarks.map(b => {
                const stats = b.data.executionStats
                const agentName = b.data.agentName || b.filename

                // Fallback: compute stats from results if not present
                const toolCalls = stats?.totalToolCalls ??
                  b.data.results.reduce((sum, r) =>
                    sum + ((r.metadata?.executionTrace as ExecutionTrace | undefined)?.toolCalls?.length || 0), 0)

                const avgPerCase = stats?.avgToolCallsPerCase ??
                  (toolCalls / (b.data.results.length || 1))

                const subAgents = stats?.totalSubAgentCalls ??
                  b.data.results.reduce((sum, r) =>
                    sum + ((r.metadata?.executionTrace as ExecutionTrace | undefined)?.subAgentCalls?.length || 0), 0)

                const delegationRate = stats?.delegationRate ??
                  (b.data.results.filter(r => (r.metadata?.executionTrace as ExecutionTrace | undefined)?.delegationDetected).length /
                   (b.data.results.length || 1) * 100)

                // Get top tools
                const toolsByType = stats?.toolCallsByType ||
                  b.data.results.reduce((acc, r) => {
                    const trace = r.metadata?.executionTrace as ExecutionTrace | undefined
                    if (trace) {
                      for (const call of trace.toolCalls) {
                        acc[call.type] = (acc[call.type] || 0) + 1
                      }
                    }
                    return acc
                  }, {} as Record<string, number>)
                const topTools = Object.entries(toolsByType)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([type, count]) => `${type}(${count})`)
                  .join(', ')

                return (
                  <tr key={agentName} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-white font-medium">{agentName}</td>
                    <td className="text-right py-3 px-4 text-slate-300">{toolCalls}</td>
                    <td className="text-right py-3 px-4 text-slate-300">{avgPerCase.toFixed(1)}</td>
                    <td className="text-right py-3 px-4 text-slate-300">{subAgents}</td>
                    <td className={`text-right py-3 px-4 ${
                      delegationRate > 30 ? 'text-yellow-400' : 'text-slate-300'
                    }`}>
                      {delegationRate.toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{topTools || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Output Pattern Analysis */}
      {commonCases.length > 0 && (
        <section className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Output Pattern Analysis</h3>
          <p className="text-slate-400 text-sm mb-4">
            Compare how different agents respond to the same test case
          </p>

          {/* Case selector */}
          <div className="mb-4">
            <label htmlFor="case-selector" className="sr-only">Select test case</label>
            <select
              id="case-selector"
              value={selectedCase || ''}
              onChange={(e) => setSelectedCase(e.target.value || null)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a test case to compare...</option>
              {commonCases.map(caseId => {
                const caseName = dedupedBenchmarks[0].data.results.find(r => r.caseId === caseId)?.caseName || caseId
                return (
                  <option key={caseId} value={caseId}>{caseName}</option>
                )
              })}
            </select>
          </div>

          {/* Output comparison */}
          {selectedCase && (
            <div className="space-y-4">
              {dedupedBenchmarks.map(b => {
                const agentName = b.data.agentName || b.filename
                const result = b.data.results.find(r => r.caseId === selectedCase)
                if (!result) return null

                const classification = getOutputClassification(result)
                const patternInfo = getPatternInfo(classification.pattern)

                return (
                  <div key={agentName} className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white">{agentName}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${patternInfo.color}`}>
                          {patternInfo.label}
                        </span>
                        {result.passed ? (
                          <span className="text-green-400 text-sm">PASSED</span>
                        ) : (
                          <span className="text-red-400 text-sm">FAILED</span>
                        )}
                      </div>
                      <span className="text-slate-500 text-sm">
                        {classification.confidence.toFixed(0)}% confidence
                      </span>
                    </div>

                    <p className="text-slate-400 text-xs mb-3">{patternInfo.description}</p>

                    {/* Indicators */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {classification.indicators.map((indicator, i) => (
                        <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                          {indicator}
                        </span>
                      ))}
                    </div>

                    {/* Add ExecutionTraceView if trace available */}
                    {result.metadata?.executionTrace && (
                      <div className="mb-3">
                        <ExecutionTraceView
                          trace={result.metadata.executionTrace as ExecutionTrace}
                          compact={false}
                        />
                      </div>
                    )}

                    {/* Code output */}
                    <div className="relative">
                      <pre className="bg-slate-950 p-4 rounded-lg text-sm text-slate-300 overflow-x-auto max-h-48 overflow-y-auto">
                        <code>{result.output?.slice(0, 1500) || 'No output'}{result.output && result.output.length > 1500 ? '\n\n... (truncated)' : ''}</code>
                      </pre>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Section 3: Failure Reason Breakdown */}
      <section className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Failure Reason Breakdown</h3>
        <p className="text-slate-400 text-sm mb-4">
          Understanding why tests failed for each agent
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dedupedBenchmarks.map(b => {
            const agentName = b.data.agentName || b.filename
            const failureAnalysis = failureAnalysisByAgent.get(agentName) || []
            const failedCount = b.data.failedCases
            const isExpanded = expandedAgent === agentName

            return (
              <div key={agentName} className="bg-slate-900 rounded-lg p-4">
                <button
                  onClick={() => setExpandedAgent(isExpanded ? null : agentName)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{agentName}</span>
                    <span className="text-red-400 text-sm">{failedCount} failures</span>
                  </div>
                  <span className="text-slate-400">{isExpanded ? '−' : '+'}</span>
                </button>

                {failedCount === 0 ? (
                  <p className="text-green-400 text-sm">No failures!</p>
                ) : (
                  <div className="space-y-2">
                    {failureAnalysis.slice(0, isExpanded ? undefined : 3).map(fa => {
                      const reasonInfo = getFailureReasonInfo(fa.reason)
                      return (
                        <div key={fa.reason} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${reasonInfo.color}`}>{reasonInfo.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full"
                                style={{ width: `${fa.percentage}%` }}
                              />
                            </div>
                            <span className="text-slate-400 text-sm w-12 text-right">
                              {fa.count}
                            </span>
                          </div>
                        </div>
                      )
                    })}

                    {isExpanded && failureAnalysis.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <h5 className="text-sm font-medium text-slate-400 mb-2">Example failures:</h5>
                        {failureAnalysis.map(fa => (
                          <div key={fa.reason} className="mb-2">
                            <span className={`text-xs ${getFailureReasonInfo(fa.reason).color}`}>
                              {getFailureReasonInfo(fa.reason).label}:
                            </span>
                            <ul className="text-xs text-slate-500 ml-4">
                              {fa.examples.map((ex, i) => (
                                <li key={i}>{ex}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Section 4: Key Insights */}
      <section className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
        <p className="text-slate-400 text-sm mb-4">
          Expert analysis of agent performance patterns
        </p>

        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-l-4 ${
                insight.severity === 'success' ? 'bg-green-500/10 border-green-500' :
                insight.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                'bg-blue-500/10 border-blue-500'
              }`}
            >
              <h4 className={`font-medium mb-1 ${
                insight.severity === 'success' ? 'text-green-400' :
                insight.severity === 'warning' ? 'text-yellow-400' :
                'text-blue-400'
              }`}>
                {insight.title}
              </h4>
              <p className="text-slate-300 text-sm">{insight.description}</p>
            </div>
          ))}
        </div>

        {/* Additional technical notes */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Technical Notes</h4>
          <ul className="text-sm text-slate-500 space-y-2">
            <li>
              <strong className="text-slate-400">Efficiency Score:</strong> Calculated as (overall score) / (tokens used in thousands). Higher is better.
            </li>
            <li>
              <strong className="text-slate-400">Delegation Detection:</strong> Output is analyzed for Task() calls, subagent_type references, and orchestration keywords.
            </li>
            <li>
              <strong className="text-slate-400">Direct Code Detection:</strong> Looks for function definitions, class declarations, import statements, and control flow patterns.
            </li>
            <li>
              <strong className="text-slate-400">Orchestration Overhead:</strong> Identified when output contains multiple planning/spawning patterns without actual code.
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
