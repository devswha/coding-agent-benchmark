<!-- Parent: ../AGENTS.md -->
# benchmark

## Purpose

Performance benchmarking tools for comparing different MAGI configurations and measuring system performance.

## Key Files

- `runner.ts` - Benchmark runner implementation
- `test-cases.ts` - Test case definitions for benchmarking
- `compare.ts` - Comparison utilities for benchmark results
- `REPORT.md` - Benchmark results and analysis report

## For AI Agents

### Running Benchmarks

```bash
bun run benchmark/runner.ts
```

### Adding Test Cases

Add new test cases in `test-cases.ts` following the existing pattern for consistent benchmarking.

### Understanding Results

The `REPORT.md` contains historical benchmark data comparing baseline vs enhanced configurations.

## Dependencies

- Uses the MAGI system from `../src/core/magi.ts`
- May depend on specific LLM providers for consistent testing
