#!/usr/bin/env bun
/**
 * Coding Agent Benchmark CLI
 *
 * Command-line interface for running benchmarks against AI coding agents.
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  listSuites,
  getSuiteById,
  ALL_SUITES,
  BenchmarkRunner,
  agents,
  type AgentKey,
} from './index'

const argv = yargs(hideBin(process.argv))
  .scriptName('agent-benchmark')
  .usage('$0 <command> [options]')
  .command('list', 'List available benchmark suites', {}, () => {
    console.log('\nAvailable Benchmark Suites:\n')
    for (const suite of listSuites()) {
      console.log(`  ${suite.id}`)
      console.log(`    Name: ${suite.name}`)
      console.log(`    Description: ${suite.description}`)
      console.log(`    Cases: ${suite.caseCount}`)
      console.log('')
    }
  })
  .command('agents', 'List available agents', {}, () => {
    console.log('\nAvailable Agents:\n')
    for (const [key, agent] of Object.entries(agents)) {
      console.log(`  ${key}: ${agent.name}`)
    }
    console.log('')
  })
  .command(
    'run <suite>',
    'Run a benchmark suite',
    (yargs) => {
      return yargs
        .positional('suite', {
          describe: 'Suite ID to run (or "all" for all suites)',
          type: 'string',
        })
        .option('agent', {
          alias: 'a',
          describe: 'Agent to benchmark',
          type: 'string',
          choices: Object.keys(agents) as AgentKey[],
          demandOption: true,
        })
        .option('difficulty', {
          alias: 'd',
          describe: 'Filter by difficulty',
          type: 'string',
          choices: ['easy', 'medium', 'hard'],
        })
        .option('verbose', {
          alias: 'v',
          describe: 'Verbose output',
          type: 'boolean',
          default: true,
        })
        .option('output', {
          alias: 'o',
          describe: 'Output directory for results',
          type: 'string',
          default: './results',
        })
    },
    async (args) => {
      const agentKey = args.agent as AgentKey
      const AgentClass = agents[agentKey]

      if (!AgentClass) {
        console.error(`Unknown agent: ${args.agent}`)
        console.log('Available agents:', Object.keys(agents).join(', '))
        process.exit(1)
      }

      // Instantiate the agent
      const agent = new AgentClass()

      // Check if agent is available
      const isAvailable = await agent.isAvailable()
      if (!isAvailable) {
        console.error(`Agent "${agent.name}" is not available. Make sure it's installed and in PATH.`)
        process.exit(1)
      }

      const runner = new BenchmarkRunner({
        verbose: args.verbose,
        difficulties: args.difficulty ? [args.difficulty as 'easy' | 'medium' | 'hard'] : undefined,
        outputDir: args.output,
        saveResults: true,
      })

      try {
        if (args.suite === 'all') {
          console.log(`\nRunning all benchmark suites against ${agent.name}...\n`)
          for (const suite of ALL_SUITES) {
            await runner.runSuite(suite, agent)
          }
        } else {
          const suite = getSuiteById(args.suite!)
          if (!suite) {
            console.error(`Unknown suite: ${args.suite}`)
            console.log('Available suites:', listSuites().map(s => s.id).join(', '))
            process.exit(1)
          }

          console.log(`\nRunning ${suite.name} against ${agent.name}...\n`)
          await runner.runSuite(suite, agent)
        }
      } finally {
        runner.cleanup()
      }
    }
  )
  .command('leaderboard', 'Show benchmark leaderboard', {}, async () => {
    const { readdir, readFile } = await import('fs/promises')
    const { join } = await import('path')

    const resultsDir = './results'

    try {
      const files = await readdir(resultsDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      if (jsonFiles.length === 0) {
        console.log('\nNo benchmark results found. Run some benchmarks first!\n')
        return
      }

      interface ResultSummary {
        agentName: string
        suiteId: string
        overallScore: number
        passedCases: number
        totalCases: number
        timestamp: number
      }

      const results: ResultSummary[] = []

      for (const file of jsonFiles) {
        try {
          const content = await readFile(join(resultsDir, file), 'utf-8')
          const data = JSON.parse(content)
          results.push({
            agentName: data.agentName || 'Unknown',
            suiteId: data.suiteId,
            overallScore: data.overallScore,
            passedCases: data.passedCases,
            totalCases: data.totalCases,
            timestamp: data.timestamp,
          })
        } catch {
          // Skip invalid files
        }
      }

      // Group by suite, then rank by score
      const bySuite = new Map<string, ResultSummary[]>()
      for (const r of results) {
        const arr = bySuite.get(r.suiteId) || []
        arr.push(r)
        bySuite.set(r.suiteId, arr)
      }

      console.log('\n' + '='.repeat(60))
      console.log('BENCHMARK LEADERBOARD')
      console.log('='.repeat(60))

      for (const [suiteId, suiteResults] of bySuite) {
        // Get best score per agent
        const bestByAgent = new Map<string, ResultSummary>()
        for (const r of suiteResults) {
          const existing = bestByAgent.get(r.agentName)
          if (!existing || r.overallScore > existing.overallScore) {
            bestByAgent.set(r.agentName, r)
          }
        }

        const ranked = Array.from(bestByAgent.values())
          .sort((a, b) => b.overallScore - a.overallScore)

        console.log(`\n${suiteId}:`)
        ranked.forEach((r, i) => {
          const passRate = r.totalCases > 0
            ? ((r.passedCases / r.totalCases) * 100).toFixed(1)
            : '0.0'
          console.log(`  ${i + 1}. ${r.agentName}: ${(r.overallScore * 100).toFixed(1)}% (${passRate}% pass rate)`)
        })
      }

      console.log('\n' + '='.repeat(60))
    } catch (err) {
      console.error('Error reading results:', err)
    }
  })
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .alias('h', 'help')
  .parseAsync()
