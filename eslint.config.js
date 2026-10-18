import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', 'coverage/', 'logs/', 'src/db/migrations/', 'src/graphql/generated/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use named exports.' },
        {
          selector: 'TSEnumDeclaration',
          message: 'Use a string-literal union or an `as const` object.',
        },
      ],
      // `type` for data shapes, `interface` for contracts classes implement: a judgement, not a rule.
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    // Only product code: a literal in a test is an expected value from outside the code
    // (docs/testing.md#literals), and tool configs are nothing but literals.
    files: ['src/**'],
    rules: {
      '@typescript-eslint/no-magic-numbers': [
        'error',
        { ignore: [-1, 0, 1], ignoreReadonlyClassProperties: true, ignoreTypeIndexes: true },
      ],
    },
  },
  {
    files: ['test/**'],
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-conditional-in-test': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Tool configs are loaded through their default export.
    files: ['*.config.js', '*.config.ts', 'codegen.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
  prettier,
);
