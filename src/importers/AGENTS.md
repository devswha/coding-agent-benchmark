<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# importers

## Purpose

Dataset importers that convert external benchmark datasets (HumanEval, SWE-bench, etc.) into the internal `BenchmarkCase` format. Handles fetching, parsing, and transforming various dataset formats.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Importer registry and exports |
| `base-importer.ts` | Abstract BaseImporter class with common functionality |
| `humaneval-importer.ts` | Importer for HumanEval/HumanEval+ datasets |
| `swe-bench-importer.ts` | Importer for SWE-bench/SWE-bench-lite datasets |

## For AI Agents

### Working In This Directory

- All importers extend `BaseImporter`
- Register new importers via `registerImporter()` in `index.ts`
- Importers should handle caching via the `datasets/` module

### Creating a New Importer

1. Create `<dataset>-importer.ts`
2. Extend `BaseImporter` and implement:
   - `import(options: ImportOptions): Promise<ImportResult>`
   - Transform external format to `BenchmarkCase[]`
3. Register in `index.ts`

### Common Patterns

```typescript
export class MyDatasetImporter extends BaseImporter {
  async import(options: ImportOptions): Promise<ImportResult> {
    // 1. Fetch or load dataset
    const raw = await this.fetchDataset(options.source)

    // 2. Transform to BenchmarkCase[]
    const cases = raw.map(item => ({
      id: `my-${item.id}`,
      name: item.title,
      prompt: item.question,
      category: 'code_generation' as const,
      difficulty: this.mapDifficulty(item.level),
      // ... other fields
    }))

    return { cases, metadata: { ... } }
  }
}
```

## Dependencies

### Internal
- `../types.ts` - BenchmarkCase and related types
- `../datasets/` - For caching imported data

### External
- Network APIs for fetching remote datasets
- `zod` for schema validation

<!-- MANUAL: -->
