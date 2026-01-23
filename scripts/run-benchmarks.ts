#!/usr/bin/env bun
/**
 * Benchmark Runner CLI Script
 *
 * Run benchmarks against one or more coding agents.
 *
 * Usage:
 *   bun scripts/run-benchmarks.ts --agent=claude-naive
 *   bun scripts/run-benchmarks.ts --agent=all --suite=code-generation
 *   bun scripts/run-benchmarks.ts --agent=claude-naive,opencode-naive --difficulty=easy
 */

import { parseArgs } from "util"
import { BenchmarkRunner } from "../src/runner"
import { getSuiteById, ALL_SUITES } from "../src/index"
import {
  ClaudeCodeAgent,
  ClaudeCodeSisyphusAgent,
  OpenCodeAgent,
  OpenCodeOhMyOpenCodeAgent,
  AgentKey,
} from "../src/agents"
import type { Agent } from "../src/agent"
import type { BenchmarkCategory } from "../src/types"

// Agent factory map
const agentFactories: Record<AgentKey, () => Agent> = {
  "claude-naive": () => new ClaudeCodeAgent(),
  "claude-sisyphus": () => new ClaudeCodeSisyphusAgent(),
  "opencode-naive": () => new OpenCodeAgent(),
  "opencode-ohmyopencode": () => new OpenCodeOhMyOpenCodeAgent(),
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    agent: { type: "string", short: "a" },
    suite: { type: "string", short: "s" },
    difficulty: { type: "string", short: "d" },
    verbose: { type: "boolean", short: "v", default: true },
    help: { type: "boolean", short: "h" },
  },
})

function showHelp() {
  console.log(`
Benchmark Runner CLI

Usage:
  bun scripts/run-benchmarks.ts [options]

Options:
  --agent, -a      Agent(s) to run (comma-separated or "all")
                   Available: ${Object.keys(agentFactories).join(", ")}
  --suite, -s      Suite to run (default: all)
                   Available: ${ALL_SUITES.map(s => s.id).join(", ")}
  --difficulty, -d Filter by difficulty (easy, medium, hard, or comma-separated)
  --verbose, -v    Show detailed output (default: true)
  --help, -h       Show this help message

Examples:
  bun scripts/run-benchmarks.ts --agent=claude-naive
  bun scripts/run-benchmarks.ts --agent=all --suite=code-generation
  bun scripts/run-benchmarks.ts --agent=claude-naive,opencode-naive --difficulty=easy
  bun scripts/run-benchmarks.ts --agent=claude-sisyphus --suite=task-completion
`)
}

async function main() {
  if (values.help) {
    showHelp()
    process.exit(0)
  }

  // Parse agents
  const agentArg = values.agent || "claude-naive"
  let agentKeys: AgentKey[]

  if (agentArg === "all") {
    agentKeys = Object.keys(agentFactories) as AgentKey[]
  } else {
    agentKeys = agentArg.split(",").map(s => s.trim()) as AgentKey[]
    for (const key of agentKeys) {
      if (!(key in agentFactories)) {
        console.error(`Unknown agent: ${key}`)
        console.error(`Available agents: ${Object.keys(agentFactories).join(", ")}`)
        process.exit(1)
      }
    }
  }

  // Parse suites
  let suites = ALL_SUITES
  if (values.suite) {
    const suite = getSuiteById(values.suite)
    if (!suite) {
      console.error(`Unknown suite: ${values.suite}`)
      console.error(`Available suites: ${ALL_SUITES.map(s => s.id).join(", ")}`)
      process.exit(1)
    }
    suites = [suite]
  }

  // Parse difficulties
  let difficulties: ("easy" | "medium" | "hard")[] | undefined
  if (values.difficulty) {
    difficulties = values.difficulty.split(",").map(s => s.trim()) as ("easy" | "medium" | "hard")[]
  }

  console.log("\n" + "=".repeat(70))
  console.log("BENCHMARK RUNNER")
  console.log("=".repeat(70))
  console.log(`Agents: ${agentKeys.join(", ")}`)
  console.log(`Suites: ${suites.map(s => s.id).join(", ")}`)
  if (difficulties) {
    console.log(`Difficulties: ${difficulties.join(", ")}`)
  }
  console.log("=".repeat(70) + "\n")

  // Run benchmarks for each agent
  for (const agentKey of agentKeys) {
    const agent = agentFactories[agentKey]()

    console.log(`\n${"#".repeat(70)}`)
    console.log(`# Agent: ${agent.name}`)
    console.log(`${"#".repeat(70)}\n`)

    // Check if agent is available
    const available = await agent.isAvailable()
    if (!available) {
      console.error(`[SKIP] Agent not available: ${agent.name}`)
      continue
    }

    const runner = new BenchmarkRunner({
      verbose: values.verbose ?? true,
      saveResults: true,
      difficulties,
    })

    try {
      for (const suite of suites) {
        console.log(`\n>>> Running suite: ${suite.name}`)
        const result = await runner.runSuite(suite, agent)
        console.log(`\n<<< Suite complete: ${result.passedCases}/${result.totalCases} passed (${(result.overallScore * 100).toFixed(1)}%)`)
      }
    } finally {
      runner.cleanup()
    }
  }

  console.log("\n" + "=".repeat(70))
  console.log("ALL BENCHMARKS COMPLETE")
  console.log("=".repeat(70) + "\n")
}

main().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
