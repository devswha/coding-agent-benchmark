/**
 * Execution Trace Parser
 *
 * Parses CLI agent output to extract tool calls, sub-agent invocations,
 * and other execution metadata. Works with black-box agents by pattern matching.
 */

import type { ToolCall, SubAgentCall, ExecutionTrace, ExecutionStats } from '../types'
import { TOOL_ICONS } from '../../shared/constants'

// Re-export for backwards compatibility
export { TOOL_ICONS }

// Tool call detection patterns
const TOOL_PATTERNS: Record<string, RegExp[]> = {
  read: [
    /Reading\s+(?:file\s+)?[`"']?([^`"'\n]+)[`"']?/gi,
    /Read\s+tool.*?file_path[`"']?\s*:\s*[`"']?([^`"'\n]+)/gi,
    /cat\s+([^\s|&;]+)/gi,
  ],
  write: [
    /Writing\s+(?:to\s+)?[`"']?([^`"'\n]+)[`"']?/gi,
    /Write\s+tool.*?file_path[`"']?\s*:\s*[`"']?([^`"'\n]+)/gi,
    /Created?\s+(?:file\s+)?[`"']?([^`"'\n]+)[`"']?/gi,
  ],
  bash: [
    /Running\s+(?:command\s+)?[`"']?([^`"'\n]+)[`"']?/gi,
    /Bash\s+tool.*?command[`"']?\s*:\s*[`"']?([^`"'\n]+)/gi,
    /Executing[:\s]+[`"']?([^`"'\n]+)[`"']?/gi,
  ],
  edit: [
    /Edit(?:ing)?\s+(?:file\s+)?[`"']?([^`"'\n]+)[`"']?/gi,
    /Edit\s+tool.*?file_path[`"']?\s*:\s*[`"']?([^`"'\n]+)/gi,
  ],
  glob: [
    /Glob(?:bing)?\s+(?:pattern\s+)?[`"']?([^`"'\n]+)[`"']?/gi,
    /Finding\s+files.*?[`"']?([^`"'\n]+)[`"']?/gi,
  ],
  grep: [
    /Grep(?:ping)?\s+(?:for\s+)?[`"']?([^`"'\n]+)[`"']?/gi,
    /Searching.*?[`"']?([^`"'\n]+)[`"']?/gi,
  ],
}

// Sub-agent detection patterns (for OmC/OmO plugins)
// VALIDATED against /results/code-generation-omc-*.json samples
const SUBAGENT_PATTERNS: RegExp[] = [
  // VALIDATED: Matches "I'm activating **ultrawork**" from sample outputs
  /activating\s+\*\*(\w+)\*\*/gi,

  // Task() call patterns (for explicit sub-agent invocation)
  /Task\s*\(\s*subagent_type\s*=\s*["']oh-my-(?:claudecode|opencode):([^"']+)["']/gi,

  // Natural language delegation patterns
  /delegat(?:e|ing)\s+(?:to\s+)?(?:the\s+)?["']?(\w+)["']?\s+agent/gi,
  /spawning\s+["']?(\w+)["']?\s+(?:agent|task)/gi,

  // Known agent type names (fallback matching)
  /\b(executor(?:-low|-high)?|architect|designer|explore|researcher|writer|critic|planner)\b/gi,
]

// Model tier detection
const MODEL_PATTERNS: Record<string, RegExp> = {
  opus: /model\s*=\s*["']opus["']|opus\s+model/gi,
  sonnet: /model\s*=\s*["']sonnet["']|sonnet\s+model/gi,
  haiku: /model\s*=\s*["']haiku["']|haiku\s+model/gi,
}

export function parseExecutionTrace(output: string): ExecutionTrace {
  const toolCalls: ToolCall[] = []
  const subAgentCalls: SubAgentCall[] = []
  const rawPatterns: string[] = []

  // Extract tool calls
  for (const [type, patterns] of Object.entries(TOOL_PATTERNS)) {
    for (const pattern of patterns) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(output)) !== null) {
        toolCalls.push({
          type: type as ToolCall['type'],
          target: match[1]?.trim(),
        })
        rawPatterns.push(match[0])
      }
    }
  }

  // Extract sub-agent calls
  for (const pattern of SUBAGENT_PATTERNS) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(output)) !== null) {
      const agentType = match[1]?.toLowerCase() || match[0].toLowerCase()

      // Detect model tier by scanning nearby context
      let model: string | undefined
      for (const [tier, modelPattern] of Object.entries(MODEL_PATTERNS)) {
        modelPattern.lastIndex = 0
        if (modelPattern.test(output)) {
          model = tier
          break
        }
      }

      subAgentCalls.push({
        agentType,
        model,
      })
      rawPatterns.push(match[0])
    }
  }

  // Detect delegation (output contains task delegation instead of actual code)
  const delegationDetected = subAgentCalls.length > 0 ||
    /I'm delegating|spawning.*agent|Task\s*\(/i.test(output)

  return {
    toolCalls: deduplicateToolCalls(toolCalls),
    subAgentCalls: deduplicateSubAgentCalls(subAgentCalls),
    delegationDetected,
    rawPatterns: [...new Set(rawPatterns)],
  }
}

function deduplicateToolCalls(calls: ToolCall[]): ToolCall[] {
  const seen = new Set<string>()
  return calls.filter(call => {
    const key = `${call.type}:${call.target}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function deduplicateSubAgentCalls(calls: SubAgentCall[]): SubAgentCall[] {
  const seen = new Set<string>()
  return calls.filter(call => {
    const key = `${call.agentType}:${call.model}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Compute aggregate execution statistics from multiple results
 */
export function computeExecutionStats(
  results: Array<{ metadata?: { executionTrace?: ExecutionTrace } }>
): ExecutionStats {
  const stats: ExecutionStats = {
    totalToolCalls: 0,
    toolCallsByType: {},
    totalSubAgentCalls: 0,
    subAgentsByType: {},
    delegationRate: 0,
    avgToolCallsPerCase: 0,
  }

  let delegationCount = 0

  for (const result of results) {
    const trace = result.metadata?.executionTrace
    if (!trace) continue

    stats.totalToolCalls += trace.toolCalls.length
    stats.totalSubAgentCalls += trace.subAgentCalls.length

    if (trace.delegationDetected) {
      delegationCount++
    }

    for (const call of trace.toolCalls) {
      stats.toolCallsByType[call.type] = (stats.toolCallsByType[call.type] || 0) + 1
    }

    for (const call of trace.subAgentCalls) {
      stats.subAgentsByType[call.agentType] = (stats.subAgentsByType[call.agentType] || 0) + 1
    }
  }

  const resultCount = results.length || 1
  stats.delegationRate = (delegationCount / resultCount) * 100
  stats.avgToolCallsPerCase = stats.totalToolCalls / resultCount

  return stats
}
