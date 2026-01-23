import type { BenchmarkCase, BenchmarkSuite } from '../types'

export interface ImportOptions {
  limit?: number
  difficulties?: ('easy' | 'medium' | 'hard')[]
  categories?: string[]
}

export interface ImportResult {
  cases: BenchmarkCase[]
  metadata: {
    source: string
    version: string
    importedAt: number
    totalAvailable: number
    imported: number
  }
}

export abstract class BaseImporter {
  abstract readonly name: string
  abstract readonly sourceUrl: string

  abstract isAvailable(): Promise<boolean>
  abstract import(options?: ImportOptions): Promise<ImportResult>

  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`)
  }
}
