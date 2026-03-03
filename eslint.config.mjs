import js from '@eslint/js';
import google from 'eslint-config-google';
import prettierConfig from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

// Override Google's rules that are removed in ESLint 9
const googleWithOverrides = {
  ...google,
  rules: {
    ...google.rules,
    'valid-jsdoc': 'off',
    'require-jsdoc': 'off',
  },
};

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '.vscode/extensions.js',
      'safari/**',
    ],
  },

  // Base configuration for JS/MJS files
  js.configs.recommended,

  // Google's style guide (with ESLint 9 compatible overrides)
  googleWithOverrides,

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

  // Override for Node.js configuration files
  {
    files: ['eslint.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['Gruntfile.js'],
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
