import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.worker,
        ...globals.node,
      },
    },
    rules: {
      // Add any specific rules for your API-prev project here
      // For example, if you want to disallow 'any' type:
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
])
