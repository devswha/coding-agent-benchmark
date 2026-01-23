import { useState, useEffect, useCallback, useRef } from 'react'
import { BenchmarkFile, BenchmarkSuiteResult } from './types'
import { Dashboard } from './components/Dashboard'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AnalysisView } from './components/AnalysisView'

function App() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkFile[]>([])
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkSuiteResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'results' | 'analysis'>('results')

  // Use ref to track if component is mounted (fixes #12 - memory leak)
  const isMountedRef = useRef(true)

  const fetchBenchmarks = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const response = await fetch('/api/benchmarks', { signal })
      if (!response.ok) throw new Error('Failed to fetch benchmarks')
      const data = await response.json()

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setBenchmarks(data)
        if (data.length > 0) {
          setSelectedBenchmark(data[0].data)
        }
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return

      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    // Create AbortController for cleanup (fixes #12)
    const controller = new AbortController()
    isMountedRef.current = true

    fetchBenchmarks(controller.signal)

    return () => {
      isMountedRef.current = false
      controller.abort()
    }
  }, [fetchBenchmarks])

  const handleSelectBenchmark = (benchmark: BenchmarkFile) => {
    setSelectedBenchmark(benchmark.data)
  }

  // Wrap loading and error states in ErrorBoundary too (fixes missing protection)
  return (
    <ErrorBoundary>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl text-slate-400">Loading benchmarks...</div>
        </div>
      ) : error ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-red-400 mb-4">Error: {error}</div>
            <p className="text-slate-400 mb-4">Make sure the API server is running:</p>
            <code className="bg-slate-800 px-4 py-2 rounded text-green-400">
              cd dashboard && bun run server
            </code>
          </div>
        </div>
      ) : benchmarks.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-slate-400 mb-4">No benchmark results found</div>
            <p className="text-slate-500">Run some benchmarks first to see results here.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="bg-slate-800 border-b border-slate-700 px-6">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'results'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Results
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'analysis'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Analysis
              </button>
            </div>
          </div>
          {activeTab === 'results' ? (
            <div className="flex flex-1 overflow-hidden">
              <Sidebar
                benchmarks={benchmarks}
                selectedBenchmark={selectedBenchmark}
                onSelect={handleSelectBenchmark}
              />
              <main className="flex-1 overflow-auto p-6">
                {selectedBenchmark && <Dashboard benchmark={selectedBenchmark} />}
              </main>
            </div>
          ) : (
            <main className="flex-1 overflow-auto p-6">
              <AnalysisView benchmarks={benchmarks} />
            </main>
          )}
        </div>
      )}
    </ErrorBoundary>
  )
}

export default App
