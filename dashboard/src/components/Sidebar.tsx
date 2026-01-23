import { useMemo } from 'react'
import { BenchmarkFile, BenchmarkSuiteResult } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { safeDivide } from '@shared/utils'

interface SidebarProps {
  benchmarks: BenchmarkFile[]
  selectedBenchmark: BenchmarkSuiteResult | null
  onSelect: (benchmark: BenchmarkFile) => void
}

export function Sidebar({ benchmarks, selectedBenchmark, onSelect }: SidebarProps) {
  // Deduplicate benchmarks: keep only latest run per agent+suite combination
  const deduplicatedBenchmarks = useMemo(() => {
    const latestByKey = new Map<string, BenchmarkFile>()
    benchmarks.forEach(benchmark => {
      const key = `${benchmark.data.agentName || 'Unknown'}-${benchmark.data.suiteName}`
      const existing = latestByKey.get(key)
      if (!existing || benchmark.data.timestamp > existing.data.timestamp) {
        latestByKey.set(key, benchmark)
      }
    })
    return Array.from(latestByKey.values()).sort((a, b) => b.data.timestamp - a.data.timestamp)
  }, [benchmarks])

  return (
    <aside className="w-72 bg-slate-800 border-r border-slate-700 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
          Benchmark Results ({deduplicatedBenchmarks.length})
        </h2>
        <div className="space-y-2">
          {deduplicatedBenchmarks.map((benchmark) => {
            const isSelected = selectedBenchmark?.timestamp === benchmark.data.timestamp
            // Safe division to prevent NaN (fixes #10)
            const passRate = safeDivide(benchmark.data.passedCases, benchmark.data.totalCases) * 100

            return (
              <button
                key={benchmark.filename}
                onClick={() => onSelect(benchmark)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-600/20 border border-blue-500/50'
                    : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white truncate">
                    {benchmark.data.agentName || 'Unknown Agent'}
                  </span>
                  <span className={`text-sm font-semibold ${
                    passRate >= 80 ? 'text-green-400' :
                    passRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {passRate.toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {benchmark.data.suiteName}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatDistanceToNow(new Date(benchmark.data.timestamp), { addSuffix: true })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
