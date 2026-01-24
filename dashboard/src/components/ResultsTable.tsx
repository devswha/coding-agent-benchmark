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

  const SortIcon = ({ active, order }: { active: boolean; order: SortOrder }) => {
    if (active) {
      return (
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {order === 'asc' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          )}
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-[#93adc8] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-blue-400/10 text-blue-400 ring-1 ring-inset ring-blue-400/20'
      case 'medium': return 'bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-400/20'
      case 'hard': return 'bg-purple-500/10 text-purple-400 ring-1 ring-inset ring-purple-400/20'
      default: return 'bg-slate-400/10 text-slate-400 ring-1 ring-inset ring-slate-400/20'
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#344d65] bg-[#1a2632] shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#1a2632] border-b border-[#344d65]">
            <th className="p-4 text-xs font-semibold tracking-wide text-[#93adc8] uppercase">
              <button
                onClick={() => handleSort('caseName')}
                className="flex items-center gap-1 hover:text-white group transition-colors"
              >
                Case Name
                <SortIcon active={sortKey === 'caseName'} order={sortOrder} />
              </button>
            </th>
            <th className="p-4 text-xs font-semibold tracking-wide text-[#93adc8] uppercase">
              <button
                onClick={() => handleSort('category')}
                className="flex items-center gap-1 hover:text-white group transition-colors"
              >
                Category
                <SortIcon active={sortKey === 'category'} order={sortOrder} />
              </button>
            </th>
            <th className="p-4 text-xs font-semibold tracking-wide text-[#93adc8] uppercase">
              <button
                onClick={() => handleSort('difficulty')}
                className="flex items-center gap-1 hover:text-white group transition-colors"
              >
                Difficulty
                <SortIcon active={sortKey === 'difficulty'} order={sortOrder} />
              </button>
            </th>
            <th className="p-4 text-xs font-semibold tracking-wide text-[#93adc8] uppercase">Status</th>
            <th className="p-4 text-xs font-semibold tracking-wide text-[#93adc8] uppercase">
              <button
                onClick={() => handleSort('score')}
                className="flex items-center gap-1 hover:text-white group transition-colors"
              >
                Score
                <SortIcon active={sortKey === 'score'} order={sortOrder} />
              </button>
            </th>
            <th className="p-4 text-xs font-semibold tracking-wide text-[#93adc8] uppercase">
              <button
                onClick={() => handleSort('durationMs')}
                className="flex items-center gap-1 hover:text-white group transition-colors"
              >
                Duration
                <SortIcon active={sortKey === 'durationMs'} order={sortOrder} />
              </button>
            </th>
            <th className="p-4 text-xs font-semibold tracking-wide text-[#93adc8] uppercase">
              <button
                onClick={() => handleSort('tokensUsed')}
                className="flex items-center gap-1 hover:text-white group transition-colors"
              >
                Tokens
                <SortIcon active={sortKey === 'tokensUsed'} order={sortOrder} />
              </button>
            </th>
            <th className="p-4 w-[60px]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#344d65]">
          {sortedResults.map((result) => (
            <React.Fragment key={result.caseId}>
              <tr
                className={`hover:bg-[#243647] transition-colors cursor-pointer group ${
                  expandedRow === result.caseId ? 'bg-[#243647]' : ''
                }`}
                onClick={() => setExpandedRow(expandedRow === result.caseId ? null : result.caseId)}
              >
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-sm">{result.caseName}</span>
                    <span className="text-xs text-[#93adc8] font-mono">{result.caseId}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-white">{result.category.replace(/_/g, ' ')}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getDifficultyColor(result.difficulty)}`}>
                    {result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1)}
                  </span>
                </td>
                <td className="p-4">
                  {result.passed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Failed
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      result.score >= 0.8 ? 'text-emerald-400' :
                      result.score >= 0.5 ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {(result.score * 100).toFixed(0)}
                    </span>
                    <div className="h-1.5 w-12 rounded-full bg-[#111921] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          result.score >= 0.8 ? 'bg-emerald-500' :
                          result.score >= 0.5 ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${result.score * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-[#93adc8]">{(result.durationMs / 1000).toFixed(2)}s</td>
                <td className="p-4 text-sm text-[#93adc8]">{result.tokensUsed.toLocaleString()}</td>
                <td className="p-4 text-right">
                  <button className="text-[#93adc8] hover:text-white transition-colors p-1 rounded-md hover:bg-white/5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {expandedRow === result.caseId ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      )}
                    </svg>
                  </button>
                </td>
              </tr>
              {expandedRow === result.caseId && (
                <tr className="bg-[#16202a] border-b border-[#344d65]">
                  <td colSpan={8} className="p-0">
                    <div className="p-6 border-l-4 border-blue-500">
                      <div className="space-y-4">
                        {result.validationDetails && (
                          <div className="space-y-1">
                            <p className="text-xs text-[#93adc8] uppercase tracking-wider font-semibold">Validation Details</p>
                            <p className="text-sm text-white">{result.validationDetails}</p>
                          </div>
                        )}
                        {result.errors && result.errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-[#93adc8] uppercase tracking-wider font-semibold">Errors</p>
                            <ul className="list-disc list-inside text-sm text-rose-400 space-y-1">
                              {result.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs text-[#93adc8] uppercase tracking-wider font-semibold">Output</p>
                          <div className="rounded-lg bg-[#0d131a] border border-[#344d65] p-4 overflow-x-auto">
                            <pre className="font-mono text-xs text-slate-300 max-h-64 overflow-y-auto">
                              {result.output || 'No output'}
                            </pre>
                          </div>
                        </div>
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
        <div className="text-center py-8 text-[#93adc8]">No results match your filters</div>
      )}
    </div>
  )
}
