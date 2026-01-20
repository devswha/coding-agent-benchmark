/**
 * Benchmark Results Storage
 *
 * Stores and retrieves benchmark comparison results.
 */

import { mkdir, readFile, writeFile, readdir, unlink, stat, rename } from "fs/promises"
import { join } from "path"
import { homedir } from "os"
import { z } from "zod"
import type { AgentComparisonResult, AgentComparisonReport, AgentType } from "./agent-comparison/types"
import type { BenchmarkSuiteResult } from "./types"

const MAGI_DIR = join(homedir(), ".magi")
const BENCHMARK_DIR = join(MAGI_DIR, "benchmarks")

function isValidBenchmarkId(id: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(id) && !id.includes("..")
}

/**
 * Benchmark result metadata for listing
 */
export const BenchmarkMetadata = z.object({
  id: z.string(),
  suiteId: z.string(),
  suiteName: z.string(),
  timestamp: z.number(),
  agents: z.array(z.string()),
  winner: z.string().optional(),
  totalCases: z.number(),
})
export type BenchmarkMetadata = z.infer<typeof BenchmarkMetadata>

/**
 * Stored benchmark result schema
 */
export const StoredBenchmarkResult = z.object({
  id: z.string(),
  suiteId: z.string(),
  suiteName: z.string(),
  timestamp: z.number(),
  agents: z.array(z.string()),
  results: z.record(z.any()), // Map<AgentType, BenchmarkSuiteResult> serialized
  report: z.any(), // AgentComparisonReport
  executionMode: z.enum(["real", "simulated"]).optional(),
})
export type StoredBenchmarkResult = z.infer<typeof StoredBenchmarkResult>

async function ensureDirectories(): Promise<void> {
  await mkdir(BENCHMARK_DIR, { recursive: true })
}

function getBenchmarkPath(id: string): string {
  return join(BENCHMARK_DIR, `${id}.json`)
}

/**
 * Generate a unique benchmark ID
 */
export function generateBenchmarkId(suiteId: string): string {
  return `${suiteId}-${Date.now()}`
}

/**
 * Save benchmark result
 */
export async function saveBenchmarkResult(result: AgentComparisonResult): Promise<string> {
  await ensureDirectories()

  const id = generateBenchmarkId(result.suiteId)

  // Serialize Map to object
  const serialized: StoredBenchmarkResult = {
    id,
    suiteId: result.suiteId,
    suiteName: result.suiteName,
    timestamp: result.timestamp,
    agents: result.agents as string[],
    results: Object.fromEntries(result.results),
    report: result.report,
    executionMode: "real", // New results use real execution
  }

  const path = getBenchmarkPath(id)
  const tempPath = `${path}.tmp`

  try {
    await writeFile(tempPath, JSON.stringify(serialized, null, 2), "utf-8")
    await rename(tempPath, path)
    return id
  } catch (error) {
    try {
      await unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(
      `Failed to save benchmark result: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Load benchmark result by ID
 */
export async function loadBenchmarkResult(id: string): Promise<StoredBenchmarkResult | null> {
  if (!isValidBenchmarkId(id)) {
    console.error(`[Benchmark Storage] Invalid benchmark ID: ${id}`)
    return null
  }

  try {
    const path = getBenchmarkPath(id)
    const content = await readFile(path, "utf-8")
    const data = JSON.parse(content)
    return StoredBenchmarkResult.parse(data)
  } catch (error) {
    console.error(
      `[Benchmark Storage] Failed to load benchmark ${id}: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    return null
  }
}

/**
 * Delete benchmark result
 */
export async function deleteBenchmarkResult(id: string): Promise<boolean> {
  if (!isValidBenchmarkId(id)) {
    console.error(`[Benchmark Storage] Invalid benchmark ID: ${id}`)
    return false
  }

  try {
    const path = getBenchmarkPath(id)
    await unlink(path)
    return true
  } catch (error) {
    console.error(
      `[Benchmark Storage] Failed to delete benchmark ${id}: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    return false
  }
}

/**
 * List all benchmark results
 */
export async function listBenchmarkResults(): Promise<BenchmarkMetadata[]> {
  await ensureDirectories()

  const results: BenchmarkMetadata[] = []

  try {
    const files = await readdir(BENCHMARK_DIR)

    for (const file of files) {
      if (!file.endsWith(".json")) continue

      try {
        const path = join(BENCHMARK_DIR, file)
        const content = await readFile(path, "utf-8")
        const data = JSON.parse(content)
        const result = StoredBenchmarkResult.parse(data)

        // Extract metadata
        const totalCases =
          Object.values(result.results)[0]?.totalCases || 0
        const winner = result.report?.aggregateStats?.overallWinner

        results.push({
          id: result.id,
          suiteId: result.suiteId,
          suiteName: result.suiteName,
          timestamp: result.timestamp,
          agents: result.agents,
          winner: winner,
          totalCases,
        })
      } catch (error) {
        console.error(
          `[Benchmark Storage] Failed to parse benchmark file ${file}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
        continue
      }
    }
  } catch (error) {
    console.error(
      `[Benchmark Storage] Failed to list benchmarks: ${error instanceof Error ? error.message : "Unknown error"}`
    )
    return []
  }

  return results.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Get the most recent benchmark result
 */
export async function getLatestBenchmarkResult(): Promise<StoredBenchmarkResult | null> {
  const list = await listBenchmarkResults()
  if (list.length === 0) return null

  return loadBenchmarkResult(list[0].id)
}

/**
 * Get benchmark storage directory
 */
export function getBenchmarkDir(): string {
  return BENCHMARK_DIR
}
