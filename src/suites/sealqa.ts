/**
 * SEAL QA Benchmark Suite
 *
 * Search-Augmented Language Model evaluation dataset.
 * Tests models' ability to reason through conflicting/noisy search results.
 *
 * Source: https://huggingface.co/datasets/vtllms/sealqa
 */

import type { BenchmarkSuite, BenchmarkCase, ValidationResult, BenchmarkSource } from "../types"

const SEALQA_VERSION = "1.0.0"

/**
 * SEAL QA data structure from HuggingFace
 */
interface SealQAEntry {
  question: string
  answer: string
  urls: string[]
  freshness: "fast-changing" | "noisy" | "unhelpful"
  question_types: string[]
  effective_year: string
  search_results: "conflicting" | "unhelpful"
  topic: string
  golds: Array<{ date: string; text: string; title: string; url: string }>
  "12_docs": Array<{ date: string; text: string; title: string; url: string }>
}

/**
 * Normalize answer for comparison
 */
function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Check if model answer contains the expected answer
 */
function answerContains(modelAnswer: string, expectedAnswer: string): boolean {
  const normalizedModel = normalizeAnswer(modelAnswer)
  const normalizedExpected = normalizeAnswer(expectedAnswer)

  // Exact match
  if (normalizedModel === normalizedExpected) return true

  // Contains match
  if (normalizedModel.includes(normalizedExpected)) return true

  // Check if all words from expected are in model answer
  const expectedWords = normalizedExpected.split(' ').filter(w => w.length > 2)
  const modelWords = normalizedModel.split(' ')
  const matchedWords = expectedWords.filter(w => modelWords.some(mw => mw.includes(w) || w.includes(mw)))

  return matchedWords.length >= expectedWords.length * 0.8
}

/**
 * Create QA validator for SEAL QA questions
 */
function createQAValidator(expectedAnswer: string): (output: string) => ValidationResult {
  return (output: string) => {
    const errors: string[] = []

    // Check if output is empty
    if (!output || output.trim().length === 0) {
      return {
        passed: false,
        score: 0,
        errors: ["Empty response"],
      }
    }

    // Check if answer contains expected answer
    const containsAnswer = answerContains(output, expectedAnswer)

    if (!containsAnswer) {
      errors.push(`Expected answer: "${expectedAnswer}"`)
    }

    // Score calculation
    // - Full match: 1.0
    // - Partial match (contains some keywords): 0.3-0.7
    // - No match: 0.0
    let score = 0

    const normalizedOutput = normalizeAnswer(output)
    const normalizedExpected = normalizeAnswer(expectedAnswer)

    if (normalizedOutput === normalizedExpected) {
      score = 1.0
    } else if (containsAnswer) {
      score = 0.8
    } else {
      // Check partial keyword match
      const expectedWords = normalizedExpected.split(' ').filter(w => w.length > 2)
      const matchedCount = expectedWords.filter(w => normalizedOutput.includes(w)).length
      score = expectedWords.length > 0 ? (matchedCount / expectedWords.length) * 0.5 : 0
    }

    return {
      passed: score >= 0.7,
      score,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}

/**
 * Map freshness to difficulty
 */
function mapDifficulty(freshness: string, searchResults: string): "easy" | "medium" | "hard" {
  if (freshness === "unhelpful" || searchResults === "unhelpful") return "hard"
  if (freshness === "noisy" || searchResults === "conflicting") return "medium"
  return "easy"
}

/**
 * Convert SEAL QA entry to benchmark case
 */
function convertToBenchmarkCase(entry: SealQAEntry, index: number, subset: string): BenchmarkCase {
  // Build context from gold documents
  const context = entry.golds && entry.golds.length > 0
    ? entry.golds.map((doc, i) =>
        `[Source ${i + 1}] ${doc.title}\nDate: ${doc.date}\n${doc.text}`
      ).join('\n\n---\n\n')
    : undefined

  const prompt = context
    ? `Based on the following sources, answer the question accurately and concisely.

${context}

Question: ${entry.question}

Provide a direct, factual answer. If the sources are conflicting, use your reasoning to determine the most likely correct answer.`
    : `Answer the following question accurately and concisely.

Question: ${entry.question}

Provide a direct, factual answer.`

  const source: BenchmarkSource = {
    dataset: "sealqa",
    originalId: `${subset}-${index}`,
    datasetVersion: SEALQA_VERSION,
    sourceUrl: "https://huggingface.co/datasets/vtllms/sealqa",
  }

  return {
    id: `sealqa-${subset}-${index.toString().padStart(3, '0')}`,
    name: entry.question.slice(0, 50) + (entry.question.length > 50 ? '...' : ''),
    description: `SEAL QA: ${entry.topic} - ${entry.question_types?.join(', ') || 'general'}`,
    category: "qa_reasoning",
    difficulty: mapDifficulty(entry.freshness, entry.search_results),
    prompt,
    context,
    expectedOutput: entry.answer,
    validationFn: createQAValidator(entry.answer),
    tags: [
      entry.topic.toLowerCase().replace(/\s+/g, '-'),
      entry.freshness,
      entry.search_results,
      ...(entry.question_types || []).map(t => t.toLowerCase().replace(/\s+/g, '-')),
    ],
    source,
    timeoutMs: 60000,
  }
}

/**
 * Fetch SEAL QA dataset from HuggingFace
 */
async function fetchSealQADataset(subset: "seal_0" | "seal_hard" = "seal_0"): Promise<SealQAEntry[]> {
  const url = `https://datasets-server.huggingface.co/rows?dataset=vtllms%2Fsealqa&config=${subset}&split=test&offset=0&length=100`

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch SEAL QA: ${response.status}`)
    }

    const data = await response.json() as { rows: Array<{ row: SealQAEntry }> }
    return data.rows.map(r => r.row)
  } catch (error) {
    console.error('[SealQA] Failed to fetch dataset:', error)
    return []
  }
}

/**
 * Sample cases for offline/cached evaluation
 */
const sampleCases: BenchmarkCase[] = [
  {
    id: "sealqa-sample-001",
    name: "Current CEO Question",
    description: "SEAL QA: Entity disambiguation with potentially outdated information",
    category: "qa_reasoning",
    difficulty: "medium",
    prompt: `Answer the following question accurately and concisely.

Question: Who is the current CEO of OpenAI?

Provide a direct, factual answer. Note that CEO positions may change over time.`,
    expectedOutput: "Sam Altman",
    validationFn: createQAValidator("Sam Altman"),
    tags: ["technology", "entity-disambiguation", "fast-changing"],
    timeoutMs: 60000,
  },
  {
    id: "sealqa-sample-002",
    name: "Sports Event Winner",
    description: "SEAL QA: Sports event result requiring temporal tracking",
    category: "qa_reasoning",
    difficulty: "medium",
    prompt: `Answer the following question accurately and concisely.

Question: Who won the 2024 Super Bowl?

Provide a direct, factual answer including the team name.`,
    expectedOutput: "Kansas City Chiefs",
    validationFn: createQAValidator("Kansas City Chiefs"),
    tags: ["sports", "temporal-tracking", "fast-changing"],
    timeoutMs: 60000,
  },
  {
    id: "sealqa-sample-003",
    name: "Science Discovery",
    description: "SEAL QA: Scientific fact requiring advanced reasoning",
    category: "qa_reasoning",
    difficulty: "hard",
    prompt: `Based on the following conflicting sources, determine the correct answer.

[Source 1] Recent NASA findings (2024)
The James Webb Space Telescope has confirmed the existence of water vapor in the atmosphere of K2-18 b.

[Source 2] Older article (2023)
K2-18 b may have conditions suitable for life, but water detection remains uncertain.

Question: Has water vapor been definitively detected in K2-18 b's atmosphere?

Provide a direct answer based on the most recent and reliable source.`,
    expectedOutput: "Yes",
    validationFn: createQAValidator("Yes"),
    tags: ["science", "advanced-reasoning", "conflicting"],
    timeoutMs: 60000,
  },
  {
    id: "sealqa-sample-004",
    name: "Entertainment Release Date",
    description: "SEAL QA: Entertainment fact with noisy information",
    category: "qa_reasoning",
    difficulty: "easy",
    prompt: `Answer the following question accurately and concisely.

Question: In what year was the movie "Oppenheimer" released?

Provide the year only.`,
    expectedOutput: "2023",
    validationFn: createQAValidator("2023"),
    tags: ["entertainment", "temporal-tracking", "noisy"],
    timeoutMs: 60000,
  },
  {
    id: "sealqa-sample-005",
    name: "Technology Company Acquisition",
    description: "SEAL QA: Business fact requiring entity tracking",
    category: "qa_reasoning",
    difficulty: "medium",
    prompt: `Answer the following question accurately and concisely.

Question: Which company acquired Twitter (now X) in 2022?

Provide the company or person name.`,
    expectedOutput: "Elon Musk",
    validationFn: createQAValidator("Elon Musk"),
    tags: ["technology", "entity-disambiguation", "fast-changing"],
    timeoutMs: 60000,
  },
]

/**
 * SEAL QA Benchmark Suite (static sample cases)
 */
export const sealQASuite: BenchmarkSuite = {
  id: "sealqa",
  name: "SEAL QA Benchmark",
  description: "Search-Augmented Language Model evaluation - tests reasoning through conflicting/noisy information",
  version: SEALQA_VERSION,
  cases: sampleCases,
  defaultTimeout: 60000,
  parallelExecution: false,
}

/**
 * Create dynamic SEAL QA suite by fetching from HuggingFace
 */
export async function createSealQASuite(
  subset: "seal_0" | "seal_hard" = "seal_0",
  maxCases: number = 50
): Promise<BenchmarkSuite> {
  console.log(`[SealQA] Fetching ${subset} dataset from HuggingFace...`)
  const entries = await fetchSealQADataset(subset)

  if (entries.length === 0) {
    console.log('[SealQA] Using sample cases (API fetch failed)')
    return sealQASuite
  }

  console.log(`[SealQA] Loaded ${entries.length} entries, using ${Math.min(entries.length, maxCases)}`)

  const cases = entries
    .slice(0, maxCases)
    .map((entry, index) => convertToBenchmarkCase(entry, index, subset))

  return {
    id: `sealqa-${subset}`,
    name: `SEAL QA Benchmark (${subset})`,
    description: `Search-Augmented Language Model evaluation - ${subset} subset with ${cases.length} cases`,
    version: SEALQA_VERSION,
    cases,
    defaultTimeout: 60000,
    parallelExecution: false,
  }
}
