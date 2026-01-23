# Coding Agent Benchmark

A benchmark framework for evaluating AI coding agent **plugins and configurations** - not the underlying LLMs themselves.

## Purpose

This project benchmarks different plugin configurations on the same base CLI tools to measure how plugins improve agent performance. We compare:

- Vanilla agents (no plugins) as baselines
- Agents with enhancement plugins (oh-my-claudecode, oh-my-ssalsyphus, oh-my-opencode)

## Supported Agent Configurations

| Agent Key | Base CLI | Plugin | Repository |
|-----------|----------|--------|------------|
| `claude-naive` | claude | (none) | N/A |
| `claude-omc` | claude | oh-my-claudecode | [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) |
| `claude-sisyphus` | claude | oh-my-claude-sisyphus | [Yeachan-Heo/oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus) |
| `opencode-naive` | opencode | (none) | N/A |
| `opencode-sisyphus` | opencode | oh-my-ssalsyphus | [devswha/oh-my-ssalsyphus](https://github.com/devswha/oh-my-ssalsyphus) |
| `opencode-ohmyopencode` | opencode | oh-my-opencode | [code-yeongyu/oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) |

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime
- claude CLI (for claude-* agents)
- opencode CLI (for opencode-* agents)

### Plugin Setup

For plugin-enhanced agents, install the respective plugins:

```bash
# For claude-omc
# Follow instructions at https://github.com/Yeachan-Heo/oh-my-claudecode

# For opencode-sisyphus
# Follow instructions at https://github.com/devswha/oh-my-ssalsyphus

# For opencode-ohmyopencode
# Follow instructions at https://github.com/code-yeongyu/oh-my-opencode
```

### Project Setup

```bash
bun install
```

### Prerequisites

- Node.js 18+ or Bun
- Git
- (Optional) Google Cloud SDK - for Stitch MCP UI design integration

## Usage

### CLI Commands

```bash
# List available agents
bun run dev agents

# List available benchmark suites
bun run list

# Run benchmark with specific agent
bun run dev run <suite-id> --agent <agent-key>

# Examples:
bun run dev run code-generation --agent claude-naive
bun run dev run code-generation --agent claude-omc
bun run dev run task-completion --agent opencode-sisyphus

# View leaderboard
bun run leaderboard

# Launch dashboard
bun run dashboard
```

### Running Comparisons

Compare vanilla vs plugin-enhanced performance:

```bash
# Run same benchmark with different configurations
bun run dev run code-generation --agent claude-naive
bun run dev run code-generation --agent claude-omc

# Compare results in dashboard
bun run dashboard
```

## Benchmark Suites

| Suite | Description |
|-------|-------------|
| `code-generation` | HumanEval-style programming problems |
| `task-completion` | Multi-step coding tasks |
| `security` | Security-related challenges |
| `sealqa` | Question-answering benchmarks |

## Dashboard

View and compare benchmark results visually:

```bash
# Start API server (required)
bun run dashboard:server

# Start dashboard UI (in another terminal)
bun run dashboard
```

## Adding Custom Agents

Implement the `Agent` interface:

```typescript
import { BaseCLIAgent } from "coding-agent-benchmark/agents"

export class MyPluginAgent extends BaseCLIAgent {
  readonly name = "MyAgent + MyPlugin"
  protected readonly command = "my-cli"

  protected buildArgs(prompt: string): string[] {
    const activatedPrompt = `activation-keyword: ${prompt}`
    return ["--flag", activatedPrompt]
  }
}
```

## MCP Integrations

The benchmark system supports MCP (Model Context Protocol) servers for extended agent capabilities.

| MCP Server | Package | Purpose | Setup |
|------------|---------|---------|-------|
| Stitch | `stitch-mcp` | Google Stitch UI design tools | [Setup Guide](./docs/stitch-mcp-setup.md) |

See `.claude/mcp-servers.example.json` for configuration templates.

## License

MIT
