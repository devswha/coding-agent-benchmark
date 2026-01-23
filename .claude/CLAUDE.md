# Project Notes

## Server Configuration

- **Tailscale IP**: `100.78.133.28` - Use this IP for all server URLs (remote access)
- **Dashboard**: `http://100.78.133.28:3000`
- **API Server**: `http://100.78.133.28:3002`
- Always start servers with `--host 0.0.0.0` for remote access

## Starting Dashboard

```bash
# Terminal 1: API Server
cd dashboard && PORT=3002 bun run server

# Terminal 2: Frontend (with host access)
cd dashboard && bun run dev --host 0.0.0.0
```

## Testing

- **Frontend E2E Testing**: Use Playwright MCP for browser-based E2E testing. It provides excellent snapshot-based element selection and interaction capabilities.
