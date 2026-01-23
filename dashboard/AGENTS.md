<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# dashboard

## Purpose

React-based web dashboard for visualizing benchmark results. Displays scores, charts, comparisons, and detailed results for AI coding agent benchmarks. Includes a Bun-based API server for serving benchmark data.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Dashboard dependencies (React, Vite, Tailwind, Recharts) |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `index.html` | HTML entry point |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | React application source code (see `src/AGENTS.md`) |
| `server/` | API server for serving benchmark results (see `server/AGENTS.md`) |

## For AI Agents

### Working In This Directory

- This is a separate Bun/React project with its own dependencies
- Run `bun install` in this directory before development
- Uses Tailwind CSS for styling
- Uses Recharts for data visualization

### Development Commands

```bash
# Install dependencies
bun install

# Start development server (frontend)
bun run dev

# Start API server (required for data)
bun run server

# Build for production
bun run build
```

### Architecture

- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS
- Charts: Recharts
- Backend: Bun HTTP server
- Data: Reads JSON files from `../results/`

## Dependencies

### Internal
- `../results/` - JSON benchmark result files
- `../src/types.ts` - Shared types (duplicated in `src/types.ts`)

### External
- `react`, `react-dom` - UI framework
- `recharts` - Charting library
- `date-fns` - Date formatting
- `vite` - Build tool
- `tailwindcss` - CSS framework

<!-- MANUAL: -->
