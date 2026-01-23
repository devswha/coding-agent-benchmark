import React, { useState } from 'react'
import { BenchmarkRunResult } from '../types'

interface ResultsTableProps {
  results: BenchmarkRunResult[]
}

type SortKey = 'caseName' | 'category' | 'difficulty' | 'score' | 'durationMs' | 'tokensUsed'
type SortOrder = 'asc' | 'desc'

export function ResultsTable({ results }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('caseName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    let aVal = a[sortKey]
    let bVal = b[sortKey]

    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const SortIcon = ({ active, order }: { active: boolean; order: SortOrder }) => (
    <span className={`ml-1 ${active ? 'text-blue-400' : 'text-slate-500'}`}>
      {active ? (order === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10'
      case 'hard': return 'text-red-400 bg-red-400/10'
      default: return 'text-slate-400 bg-slate-400/10'
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left p-4 text-slate-300 font-medium">
              <button onClick={() => handleSort('caseName')} className="flex items-center hover:text-white">
                Case Name
                <SortIcon active={sortKey === 'caseName'} order={sortOrder} />
              </button>
            </th>
            <th className="text-left p-4 text-slate-300 font-medium">
              <button onClick={() => handleSort('category')} className="flex items-center hover:text-white">
                Category
                <SortIcon active={sortKey === 'category'} order={sortOrder} />
              </button>
            </th>
            <th className="text-left p-4 text-slate-300 font-medium">
              <button onClick={() => handleSort('difficulty')} className="flex items-center hover:text-white">
                Difficulty
                <SortIcon active={sortKey === 'difficulty'} order={sortOrder} />
              </button>
            </th>
            <th className="text-left p-4 text-slate-300 font-medium">Status</th>
            <th className="text-left p-4 text-slate-300 font-medium">
              <button onClick={() => handleSort('score')} className="flex items-center hover:text-white">
                Score
                <SortIcon active={sortKey === 'score'} order={sortOrder} />
              </button>
            </th>
            <th className="text-left p-4 text-slate-300 font-medium">
              <button onClick={() => handleSort('durationMs')} className="flex items-center hover:text-white">
                Duration
                <SortIcon active={sortKey === 'durationMs'} order={sortOrder} />
              </button>
            </th>
            <th className="text-left p-4 text-slate-300 font-medium">
              <button onClick={() => handleSort('tokensUsed')} className="flex items-center hover:text-white">
                Tokens
                <SortIcon active={sortKey === 'tokensUsed'} order={sortOrder} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((result) => (
            <React.Fragment key={result.caseId}>
              <tr
                className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                onClick={() => setExpandedRow(expandedRow === result.caseId ? null : result.caseId)}
              >
                <td className="p-4">
                  <div className="font-medium text-white">{result.caseName}</div>
                  <div className="text-xs text-slate-500">{result.caseId}</div>
                </td>
                <td className="p-4 text-slate-300">{result.category.replace(/_/g, ' ')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(result.difficulty)}`}>
                    {result.difficulty}
                  </span>
                </td>
                <td className="p-4">
                  {result.passed ? (
                    <span className="text-green-400 font-medium">Passed</span>
                  ) : (
                    <span className="text-red-400 font-medium">Failed</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={result.score >= 0.8 ? 'text-green-400' : result.score >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                    {(result.score * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="p-4 text-slate-300">{(result.durationMs / 1000).toFixed(2)}s</td>
                <td className="p-4 text-slate-300">{result.tokensUsed.toLocaleString()}</td>
              </tr>
              {expandedRow === result.caseId && (
                <tr className="bg-slate-700/20">
                  <td colSpan={7} className="p-4">
                    <div className="space-y-4">
                      {result.validationDetails && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Validation Details</h4>
                          <p className="text-slate-400 text-sm">{result.validationDetails}</p>
                        </div>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-red-400 mb-2">Errors</h4>
                          <ul className="list-disc list-inside text-sm text-red-300">
                            {result.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Output</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg text-sm text-slate-300 overflow-x-auto max-h-64 overflow-y-auto">
                          {result.output || 'No output'}
                        </pre>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {sortedResults.length === 0 && (
        <div className="text-center py-8 text-slate-400">No results match your filters</div>
      )}
    </div>
  )
}
