/**
 * Code Generation Benchmark Suite
 * HumanEval-style programming problems
 */

import type { BenchmarkSuite, BenchmarkCase, ValidationResult } from "../types"

/**
 * Validate code by checking for key patterns and structure
 */
function createCodeValidator(
  requiredPatterns: RegExp[],
  forbiddenPatterns?: RegExp[]
): (output: string) => ValidationResult {
  return (output: string) => {
    const errors: string[] = []
    let score = 0

    // Check required patterns
    const patternScores: number[] = requiredPatterns.map(pattern => {
      if (pattern.test(output)) {
        return 1
      } else {
        errors.push(`Missing expected pattern: ${pattern.source}`)
        return 0
      }
    })

    score = patternScores.reduce((a, b) => a + b, 0) / requiredPatterns.length

    // Check forbidden patterns
    if (forbiddenPatterns) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(output)) {
          errors.push(`Contains forbidden pattern: ${pattern.source}`)
          score *= 0.5
        }
      }
    }

    return {
      passed: score >= 0.8,
      score,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}

/**
 * Validate function implementation
 */
function createFunctionValidator(
  functionName: string,
  testCases: Array<{ input: string; expected: string }>
): (output: string) => ValidationResult {
  return (output: string) => {
    const errors: string[] = []

    // Check if function is defined
    const funcPattern = new RegExp(`function\\s+${functionName}|const\\s+${functionName}\\s*=|${functionName}\\s*\\(`)
    if (!funcPattern.test(output)) {
      return {
        passed: false,
        score: 0,
        errors: [`Function '${functionName}' not found in output`],
      }
    }

    // Check for test case coverage (simplified - checks for expected values in output)
    let passedTests = 0
    for (const tc of testCases) {
      if (output.includes(tc.expected) || output.includes(tc.input)) {
        passedTests++
      }
    }

    const score = testCases.length > 0 ? passedTests / testCases.length : 0.5

    return {
      passed: score >= 0.6,
      score: Math.min(1, score + 0.3), // Bonus for having the function
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}

const codeGenerationCases: BenchmarkCase[] = [
  // Easy problems
  {
    id: "cg-001",
    name: "Two Sum",
    description: "Find two numbers that add up to target",
    category: "code_generation",
    difficulty: "easy",
    prompt: `Write a TypeScript function called 'twoSum' that takes an array of numbers and a target number, and returns the indices of two numbers that add up to the target.

Example:
twoSum([2, 7, 11, 15], 9) should return [0, 1] because nums[0] + nums[1] = 2 + 7 = 9

Return the function code only.`,
    validationFn: createFunctionValidator("twoSum", [
      { input: "[2, 7, 11, 15], 9", expected: "[0, 1]" },
    ]),
    tags: ["array", "hash-map"],
  },
  {
    id: "cg-002",
    name: "Palindrome Check",
    description: "Check if string is palindrome",
    category: "code_generation",
    difficulty: "easy",
    prompt: `Write a TypeScript function called 'isPalindrome' that checks if a given string is a palindrome (reads the same forwards and backwards), ignoring case and non-alphanumeric characters.

Examples:
isPalindrome("A man, a plan, a canal: Panama") → true
isPalindrome("race a car") → false

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+isPalindrome|const\s+isPalindrome/,
      /toLowerCase|toUpperCase/,
      /replace|filter|match/,
    ]),
    tags: ["string", "two-pointer"],
  },
  {
    id: "cg-003",
    name: "FizzBuzz",
    description: "Classic FizzBuzz problem",
    category: "code_generation",
    difficulty: "easy",
    prompt: `Write a TypeScript function called 'fizzBuzz' that takes a number n and returns an array of strings from 1 to n where:
- Numbers divisible by 3 are replaced with "Fizz"
- Numbers divisible by 5 are replaced with "Buzz"
- Numbers divisible by both 3 and 5 are replaced with "FizzBuzz"
- Other numbers remain as strings

Example: fizzBuzz(15) returns ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+fizzBuzz|const\s+fizzBuzz/,
      /Fizz/,
      /Buzz/,
      /FizzBuzz/,
      /%\s*3|%\s*5/,
    ]),
    tags: ["loop", "conditionals"],
  },
  {
    id: "cg-004",
    name: "Reverse Linked List",
    description: "Reverse a singly linked list",
    category: "code_generation",
    difficulty: "easy",
    prompt: `Write a TypeScript function called 'reverseList' that reverses a singly linked list.

The ListNode interface is:
interface ListNode {
  val: number;
  next: ListNode | null;
}

The function should take the head of the list and return the new head after reversal.

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+reverseList|const\s+reverseList/,
      /prev|previous/i,
      /next/,
      /while|for/,
    ]),
    tags: ["linked-list", "iteration"],
  },

  // Medium problems
  {
    id: "cg-005",
    name: "Valid Parentheses",
    description: "Check if parentheses are balanced",
    category: "code_generation",
    difficulty: "medium",
    prompt: `Write a TypeScript function called 'isValidParentheses' that determines if a string containing just the characters '(', ')', '{', '}', '[' and ']' is valid.

A string is valid if:
- Open brackets are closed by the same type of brackets
- Open brackets are closed in the correct order
- Every close bracket has a corresponding open bracket of the same type

Examples:
isValidParentheses("()") → true
isValidParentheses("()[]{}") → true
isValidParentheses("(]") → false
isValidParentheses("([)]") → false
isValidParentheses("{[]}") → true

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+isValidParentheses|const\s+isValidParentheses/,
      /stack|push|pop/i,
      /\[|\]|\{|\}|\(|\)/,
    ]),
    tags: ["stack", "string"],
  },
  {
    id: "cg-006",
    name: "Merge Sorted Arrays",
    description: "Merge two sorted arrays",
    category: "code_generation",
    difficulty: "medium",
    prompt: `Write a TypeScript function called 'mergeSortedArrays' that merges two sorted arrays into one sorted array.

Example:
mergeSortedArrays([1, 3, 5], [2, 4, 6]) → [1, 2, 3, 4, 5, 6]
mergeSortedArrays([1, 2, 3], [4, 5, 6]) → [1, 2, 3, 4, 5, 6]

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+mergeSortedArrays|const\s+mergeSortedArrays/,
      /while|for/,
      /push|concat|\.\.\./,
    ]),
    tags: ["array", "two-pointer", "merge"],
  },
  {
    id: "cg-007",
    name: "Binary Search",
    description: "Implement binary search",
    category: "code_generation",
    difficulty: "medium",
    prompt: `Write a TypeScript function called 'binarySearch' that searches for a target value in a sorted array and returns its index, or -1 if not found.

Example:
binarySearch([1, 2, 3, 4, 5, 6, 7, 8, 9], 5) → 4
binarySearch([1, 2, 3, 4, 5], 6) → -1

The function should have O(log n) time complexity.

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+binarySearch|const\s+binarySearch/,
      /left|lo|start/i,
      /right|hi|end/i,
      /mid|middle/i,
      /while/,
    ]),
    tags: ["binary-search", "array"],
  },
  {
    id: "cg-008",
    name: "Group Anagrams",
    description: "Group strings that are anagrams",
    category: "code_generation",
    difficulty: "medium",
    prompt: `Write a TypeScript function called 'groupAnagrams' that takes an array of strings and groups anagrams together.

An anagram is a word formed by rearranging the letters of another word.

Example:
groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
→ [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+groupAnagrams|const\s+groupAnagrams/,
      /sort|Map|Object/,
      /split|join/,
    ]),
    tags: ["hash-map", "string", "sorting"],
  },

  // Hard problems
  {
    id: "cg-009",
    name: "LRU Cache",
    description: "Implement LRU Cache data structure",
    category: "code_generation",
    difficulty: "hard",
    prompt: `Implement an LRU (Least Recently Used) Cache class in TypeScript with the following methods:

- constructor(capacity: number): Initialize the cache with positive capacity
- get(key: number): number - Return the value if key exists, otherwise -1
- put(key: number, value: number): void - Update or insert the value. Evict the LRU key if capacity is exceeded.

Both get and put should run in O(1) average time complexity.

Example:
const cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
cache.get(1);      // returns 1
cache.put(3, 3);   // evicts key 2
cache.get(2);      // returns -1

Return the class code only.`,
    validationFn: createCodeValidator([
      /class\s+LRUCache/,
      /get\s*\(/,
      /put\s*\(/,
      /Map|capacity/,
    ]),
    tags: ["design", "hash-map", "doubly-linked-list"],
    timeoutMs: 90000,
  },
  {
    id: "cg-010",
    name: "Serialize Binary Tree",
    description: "Serialize and deserialize binary tree",
    category: "code_generation",
    difficulty: "hard",
    prompt: `Write two TypeScript functions:

1. 'serialize(root: TreeNode | null): string' - Converts a binary tree to a string
2. 'deserialize(data: string): TreeNode | null' - Reconstructs the tree from the string

The TreeNode interface is:
interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

The serialization format is up to you, but deserialize(serialize(root)) should return a tree identical to root.

Return both function codes.`,
    validationFn: createCodeValidator([
      /function\s+serialize|const\s+serialize/,
      /function\s+deserialize|const\s+deserialize/,
      /JSON|split|join|null/,
    ]),
    tags: ["tree", "bfs", "dfs", "design"],
    timeoutMs: 90000,
  },
  {
    id: "cg-011",
    name: "Word Break II",
    description: "Find all valid sentence segmentations",
    category: "code_generation",
    difficulty: "hard",
    prompt: `Write a TypeScript function called 'wordBreak' that takes a string s and a dictionary of words, and returns all possible sentences where every word is in the dictionary.

Example:
wordBreak("catsanddog", ["cat", "cats", "and", "sand", "dog"])
→ ["cats and dog", "cat sand dog"]

wordBreak("pineapplepenapple", ["apple", "pen", "applepen", "pine", "pineapple"])
→ ["pine apple pen apple", "pineapple pen apple", "pine applepen apple"]

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+wordBreak|const\s+wordBreak/,
      /Set|Map|includes|has/,
      /recursive|backtrack|memo|dp/i,
    ]),
    tags: ["dynamic-programming", "backtracking", "memoization"],
    timeoutMs: 120000,
  },
  {
    id: "cg-012",
    name: "Median of Two Sorted Arrays",
    description: "Find median in O(log(m+n))",
    category: "code_generation",
    difficulty: "hard",
    prompt: `Write a TypeScript function called 'findMedianSortedArrays' that finds the median of two sorted arrays.

The overall run time complexity should be O(log(m+n)) where m and n are the sizes of the two arrays.

Examples:
findMedianSortedArrays([1, 3], [2]) → 2.0
findMedianSortedArrays([1, 2], [3, 4]) → 2.5

Return the function code only.`,
    validationFn: createCodeValidator([
      /function\s+findMedianSortedArrays|const\s+findMedianSortedArrays/,
      /left|right|lo|hi/i,
      /partition|binary|mid/i,
    ]),
    tags: ["binary-search", "divide-conquer"],
    timeoutMs: 120000,
  },
]

export const codeGenerationSuite: BenchmarkSuite = {
  id: "code-generation",
  name: "Code Generation Benchmark",
  description: "HumanEval-style programming problems testing code generation capabilities",
  version: "1.0.0",
  cases: codeGenerationCases,
  defaultTimeout: 60000,
  parallelExecution: false,
}
