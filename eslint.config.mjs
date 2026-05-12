import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "*.js",
    // Default ignores of eslint-config-next:
    ".firebase/**",
    "functions/lib/**",
    ".next/**",
    "out/**",
    "build/**",
    "public/firebase-messaging-sw.js",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
