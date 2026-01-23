import type { BenchmarkSuite, BenchmarkCase } from '../types'

// Sample SWE-bench problems for demonstration
const sweBenchCases: BenchmarkCase[] = [
  {
    id: 'swe_astropy_12907',
    name: 'astropy__astropy-12907',
    description: 'Modeling compound model separability with indexed operators fails',
    category: 'bug_fixing',
    difficulty: 'hard',
    prompt: `Fix the following issue in astropy/astropy:

Modeling compound model separability with indexed operators fails.

The issue is with compound models that use indexed operators like \`model[0]\`.
When computing the separability matrix for such compound models, the code
fails to handle the indexed access properly.

The bug is in the separability matrix computation in astropy/modeling/separable.py`,
    context: `Repository: astropy/astropy
Tests to pass: astropy/modeling/tests/test_separable.py::test_compound_model_indexing`,
    validationFn: (output) => {
      const hasFix = /separab|index|compound|model\[/.test(output.toLowerCase())
      const hasPatch = /diff|---|\+\+\+|@@/.test(output)
      const score = [hasFix, hasPatch].filter(Boolean).length / 2
      return { passed: score >= 0.5, score }
    },
    tags: ['swe-bench', 'astropy', 'modeling']
  },
  {
    id: 'swe_django_11099',
    name: 'django__django-11099',
    description: 'UsernameValidator does not accept plus sign character',
    category: 'bug_fixing',
    difficulty: 'easy',
    prompt: `Fix the following issue in django/django:

UsernameValidator does not accept the plus sign character.

The username validator should accept + as a valid character in usernames,
but currently it rejects usernames containing +.

The fix should be in django/contrib/auth/validators.py`,
    context: `Repository: django/django
Tests to pass: tests/auth_tests/test_validators.py::TestUsernameValidator::test_plus_sign`,
    validationFn: (output) => {
      const hasRegex = /regex|pattern|\+|plus/.test(output.toLowerCase())
      const hasValidator = /validator|username/.test(output.toLowerCase())
      const score = [hasRegex, hasValidator].filter(Boolean).length / 2
      return { passed: score >= 0.5, score }
    },
    tags: ['swe-bench', 'django', 'auth']
  },
  {
    id: 'swe_requests_5414',
    name: 'requests__requests-5414',
    description: 'Session does not honor timeout passed to request method',
    category: 'bug_fixing',
    difficulty: 'medium',
    prompt: `Fix the following issue in psf/requests:

Session does not honor timeout passed to request method.

When timeout is passed to session.get() or other request methods,
it should override the session default timeout. Currently the session
default timeout is always used.

The fix should be in requests/sessions.py`,
    context: `Repository: psf/requests
Tests to pass: tests/test_requests.py::TestSession::test_timeout_override`,
    validationFn: (output) => {
      const hasTimeout = /timeout/.test(output.toLowerCase())
      const hasSession = /session|request/.test(output.toLowerCase())
      const score = [hasTimeout, hasSession].filter(Boolean).length / 2
      return { passed: score >= 0.5, score }
    },
    tags: ['swe-bench', 'requests', 'http']
  }
]

export const sweBenchLiteSuite: BenchmarkSuite = {
  id: 'swe-bench-lite',
  name: 'SWE-bench Lite',
  description: 'Real-world GitHub issue resolution benchmark (sample from 300 instances)',
  version: '1.0.0',
  cases: sweBenchCases,
  defaultTimeout: 300000,
  parallelExecution: false
}

// Async loader for full dataset
export async function loadSWEBenchLiteSuite(): Promise<BenchmarkSuite> {
  return sweBenchLiteSuite
}
