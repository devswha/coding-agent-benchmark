# MAGI Benchmark

Benchmark suite for evaluating the [MAGI](https://github.com/devswha/MAGI) multi-orchestrator AI coding agent.

## Features

- **4 Benchmark Suites**
  - Code Generation - Generate code from descriptions
  - Trinity Protocol - Evaluate orchestrator consensus quality
  - Task Completion - End-to-end multi-step tasks
  - Agent Comparison - Compare MAGI vs other AI agents

- **Real Execution Mode** - Tests against actual CLI tools
- **Comprehensive Metrics** - Score, duration, token usage, consensus rates
- **Leaderboard** - Track performance over time

## Installation

```bash
# Clone the repository
git clone https://github.com/devswha/magi-benchmark.git
cd magi-benchmark

# Install dependencies
bun install

# Optional: Install MAGI for full integration
bun add magi
```

## Usage

### List Available Suites

```bash
bun run list
```

### Run Benchmarks

```bash
# Run specific suite
bun run run:trinity
bun run run:code
bun run run:task
bun run run:agent

# Run all suites
bun run run:all
```

### View Leaderboard

```bash
bun run leaderboard
```

### Compare Results

```bash
bun run compare <baseline-file> <current-file>
```

## Configuration

### Environment Variables

```bash
# Use unified model for all orchestrators
MAGI_UNIFIED_MODEL=anthropic/claude-opus-4-5

# Or configure individual orchestrators
MAGI_MELCHIOR_MODEL=anthropic/claude-opus-4-5
MAGI_BALTHASAR_MODEL=anthropic/claude-sonnet-4-5
MAGI_CASPAR_MODEL=anthropic/claude-haiku-4-5
```

## Test Projects

The `test-projects/` directory contains fixtures for benchmarking:

- **blog-generator** - Markdown to HTML blog generator
- **config-migrator** - YAML configuration merger
- **git-stats** - Git repository statistics
- **mock-server** - JSON schema to mock API
- **todo-cli** - Simple todo CLI application

## Standalone vs Integrated Mode

This benchmark can run in two modes:

1. **Standalone Mode** - Define and validate test cases without MAGI
2. **Integrated Mode** - Full execution against MAGI system (requires `magi` package)

```typescript
import { BenchmarkRunner } from "magi-benchmark"

const runner = new BenchmarkRunner({ verbose: true })

// Check if MAGI is available
if (await BenchmarkRunner.isMAGIAvailable()) {
  const results = await runner.runSuite(suite)
}
```

## API

### Types

```typescript
import type {
  BenchmarkSuite,
  BenchmarkCase,
  BenchmarkSuiteResult,
  BenchmarkRunResult,
  TrinityBenchmarkMetrics,
} from "magi-benchmark"
```

### Running Benchmarks

```typescript
import { BenchmarkRunner, trinityProtocolSuite } from "magi-benchmark"

const runner = new BenchmarkRunner({
  verbose: true,
  saveResults: true,
  outputDir: "./results",
})

const results = await runner.runSuite(trinityProtocolSuite)
```

## License

MIT
