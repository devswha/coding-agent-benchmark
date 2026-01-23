import { BaseImporter, type ImportOptions, type ImportResult } from './base-importer'
import type { BenchmarkCase, BenchmarkSource, ExecutionConfig, TestHarness } from '../types'

interface HumanEvalEntry {
  task_id: string
  prompt: string
  canonical_solution: string
  test: string
  entry_point: string
}

export class HumanEvalImporter extends BaseImporter {
  readonly name = 'humaneval-plus'
  readonly sourceUrl = 'https://github.com/evalplus/evalplus'

  async isAvailable(): Promise<boolean> {
    // Check if evalplus is installed or data file exists
    return true // For now, we'll bundle sample data
  }

  async import(options?: ImportOptions): Promise<ImportResult> {
    this.log('Importing HumanEval+ dataset...')

    // Sample HumanEval problems for demonstration
    const sampleProblems: HumanEvalEntry[] = [
      {
        task_id: 'HumanEval/0',
        prompt: 'from typing import List\n\ndef has_close_elements(numbers: List[float], threshold: float) -> bool:\n    """Check if in given list of numbers, are any two numbers closer to each other than given threshold.\n    >>> has_close_elements([1.0, 2.0, 3.0], 0.5)\n    False\n    >>> has_close_elements([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3)\n    True\n    """',
        canonical_solution: '    for i, n1 in enumerate(numbers):\n        for j, n2 in enumerate(numbers):\n            if i != j and abs(n1 - n2) < threshold:\n                return True\n    return False',
        test: 'def check(candidate):\n    assert candidate([1.0, 2.0, 3.0], 0.5) == False\n    assert candidate([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3) == True',
        entry_point: 'has_close_elements'
      },
      {
        task_id: 'HumanEval/1',
        prompt: 'from typing import List\n\ndef separate_paren_groups(paren_string: str) -> List[str]:\n    """Input to this function is a string containing multiple groups of nested parentheses.\n    Your goal is to separate those groups into separate strings and return the list of those.\n    >>> separate_paren_groups("( ) (( )) (( )( ))")\n    ["()", "(())", "(()())"]\n    """',
        canonical_solution: '    result = []\n    current = ""\n    depth = 0\n    for c in paren_string:\n        if c == "(":\n            depth += 1\n            current += c\n        elif c == ")":\n            depth -= 1\n            current += c\n            if depth == 0:\n                result.append(current)\n                current = ""\n    return result',
        test: 'def check(candidate):\n    assert candidate("( ) (( )) (( )( ))") == ["()", "(())", "(()())"]\n    assert candidate("") == []',
        entry_point: 'separate_paren_groups'
      },
      {
        task_id: 'HumanEval/2',
        prompt: 'def truncate_number(number: float) -> float:\n    """Given a positive floating point number, return its decimal part.\n    >>> truncate_number(3.5)\n    0.5\n    """',
        canonical_solution: '    return number % 1.0',
        test: 'def check(candidate):\n    assert candidate(3.5) == 0.5\n    assert abs(candidate(1.25) - 0.25) < 1e-6',
        entry_point: 'truncate_number'
      }
    ]

    const cases = sampleProblems.map(entry => this.mapToCase(entry))
    const limit = options?.limit ?? cases.length

    return {
      cases: cases.slice(0, limit),
      metadata: {
        source: this.sourceUrl,
        version: '0.2.1',
        importedAt: Date.now(),
        totalAvailable: 164,
        imported: Math.min(limit, cases.length)
      }
    }
  }

  private mapToCase(entry: HumanEvalEntry): BenchmarkCase {
    const source: BenchmarkSource = {
      dataset: 'humaneval_plus',
      originalId: entry.task_id,
      datasetVersion: '0.2.1',
      sourceUrl: this.sourceUrl
    }

    const executionConfig: ExecutionConfig = {
      language: 'python',
      runtimeVersion: '3.10',
      entryPoint: 'solution.py',
      timeoutMs: 10000,
      memoryLimitMb: 256,
      allowNetwork: false
    }

    const testHarness: TestHarness = {
      type: 'unit_test',
      framework: 'pytest',
      testCode: `${entry.prompt}\n${entry.canonical_solution}\n\n${entry.test}\n\ncheck(${entry.entry_point})`
    }

    return {
      id: entry.task_id.replace('/', '_').toLowerCase(),
      name: entry.entry_point,
      description: `HumanEval problem: ${entry.entry_point}`,
      category: 'code_generation',
      difficulty: 'easy',
      prompt: entry.prompt,
      source,
      executionConfig,
      testHarness,
      tags: ['humaneval', 'python', 'function']
    }
  }
}

