<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# validators

## Purpose

Output validation logic for benchmark cases. Validates agent outputs through pattern matching, code execution, or custom validation functions. Returns normalized scores (0-1) for comparison.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Exports validation modules |
| `execution-validator.ts` | ExecutionValidator for running and testing generated code |

## For AI Agents

### Working In This Directory

- Validators return `ValidationResult` with score 0-1
- ExecutionValidator uses `../execution/` for code running
- Add new validation strategies as separate modules

### Validation Flow

```
Agent Output
    ↓
Validator (pattern/execution/custom)
    ↓
ValidationResult { passed, score, details, errors }
```

### Using ExecutionValidator

```typescript
import { executionValidator } from './validators'

const result = await executionValidator.validate(
  output,           // Generated code string
  executionConfig,  // Language, entry point, etc.
  testHarness      // Test code, assertions, expected output
)
// result: { passed: boolean, score: number, details?: string, errors?: string[] }
```

### Common Patterns

- Pattern validators check for required code patterns
- Execution validators run code and check test results
- Custom validators can implement any logic

## Dependencies

### Internal
- `../types.ts` - ValidationResult, ExecutionConfig, TestHarness types
- `../execution/` - Code execution infrastructure

### External
- Language runtimes (Python, etc.) for execution-based validation

<!-- MANUAL: -->
