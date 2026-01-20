#!/usr/bin/env bun
import { existsSync, readFileSync } from "fs"

interface Schema {
  resources: Record<string, { fields: string[] }>
}

interface Store {
  [resource: string]: Record<string, any>[]
}

const store: Store = {}
const counters: Record<string, number> = {}

function loadSchema(path: string): Schema {
  if (!existsSync(path)) {
    console.error(`Error: Schema file '${path}' not found`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, "utf-8"))
}

function initializeStore(schema: Schema): void {
  for (const resource of Object.keys(schema.resources)) {
    store[resource] = []
    counters[resource] = 1
  }
}

function log(method: string, path: string, status: number, body?: any): void {
  const timestamp = new Date().toISOString().slice(11, 19)
  const statusColor = status < 400 ? "\x1b[32m" : "\x1b[31m"
  console.log(`[${timestamp}] ${method.padEnd(6)} ${path.padEnd(30)} ${statusColor}${status}\x1b[0m`)
  if (body && process.env.VERBOSE) {
    console.log("  →", JSON.stringify(body).slice(0, 100))
  }
}

function parseBody(req: Request): Promise<any> {
  return req.json().catch(() => ({}))
}

function createServer(schema: Schema, port: number) {
  initializeStore(schema)

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)
      const parts = url.pathname.split("/").filter(Boolean)
      const method = req.method
      const resource = parts[0]
      const id = parts[1]

      if (!resource) {
        return new Response(JSON.stringify({ 
          message: "Mock API Server",
          resources: Object.keys(schema.resources) 
        }), {
          headers: { "Content-Type": "application/json" },
        })
      }

      if (!schema.resources[resource]) {
        log(method, url.pathname, 404)
        return new Response(JSON.stringify({ error: `Resource '${resource}' not found` }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      const data = store[resource]

      if (method === "GET" && !id) {
        log(method, url.pathname, 200, data)
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        })
      }

      if (method === "GET" && id) {
        const item = data.find(d => d.id === parseInt(id))
        if (!item) {
          log(method, url.pathname, 404)
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        }
        log(method, url.pathname, 200, item)
        return new Response(JSON.stringify(item), {
          headers: { "Content-Type": "application/json" },
        })
      }

      if (method === "POST") {
        const body = await parseBody(req)
        const newItem = { id: counters[resource]++, ...body }
        data.push(newItem)
        log(method, url.pathname, 201, newItem)
        return new Response(JSON.stringify(newItem), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (method === "PUT" && id) {
        const index = data.findIndex(d => d.id === parseInt(id))
        if (index === -1) {
          log(method, url.pathname, 404)
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        }
        const body = await parseBody(req)
        data[index] = { ...data[index], ...body }
        log(method, url.pathname, 200, data[index])
        return new Response(JSON.stringify(data[index]), {
          headers: { "Content-Type": "application/json" },
        })
      }

      if (method === "DELETE" && id) {
        const index = data.findIndex(d => d.id === parseInt(id))
        if (index === -1) {
          log(method, url.pathname, 404)
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        }
        const [deleted] = data.splice(index, 1)
        log(method, url.pathname, 200, deleted)
        return new Response(JSON.stringify(deleted), {
          headers: { "Content-Type": "application/json" },
        })
      }

      log(method, url.pathname, 405)
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      })
    },
  })

  return server
}

function showHelp(): void {
  console.log(`
🔌 Mock API Server

Usage:
  mock-server [options]

Options:
  --schema <file>   Schema file (default: ./schema.json)
  --port <number>   Port number (default: 3000)
  --help            Show this help

Schema format:
  {
    "resources": {
      "users": { "fields": ["id", "name", "email"] },
      "posts": { "fields": ["id", "title", "body"] }
    }
  }

Generated endpoints:
  GET    /<resource>       List all
  GET    /<resource>/:id   Get one
  POST   /<resource>       Create
  PUT    /<resource>/:id   Update
  DELETE /<resource>/:id   Delete
`)
}

function main() {
  const args = process.argv.slice(2)

  if (args.includes("--help") || args.includes("-h")) {
    showHelp()
    return
  }

  let schemaPath = "./schema.json"
  let port = 3000

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--schema" && args[i + 1]) {
      schemaPath = args[++i]
    } else if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[++i])
    }
  }

  const schema = loadSchema(schemaPath)
  const server = createServer(schema, port)

  console.log(`\n🚀 Mock Server running at http://localhost:${port}`)
  console.log(`📦 Resources: ${Object.keys(schema.resources).join(", ")}\n`)
  console.log("Endpoints:")
  for (const resource of Object.keys(schema.resources)) {
    console.log(`  GET/POST   /${resource}`)
    console.log(`  GET/PUT/DELETE /${resource}/:id`)
  }
  console.log("\nPress Ctrl+C to stop\n")
}

main()
