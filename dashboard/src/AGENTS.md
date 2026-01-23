<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# src

## Purpose

React application source code for the benchmark dashboard. Contains the main App component, reusable UI components for displaying benchmark data, and TypeScript type definitions.

## Key Files

| File | Description |
|------|-------------|
| `main.tsx` | React entry point, renders App |
| `App.tsx` | Main application component with state management |
| `types.ts` | TypeScript types for benchmark data |
| `vite-env.d.ts` | Vite environment type declarations |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `components/` | Reusable React components (see `components/AGENTS.md`) |

## For AI Agents

### Working In This Directory

- Use functional components with hooks
- Follow existing Tailwind CSS patterns for styling
- Types are defined in `types.ts` - keep in sync with backend
- Use AbortController for cleanup in useEffect (see App.tsx pattern)

### Key Components

- `App.tsx` - State management, data fetching, layout
- `Dashboard.tsx` - Main dashboard view with charts and tables
- `Sidebar.tsx` - Benchmark file selection
- `Header.tsx` - Page header
- `ScoreCard.tsx` - Score display cards
- `CategoryChart.tsx` / `DifficultyChart.tsx` - Recharts visualizations
- `ResultsTable.tsx` - Individual case results
- `ComparisonView.tsx` - Multi-agent comparison
- `ErrorBoundary.tsx` - Error handling

### State Flow

```
API (/api/benchmarks)
    ↓
App.tsx (fetch + state)
    ↓
Sidebar (list) + Dashboard (detail)
    ↓
Charts + Tables + Cards
```

## Dependencies

### Internal
- `../server/` - API endpoints for data
- `types.ts` - Shared type definitions

### External
- `react` - UI framework
- `recharts` - Chart components
- `date-fns` - Date formatting

<!-- MANUAL: -->
