import js from '@eslint/js';
import google from 'eslint-config-google';
import prettierConfig from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

const googleRules = { ...google.rules };
delete googleRules['valid-jsdoc'];
delete googleRules['require-jsdoc'];

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '.vscode/extensions.js',
      'safari/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },

  // Base configuration for JS/MJS files
  js.configs.recommended,

  // Google's style guide (excluding JSDoc rules removed in ESLint v9)
  {
    rules: googleRules,
  },

  // Main custom configuration
  {
    files: ['**/*.{js,mjs}'],
    plugins: {
      prettier,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // Override for Node.js configuration and test files
  {
    files: ['eslint.config.mjs', 'playwright.config.js', 'test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['Gruntfile.js', 'Gruntfile.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },

  // Prettier config must be last
  // This turns off all rules that are unnecessary or might conflict with Prettier.
  prettierConfig,
];
