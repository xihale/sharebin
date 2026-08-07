import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: [
      "apps/*/src/**/*.ts",
      "packages/frontend/src/**/*.ts",
      "packages/shared/src/**/*.ts",
    ],
  })),
  {
    files: ["apps/cloud/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.worker,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["apps/selfhost/src/**/*.ts", "packages/shared/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["packages/frontend/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "packages/frontend/src/global.d.ts",
    ],
  },
);
