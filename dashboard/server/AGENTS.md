<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# server

## Purpose

Bun HTTP API server that serves benchmark result data to the React dashboard. Reads JSON files from the `results/` directory and provides REST endpoints for listing, filtering, and comparing benchmarks.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Main server file with all API routes |

## For AI Agents

### Working In This Directory

- Server uses Bun.serve() for HTTP handling
- All responses are JSON with CORS headers
- Results are read from `../../results/` directory
- Path traversal is prevented via filename sanitization

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/benchmarks` | GET | List all benchmark result files |
| `/api/benchmarks/:filename` | GET | Get specific benchmark by filename |
| `/api/comparison` | GET | Compare latest results across agents |
| `/api/trends` | GET | Score progression over time |
| `/api/leaderboard` | GET | Agent rankings by best score |
| `/api/cases/:caseId` | GET | Results for specific test case |

### Query Parameters

- `/api/comparison?agents=agent1,agent2&suite=code-generation`
- `/api/trends?agent=claude-naive&suite=code-generation`
- `/api/leaderboard?suite=code-generation`

### Configuration

- `PORT` env var - Server port (default: 3001)
- `ALLOWED_ORIGIN` env var - CORS origin (default: '*')

### Security Notes

- Filename sanitization prevents path traversal attacks
- CORS is configurable via environment variable
- Only GET and OPTIONS methods are allowed

## Dependencies

### Internal
- `../../results/` - Benchmark result JSON files

### External
- Bun built-in HTTP server
- Node.js `fs/promises` for file reading

<!-- MANUAL: -->
