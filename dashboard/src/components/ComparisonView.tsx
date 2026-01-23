import { BenchmarkFile, BenchmarkRunResult, ExecutionTrace } from '../types'
import { ExecutionTraceView } from './ExecutionTraceView'

interface ComparisonViewProps {
  benchmarks: BenchmarkFile[]
  caseId: string
}

export function ComparisonView({ benchmarks, caseId }: ComparisonViewProps) {
  const resultsForCase = benchmarks
    .map(b => ({
      agentName: b.data.agentName || b.filename,
      result: b.data.results.find(r => r.caseId === caseId),
    }))
    .filter((r): r is { agentName: string; result: BenchmarkRunResult } => r.result !== undefined)

  if (resultsForCase.length === 0) {
    return <div className="text-slate-400">No results found for this case</div>
  }

  // Get shared input prompt (should be same across agents)
  const inputPrompt = resultsForCase[0]?.result?.metadata?.inputPrompt as string | undefined

  return (
    <div className="space-y-6">
      {/* Shared Input Prompt */}
      {inputPrompt && (
        <details className="bg-slate-900 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-400 hover:text-slate-300">
            Input Prompt (shared)
          </summary>
          <pre className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">
            {inputPrompt}
          </pre>
        </details>
      )}

      {/* Side-by-side comparison grid */}
      <div className={`grid gap-4 ${resultsForCase.length === 2 ? 'grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
        {resultsForCase.map(({ agentName, result }) => (
          <div key={agentName} className="bg-slate-900 rounded-lg p-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-white">{agentName}</h4>
              <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
              <div className="text-center">
                <div className="text-slate-400">Score</div>
                <div className="text-white font-medium">{(result.score * 100).toFixed(0)}%</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Duration</div>
                <div className="text-white font-medium">{(result.durationMs / 1000).toFixed(1)}s</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Tokens</div>
                <div className="text-white font-medium">{result.tokensUsed}</div>
              </div>
            </div>

            {/* Execution Trace */}
            {result.metadata?.executionTrace && (
              <div className="mb-4">
                <ExecutionTraceView
                  trace={result.metadata.executionTrace as ExecutionTrace}
                  compact={true}
                />
              </div>
            )}

            {/* Output (truncated) */}
            <div className="flex-1">
              <pre className="bg-slate-950 p-3 rounded text-xs text-slate-300 overflow-auto max-h-64">
                <code>{result.output?.slice(0, 1000) || 'No output'}</code>
                {result.output && result.output.length > 1000 && (
                  <span className="text-slate-500">... (truncated)</span>
                )}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
