import { BaseImporter, type ImportOptions, type ImportResult } from './base-importer'
import { HumanEvalImporter } from './humaneval-importer'
import { SWEBenchImporter } from './swe-bench-importer'

export { BaseImporter, type ImportOptions, type ImportResult }
export { HumanEvalImporter }
export { SWEBenchImporter }

// Registry for importers
const importerRegistry = new Map<string, () => BaseImporter>()

export function registerImporter(name: string, factory: () => BaseImporter): void {
  importerRegistry.set(name, factory)
}

export function getImporter(name: string): BaseImporter | undefined {
  const factory = importerRegistry.get(name)
  return factory?.()
}

export function listImporters(): string[] {
  return Array.from(importerRegistry.keys())
}

// Register built-in importers
registerImporter('humaneval-plus', () => new HumanEvalImporter())
registerImporter('swe-bench-lite', () => new SWEBenchImporter())
