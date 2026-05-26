import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'error',  // Upgrade from warn
      'no-undef': 'error',         // Upgrade from warn
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'off',  // Allow console in GitHub Actions
    }
  }
];