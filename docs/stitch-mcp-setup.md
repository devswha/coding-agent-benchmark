# Stitch MCP Setup Guide

## Overview
Stitch MCP enables Claude Code to use Google Stitch for AI-powered UI design generation.

Package: `stitch-mcp` v1.3.1
GitHub: https://github.com/Kargatharaakash/stitch-mcp

## Prerequisites
- Node.js 18+ (for npx)
- Google Cloud account
- Google Cloud CLI (gcloud) installed

## Step 1: GCP Project Setup

1. Create or select a project at https://console.cloud.google.com
2. Note your Project ID (e.g., `my-project-123`)

## Step 2: Enable Stitch API

```bash
# Install gcloud beta component if needed
gcloud components install beta

# Enable the Stitch API
gcloud beta services mcp enable stitch.googleapis.com --project=YOUR_PROJECT_ID
```

## Step 3: Set Up Authentication

```bash
# Login to Google Cloud
gcloud auth login

# Set up Application Default Credentials
gcloud auth application-default login

# Set your project
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

## Step 4: Configure Claude Code

Copy from `.claude/mcp-servers.example.json` and add to your Claude settings:

**Global settings** (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id"
      }
    }
  }
}
```

## Step 5: Verify Installation

```bash
# Test the package loads
npx -y stitch-mcp --help
```

When Claude Code starts, you should see Stitch tools available.

## Available Stitch MCP Tools

| Tool | Description |
|------|-------------|
| extract_design_context | Extract colors, typography, and structure from designs |
| fetch_code | Get frontend code from Stitch projects |
| fetch_images | Retrieve design images |
| generate_screen | Generate new UI screens |
| list_projects | List available Stitch projects |
| list_screens | List screens in a project |

## Troubleshooting

### "API not enabled"
Run: `gcloud beta services mcp enable stitch.googleapis.com --project=YOUR_PROJECT_ID`

### "No credentials found"
Run: `gcloud auth application-default login`

### "Project not found"
Verify your project ID in the config matches your GCP project.

### "Permission denied"
Ensure your account has the `roles/serviceusage.serviceUsageConsumer` role.

## Resources

- [stitch-mcp on npm](https://www.npmjs.com/package/stitch-mcp)
- [Google Stitch](https://stitch.withgoogle.com)
- [MCP Protocol](https://modelcontextprotocol.io)
