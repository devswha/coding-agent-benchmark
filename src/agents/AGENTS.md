<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# agents

## Purpose

Agent implementations that wrap various AI coding assistants (Claude Code, OpenCode, etc.) to make them usable with the benchmark framework. Each agent implements the common `Agent` interface, allowing unified testing across different tools.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Exports all agents and registers them with AgentRegistry |
| `base-cli-agent.ts` | Abstract base class for CLI-based agents |
| `claude-code.ts` | Claude Code (naive) agent implementation |
| `claude-code-omc.ts` | Claude Code + oh-my-claudecode agent |
| `claude-code-sisyphus.ts` | Claude Code + Sisyphus agent (legacy) |
| `opencode.ts` | OpenCode (naive) agent implementation |
| `opencode-sisyphus.ts` | OpenCode + Sisyphus agent |
| `opencode-ohmyopencode.ts` | OpenCode + oh-my-opencode agent |

## Registered Agents

| Agent Key | Class | Display Name |
|-----------|-------|--------------|
| `claude-naive` | ClaudeCodeAgent | Claude Code (naive) |
| `claude-omc` | ClaudeCodeOMCAgent | Claude Code + OMC |
| `claude-sisyphus` | ClaudeCodeSisyphusAgent | Claude Code + Sisyphus (legacy) |
| `opencode-naive` | OpenCodeAgent | OpenCode (naive) |
| `opencode-sisyphus` | OpenCodeSisyphusAgent | OpenCode + Sisyphus |
| `opencode-ohmyopencode` | OpenCodeOhMyOpenCodeAgent | OpenCode + Oh-My-OpenCode |

## For AI Agents

### Working In This Directory

- All agents must extend `BaseCLIAgent` or implement `Agent` interface
- Register new agents in `index.ts` with `agentRegistry.register()`
- Add new agents to the `agents` export map for CLI access

### Creating a New Agent

1. Create a new file `my-agent.ts`
2. Extend `BaseCLIAgent` and implement:
   - `name: string` - Display name
   - `command: string` - CLI command to invoke
   - `buildArgs(prompt: string): string[]` - Build CLI arguments
3. Export from `index.ts`
4. Register with `agentRegistry.register("my-agent", () => new MyAgent())`
5. Add to `agents` map for CLI availability

### Security Notes

- Uses `execFileSync` with array args to prevent command injection
- Handles platform-specific `which`/`where` commands for availability check
- Timeouts are enforced via Node.js child_process options

### Common Patterns

```typescript
export class MyAgent extends BaseCLIAgent {
  readonly name = "My Agent"
  protected readonly command = "my-cli"

  protected buildArgs(prompt: string): string[] {
    return ["--prompt", prompt, "--non-interactive"]
  }
}
```

## Dependencies

### Internal
- `../agent.ts` - Agent interface and AgentRegistry
- Each agent wraps an external CLI tool

### External
- Node.js `child_process` - For executing CLI commands
- Various CLI tools (claude, opencode, etc.) - Must be installed separately

<!-- MANUAL: -->
