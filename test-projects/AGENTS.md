<!-- Parent: ../AGENTS.md -->
# test-projects

## Purpose

Sample projects used for testing the MAGI system. These provide realistic codebases for testing AI agent capabilities like code analysis, refactoring, and generation.

## Subdirectories

- `blog-generator/` - Blog post generator project (see blog-generator/AGENTS.md)
- `config-migrator/` - Configuration migration tool (see config-migrator/AGENTS.md)
- `git-stats/` - Git statistics analyzer (see git-stats/AGENTS.md)
- `mock-server/` - Mock HTTP server (see mock-server/AGENTS.md)
- `todo-cli/` - CLI todo application (see todo-cli/AGENTS.md)

## For AI Agents

### Using Test Projects

These projects serve as test fixtures for:
- End-to-end testing of MAGI capabilities
- Benchmarking AI agent performance
- Demonstrating MAGI features

### Project Conventions

Each test project is a standalone, minimal implementation meant to exercise specific MAGI features. They are not meant for production use.

## Dependencies

- No runtime dependencies (used as test fixtures)
