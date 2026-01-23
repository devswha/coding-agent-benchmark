<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# datasets

## Purpose

Dataset caching and loading utilities for benchmark data. Provides efficient local caching of imported datasets and unified loading interface for benchmark suites.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Exports cache and loader modules |
| `cache.ts` | DatasetCache class for local caching of datasets |
| `loader.ts` | DatasetLoader for unified dataset access |

## For AI Agents

### Working In This Directory

- Cache entries include metadata and expiration handling
- Loader provides abstraction over cache and remote fetching
- Use existing patterns for adding new dataset sources

### Common Patterns

```typescript
// Using the dataset cache
import { datasetCache } from './datasets'

const cached = await datasetCache.get('humaneval-plus')
if (!cached) {
  // Fetch and cache
  await datasetCache.set('humaneval-plus', data, metadata)
}

// Using the loader
import { datasetLoader } from './datasets'

const dataset = await datasetLoader.load('humaneval-plus')
```

## Dependencies

### Internal
- Used by `importers/` to cache fetched datasets
- Used by `suites/` to load benchmark cases

### External
- File system APIs for cache persistence

<!-- MANUAL: -->
