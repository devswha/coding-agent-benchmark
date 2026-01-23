import type { BenchmarkSuite, BenchmarkCase } from '../types'
import { HumanEvalImporter } from '../importers/humaneval-importer'

// Sample HumanEval+ problems for demonstration
const humanevalCases: BenchmarkCase[] = [
  {
    id: 'humaneval_0',
    name: 'has_close_elements',
    description: 'Check if any two numbers in list are closer than threshold',
    category: 'code_generation',
    difficulty: 'easy',
    prompt: `from typing import List

def has_close_elements(numbers: List[float], threshold: float) -> bool:
    """Check if in given list of numbers, are any two numbers closer to each other than given threshold.
    >>> has_close_elements([1.0, 2.0, 3.0], 0.5)
    False
    >>> has_close_elements([1.0, 2.8, 3.0, 4.0, 5.0, 2.0], 0.3)
    True
    """`,
    expectedOutput: 'def has_close_elements',
    validationFn: (output) => {
      const hasFunction = /def\s+has_close_elements/.test(output)
      const hasLoop = /for|while/.test(output)
      const hasComparison = /abs\(|<|>/.test(output)
      const score = [hasFunction, hasLoop, hasComparison].filter(Boolean).length / 3
      return { passed: score >= 0.66, score }
    },
    tags: ['humaneval', 'python', 'list']
  },
  {
    id: 'humaneval_1',
    name: 'separate_paren_groups',
    description: 'Separate balanced parentheses groups',
    category: 'code_generation',
    difficulty: 'easy',
    prompt: `from typing import List

def separate_paren_groups(paren_string: str) -> List[str]:
    """Input is a string containing multiple groups of nested parentheses.
    Separate those groups into separate strings and return the list.
    >>> separate_paren_groups("( ) (( )) (( )( ))")
    ['()', '(())', '(()())']
    """`,
    validationFn: (output) => {
      const hasFunction = /def\s+separate_paren_groups/.test(output)
      const hasStack = /\[|\]|append|push|depth|count/.test(output)
      const score = [hasFunction, hasStack].filter(Boolean).length / 2
      return { passed: score >= 0.5, score }
    },
    tags: ['humaneval', 'python', 'string']
  },
  {
    id: 'humaneval_2',
    name: 'truncate_number',
    description: 'Return decimal part of a number',
    category: 'code_generation',
    difficulty: 'easy',
    prompt: `def truncate_number(number: float) -> float:
    """Given a positive floating point number, return its decimal part.
    >>> truncate_number(3.5)
    0.5
    """`,
    validationFn: (output) => {
      const hasFunction = /def\s+truncate_number/.test(output)
      const hasMod = /%|modf|int\(|floor/.test(output)
      const score = [hasFunction, hasMod].filter(Boolean).length / 2
      return { passed: score >= 0.5, score }
    },
    tags: ['humaneval', 'python', 'math']
  }
]

// Static subset for quick testing
export const humanevalPlusSuite: BenchmarkSuite = {
  id: 'humaneval-plus',
  name: 'HumanEval+ Benchmark',
  description: 'EvalPlus enhanced HumanEval benchmark with rigorous testing',
  version: '0.2.1',
  cases: humanevalCases,
  defaultTimeout: 10000,
  parallelExecution: false
}

// Async loader for full dataset (when available)
export async function loadHumanEvalPlusSuite(): Promise<BenchmarkSuite> {
  const importer = new HumanEvalImporter()
  const result = await importer.import()

  return {
    id: 'humaneval-plus',
    name: 'HumanEval+ Benchmark',
    description: 'EvalPlus enhanced HumanEval benchmark with 80x more tests',
    version: result.metadata.version,
    cases: result.cases,
    defaultTimeout: 10000,
    parallelExecution: false
  }
}
