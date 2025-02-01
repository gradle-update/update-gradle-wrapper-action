import {fileURLToPath} from 'node:url';
import {FlatCompat} from '@eslint/eslintrc';
import globals from 'globals';
import jest from 'eslint-plugin-jest';
import js from '@eslint/js';
import path from 'node:path';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  {
    ignores: ['**/dist/', '**/lib/', '**/node_modules/', 'jest.config.js']
  },
  ...compat.extends('plugin:github/recommended'),
  {
    plugins: {
      jest,
      '@typescript-eslint': typescriptEslint,
      '@stylistic': stylistic
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        ...jest.environments.globals.globals
      },
      parser: tsParser,
      ecmaVersion: 9,
      sourceType: 'module',

      parserOptions: {
        project: ['tsconfig.eslint.json'],
        tsconfigRootDir: __dirname
      }
    },

    rules: {
      'eslint-comments/no-use': 'off',
      'filenames/match-regex': 'off',
      'i18n-text/no-en': 'off',
      'import/no-namespace': 'off',

      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          allowSeparatedGroups: true,
          memberSyntaxSortOrder: ['all', 'single', 'multiple', 'none']
        }
      ],

      'import/no-unresolved': [
        'error',
        {
          ignore: ['@octokit', '@typescript-eslint']
        }
      ],

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',

      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public'
        }
      ],

      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      camelcase: 'off',
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@stylistic/indent': ['error', 2],
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      semi: 'off',
      '@stylistic/type-annotation-spacing': 'error',
      '@typescript-eslint/unbound-method': 'off'
    }
  }
];
