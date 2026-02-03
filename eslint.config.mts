import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default defineConfig(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.env*"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginUnicorn.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: true,
      },
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      
      // Reglas de estilo
      "semi": ["error", "always"],
      "quotes": ["error", "single"],
      "comma-dangle": ["error", "always-multiline"],
      
      // Ajustes de Unicorn para NestJS
      "unicorn/filename-case": "off", // NestJS usa PascalCase y kebab-case
      "unicorn/prevent-abbreviations": "off", // Permite abreviaciones comunes (args, props, etc)
      "unicorn/no-null": "off", // TypeScript/NestJS usa null
      "unicorn/prefer-top-level-await": "off", // NestJS bootstrap pattern es válido
      "unicorn/no-array-sort": "off", // toSorted() no está disponible en nuestra versión de ES
    },
  },
  eslintPluginPrettier
);
