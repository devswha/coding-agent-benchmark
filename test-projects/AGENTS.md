<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# test-projects

## Purpose

Sample TypeScript projects used as test fixtures for benchmarking AI coding agents. These provide realistic, minimal codebases for testing agent capabilities like code analysis, task completion, and code generation.

## Key Files

| File | Description |
|------|-------------|
| Each subdirectory contains an `index.ts` | Entry point for each test project |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `blog-generator/` | Static blog post generator with markdown support |
| `config-migrator/` | Configuration file migration tool with JSON schema |
| `git-stats/` | Git repository statistics analyzer |
| `mock-server/` | Mock HTTP server for API testing |
| `todo-cli/` | Command-line todo list application |

## For AI Agents

### Using Test Projects

These projects serve as test fixtures for:
- End-to-end testing of benchmark capabilities
- Benchmarking AI agent performance on real-world tasks
- Testing code understanding and modification skills

### Project Conventions

- Each project is standalone with minimal dependencies
- Entry point is always `index.ts`
- Projects are intentionally simple to isolate specific capabilities
- Not meant for production use

### Testing With These Projects

```bash
# Run a specific test project
bun run test-projects/todo-cli/index.ts

# Use in benchmark cases by referencing the directory
```

## Dependencies

### Internal
- Used by `src/suites/task-completion.ts` for task completion benchmarks

### External
- No runtime dependencies (used as test fixtures)
- TypeScript for type checking

<!-- MANUAL: -->
