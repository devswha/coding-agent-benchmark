import type { BenchmarkCase, BenchmarkSuite } from '../types'
import { datasetCache } from './cache'

export interface DatasetMetadata {
  name: string
  version: string
  source: string
  totalCases: number
  categories: string[]
  difficulties: string[]
}

export interface LoadedDataset {
  metadata: DatasetMetadata
  cases: BenchmarkCase[]
}

export class DatasetLoader {
  async load(
    name: string,
    fetcher: () => Promise<LoadedDataset>,
    version: string
  ): Promise<LoadedDataset> {
    // Check cache first (now async)
    const cached = await datasetCache.get<LoadedDataset>(name)
    if (cached && cached.version === version) {
      console.log(`[DatasetLoader] Loading ${name} from cache`)
      return cached.data
    }

    // Fetch and cache
    console.log(`[DatasetLoader] Fetching ${name} from source`)
    const dataset = await fetcher()
    await datasetCache.set(name, dataset, version)
    return dataset
  }

  async getCached(name: string): Promise<LoadedDataset | null> {
    const entry = await datasetCache.get<LoadedDataset>(name)
    return entry?.data ?? null
  }

  async invalidate(name: string): Promise<void> {
    await datasetCache.invalidate(name)
  }
}

export const datasetLoader = new DatasetLoader()
