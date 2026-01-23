<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# src

## Purpose

Core source code for the coding agent benchmark framework. Contains the type system, agent interface, benchmark runner, CLI, and all supporting modules for executing and validating benchmarks against AI coding agents.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Main entry point - exports all public APIs and types |
| `types.ts` | Core type definitions for benchmarks, cases, and results |
| `agent.ts` | Agent interface and registry for pluggable agent implementations |
| `runner.ts` | BenchmarkRunner class that orchestrates benchmark execution |
| `cli.ts` | Command-line interface using yargs |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `agents/` | Agent implementations (Claude Code, OpenCode, etc.) (see `agents/AGENTS.md`) |
| `datasets/` | Dataset caching and loading utilities (see `datasets/AGENTS.md`) |
| `execution/` | Code execution runners (Python, etc.) (see `execution/AGENTS.md`) |
| `importers/` | Dataset importers (HumanEval, SWE-bench) (see `importers/AGENTS.md`) |
| `suites/` | Benchmark suite definitions (see `suites/AGENTS.md`) |
| `validators/` | Output validation logic (see `validators/AGENTS.md`) |

## For AI Agents

### Working In This Directory

- Follow TypeScript strict mode conventions
- Export new modules from `index.ts`
- Use the existing type definitions from `types.ts`
- Agents must implement the `Agent` interface from `agent.ts`

### Testing Requirements

- Run `bun run typecheck` to verify types
- Test new functionality with existing benchmark suites
- Ensure backwards compatibility with existing agents

### Common Patterns

- Use `BenchmarkCase` interface for all test case definitions
- Validation functions return `ValidationResult` with score 0-1
- Timeout handling uses Promise.race with cleanup
- Results are aggregated into `BenchmarkSuiteResult`

### Key Interfaces

```typescript
// Agent interface (from agent.ts)
interface Agent {
  name: string
  execute(prompt: string, config?: AgentConfig): Promise<AgentResponse>
  isAvailable(): Promise<boolean>
}

// Benchmark case (from types.ts)
interface BenchmarkCase {
  id: string
  name: string
  prompt: string
  category: BenchmarkCategory
  difficulty: "easy" | "medium" | "hard"
  validationFn?: (output: string) => ValidationResult
}
```

## Dependencies

### Internal
- All subdirectories are re-exported through `index.ts`
- `runner.ts` depends on `validators/` for output validation
- `cli.ts` depends on all other modules

### External
- `yargs` - CLI argument parsing (in cli.ts)
- `zod` - Schema validation (used in importers)
- `glob` - File pattern matching

<!-- MANUAL: -->
