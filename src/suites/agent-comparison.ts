/**
 * Agent Comparison Benchmark Suite
 * Compares AI coding agents (MAGI vs Claude Code + oh-my-claude-sisyphus)
 */

import type { BenchmarkSuite, BenchmarkCase, ValidationResult } from "../types"

/**
 * Validate by checking for multiple required patterns
 */
function createPatternValidator(
  requiredPatterns: RegExp[],
  optionalPatterns?: RegExp[],
  forbiddenPatterns?: RegExp[]
): (output: string) => ValidationResult {
  return (output: string) => {
    const errors: string[] = []
    let score = 0

    // Check required patterns (mandatory)
    const patternScores: number[] = requiredPatterns.map(pattern => {
      if (pattern.test(output)) {
        return 1
      } else {
        errors.push(`Missing required pattern: ${pattern.source}`)
        return 0
      }
    })

    score = patternScores.reduce((a, b) => a + b, 0) / requiredPatterns.length

    // Check optional patterns (bonus points)
    if (optionalPatterns && score > 0.5) {
      const bonusCount = optionalPatterns.filter(p => p.test(output)).length
      const bonus = (bonusCount / optionalPatterns.length) * 0.2
      score = Math.min(1, score + bonus)
    }

    // Check forbidden patterns (penalty)
    if (forbiddenPatterns) {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(output)) {
          errors.push(`Contains forbidden pattern: ${pattern.source}`)
          score *= 0.5
        }
      }
    }

    return {
      passed: score >= 0.75,
      score,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}

/**
 * Validate output structure and completeness
 */
function createStructureValidator(
  checks: Array<{ name: string; validator: (output: string) => boolean }>
): (output: string) => ValidationResult {
  return (output: string) => {
    const errors: string[] = []
    let passedChecks = 0

    for (const check of checks) {
      try {
        if (check.validator(output)) {
          passedChecks++
        } else {
          errors.push(`Failed check: ${check.name}`)
        }
      } catch (e) {
        errors.push(`Error in check ${check.name}: ${e}`)
      }
    }

    const score = checks.length > 0 ? passedChecks / checks.length : 0

    return {
      passed: score >= 0.7,
      score,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}

// =============================================================================
// CATEGORY 1: SIMPLE TASKS (5 cases)
// =============================================================================

const simpleTasks: BenchmarkCase[] = [
  {
    id: "ac-simple-001",
    name: "Single File Read",
    description: "Read and summarize a configuration file",
    category: "task_completion",
    difficulty: "easy",
    prompt: `Read the package.json file in the current project and tell me:
1. Project name and version
2. Main dependencies (runtime)
3. Dev dependencies

Provide a brief summary in bullet points.`,
    validationFn: createStructureValidator([
      { name: "Mentions project name", validator: (o) => /name|project/i.test(o) },
      { name: "Mentions version", validator: (o) => /version|\d+\.\d+\.\d+/.test(o) },
      { name: "Lists dependencies", validator: (o) => /dependencies|deps/i.test(o) },
      { name: "Uses bullet points or structure", validator: (o) => /[-•*]|\d\./g.test(o) },
    ]),
    tags: ["read", "simple", "file-io"],
  },

  {
    id: "ac-simple-002",
    name: "Code Search",
    description: "Search for function definitions in codebase",
    category: "task_completion",
    difficulty: "easy",
    prompt: `Search the codebase for all exported functions that contain "validate" in their name.
List the function names and the files they're defined in.`,
    validationFn: createStructureValidator([
      { name: "Shows file paths", validator: (o) => /\.ts|\.js|\//.test(o) },
      { name: "Shows function names", validator: (o) => /function|const|export/i.test(o) },
      { name: "References 'validate'", validator: (o) => /validate/i.test(o) },
    ]),
    tags: ["search", "grep", "functions"],
  },

  {
    id: "ac-simple-003",
    name: "Status Check",
    description: "Check git status and summarize changes",
    category: "task_completion",
    difficulty: "easy",
    prompt: `Run git status and tell me:
1. Current branch
2. Number of modified files
3. Number of untracked files
4. Whether there are staged changes

Keep it concise.`,
    validationFn: createStructureValidator([
      { name: "Shows branch name", validator: (o) => /branch/i.test(o) },
      { name: "Counts files", validator: (o) => /\d+\s+(file|modified|untracked)/i.test(o) },
      { name: "Mentions staged status", validator: (o) => /staged|unstaged|clean/i.test(o) },
    ]),
    tags: ["git", "status", "vcs"],
  },

  {
    id: "ac-simple-004",
    name: "Simple Explanation",
    description: "Explain what a code snippet does",
    category: "code_explanation",
    difficulty: "easy",
    prompt: `Explain what this TypeScript code does:

\`\`\`typescript
const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
\`\`\`

Explain in 2-3 sentences for a junior developer.`,
    validationFn: createPatternValidator(
      [/debounce|delay/i, /timeout|wait/i, /function|call/i],
      [/rate.?limit|throttle/i, /prevent.*rapid/i]
    ),
    tags: ["explanation", "javascript", "patterns"],
  },

  {
    id: "ac-simple-005",
    name: "Quick Fix",
    description: "Fix a simple syntax error",
    category: "bug_fixing",
    difficulty: "easy",
    prompt: `Fix the syntax error in this TypeScript code:

\`\`\`typescript
function greet(name: string {
  return \`Hello, \${name}!\`
}
\`\`\`

Return only the corrected code.`,
    validationFn: createPatternValidator(
      [/function\s+greet/, /name:\s*string\s*\)/, /return/],
      undefined,
      [/syntax.*error/i]
    ),
    tags: ["bug-fix", "syntax", "typescript"],
  },
]

// =============================================================================
// CATEGORY 2: MULTI-STEP TASKS (5 cases)
// =============================================================================

const multiStepTasks: BenchmarkCase[] = [
  {
    id: "ac-multi-001",
    name: "Implement Feature with Tests",
    description: "Create a new utility function with test coverage",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Create a utility function called \`clamp\` that constrains a number between min and max values.

Requirements:
1. Write the function in TypeScript with proper types
2. Add JSDoc comments
3. Create a test file with at least 3 test cases
4. Handle edge cases (min > max, etc.)

Create both implementation and test files.`,
    validationFn: createPatternValidator(
      [
        /function\s+clamp|const\s+clamp/,
        /min.*max|max.*min/i,
        /test|describe|it\(/i,
        /Math\.(min|max)|<|>/,
      ],
      [/JSDoc|@param|@returns|\*\*/, /edge.*case|validation/i]
    ),
    tags: ["implementation", "testing", "tdd"],
    timeoutMs: 90000,
  },

  {
    id: "ac-multi-002",
    name: "Refactor Across Files",
    description: "Extract repeated code into shared utility",
    category: "refactoring",
    difficulty: "medium",
    prompt: `I notice we have this pattern repeated in 3 files:

\`\`\`typescript
const timestamp = new Date().toISOString()
console.log(\`[\${timestamp}] \${message}\`)
\`\`\`

Refactor this:
1. Create a shared \`logger.ts\` utility
2. Add log levels (info, warn, error)
3. Update all 3 locations to use the new utility
4. Ensure backwards compatibility

Show the refactored code for logger.ts and explain the changes.`,
    validationFn: createPatternValidator(
      [
        /logger|log/i,
        /info|warn|error/i,
        /timestamp|date|time/i,
        /export/,
      ],
      [/level|severity/i, /backwards.*compatible/i]
    ),
    tags: ["refactoring", "dry", "logging"],
    timeoutMs: 90000,
  },

  {
    id: "ac-multi-003",
    name: "Debug Complex Issue",
    description: "Diagnose and fix async race condition",
    category: "bug_fixing",
    difficulty: "hard",
    prompt: `This code sometimes fails with "Cannot read property of undefined":

\`\`\`typescript
async function loadUserData(userId: string) {
  const user = await fetchUser(userId)
  const posts = await fetchPosts(userId)

  posts.forEach(post => {
    post.authorName = user.name
  })

  return posts
}
\`\`\`

The issue is intermittent. Debug this:
1. Identify the root cause
2. Explain why it's intermittent
3. Provide a fixed version
4. Add error handling`,
    validationFn: createPatternValidator(
      [
        /null|undefined|optional/i,
        /error.*handling|try.*catch/i,
        /async|await|promise/i,
      ],
      [/race.*condition|timing/i, /validation|check/i]
    ),
    tags: ["debugging", "async", "error-handling"],
    timeoutMs: 120000,
  },

  {
    id: "ac-multi-004",
    name: "Add and Document API Endpoint",
    description: "Create REST endpoint with OpenAPI docs",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Add a new REST API endpoint:

POST /api/users/:userId/preferences
Body: { theme: string, language: string, notifications: boolean }

Requirements:
1. Implement the endpoint handler
2. Add input validation
3. Add OpenAPI/Swagger documentation
4. Add a test for the endpoint
5. Handle error cases (user not found, invalid input)

Show the handler code and OpenAPI spec.`,
    validationFn: createPatternValidator(
      [
        /POST|post.*\/api/i,
        /validation|validate/i,
        /swagger|openapi/i,
        /test|spec/i,
      ],
      [/error.*handling|status.*code/i, /@param|@body/i]
    ),
    tags: ["api", "rest", "documentation", "testing"],
    timeoutMs: 120000,
  },

  {
    id: "ac-multi-005",
    name: "Migration Script",
    description: "Write database migration with rollback",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Create a database migration script to:
1. Add a new \`email_verified\` boolean column to users table (default: false)
2. Add a \`verified_at\` timestamp column (nullable)
3. Create an index on \`email_verified\`

Include:
- Up migration (apply changes)
- Down migration (rollback)
- Safety checks (table exists, column doesn't exist)

Use SQL and show both up and down migrations.`,
    validationFn: createPatternValidator(
      [
        /ALTER TABLE|ADD COLUMN/i,
        /email_verified/,
        /verified_at/,
        /CREATE INDEX/i,
      ],
      [/IF.*EXISTS|IF.*NOT.*EXISTS/i, /DROP.*COLUMN|DROP.*INDEX/i]
    ),
    tags: ["database", "migration", "sql"],
    timeoutMs: 90000,
  },
]

// =============================================================================
// CATEGORY 3: PLANNING & ARCHITECTURE (5 cases)
// =============================================================================

const planningTasks: BenchmarkCase[] = [
  {
    id: "ac-plan-001",
    name: "Design System Architecture",
    description: "Design architecture for new feature",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Design the architecture for a real-time notification system:

Requirements:
- Supports WebSocket connections
- Handles 10K concurrent users
- Persists notifications to database
- Supports multiple notification types (info, warning, error)
- Users can mark notifications as read

Provide:
1. High-level architecture diagram (text description)
2. Key components and their responsibilities
3. Data models
4. Technology choices with rationale
5. Scalability considerations`,
    validationFn: createPatternValidator(
      [
        /websocket|ws|socket\.io/i,
        /database|persist|storage/i,
        /notification.*type|type.*notification/i,
        /scalab|concurrent|performance/i,
      ],
      [/redis|queue|pub.*sub/i, /diagram|component|architecture/i]
    ),
    tags: ["architecture", "design", "scalability"],
    timeoutMs: 180000,
  },

  {
    id: "ac-plan-002",
    name: "Plan Feature Implementation",
    description: "Create detailed implementation plan",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Plan the implementation of a "dark mode" feature for a React web app:

Create a step-by-step implementation plan including:
1. What files need to be created/modified
2. State management approach
3. CSS/styling strategy
4. User preference persistence
5. Testing strategy
6. Estimated complexity for each step

Be specific and practical.`,
    validationFn: createPatternValidator(
      [
        /step|phase|task/i,
        /css|style|theme/i,
        /state|context|redux|store/i,
        /storage|persist|save/i,
      ],
      [/test|spec/i, /complexity|estimate|time/i]
    ),
    tags: ["planning", "implementation", "react"],
    timeoutMs: 120000,
  },

  {
    id: "ac-plan-003",
    name: "Review and Improve Design",
    description: "Critique existing architecture and suggest improvements",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Review this authentication system design:

\`\`\`
- Users log in with email/password
- Server creates JWT token (expires in 24h)
- Token stored in localStorage
- Every API request includes token in header
- No refresh token mechanism
- Passwords hashed with MD5
\`\`\`

Provide:
1. Security vulnerabilities (list at least 3)
2. Scalability concerns
3. Recommended improvements with rationale
4. Priority order for fixes`,
    validationFn: createPatternValidator(
      [
        /security|vulnerability|exploit/i,
        /MD5|hash|bcrypt|argon/i,
        /refresh.*token|token.*refresh/i,
        /localStorage|XSS|storage/i,
      ],
      [/priority|critical|high.*risk/i, /improvement|fix|solution/i]
    ),
    tags: ["security", "architecture", "review"],
    timeoutMs: 120000,
  },

  {
    id: "ac-plan-004",
    name: "Identify Tech Debt",
    description: "Analyze codebase and identify technical debt",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Analyze this code and identify technical debt:

\`\`\`typescript
class UserService {
  async getUser(id) {
    const sql = "SELECT * FROM users WHERE id = " + id
    const result = await db.query(sql)
    return result[0]
  }

  async updateUser(id, data) {
    // TODO: add validation
    await db.query("UPDATE users SET name = '" + data.name + "' WHERE id = " + id)
  }

  async deleteUser(id) {
    await db.query("DELETE FROM users WHERE id = " + id)
    // Also need to delete user posts, comments, etc
  }
}
\`\`\`

List:
1. Security issues
2. Code quality issues
3. Missing functionality
4. Suggested refactoring
5. Priority for each fix`,
    validationFn: createPatternValidator(
      [
        /SQL.*injection|injection/i,
        /validation|sanitize|escape/i,
        /typescript|type|any/i,
        /transaction|cascade|consistency/i,
      ],
      [/priority|critical|high/i, /refactor|improve/i]
    ),
    tags: ["technical-debt", "security", "refactoring"],
    timeoutMs: 90000,
  },

  {
    id: "ac-plan-005",
    name: "Create Implementation Roadmap",
    description: "Plan multi-phase feature rollout",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Create a roadmap for adding multi-tenancy to an existing SaaS app:

Current state:
- Single database for all users
- No tenant isolation
- 500 existing users
- Active development ongoing

Plan:
1. Break into phases (MVP → Full rollout)
2. Identify risks and dependencies
3. Database migration strategy
4. Backwards compatibility approach
5. Testing strategy for each phase
6. Estimated timeline

Focus on minimizing disruption.`,
    validationFn: createPatternValidator(
      [
        /phase|stage|milestone/i,
        /migration|tenant|isolation/i,
        /risk|dependency/i,
        /timeline|estimate/i,
      ],
      [/mvp|minimum.*viable/i, /backwards.*compatible|compatibility/i, /test|validation/i]
    ),
    tags: ["planning", "architecture", "migration", "multi-tenancy"],
    timeoutMs: 180000,
  },
]

// =============================================================================
// CATEGORY 4: AGENT COLLABORATION (5 cases)
// =============================================================================

const collaborationTasks: BenchmarkCase[] = [
  {
    id: "ac-collab-001",
    name: "Delegate to Specialist",
    description: "Recognize need for specialized agent and delegate",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Create a beautiful, modern landing page component for a SaaS product.

Requirements:
- Hero section with gradient background
- Feature cards with icons
- Pricing table with hover effects
- Responsive design
- Smooth animations
- Modern aesthetic (not generic)

This requires UI/UX expertise. Delegate to the appropriate specialist if available, or implement with high design quality.`,
    validationFn: createPatternValidator(
      [
        /component|jsx|tsx/i,
        /hero|section/i,
        /responsive|mobile|tablet/i,
        /animation|transition/i,
      ],
      [/gradient|modern|design/i, /delegate|agent|specialist/i]
    ),
    tags: ["delegation", "ui", "frontend", "collaboration"],
    timeoutMs: 120000,
  },

  {
    id: "ac-collab-002",
    name: "Parallel Task Execution",
    description: "Identify independent tasks and parallelize",
    category: "task_completion",
    difficulty: "medium",
    prompt: `I need to:
1. Add TypeScript types to 5 JavaScript files
2. Update README with new API documentation
3. Run the test suite and fix any failures
4. Check for unused dependencies and remove them

These are independent tasks. Execute them efficiently (in parallel if beneficial).`,
    validationFn: createStructureValidator([
      { name: "Recognizes independence", validator: (o) => /parallel|concurrent|independent/i.test(o) },
      { name: "Addresses types", validator: (o) => /typescript|types|interface/i.test(o) },
      { name: "Addresses README", validator: (o) => /readme|documentation/i.test(o) },
      { name: "Addresses tests", validator: (o) => /test|spec/i.test(o) },
      { name: "Addresses dependencies", validator: (o) => /dependency|dependencies|package/i.test(o) },
    ]),
    tags: ["parallelization", "efficiency", "multi-task"],
    timeoutMs: 180000,
  },

  {
    id: "ac-collab-003",
    name: "Research Then Implement",
    description: "Delegate research, then implement based on findings",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Implement rate limiting for our API using Redis.

Requirements:
1. First, research best practices for Redis-based rate limiting
2. Choose an appropriate algorithm (token bucket, sliding window, etc.)
3. Implement the rate limiter
4. Add tests
5. Document the approach

If you have a research specialist, use them first.`,
    validationFn: createPatternValidator(
      [
        /redis/i,
        /rate.*limit|limit.*rate/i,
        /algorithm|token.*bucket|sliding.*window/i,
        /test/i,
      ],
      [/research|investigate|best.*practice/i, /delegate|agent|librarian/i]
    ),
    tags: ["research", "implementation", "redis", "delegation"],
    timeoutMs: 180000,
  },

  {
    id: "ac-collab-004",
    name: "Code Review Workflow",
    description: "Review code and delegate fixes if needed",
    category: "task_completion",
    difficulty: "medium",
    prompt: `Review this pull request and identify issues:

\`\`\`typescript
export function processPayment(amount: number, cardNumber: string) {
  console.log("Processing payment: " + amount)
  console.log("Card: " + cardNumber)

  // TODO: actually charge the card

  return { success: true }
}
\`\`\`

After identifying issues:
1. List all problems (security, logging, error handling, etc.)
2. Provide a fixed version
3. Add proper error handling
4. Add validation`,
    validationFn: createPatternValidator(
      [
        /security|pci|sensitive/i,
        /log|console|sensitive.*data/i,
        /error.*handling|try.*catch/i,
        /validation|validate/i,
      ],
      [/review|issue|problem/i, /fix|improve|solution/i]
    ),
    tags: ["code-review", "security", "best-practices"],
    timeoutMs: 90000,
  },

  {
    id: "ac-collab-005",
    name: "Error Recovery Chain",
    description: "Handle errors and recover through delegation",
    category: "task_completion",
    difficulty: "hard",
    prompt: `Run the test suite, and if any tests fail:
1. Analyze the failure
2. Determine root cause
3. Fix the issue
4. Re-run tests to verify
5. If still failing, escalate to debugging specialist (if available)

Keep going until tests pass or you've exhausted options.`,
    validationFn: createStructureValidator([
      { name: "Mentions running tests", validator: (o) => /run.*test|test.*suite|npm.*test/i.test(o) },
      { name: "Mentions analysis", validator: (o) => /analyze|diagnose|root.*cause/i.test(o) },
      { name: "Mentions fixing", validator: (o) => /fix|resolve|solution/i.test(o) },
      { name: "Mentions verification", validator: (o) => /verify|re.*run|confirm/i.test(o) },
      { name: "Shows persistence", validator: (o) => /until|keep|continue|loop/i.test(o) },
    ]),
    tags: ["error-recovery", "testing", "debugging", "persistence"],
    timeoutMs: 180000,
  },
]

// =============================================================================
// COMBINE ALL CASES
// =============================================================================

const allCases: BenchmarkCase[] = [
  ...simpleTasks,
  ...multiStepTasks,
  ...planningTasks,
  ...collaborationTasks,
]

export const agentComparisonSuite: BenchmarkSuite = {
  id: "agent-comparison",
  name: "Agent Comparison Benchmark",
  description: "Compare AI coding agents (MAGI vs Claude Code + oh-my-claude-sisyphus) across simple tasks, multi-step workflows, planning, and collaboration",
  version: "1.0.0",
  cases: allCases,
  defaultTimeout: 90000,
  parallelExecution: false,
}
