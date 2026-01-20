/**
 * Task Completion Benchmark Suite
 * Tests multi-step task execution and tool usage
 */

import type { BenchmarkSuite, BenchmarkCase, ValidationResult } from "../types"

/**
 * Validate task completion with step checking
 */
function createTaskValidator(
  requiredSteps: string[],
  forbiddenActions?: string[]
): (output: string) => ValidationResult {
  return (output: string) => {
    const lowerOutput = output.toLowerCase()
    const errors: string[] = []

    // Check for required steps
    const completedSteps = requiredSteps.filter(step =>
      lowerOutput.includes(step.toLowerCase())
    )

    let score = completedSteps.length / requiredSteps.length

    // Check for forbidden actions
    if (forbiddenActions) {
      const violations = forbiddenActions.filter(action =>
        lowerOutput.includes(action.toLowerCase())
      )
      if (violations.length > 0) {
        score *= 0.5
        errors.push(`Forbidden actions detected: ${violations.join(", ")}`)
      }
    }

    // Bonus for detailed explanations
    if (output.length > 500) {
      score = Math.min(1, score + 0.1)
    }

    return {
      passed: score >= 0.7,
      score,
      errors: errors.length > 0 ? errors : undefined,
      details: `Completed ${completedSteps.length}/${requiredSteps.length} required steps`,
    }
  }
}

/**
 * Validate code refactoring task
 */
function createRefactorValidator(
  improvements: string[]
): (output: string) => ValidationResult {
  return (output: string) => {
    const foundImprovements = improvements.filter(imp =>
      output.toLowerCase().includes(imp.toLowerCase())
    )

    const score = foundImprovements.length / improvements.length

    return {
      passed: score >= 0.6,
      score,
      details: `Found ${foundImprovements.length}/${improvements.length} expected improvements`,
    }
  }
}

const taskCompletionCases: BenchmarkCase[] = [
  // Simple tasks (1-2 steps)
  {
    id: "tc-001",
    name: "Read and Summarize File",
    description: "Read a file and provide a summary",
    category: "task_completion",
    difficulty: "easy",
    prompt: `Read the file at src/core/magi.ts and give me a brief summary of:
1. What the main class is called
2. What its primary responsibility is
3. How many public methods it has (approximately)

Keep the summary concise.`,
    validationFn: createTaskValidator([
      "magisystem",
      "class",
      "orchestrator",
    ]),
    tags: ["file-read", "summarization"],
  },
  {
    id: "tc-002",
    name: "Find Function Definition",
    description: "Locate a specific function in codebase",
    category: "task_completion",
    difficulty: "easy",
    prompt: `Find where the 'processMessage' function is defined in this codebase. Tell me:
1. Which file it's in
2. What parameters it takes
3. What it returns`,
    validationFn: createTaskValidator([
      "magi.ts",
      "message",
      "response",
    ]),
    tags: ["search", "code-navigation"],
  },
  {
    id: "tc-003",
    name: "Count Files by Type",
    description: "Count TypeScript files in a directory",
    category: "task_completion",
    difficulty: "easy",
    prompt: `Count how many TypeScript files (.ts and .tsx) are in the src/ directory (including subdirectories). Just give me the total count.`,
    validationFn: (output: string) => {
      const hasNumber = /\d+/.test(output)
      const mentionsTs = /\.tsx?|typescript/i.test(output)

      return {
        passed: hasNumber,
        score: hasNumber ? (mentionsTs ? 1 : 0.8) : 0,
        details: hasNumber ? "Found file count" : "No count provided",
      }
    },
    tags: ["file-system", "count"],
  },

  // Medium tasks (3-5 steps)
  {
    id: "tc-004",
    name: "Add Type to Interface",
    description: "Add a new field to an existing interface",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Add a new optional field called 'metadata' of type 'Record<string, unknown>' to the Message interface in src/core/types.ts.

Show me the updated interface.`,
    validationFn: createTaskValidator([
      "metadata",
      "record",
      "unknown",
      "optional",
    ]),
    tags: ["edit", "typescript"],
  },
  {
    id: "tc-005",
    name: "Create Utility Function",
    description: "Create a new utility function with tests",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Create a utility function called 'truncateString' that:
1. Takes a string and a max length
2. Returns the string truncated with '...' if it exceeds max length
3. Returns the original string if it's shorter

Include TypeScript types and a brief usage example.`,
    validationFn: createTaskValidator([
      "truncatestring",
      "maxlength",
      "...",
      "function",
    ]),
    tags: ["create", "utility"],
  },
  {
    id: "tc-006",
    name: "Analyze Dependencies",
    description: "Analyze project dependencies",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Analyze the package.json and tell me:
1. How many production dependencies are there?
2. How many dev dependencies?
3. Which AI-related packages are being used?
4. Is there a testing framework? Which one?`,
    validationFn: createTaskValidator([
      "dependencies",
      "ai",
      "test",
      "bun",
    ]),
    tags: ["analysis", "dependencies"],
  },
  {
    id: "tc-007",
    name: "Find and Fix Import",
    description: "Find incorrect import and fix it",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Check if all imports in src/api/server.ts are valid. If there are any imports that reference files that don't exist or are incorrect, list them and suggest the correct import path.`,
    validationFn: createTaskValidator([
      "import",
      "from",
    ]),
    tags: ["analysis", "imports"],
  },

  // Complex tasks (6+ steps)
  {
    id: "tc-008",
    name: "Refactor Function",
    description: "Refactor a function for better readability",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Look at the analyzeProblem method in src/core/magi.ts and suggest how to refactor it for:
1. Better readability
2. Easier maintenance
3. Better testability

Provide the refactored code with explanations for each change.`,
    validationFn: createRefactorValidator([
      "extract",
      "separate",
      "const",
      "function",
      "readable",
      "test",
    ]),
    tags: ["refactor", "code-quality"],
    timeoutMs: 120000,
  },
  {
    id: "tc-009",
    name: "Add Logging System",
    description: "Design and implement a logging system",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Design a simple logging system for MAGI that:
1. Supports log levels (debug, info, warn, error)
2. Includes timestamps
3. Can output to console and file
4. Is configurable via environment variables

Provide:
- The interface/type definitions
- A basic implementation
- Usage example`,
    validationFn: createTaskValidator([
      "debug",
      "info",
      "warn",
      "error",
      "timestamp",
      "level",
    ]),
    tags: ["design", "implementation", "logging"],
    timeoutMs: 120000,
  },
  {
    id: "tc-010",
    name: "API Endpoint Analysis",
    description: "Analyze all API endpoints",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Analyze src/api/server.ts and create a documentation of all API endpoints including:
1. HTTP method and path
2. Request body schema (if any)
3. Response format
4. Authentication requirements (if any)

Format as a clear API reference.`,
    validationFn: createTaskValidator([
      "get",
      "post",
      "delete",
      "/api",
      "endpoint",
      "response",
    ]),
    tags: ["documentation", "api"],
    timeoutMs: 120000,
  },
  {
    id: "tc-011",
    name: "Test Coverage Analysis",
    description: "Analyze test coverage and suggest improvements",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Analyze the test files in the test/ directory and:
1. List what modules/features are being tested
2. Identify what important functionality is NOT being tested
3. Suggest 3 specific test cases that should be added
4. Prioritize them by importance`,
    validationFn: createTaskValidator([
      "test",
      "coverage",
      "missing",
      "suggest",
      "priority",
    ]),
    tags: ["testing", "analysis"],
    timeoutMs: 120000,
  },
  {
    id: "tc-012",
    name: "Security Audit",
    description: "Perform a basic security audit",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Perform a basic security audit on the MAGI codebase:
1. Check for hardcoded secrets or API keys
2. Review input validation in API endpoints
3. Check for SQL injection risks
4. Review file system access patterns
5. Identify any other potential security issues

Provide findings with severity levels (low/medium/high/critical).`,
    validationFn: createTaskValidator([
      "security",
      "validation",
      "input",
      "severity",
    ]),
    tags: ["security", "audit"],
    timeoutMs: 180000,
  },

  // Tool usage tasks
  {
    id: "tc-013",
    name: "Search and Replace",
    description: "Find and replace across files",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Find all occurrences of 'console.log' in the src/ directory. List each file and line number where it appears. Then suggest which ones should be:
1. Kept (for debugging)
2. Replaced with proper logging
3. Removed entirely`,
    validationFn: createTaskValidator([
      "console.log",
      "file",
      "line",
    ]),
    tags: ["search", "code-quality"],
  },
  {
    id: "tc-014",
    name: "Generate Type from Usage",
    description: "Infer types from code usage",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Look at how the 'processMessage' function is called throughout the codebase. Based on its usage patterns:
1. What type is expected for the input?
2. What does the return type look like?
3. Are there any edge cases in how it's called?`,
    validationFn: createTaskValidator([
      "string",
      "message",
      "return",
      "response",
    ]),
    tags: ["types", "inference"],
  },
  {
    id: "tc-015",
    name: "Create Migration Script",
    description: "Create a data migration script",
    category: "task_completion",
    difficulty: "hard",
    prompt: `The session storage format is changing. Old format stores messages as:
{ role: string, content: string }

New format should be:
{ role: string, content: string, timestamp: number, id: string }

Create a migration script that:
1. Reads existing session files from ~/.magi/sessions/
2. Transforms to new format (adds timestamp as Date.now(), generates UUID for id)
3. Creates backup before migrating
4. Validates the migrated data

Provide the complete script with error handling.`,
    validationFn: createTaskValidator([
      "backup",
      "migrate",
      "timestamp",
      "id",
      "uuid",
      "validate",
    ]),
    tags: ["migration", "script"],
    timeoutMs: 180000,
  },
]

export const taskCompletionSuite: BenchmarkSuite = {
  id: "task-completion",
  name: "Task Completion Benchmark",
  description: "Tests multi-step task execution, tool usage, and problem-solving capabilities",
  version: "1.0.0",
  cases: taskCompletionCases,
  defaultTimeout: 90000,
  parallelExecution: false,
}
