#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "fs"
import { extname } from "path"

type ConfigFormat = "env" | "yaml" | "json"
type ConfigData = Record<string, any>

function detectFormat(filePath: string): ConfigFormat {
  const ext = extname(filePath).toLowerCase()
  if (ext === ".env" || filePath.endsWith(".env")) return "env"
  if (ext === ".yaml" || ext === ".yml") return "yaml"
  if (ext === ".json") return "json"
  throw new Error(`Unknown format for file: ${filePath}`)
}

function parseEnv(content: string): ConfigData {
  const result: ConfigData = {}
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

function parseYaml(content: string): ConfigData {
  const result: ConfigData = {}
  const lines = content.split("\n")
  const stack: { indent: number; obj: ConfigData; key?: string }[] = [{ indent: -1, obj: result }]

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue

    const indent = line.search(/\S/)
    const trimmed = line.trim()

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    const current = stack[stack.length - 1].obj

    if (trimmed.startsWith("- ")) {
      const parentKey = stack[stack.length - 1].key
      if (parentKey && !Array.isArray(current[parentKey])) {
        current[parentKey] = []
      }
      if (parentKey) {
        current[parentKey].push(trimmed.slice(2).trim())
      }
      continue
    }

    const colonIndex = trimmed.indexOf(":")
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    const value = trimmed.slice(colonIndex + 1).trim()

    if (!value) {
      current[key] = {}
      stack.push({ indent, obj: current[key], key })
    } else {
      current[key] = parseYamlValue(value)
    }
  }

  return result
}

function parseYamlValue(value: string): any {
  if (value === "true") return true
  if (value === "false") return false
  if (value === "null" || value === "~") return null
  if (/^-?\d+$/.test(value)) return parseInt(value)
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map(s => parseYamlValue(s.trim()))
  }
  return value
}

function parseJson(content: string): ConfigData {
  return JSON.parse(content)
}

function parse(filePath: string): ConfigData {
  const content = readFileSync(filePath, "utf-8")
  const format = detectFormat(filePath)
  switch (format) {
    case "env": return parseEnv(content)
    case "yaml": return parseYaml(content)
    case "json": return parseJson(content)
  }
}

function toEnv(data: ConfigData, prefix = ""): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}_${key}` : key
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      lines.push(toEnv(value, fullKey))
    } else {
      const strValue = Array.isArray(value) ? value.join(",") : String(value)
      lines.push(`${fullKey.toUpperCase()}=${strValue}`)
    }
  }
  return lines.join("\n")
}

function toYaml(data: ConfigData, indent = 0): string {
  const spaces = "  ".repeat(indent)
  const lines: string[] = []

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${spaces}${key}:`)
      for (const item of value) {
        lines.push(`${spaces}  - ${item}`)
      }
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${spaces}${key}:`)
      lines.push(toYaml(value, indent + 1))
    } else {
      const strValue = typeof value === "string" && value.includes(" ") ? `"${value}"` : value
      lines.push(`${spaces}${key}: ${strValue}`)
    }
  }

  return lines.join("\n")
}

function toJson(data: ConfigData): string {
  return JSON.stringify(data, null, 2)
}

function serialize(data: ConfigData, format: ConfigFormat): string {
  switch (format) {
    case "env": return toEnv(data)
    case "yaml": return toYaml(data)
    case "json": return toJson(data)
  }
}

function deepMerge(target: ConfigData, source: ConfigData): ConfigData {
  const result = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value) &&
        typeof result[key] === "object" && result[key] !== null && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value)
    } else {
      result[key] = value
    }
  }
  return result
}

function diff(obj1: ConfigData, obj2: ConfigData, path = ""): string[] {
  const diffs: string[] = []
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)])

  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key
    const val1 = obj1[key]
    const val2 = obj2[key]

    if (!(key in obj1)) {
      diffs.push(`+ ${fullPath}: ${JSON.stringify(val2)}`)
    } else if (!(key in obj2)) {
      diffs.push(`- ${fullPath}: ${JSON.stringify(val1)}`)
    } else if (typeof val1 === "object" && typeof val2 === "object" &&
               val1 !== null && val2 !== null && !Array.isArray(val1) && !Array.isArray(val2)) {
      diffs.push(...diff(val1, val2, fullPath))
    } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs.push(`~ ${fullPath}: ${JSON.stringify(val1)} → ${JSON.stringify(val2)}`)
    }
  }

  return diffs
}

function interpolate(data: ConfigData, env: Record<string, string> = process.env as Record<string, string>): ConfigData {
  const result: ConfigData = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      result[key] = value.replace(/\$\{(\w+)\}/g, (_, varName) => env[varName] || "")
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = interpolate(value, env)
    } else {
      result[key] = value
    }
  }
  return result
}

function validate(data: ConfigData, schemaPath: string): { valid: boolean; errors: string[] } {
  const schema = parse(schemaPath)
  const errors: string[] = []

  function check(data: ConfigData, schema: ConfigData, path = "") {
    for (const [key, schemaValue] of Object.entries(schema)) {
      const fullPath = path ? `${path}.${key}` : key
      const dataValue = data[key]

      if (schemaValue.required && dataValue === undefined) {
        errors.push(`Missing required field: ${fullPath}`)
        continue
      }

      if (dataValue === undefined) continue

      if (schemaValue.type) {
        const actualType = Array.isArray(dataValue) ? "array" : typeof dataValue
        if (actualType !== schemaValue.type) {
          errors.push(`Type mismatch at ${fullPath}: expected ${schemaValue.type}, got ${actualType}`)
        }
      }

      if (schemaValue.properties && typeof dataValue === "object") {
        check(dataValue, schemaValue.properties, fullPath)
      }
    }
  }

  if (schema.properties) {
    check(data, schema.properties)
  }

  return { valid: errors.length === 0, errors }
}

function showHelp(): void {
  console.log(`
🔄 Config Migrator

Usage:
  migrate <command> [options]

Commands:
  convert <file> --to <format>          Convert config format (env/yaml/json)
  merge <base> <override> -o <output>   Deep merge two configs
  diff <file1> <file2>                  Show differences between configs
  validate <file> --schema <schema>     Validate against schema
  interpolate <file> -o <output>        Replace \${VAR} with env values

Examples:
  migrate convert config.env --to yaml
  migrate merge base.yaml override.yaml -o merged.yaml
  migrate diff old.json new.json
  migrate validate config.yaml --schema schema.json
  migrate interpolate template.yaml -o config.yaml
`)
}

function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case "convert": {
      const inputFile = args[1]
      const toIndex = args.indexOf("--to")
      const toFormat = args[toIndex + 1] as ConfigFormat

      if (!inputFile || !toFormat) {
        console.error("Usage: migrate convert <file> --to <format>")
        process.exit(1)
      }

      if (!existsSync(inputFile)) {
        console.error(`File not found: ${inputFile}`)
        process.exit(1)
      }

      const data = parse(inputFile)
      const output = serialize(data, toFormat)
      console.log(output)
      break
    }

    case "merge": {
      const baseFile = args[1]
      const overrideFile = args[2]
      const outputIndex = args.indexOf("-o")
      const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : undefined

      if (!baseFile || !overrideFile) {
        console.error("Usage: migrate merge <base> <override> -o <output>")
        process.exit(1)
      }

      const base = parse(baseFile)
      const override = parse(overrideFile)
      const merged = deepMerge(base, override)
      const format = outputFile ? detectFormat(outputFile) : detectFormat(baseFile)
      const output = serialize(merged, format)

      if (outputFile) {
        writeFileSync(outputFile, output)
        console.log(`✅ Merged config written to ${outputFile}`)
      } else {
        console.log(output)
      }
      break
    }

    case "diff": {
      const file1 = args[1]
      const file2 = args[2]

      if (!file1 || !file2) {
        console.error("Usage: migrate diff <file1> <file2>")
        process.exit(1)
      }

      const data1 = parse(file1)
      const data2 = parse(file2)
      const diffs = diff(data1, data2)

      if (diffs.length === 0) {
        console.log("✅ No differences found")
      } else {
        console.log("\n📋 Differences:")
        console.log("─".repeat(50))
        for (const d of diffs) {
          const color = d.startsWith("+") ? "\x1b[32m" : d.startsWith("-") ? "\x1b[31m" : "\x1b[33m"
          console.log(`${color}${d}\x1b[0m`)
        }
        console.log("─".repeat(50))
      }
      break
    }

    case "validate": {
      const file = args[1]
      const schemaIndex = args.indexOf("--schema")
      const schemaFile = args[schemaIndex + 1]

      if (!file || !schemaFile) {
        console.error("Usage: migrate validate <file> --schema <schema>")
        process.exit(1)
      }

      const data = parse(file)
      const { valid, errors } = validate(data, schemaFile)

      if (valid) {
        console.log("✅ Config is valid")
      } else {
        console.log("❌ Validation errors:")
        for (const err of errors) {
          console.log(`  - ${err}`)
        }
        process.exit(1)
      }
      break
    }

    case "interpolate": {
      const file = args[1]
      const outputIndex = args.indexOf("-o")
      const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : undefined

      if (!file) {
        console.error("Usage: migrate interpolate <file> -o <output>")
        process.exit(1)
      }

      const data = parse(file)
      const interpolated = interpolate(data)
      const format = outputFile ? detectFormat(outputFile) : detectFormat(file)
      const output = serialize(interpolated, format)

      if (outputFile) {
        writeFileSync(outputFile, output)
        console.log(`✅ Interpolated config written to ${outputFile}`)
      } else {
        console.log(output)
      }
      break
    }

    case "help":
    case "--help":
    case "-h":
      showHelp()
      break

    default:
      if (!command) {
        showHelp()
      } else {
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
      }
  }
}

main()
