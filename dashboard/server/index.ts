import { readdir, readFile } from 'fs/promises'
import { join, resolve } from 'path'
import type { BenchmarkSuiteResult, BenchmarkFile } from '../../shared/types'
import { safeDivide } from '../../shared/utils'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001
const RESULTS_DIR = resolve(import.meta.dir, '../../results')
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*' // Configurable CORS (fixes #13)

async function loadBenchmarks(): Promise<BenchmarkFile[]> {
  try {
    const files = await readdir(RESULTS_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    const benchmarks: BenchmarkFile[] = []

    for (const filename of jsonFiles) {
      try {
        const content = await readFile(join(RESULTS_DIR, filename), 'utf-8')
        const data = JSON.parse(content) as BenchmarkSuiteResult
        benchmarks.push({ filename, data })
      } catch (err) {
        console.error(`Error reading ${filename}:`, err)
      }
    }

    // Sort by timestamp, newest first
    benchmarks.sort((a, b) => {
      const tsA = a.data.timestamp || 0
      const tsB = b.data.timestamp || 0
      return tsB - tsA
    })

    return benchmarks
  } catch (err) {
    console.error('Error loading benchmarks:', err)
    return []
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // CORS headers - configurable origin (fixes #13)
    const headers = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (url.pathname === '/api/benchmarks') {
      const benchmarks = await loadBenchmarks()
      return new Response(JSON.stringify(benchmarks), { headers })
    }

    if (url.pathname.startsWith('/api/benchmarks/')) {
      const filename = decodeURIComponent(url.pathname.replace('/api/benchmarks/', ''))

      // Sanitize filename to prevent path traversal
      if (filename.includes('..') || filename.includes('/') || !filename.endsWith('.json')) {
        return new Response(JSON.stringify({ error: 'Invalid filename' }), {
          status: 400,
          headers,
        })
      }

      // Read file directly instead of loading all benchmarks (fixes performance)
      try {
        const content = await readFile(join(RESULTS_DIR, filename), 'utf-8')
        const data = JSON.parse(content) as BenchmarkSuiteResult
        return new Response(JSON.stringify({ filename, data }), { headers })
      } catch {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers,
        })
      }
    }

    if (url.pathname === '/api/comparison') {
      const benchmarks = await loadBenchmarks()

      // Get agent names from query params (comma-separated)
      const agentsParam = url.searchParams.get('agents')
      const suiteParam = url.searchParams.get('suite')

      let filteredBenchmarks = benchmarks

      // Filter by suite if specified
      if (suiteParam) {
        filteredBenchmarks = filteredBenchmarks.filter(b => b.data.suiteId === suiteParam)
      }

      // Group by agent and get latest for each
      const latestByAgent = new Map<string, BenchmarkFile>()
      for (const b of filteredBenchmarks) {
        const agentName = b.data.agentName
        if (!agentName) continue

        // If agents param specified, filter by it
        if (agentsParam) {
          const requestedAgents = agentsParam.split(',')
          if (!requestedAgents.includes(agentName)) continue
        }

        const existing = latestByAgent.get(agentName)
        const timestamp = b.data.timestamp || 0
        if (!existing || (existing.data.timestamp || 0) < timestamp) {
          latestByAgent.set(agentName, b)
        }
      }

      // Build comparison response with safe division (fixes #10)
      const comparison = Array.from(latestByAgent.values()).map(b => ({
        agentName: b.data.agentName,
        suiteId: b.data.suiteId,
        timestamp: b.data.timestamp,
        overallScore: b.data.overallScore,
        passedCases: b.data.passedCases,
        totalCases: b.data.totalCases,
        avgDurationMs: b.data.avgDurationMs,
        totalTokensUsed: b.data.totalTokensUsed,
        scoreByCategory: b.data.scoreByCategory || {},
        scoreByDifficulty: b.data.scoreByDifficulty || {}
      }))

      return new Response(JSON.stringify({
        agents: comparison,
        comparedAt: Date.now()
      }), { headers })
    }

    // Trends endpoint - score progression over time
    if (url.pathname === '/api/trends') {
      const benchmarks = await loadBenchmarks()
      const agentParam = url.searchParams.get('agent')
      const suiteParam = url.searchParams.get('suite')

      let filtered = benchmarks
      if (agentParam) {
        filtered = filtered.filter(b => b.data.agentName === agentParam)
      }
      if (suiteParam) {
        filtered = filtered.filter(b => b.data.suiteId === suiteParam)
      }

      // Sort by timestamp
      filtered.sort((a, b) => (a.data.timestamp || 0) - (b.data.timestamp || 0))

      // Use safe division (fixes #10)
      const trends = filtered.map(b => ({
        timestamp: b.data.timestamp,
        agentName: b.data.agentName,
        suiteId: b.data.suiteId,
        overallScore: b.data.overallScore,
        passRate: safeDivide(b.data.passedCases || 0, b.data.totalCases || 0),
        avgDurationMs: b.data.avgDurationMs
      }))

      return new Response(JSON.stringify({ trends }), { headers })
    }

    // Leaderboard endpoint - aggregate rankings
    if (url.pathname === '/api/leaderboard') {
      const benchmarks = await loadBenchmarks()
      const suiteParam = url.searchParams.get('suite')

      // Group by agent, get best score for each
      const agentBest = new Map<string, { score: number; benchmark: BenchmarkSuiteResult }>()

      for (const b of benchmarks) {
        const data = b.data
        if (suiteParam && data.suiteId !== suiteParam) continue

        const agentName = data.agentName
        if (!agentName) continue

        const current = agentBest.get(agentName)
        const score = data.overallScore || 0
        if (!current || score > current.score) {
          agentBest.set(agentName, { score, benchmark: data })
        }
      }

      // Use safe division (fixes #10)
      const leaderboard = Array.from(agentBest.entries())
        .map(([name, { score, benchmark }]) => ({
          rank: 0,
          agentName: name,
          bestScore: score,
          passRate: safeDivide(benchmark.passedCases || 0, benchmark.totalCases || 0),
          totalCases: benchmark.totalCases || 0,
          avgDurationMs: benchmark.avgDurationMs || 0,
          lastRun: benchmark.timestamp || 0
        }))
        .sort((a, b) => b.bestScore - a.bestScore)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))

      return new Response(JSON.stringify({ leaderboard }), { headers })
    }

    // Individual case details endpoint
    if (url.pathname.startsWith('/api/cases/')) {
      const caseId = decodeURIComponent(url.pathname.replace('/api/cases/', ''))
      const benchmarks = await loadBenchmarks()

      // Find all results for this case across benchmarks
      const caseResults = []
      for (const b of benchmarks) {
        const data = b.data
        const results = data.results || []
        const caseResult = results.find(r => r.caseId === caseId)
        if (caseResult) {
          caseResults.push({
            ...caseResult,
            agentName: data.agentName,
            suiteId: data.suiteId,
            benchmarkTimestamp: data.timestamp
          })
        }
      }

      if (caseResults.length === 0) {
        return new Response(JSON.stringify({ error: 'Case not found' }), { status: 404, headers })
      }

      return new Response(JSON.stringify({ caseId, results: caseResults }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers,
    })
  },
})

console.log(`API server running at http://localhost:${PORT}`)
console.log(`Results directory: ${RESULTS_DIR}`)
console.log(`CORS origin: ${ALLOWED_ORIGIN}`)
