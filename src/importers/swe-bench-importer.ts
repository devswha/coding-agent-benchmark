import { BaseImporter, type ImportOptions, type ImportResult } from './base-importer'
import type { BenchmarkCase, BenchmarkSource, FileContext } from '../types'

interface SWEBenchEntry {
  instance_id: string
  repo: string
  base_commit: string
  problem_statement: string
  hints_text: string
  test_patch: string
  patch: string
  FAIL_TO_PASS: string[]
  PASS_TO_PASS: string[]
}

export class SWEBenchImporter extends BaseImporter {
  readonly name = 'swe-bench-lite'
  readonly sourceUrl = 'https://github.com/princeton-nlp/SWE-bench'

  async isAvailable(): Promise<boolean> {
    return true // Sample data bundled
  }

  async import(options?: ImportOptions): Promise<ImportResult> {
    this.log('Importing SWE-bench-lite dataset...')

    // Sample SWE-bench problems
    const sampleProblems: SWEBenchEntry[] = [
      {
        instance_id: 'astropy__astropy-12907',
        repo: 'astropy/astropy',
        base_commit: 'abc123',
        problem_statement: 'Modeling compound model separability with indexed operators fails.\n\nThe issue is with compound models that use indexed operators like `model[0]`.',
        hints_text: 'The issue seems to be in the separability matrix computation.',
        test_patch: 'diff --git a/astropy/modeling/tests/test_separable.py...',
        patch: 'diff --git a/astropy/modeling/separable.py...',
        FAIL_TO_PASS: ['astropy/modeling/tests/test_separable.py::test_compound_model_indexing'],
        PASS_TO_PASS: ['astropy/modeling/tests/test_separable.py::test_basic_separability']
      },
      {
        instance_id: 'django__django-11099',
        repo: 'django/django',
        base_commit: 'def456',
        problem_statement: 'UsernameValidator does not accept the plus sign character.\n\nThe username validator should accept + as a valid character.',
        hints_text: 'Check the regex in auth/validators.py',
        test_patch: 'diff --git a/tests/auth_tests/test_validators.py...',
        patch: 'diff --git a/django/contrib/auth/validators.py...',
        FAIL_TO_PASS: ['tests/auth_tests/test_validators.py::TestUsernameValidator::test_plus_sign'],
        PASS_TO_PASS: ['tests/auth_tests/test_validators.py::TestUsernameValidator::test_basic']
      },
      {
        instance_id: 'requests__requests-5414',
        repo: 'psf/requests',
        base_commit: 'ghi789',
        problem_statement: 'Session does not honor timeout passed to request method.\n\nWhen timeout is passed to session.get(), it should override the session default.',
        hints_text: 'Look at the Session.request method in sessions.py',
        test_patch: 'diff --git a/tests/test_requests.py...',
        patch: 'diff --git a/requests/sessions.py...',
        FAIL_TO_PASS: ['tests/test_requests.py::TestSession::test_timeout_override'],
        PASS_TO_PASS: ['tests/test_requests.py::TestSession::test_basic_get']
      }
    ]

    const cases = sampleProblems.map(entry => this.mapToCase(entry))
    const limit = options?.limit ?? cases.length

    return {
      cases: cases.slice(0, limit),
      metadata: {
        source: this.sourceUrl,
        version: '1.0.0',
        importedAt: Date.now(),
        totalAvailable: 300,
        imported: Math.min(limit, cases.length)
      }
    }
  }

  private mapToCase(entry: SWEBenchEntry): BenchmarkCase {
    const source: BenchmarkSource = {
      dataset: 'swe_bench_lite',
      originalId: entry.instance_id,
      datasetVersion: '1.0.0',
      sourceUrl: `https://github.com/${entry.repo}`
    }

    const fileContext: FileContext = {
      files: {},
      editableFiles: [],
      repoUrl: `https://github.com/${entry.repo}`,
      repoRef: entry.base_commit
    }

    const difficulty = entry.FAIL_TO_PASS.length > 3 ? 'hard' :
                       entry.FAIL_TO_PASS.length > 1 ? 'medium' : 'easy'

    return {
      id: entry.instance_id.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
      name: entry.instance_id,
      description: entry.problem_statement.slice(0, 200),
      category: 'bug_fixing',
      difficulty,
      prompt: `Fix the following issue in ${entry.repo}:\n\n${entry.problem_statement}\n\nHints: ${entry.hints_text}`,
      context: `Repository: ${entry.repo}\nCommit: ${entry.base_commit}\n\nTests to pass:\n${entry.FAIL_TO_PASS.join('\n')}`,
      source,
      fileContext,
      tags: ['swe-bench', 'github-issue', entry.repo.split('/')[0]]
    }
  }
}

