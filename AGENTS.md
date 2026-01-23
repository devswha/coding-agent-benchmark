<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# coding-agent-benchmark

## Purpose

A comprehensive benchmark framework for evaluating AI coding agent **plugins** and extensions. While the underlying LLMs (Claude, GPT, etc.) provide the base intelligence, this framework benchmarks the **plugin layer** that enhances these agents with specialized capabilities, workflows, and tooling. The system provides standardized test suites, execution infrastructure, and a dashboard for comparing how different plugin configurations affect agent performance across code generation, task completion, security, and other software engineering tasks.

## Supported Agent Configurations

This project benchmarks coding agent **plugins**, not the underlying LLMs.

| Agent Key | Base CLI | Plugin | Repository |
|-----------|----------|--------|------------|
| `claude-naive` | claude | (none) | N/A |
| `claude-omc` | claude | oh-my-claudecode | [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) |
| `claude-sisyphus` | claude | oh-my-claude-sisyphus | [Yeachan-Heo/oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus) |
| `opencode-naive` | opencode | (none) | N/A |
| `opencode-sisyphus` | opencode | oh-my-ssalsyphus | [devswha/oh-my-ssalsyphus](https://github.com/devswha/oh-my-ssalsyphus) |
| `opencode-ohmyopencode` | opencode | oh-my-opencode | [code-yeongyu/oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) |

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Project dependencies and npm scripts |
| `tsconfig.json` | TypeScript configuration |
| `bin/agent-benchmark` | CLI entry point executable |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Core benchmark framework source code (see `src/AGENTS.md`) |
| `dashboard/` | React-based web UI for viewing benchmark results (see `dashboard/AGENTS.md`) |
| `test-projects/` | Sample projects used as test fixtures (see `test-projects/AGENTS.md`) |
| `scripts/` | Utility scripts for running benchmarks |
| `results/` | Output directory for benchmark results (JSON) |

## MCP Server Integration

This project supports MCP (Model Context Protocol) servers to extend agent capabilities during benchmarks.

### Available MCP Servers

| Server | Package | Purpose |
|--------|---------|---------|
| Stitch | `stitch-mcp` | Google Stitch UI design tools |

### Configuration

- Example config: `.claude/mcp-servers.example.json`
- Setup guide: `docs/stitch-mcp-setup.md`

MCP configuration is external to the benchmark framework. Agents gain access to MCP tools automatically when configured in Claude settings.

## For AI Agents

### Working In This Directory

- This is a Bun/TypeScript project - use `bun` for all commands
- Run `bun install` after modifying package.json
- The main entry point is `src/cli.ts` via `bun run dev`
- Use TypeScript strict mode and follow existing patterns

### Testing Requirements

- Run `bun test` for unit tests
- Run `bun run typecheck` to verify TypeScript types
- Test new agents by running them against a single benchmark case first

### Common Patterns

- Agent implementations extend `BaseCLIAgent` in `src/agents/`
- Benchmark suites are defined in `src/suites/` with `BenchmarkCase` arrays
- Validation can be pattern-based, execution-based, or custom function
- Results are saved as JSON to `./results/`

### CLI Commands

```bash
# List available suites
bun run list

# List available agents
bun run dev agents

# Run a benchmark
bun run dev run <suite-id> --agent claude-naive
bun run dev run <suite-id> --agent opencode-sisyphus

# View leaderboard
bun run leaderboard

# Start dashboard
bun run dashboard
```

## Dependencies

### Internal
- Agents implement the `Agent` interface from `src/agent.ts`
- Suites use types from `src/types.ts`
- Runner orchestrates execution via `src/runner.ts`

### External
- `bun` - JavaScript runtime and package manager
- `yargs` - CLI argument parsing
- `zod` - Schema validation
- `glob` - File pattern matching

<!-- MANUAL: Project-specific notes can be added below -->
