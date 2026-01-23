# Benchmark Dashboard

A React-based dashboard for visualizing coding agent benchmark results.

## Features

- View all benchmark results in one place
- Filter by difficulty (easy/medium/hard)
- Filter by status (passed/failed)
- Search cases by name
- Sort by any column
- Interactive charts showing:
  - Score by category
  - Score by difficulty
- Expandable rows to view detailed output and errors

## Quick Start

```bash
# From the project root
bun run dashboard:install   # Install dependencies
bun run dashboard:server    # Start API server (runs on port 3001)
bun run dashboard           # Start frontend (runs on port 3000)
```

Then open http://localhost:3000 in your browser.

## Development

The dashboard consists of two parts:

1. **API Server** (`server/index.ts`) - Bun server that reads JSON results from `../results/`
2. **Frontend** (`src/`) - React + Vite + TailwindCSS application

### Running Separately

```bash
# Terminal 1: API Server
cd dashboard
bun run server

# Terminal 2: Frontend Dev Server
cd dashboard
bun run dev
```

### Building for Production

```bash
cd dashboard
bun run build
```

Built files will be in `dashboard/dist/`.

## Architecture

```
dashboard/
├── server/
│   └── index.ts          # Bun API server
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ScoreCard.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── DifficultyChart.tsx
│   │   └── ResultsTable.tsx
│   ├── types.ts          # TypeScript types
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Tailwind styles
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## API Endpoints

- `GET /api/benchmarks` - Returns all benchmark results
- `GET /api/benchmarks/:filename` - Returns a specific benchmark result

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Recharts (charts)
- date-fns (date formatting)
- Bun (server & runtime)
