import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['build/', 'release/', 'artifacts/', '.worktrees/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'object-shorthand': 'error',
      'prefer-template': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // A type assertion is a claim the compiler cannot check: values are narrowed instead
      // (`as const` stays allowed). The few process boundaries that cannot be checked say so.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      // An empty string means "not set" throughout (model ids, titles, paths), so `||` is deliberate there.
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
      // node:test registers tests synchronously; the promises it returns are its own.
      '@typescript-eslint/no-floating-promises': [
        'error',
        { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'suite'] }] }
      ]
    }
  },
  {
    // Tests forge invalid input and stand-in objects on purpose, and read files they wrote as
    // their oracles: there an assertion states the test's intent.
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-assertions': 'off' }
  }
);
