# Coding Agent Benchmark

A generic benchmark framework for evaluating AI coding agents.

## Supported Agents

- Claude Code
- Cursor
- Aider
- OpenHands
- Cline
- Any agent implementing the `Agent` interface

## Installation

```bash
bun install
```

### Prerequisites

- Node.js 18+ or Bun
- Git
- (Optional) Google Cloud SDK - for Stitch MCP UI design integration

## Quick Start

```typescript
import { BenchmarkRunner, codeGenerationSuite, type Agent } from "coding-agent-benchmark"

// Implement the Agent interface for your agent
const myAgent: Agent = {
  name: "My Agent",

  async execute(prompt, config) {
    // Your agent execution logic here
    const result = await runMyAgent(prompt)
    return {
      content: result.output,
      tokensUsed: result.tokens,
      durationMs: result.duration,
    }
  },

  async isAvailable() {
    return true
  }
}

// Run benchmarks
const runner = new BenchmarkRunner({ verbose: true })
const results = await runner.runSuite(codeGenerationSuite, myAgent)

console.log(`Score: ${results.overallScore}`)
console.log(`Pass Rate: ${results.passedCases}/${results.totalCases}`)
```

## CLI Usage

```bash
# List available suites
bun run list

# View leaderboard
bun run leaderboard
```

## Benchmark Suites

### Code Generation
Tests ability to generate code from natural language descriptions.

```typescript
import { codeGenerationSuite } from "coding-agent-benchmark"
```

### Task Completion
Tests ability to complete multi-step coding tasks.

```typescript
import { taskCompletionSuite } from "coding-agent-benchmark"
```

## MCP Integrations

The benchmark system supports MCP (Model Context Protocol) servers for extended agent capabilities.

| MCP Server | Package | Purpose | Setup |
|------------|---------|---------|-------|
| Stitch | `stitch-mcp` | Google Stitch UI design tools | [Setup Guide](./docs/stitch-mcp-setup.md) |

See `.claude/mcp-servers.example.json` for configuration templates.

## Creating Custom Agents

```typescript
import type { Agent, AgentResponse } from "coding-agent-benchmark"
import { spawn } from "child_process"

// Example: CLI-based agent wrapper
export const claudeCodeAgent: Agent = {
  name: "Claude Code",

  async execute(prompt, config): Promise<AgentResponse> {
    const startTime = Date.now()

    // Execute claude CLI
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn("claude", ["-p", prompt], {
        cwd: config?.workingDir,
        timeout: config?.timeoutMs,
      })

      let output = ""
      proc.stdout.on("data", (data) => output += data)
      proc.on("close", () => resolve(output))
      proc.on("error", reject)
    })

    return {
      content: result,
      durationMs: Date.now() - startTime,
    }
  },

  async isAvailable() {
    // Check if claude CLI is installed
    try {
      const { execSync } = await import("child_process")
      execSync("which claude")
      return true
    } catch {
      return false
    }
  }
}
```

## Test Projects

The `test-projects/` directory contains fixtures for benchmarking:

- **blog-generator** - Markdown to HTML blog generator
- **config-migrator** - YAML configuration merger
- **git-stats** - Git repository statistics
- **mock-server** - JSON schema to mock API
- **todo-cli** - Simple todo CLI application

## Benchmark Categories

| Category | Description |
|----------|-------------|
| `code_generation` | Generate code from description |
| `code_completion` | Complete partial code |
| `bug_fixing` | Fix bugs in code |
| `refactoring` | Refactor code |
| `test_generation` | Generate tests |
| `task_completion` | Multi-step tasks |
| `debugging` | Debug issues |
| `documentation` | Generate docs |

## API Reference

### BenchmarkRunner

```typescript
const runner = new BenchmarkRunner({
  verbose: true,           // Show progress
  saveResults: true,       // Save to JSON
  outputDir: "./results",  // Results directory
  maxConcurrency: 3,       // Parallel execution
  defaultTimeoutMs: 60000, // Default timeout
})

const results = await runner.runSuite(suite, agent)
```

### Agent Interface

```typescript
interface Agent {
  name: string
  initialize?(config?: AgentConfig): Promise<void>
  execute(prompt: string, config?: AgentConfig): Promise<AgentResponse>
  isAvailable(): Promise<boolean>
  cleanup?(): Promise<void>
}

interface AgentResponse {
  content: string
  tokensUsed?: number
  durationMs?: number
  filesModified?: string[]
  metadata?: Record<string, unknown>
}
```

## License

MIT
