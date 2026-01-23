<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# execution

## Purpose

Code execution infrastructure for running generated code in sandboxed environments. Supports Python execution for HumanEval-style benchmarks with proper isolation and timeout handling.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Exports execution modules |
| `python-runner.ts` | PythonRunner class for executing Python code |

## For AI Agents

### Working In This Directory

- Execution is sandboxed with timeout and memory limits
- Add new language runners following the PythonRunner pattern
- All runners should return `ExecutionResult` with stdout, stderr, and exit code

### Adding a New Language Runner

1. Create `<language>-runner.ts`
2. Implement execution with proper sandboxing
3. Handle timeouts and resource limits
4. Export from `index.ts`

### Security Notes

- Code execution is inherently risky - proper sandboxing is critical
- Timeouts prevent infinite loops
- Memory limits prevent resource exhaustion
- Network access should be disabled by default

## Dependencies

### Internal
- Used by `validators/execution-validator.ts` for code validation
- Uses `ExecutionConfig` and `TestHarness` types from `../types.ts`

### External
- Python interpreter (for python-runner)
- Node.js `child_process` for spawning execution

<!-- MANUAL: -->
