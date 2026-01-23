<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# suites

## Purpose

Benchmark suite definitions containing test cases organized by category. Each suite is a collection of `BenchmarkCase` items with validation logic. Suites are exported and aggregated in `../index.ts`.

## Key Files

| File | Description |
|------|-------------|
| `code-generation.ts` | HumanEval-style programming problems (Two Sum, FizzBuzz, LRU Cache, etc.) |
| `task-completion.ts` | Multi-step task completion benchmarks |
| `security.ts` | Security-focused benchmark cases |
| `humaneval-plus.ts` | HumanEval+ imported benchmark suite |
| `swe-bench-lite.ts` | SWE-bench Lite imported benchmark suite |
| `sealqa.ts` | SealQA question-answering benchmark suite |

## For AI Agents

### Working In This Directory

- Each suite exports a `BenchmarkSuite` object
- Cases use `validationFn` or `executionConfig` for validation
- Add new suites to `ALL_SUITES` array in `../index.ts`

### Creating a New Suite

1. Create `<suite-name>.ts`
2. Define cases as `BenchmarkCase[]`
3. Create validation functions
4. Export as `BenchmarkSuite`:

```typescript
export const mySuite: BenchmarkSuite = {
  id: "my-suite",
  name: "My Benchmark Suite",
  description: "Description of the suite",
  version: "1.0.0",
  cases: myCases,
  defaultTimeout: 60000,
}
```

5. Add to `../index.ts` exports and `ALL_SUITES`

### Validation Patterns

- **Pattern matching**: `createCodeValidator([/function\s+name/, /return/])`
- **Function validation**: `createFunctionValidator("funcName", testCases)`
- **Execution-based**: Set `executionConfig` and `testHarness` for runtime validation
- **Custom**: Provide `validationFn: (output) => ValidationResult`

### Case Categories

- `code_generation` - Generate code from description
- `code_completion` - Complete partial code
- `bug_fixing` - Fix bugs in code
- `task_completion` - Multi-step tasks
- `security` - Security-related challenges
- `qa_reasoning` - Question answering

## Dependencies

### Internal
- `../types.ts` - BenchmarkSuite, BenchmarkCase types
- `../validators/` - For execution-based validation
- `../importers/` - For imported dataset suites

### External
- None directly (validation may use external runners)

<!-- MANUAL: -->
