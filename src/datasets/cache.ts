import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile, unlink, rm } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

const CACHE_DIR = join(homedir(), '.coding-agent-benchmark', 'datasets')

export interface CacheEntry<T> {
  data: T
  version: string
  cachedAt: number
  expiresAt?: number
}

/**
 * Dataset cache with async file operations (fixes #8).
 * Uses non-blocking I/O for better performance.
 */
export class DatasetCache {
  private cacheDir: string

  constructor(cacheDir: string = CACHE_DIR) {
    this.cacheDir = cacheDir
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getCachePath(key: string): string {
    return join(this.cacheDir, `${key}.json`)
  }

  /**
   * Get cached entry (async - non-blocking).
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const path = this.getCachePath(key)
    if (!existsSync(path)) return null

    try {
      const content = await readFile(path, 'utf-8')
      const entry = JSON.parse(content) as CacheEntry<T>

      // Check expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        return null
      }

      return entry
    } catch {
      return null
    }
  }

  /**
   * Get cached entry (sync - for backwards compatibility).
   * Prefer async get() for non-blocking operations.
   */
  getSync<T>(key: string): CacheEntry<T> | null {
    const path = this.getCachePath(key)
    if (!existsSync(path)) return null

    try {
      const { readFileSync } = require('fs')
      const content = readFileSync(path, 'utf-8')
      const entry = JSON.parse(content) as CacheEntry<T>

      // Check expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        return null
      }

      return entry
    } catch {
      return null
    }
  }

  /**
   * Set cache entry (async - non-blocking).
   */
  async set<T>(key: string, data: T, version: string, ttlMs?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      version,
      cachedAt: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined
    }
    await writeFile(this.getCachePath(key), JSON.stringify(entry, null, 2))
  }

  /**
   * Set cache entry (sync - for backwards compatibility).
   * Prefer async set() for non-blocking operations.
   */
  setSync<T>(key: string, data: T, version: string, ttlMs?: number): void {
    const { writeFileSync } = require('fs')
    const entry: CacheEntry<T> = {
      data,
      version,
      cachedAt: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined
    }
    writeFileSync(this.getCachePath(key), JSON.stringify(entry, null, 2))
  }

  /**
   * Check if cache entry exists and is valid.
   */
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null
  }

  /**
   * Invalidate (delete) a cache entry.
   */
  async invalidate(key: string): Promise<void> {
    const path = this.getCachePath(key)
    if (existsSync(path)) {
      await unlink(path)
    }
  }

  /**
   * Clear all cache entries.
   */
  async clear(): Promise<void> {
    if (existsSync(this.cacheDir)) {
      await rm(this.cacheDir, { recursive: true })
      this.ensureCacheDir()
    }
  }
}

export const datasetCache = new DatasetCache()
