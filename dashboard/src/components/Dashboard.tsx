import { useState, useMemo } from 'react'
import { BenchmarkSuiteResult, BenchmarkRunResult } from '../types'
import { ScoreCard } from './ScoreCard'
import { CategoryChart } from './CategoryChart'
import { DifficultyChart } from './DifficultyChart'
import { ResultsTable } from './ResultsTable'
import { formatDistanceToNow } from 'date-fns'
import { safeDivide, normalizeScore } from '@shared/utils'

interface DashboardProps {
  benchmark: BenchmarkSuiteResult
}

type FilterDifficulty = 'all' | 'easy' | 'medium' | 'hard'
type FilterStatus = 'all' | 'passed' | 'failed'

export function Dashboard({ benchmark }: DashboardProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<FilterDifficulty>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Memoize filtered results to avoid recalculation on every render (fixes #18)
  const filteredResults = useMemo(() => {
    return benchmark.results.filter((result: BenchmarkRunResult) => {
      if (difficultyFilter !== 'all' && result.difficulty !== difficultyFilter) return false
      if (statusFilter === 'passed' && !result.passed) return false
      if (statusFilter === 'failed' && result.passed) return false
      if (searchQuery && !result.caseName.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [benchmark.results, difficultyFilter, statusFilter, searchQuery])

  // Safe division for pass rate (fixes #10)
  const passRate = safeDivide(benchmark.passedCases, benchmark.totalCases) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {benchmark.agentName || 'Unknown Agent'}
          </h2>
          <p className="text-slate-400">
            {benchmark.suiteName} • {formatDistanceToNow(new Date(benchmark.timestamp), { addSuffix: true })}
          </p>
        </div>
        <div className={`text-4xl font-bold ${
          passRate >= 80 ? 'text-green-400' :
          passRate >= 50 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {normalizeScore(benchmark.overallScore).toFixed(1)}%
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          title="Pass Rate"
          value={`${passRate.toFixed(1)}%`}
          subtitle={`${benchmark.passedCases} / ${benchmark.totalCases} cases`}
          color={passRate >= 80 ? 'green' : passRate >= 50 ? 'yellow' : 'red'}
        />
        <ScoreCard
          title="Total Duration"
          value={`${(benchmark.durationMs / 1000).toFixed(1)}s`}
          subtitle={`Avg: ${(benchmark.avgDurationMs / 1000).toFixed(2)}s per case`}
          color="blue"
        />
        <ScoreCard
          title="Tokens Used"
          value={benchmark.totalTokensUsed.toLocaleString()}
          subtitle={`Avg: ${benchmark.avgTokensPerCase.toLocaleString()} per case`}
          color="purple"
        />
        <ScoreCard
          title="Failed Cases"
          value={benchmark.failedCases.toString()}
          subtitle={benchmark.skippedCases > 0 ? `${benchmark.skippedCases} skipped` : 'No skipped cases'}
          color={benchmark.failedCases > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Score by Category</h3>
          <CategoryChart scoreByCategory={benchmark.scoreByCategory} />
        </div>
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Score by Difficulty</h3>
          <DifficultyChart scoreByDifficulty={benchmark.scoreByDifficulty} />
        </div>
      </div>

      {/* Filters with accessibility labels (fixes #19) */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label htmlFor="search-cases" className="sr-only">Search cases</label>
            <input
              id="search-cases"
              type="text"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search cases"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="difficulty-filter" className="sr-only">Filter by difficulty</label>
            <select
              id="difficulty-filter"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as FilterDifficulty)}
              aria-label="Filter by difficulty"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              aria-label="Filter by status"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <span className="text-slate-400 text-sm">
            Showing {filteredResults.length} of {benchmark.results.length} results
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <ResultsTable results={filteredResults} />
      </div>
    </div>
  )
}
