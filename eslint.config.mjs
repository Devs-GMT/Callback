import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    // Build output. Globbed with a leading `**/` because the resolved paths
    // can carry a prefix above the project root, which a bare `.next/**` does
    // not match — without this, linting reports on Turbopack's own runtime.
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",

    // Vendored at build time by scripts/copy-pdf-worker.mjs, not ours to lint.
    "public/vendor/**",

    // The contracts package has its own toolchain; artifacts and the
    // TypeChain output are generated.
    "contracts/artifacts/**",
    "contracts/cache/**",
    "contracts/types/**",
  ]),
]);

export default eslintConfig;
