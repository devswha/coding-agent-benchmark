import type { BenchmarkSuite, BenchmarkCase, ValidationResult } from '../types'

function createSecurityValidator(patterns: { good: RegExp[], bad: RegExp[] }): (output: string) => ValidationResult {
  return (output: string) => {
    const hasBadPatterns = patterns.bad.some(p => p.test(output))
    const hasGoodPatterns = patterns.good.every(p => p.test(output))

    if (hasBadPatterns) {
      return { passed: false, score: 0, errors: ['Contains vulnerable patterns'] }
    }
    if (!hasGoodPatterns) {
      return { passed: false, score: 0.5, details: 'Missing secure coding patterns' }
    }
    return { passed: true, score: 1 }
  }
}

const securityCases: BenchmarkCase[] = [
  // SQL Injection Prevention (5 cases)
  {
    id: 'sec-001',
    name: 'SQL Injection - Parameterized Queries',
    description: 'Write a function to safely query user by ID using parameterized queries',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a Python function get_user(conn, user_id) that safely retrieves a user from a database using parameterized queries to prevent SQL injection.',
    validationFn: createSecurityValidator({
      good: [/\?|%s|:[\w]+|\$\d+/],  // Parameterized query markers
      bad: [/f["\']/i, /\.format\(/i, /\+\s*user_id/i]  // String formatting with user input
    }),
    tags: ['sql-injection', 'parameterized-queries']
  },
  {
    id: 'sec-002',
    name: 'SQL Injection - ORM Usage',
    description: 'Rewrite raw SQL query to use ORM safely',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Convert this vulnerable query to safe SQLAlchemy ORM: query = f"SELECT * FROM users WHERE name = \'{name}\'"',
    validationFn: createSecurityValidator({
      good: [/filter|filter_by|query\(/i],
      bad: [/f["\']/i, /\.format\(/i, /text\(/i]
    }),
    tags: ['sql-injection', 'orm']
  },
  {
    id: 'sec-003',
    name: 'SQL Injection - Stored Procedures',
    description: 'Create a stored procedure call that prevents SQL injection',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a function to call a stored procedure search_products(search_term) safely in Python with psycopg2.',
    validationFn: createSecurityValidator({
      good: [/cursor\.callproc|execute.*%s/i],
      bad: [/f["\']/i, /\.format\(/i]
    }),
    tags: ['sql-injection', 'stored-procedures']
  },

  // XSS Prevention (5 cases)
  {
    id: 'sec-004',
    name: 'XSS - HTML Escaping',
    description: 'Safely render user input in HTML',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a Python function render_comment(comment) that safely renders a user comment in HTML, preventing XSS attacks.',
    validationFn: createSecurityValidator({
      good: [/escape|html\.escape|bleach|sanitize/i],
      bad: [/innerHTML|dangerouslySetInnerHTML/i]
    }),
    tags: ['xss', 'html-escaping']
  },
  {
    id: 'sec-005',
    name: 'XSS - React Safe Rendering',
    description: 'Render user content safely in React',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a React component UserComment that safely displays user-provided content without XSS vulnerabilities.',
    validationFn: createSecurityValidator({
      good: [/\{.*\}/],  // JSX interpolation (auto-escaped)
      bad: [/dangerouslySetInnerHTML|innerHTML/i]
    }),
    tags: ['xss', 'react']
  },
  {
    id: 'sec-006',
    name: 'XSS - URL Sanitization',
    description: 'Safely handle user-provided URLs',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a function safe_redirect(url) that validates and sanitizes a user-provided URL before redirecting, preventing javascript: and data: URL attacks.',
    validationFn: createSecurityValidator({
      good: [/startswith|^https?:\/\/|url.*parse|whitelist/i],
      bad: [/javascript:|data:/i]
    }),
    tags: ['xss', 'url-sanitization']
  },

  // Authentication & Authorization (5 cases)
  {
    id: 'sec-007',
    name: 'Password Hashing',
    description: 'Implement secure password hashing',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write Python functions hash_password(password) and verify_password(password, hashed) using bcrypt or argon2.',
    validationFn: createSecurityValidator({
      good: [/bcrypt|argon2|pbkdf2|scrypt/i],
      bad: [/md5|sha1(?!_)|sha256(?!_crypt)/i]  // Plain hashes without salt
    }),
    tags: ['authentication', 'password-hashing']
  },
  {
    id: 'sec-008',
    name: 'JWT Validation',
    description: 'Implement secure JWT token validation',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a function validate_jwt(token, secret) that securely validates a JWT token, checking signature, expiration, and issuer.',
    validationFn: createSecurityValidator({
      good: [/verify|decode.*verify|exp|iss|algorithms/i],
      bad: [/algorithms.*\[.*none.*\]|verify\s*=\s*False/i]
    }),
    tags: ['authentication', 'jwt']
  },
  {
    id: 'sec-009',
    name: 'Session Management',
    description: 'Implement secure session handling',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a Flask middleware that implements secure session management with HttpOnly cookies, Secure flag, and SameSite attribute.',
    validationFn: createSecurityValidator({
      good: [/httponly|secure|samesite/i],
      bad: []
    }),
    tags: ['authentication', 'session']
  },

  // Input Validation (5 cases)
  {
    id: 'sec-010',
    name: 'Email Validation',
    description: 'Validate email input securely',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a function validate_email(email) that validates an email address format and prevents header injection attacks.',
    validationFn: createSecurityValidator({
      good: [/regex|re\.|@.*\./i],
      bad: [/\\r|\\n|%0[aAdD]/i]  // CRLF injection patterns
    }),
    tags: ['input-validation', 'email']
  },
  {
    id: 'sec-011',
    name: 'Path Traversal Prevention',
    description: 'Prevent path traversal attacks',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a function safe_file_read(base_dir, filename) that safely reads a file while preventing path traversal attacks (../).',
    validationFn: createSecurityValidator({
      good: [/os\.path\.realpath|os\.path\.abspath|pathlib|startswith|commonpath/i],
      bad: [/open\(.*\+/i]  // Direct concatenation
    }),
    tags: ['input-validation', 'path-traversal']
  },
  {
    id: 'sec-012',
    name: 'Command Injection Prevention',
    description: 'Execute system commands safely',
    category: 'security',
    difficulty: 'hard',
    prompt: 'Write a function run_backup(filename) that executes a backup command with user-provided filename, preventing command injection.',
    validationFn: createSecurityValidator({
      good: [/subprocess\.run.*shell\s*=\s*False|shlex\.quote|list\s*\[/i],
      bad: [/os\.system|shell\s*=\s*True|`|eval\(|exec\(/i]
    }),
    tags: ['input-validation', 'command-injection']
  },

  // Secret Detection (3 cases)
  {
    id: 'sec-013',
    name: 'API Key Handling',
    description: 'Handle API keys securely',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a function get_api_key() that retrieves an API key from environment variables instead of hardcoding it.',
    validationFn: createSecurityValidator({
      good: [/os\.environ|os\.getenv|environ\.get|dotenv/i],
      bad: [/["\'](sk_|api_|key_|secret_)[\w]{20,}["\']/i]  // Hardcoded keys
    }),
    tags: ['secrets', 'api-keys']
  },
  {
    id: 'sec-014',
    name: 'Database Credentials',
    description: 'Handle database credentials securely',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a function get_db_connection() that creates a database connection using credentials from environment variables or a secrets manager.',
    validationFn: createSecurityValidator({
      good: [/os\.environ|os\.getenv|secrets|vault|ssm/i],
      bad: [/password\s*=\s*["\']\w+["\']/i]
    }),
    tags: ['secrets', 'database']
  },
  {
    id: 'sec-015',
    name: 'Logging Sensitive Data',
    description: 'Avoid logging sensitive information',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a logging middleware that redacts sensitive fields (password, token, credit_card) before logging request data.',
    validationFn: createSecurityValidator({
      good: [/redact|\*{3,}|mask|filter/i],
      bad: []
    }),
    tags: ['secrets', 'logging']
  },

  // Cryptography (5 cases)
  {
    id: 'sec-016',
    name: 'Secure Random Generation',
    description: 'Generate cryptographically secure random tokens',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a function generate_token(length) that generates a cryptographically secure random token.',
    validationFn: createSecurityValidator({
      good: [/secrets\.|os\.urandom|crypto\.randomBytes|SystemRandom/i],
      bad: [/random\.\w+\(|Math\.random/i]
    }),
    tags: ['cryptography', 'random']
  },
  {
    id: 'sec-017',
    name: 'AES Encryption',
    description: 'Implement AES encryption correctly',
    category: 'security',
    difficulty: 'hard',
    prompt: 'Write functions encrypt_data(plaintext, key) and decrypt_data(ciphertext, key) using AES-256-GCM with proper IV handling.',
    validationFn: createSecurityValidator({
      good: [/AES|GCM|iv|nonce|tag/i],
      bad: [/ECB|DES(?!_)|padding.*pkcs1/i]
    }),
    tags: ['cryptography', 'aes']
  },
  {
    id: 'sec-018',
    name: 'HTTPS Certificate Validation',
    description: 'Make HTTPS requests with proper certificate validation',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a function fetch_secure(url) that makes an HTTPS request with proper certificate validation (do not disable SSL verification).',
    validationFn: createSecurityValidator({
      good: [/https/i],
      bad: [/verify\s*=\s*False|CERT_NONE|InsecureRequestWarning/i]
    }),
    tags: ['cryptography', 'tls']
  },
  {
    id: 'sec-019',
    name: 'Signature Verification',
    description: 'Verify webhook signatures',
    category: 'security',
    difficulty: 'medium',
    prompt: 'Write a function verify_webhook_signature(payload, signature, secret) that verifies an HMAC-SHA256 webhook signature.',
    validationFn: createSecurityValidator({
      good: [/hmac|sha256|compare_digest|timingSafeEqual/i],
      bad: [/==|!=/]  // Timing-unsafe comparison
    }),
    tags: ['cryptography', 'signatures']
  },
  {
    id: 'sec-020',
    name: 'Data Sanitization',
    description: 'Sanitize data before display',
    category: 'security',
    difficulty: 'easy',
    prompt: 'Write a function sanitize_for_display(data) that removes or escapes potentially dangerous characters from user data before displaying it.',
    validationFn: createSecurityValidator({
      good: [/escape|sanitize|strip|replace|filter/i],
      bad: []
    }),
    tags: ['sanitization', 'output-encoding']
  }
]

export const securitySuite: BenchmarkSuite = {
  id: 'security',
  name: 'Security Benchmark Suite',
  description: 'Security vulnerability detection and secure coding practices benchmark',
  version: '1.0.0',
  cases: securityCases,
  defaultTimeout: 60000,
  parallelExecution: false
}
