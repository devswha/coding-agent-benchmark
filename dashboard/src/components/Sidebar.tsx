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
    <aside className="flex w-80 min-w-[320px] flex-col border-r border-white/5 bg-[#0b1612] h-full shadow-xl z-20">
      {/* Header Section */}
      <div className="flex flex-col p-4 pb-2">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-[#10b77f] to-[#0b7a55] shadow-lg shadow-[#10b77f]/20 text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-lg font-bold tracking-tight font-['Inter']">Benchmark AI</h1>
            <span className="text-xs text-[#10b77f]/80 font-medium uppercase tracking-wider">Performance Lab</span>
          </div>
        </div>
      </div>

      {/* List Section Header */}
      <div className="px-6 py-2 flex items-center justify-between border-b border-white/5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Runs</span>
        <span className="text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">{deduplicatedBenchmarks.length}</span>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#23483c] [&::-webkit-scrollbar-thumb]:rounded-full">
        {deduplicatedBenchmarks.map((benchmark) => {
          const isSelected = selectedBenchmark?.timestamp === benchmark.data.timestamp
          // Safe division to prevent NaN (fixes #10)
          const passRate = safeDivide(benchmark.data.passedCases, benchmark.data.totalCases) * 100

          return (
            <button
              key={benchmark.filename}
              onClick={() => onSelect(benchmark)}
              className={`relative flex flex-col gap-1 border-b border-white/5 py-4 px-5 transition-all duration-200 group text-left ${
                isSelected
                  ? 'bg-[#162e25]'
                  : 'bg-transparent hover:bg-[#13251f]'
              }`}
            >
              {/* Left Accent Border (Active Only) */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10b77f] shadow-[0_0_12px_rgba(16,183,127,0.5)]"></div>
              )}

              <div className="flex items-start justify-between mb-1">
                <h3 className={`text-sm font-semibold leading-tight transition-colors ${
                  isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                }`}>
                  {benchmark.data.agentName || 'Unknown Agent'}
                </h3>
                {isSelected ? (
                  <span className="flex h-2 w-2 rounded-full bg-[#10b77f] shadow-[0_0_8px_rgba(16,183,127,0.8)]"></span>
                ) : (
                  <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <div className={`flex items-center gap-2 text-xs transition-colors ${
                isSelected ? 'text-slate-400' : 'text-slate-500 group-hover:text-slate-400'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatDistanceToNow(new Date(benchmark.data.timestamp), { addSuffix: true })}</span>
                <span className={isSelected ? 'text-slate-600' : 'text-slate-700'}>•</span>
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset transition-colors ${
                  isSelected
                    ? 'bg-[#10b77f]/20 text-[#10b77f] ring-[#10b77f]/30'
                    : passRate >= 80
                      ? 'bg-green-500/10 text-green-400 ring-green-500/20 group-hover:bg-green-500/20 group-hover:text-green-300'
                      : passRate >= 50
                        ? 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20 group-hover:bg-yellow-500/20 group-hover:text-yellow-300'
                        : 'bg-red-500/10 text-red-400 ring-red-500/20 group-hover:bg-red-500/20 group-hover:text-red-300'
                }`}>
                  {passRate.toFixed(0)}%
                </span>
              </div>

              <div className={`text-xs truncate mt-0.5 transition-colors ${
                isSelected ? 'text-slate-400' : 'text-slate-500 group-hover:text-slate-400'
              }`}>
                {benchmark.data.suiteName}
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
