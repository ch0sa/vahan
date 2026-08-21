import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".local-tools/**", ".next/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
  js.configs.recommended,
  ...nextVitals,
  ...tseslint.configs.recommended,
);
