import { ExecutionTrace, ToolCall } from '../types'
import { TOOL_ICONS, MODEL_COLORS } from '@shared/constants'

interface ExecutionTraceViewProps {
  trace: ExecutionTrace
  compact?: boolean  // For inline display
}

export function ExecutionTraceView({ trace, compact }: ExecutionTraceViewProps) {
  if (compact) {
    return <CompactTraceView trace={trace} />
  }

  return (
    <div className="space-y-4">
      {/* Delegation Warning */}
      {trace.delegationDetected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <span className="text-yellow-400">Delegation Detected</span>
          <span className="text-slate-400 text-sm">
            Output contains sub-agent calls instead of direct code
          </span>
        </div>
      )}

      {/* Tool Call Summary */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 mb-2">Tool Calls ({trace.toolCalls.length})</h4>
        {trace.toolCalls.length === 0 ? (
          <p className="text-slate-500 text-sm">No tool calls detected</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(groupToolCallsByType(trace.toolCalls)).map(([type, calls]) => (
              <div key={type} className="flex items-center gap-2 text-sm">
                <span>{TOOL_ICONS[type] || TOOL_ICONS.unknown}</span>
                <span className="text-slate-300 capitalize">{type}</span>
                <span className="text-slate-500">x{calls.length}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tool Call Details (expandable) */}
      {trace.toolCalls.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300">
            Show details
          </summary>
          <div className="mt-2 space-y-1 pl-4 border-l border-slate-700">
            {trace.toolCalls.map((call, i) => (
              <div key={i} className="text-xs text-slate-500">
                <span>{TOOL_ICONS[call.type]}</span>
                <span className="ml-2">{call.target || '(no target)'}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Sub-Agent Calls */}
      {trace.subAgentCalls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-2">
            Sub-Agent Calls ({trace.subAgentCalls.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {trace.subAgentCalls.map((call, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  call.model ? MODEL_COLORS[call.model] || 'text-slate-400 bg-slate-700' : 'text-slate-400 bg-slate-700'
                }`}
              >
                {call.agentType}
                {call.model && <span className="ml-1 opacity-70">({call.model})</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CompactTraceView({ trace }: { trace: ExecutionTrace }) {
  const toolCounts = groupToolCallsByType(trace.toolCalls)

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Tool call icons with counts */}
      {Object.entries(toolCounts).slice(0, 4).map(([type, calls]) => (
        <span key={type} className="flex items-center gap-1 text-slate-400">
          <span>{TOOL_ICONS[type]}</span>
          <span>{calls.length}</span>
        </span>
      ))}

      {/* Delegation badge */}
      {trace.delegationDetected && (
        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
          delegates
        </span>
      )}

      {/* Sub-agent count */}
      {trace.subAgentCalls.length > 0 && (
        <span className="text-slate-500">
          {trace.subAgentCalls.length} sub-agent{trace.subAgentCalls.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

/**
 * Group tool calls by their type for summary display.
 * EXPORTED for use in AnalysisView.tsx
 */
export function groupToolCallsByType(calls: ToolCall[]): Record<string, ToolCall[]> {
  return calls.reduce((acc, call) => {
    if (!acc[call.type]) acc[call.type] = []
    acc[call.type].push(call)
    return acc
  }, {} as Record<string, ToolCall[]>)
}
