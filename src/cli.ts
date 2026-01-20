#!/usr/bin/env bun
/**
 * MAGI Benchmark CLI
 * Command-line interface for running benchmarks
 */

import {
  quickBenchmark,
  runAllBenchmarks,
  listSuites,
  getSuiteById,
  getLeaderboard,
  formatLeaderboard,
} from "./index"
import { BenchmarkRunner } from "./runner"
import { calculateDetailedMetrics } from "./metrics"

const HELP = `
MAGI Benchmark CLI

Usage:
  bun run benchmark <command> [options]

Commands:
  list                    List all available benchmark suites
  run <suite-id>          Run a specific benchmark suite
  run-all                 Run all benchmark suites
  leaderboard [suite-id]  Show benchmark leaderboard

Options:
  --verbose, -v           Show detailed output
  --easy                  Only run easy difficulty tests
  --medium                Only run medium difficulty tests
  --hard                  Only run hard difficulty tests
  --category <cat>        Filter by category (can be repeated)
  --help, -h              Show this help message

Examples:
  bun run benchmark list
  bun run benchmark run code-generation --verbose
  bun run benchmark run trinity-protocol --easy
  bun run benchmark run-all
  bun run benchmark leaderboard code-generation
`

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP)
    process.exit(0)
  }

  const command = args[0]
  const verbose = args.includes("--verbose") || args.includes("-v")

  // Parse difficulties
  const difficulties: ("easy" | "medium" | "hard")[] = []
  if (args.includes("--easy")) difficulties.push("easy")
  if (args.includes("--medium")) difficulties.push("medium")
  if (args.includes("--hard")) difficulties.push("hard")

  // Parse categories
  const categories: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--category" && args[i + 1]) {
      categories.push(args[i + 1])
    }
  }

  switch (command) {
    case "list": {
      console.log("\nAvailable Benchmark Suites:\n")
      for (const suite of listSuites()) {
        console.log(`  ${suite.id}`)
        console.log(`    ${suite.name}`)
        console.log(`    ${suite.description}`)
        console.log(`    Cases: ${suite.caseCount}`)
        console.log("")
      }
      break
    }

    case "run": {
      const suiteId = args[1]
      if (!suiteId) {
        console.error("Error: Please specify a suite ID")
        console.log("Use 'bun run benchmark list' to see available suites")
        process.exit(1)
      }

      const suite = getSuiteById(suiteId)
      if (!suite) {
        console.error(`Error: Unknown suite '${suiteId}'`)
        console.log("Use 'bun run benchmark list' to see available suites")
        process.exit(1)
      }

      console.log(`\nRunning benchmark: ${suite.name}`)
      console.log(`Cases: ${suite.cases.length}`)
      if (difficulties.length > 0) {
        console.log(`Difficulties: ${difficulties.join(", ")}`)
      }
      if (categories.length > 0) {
        console.log(`Categories: ${categories.join(", ")}`)
      }
      console.log("")

      const runner = new BenchmarkRunner({
        verbose,
        difficulties: difficulties.length > 0 ? difficulties : undefined,
        categories: categories.length > 0 ? categories as any : undefined,
        saveResults: true,
      })

      try {
        const result = await runner.runSuite(suite)

        if (verbose) {
          console.log("\nDetailed Metrics:")
          const metrics = calculateDetailedMetrics(result)
          console.log(JSON.stringify(metrics, null, 2))
        }
      } finally {
        runner.cleanup()
      }
      break
    }

    case "run-all": {
      await runAllBenchmarks({ verbose })
      break
    }

    case "leaderboard": {
      const suiteId = args[1]
      const entries = await getLeaderboard(suiteId, 20)
      console.log(formatLeaderboard(entries))
      break
    }

    default: {
      console.error(`Unknown command: ${command}`)
      console.log("Use 'bun run benchmark --help' for usage information")
      process.exit(1)
    }
  }
}

main().catch(error => {
  console.error("Benchmark error:", error)
  process.exit(1)
})
