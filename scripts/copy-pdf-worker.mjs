/**
 * Copy the pdf.js worker into /public.
 *
 * pdfjs-dist ships the worker as an ESM file inside node_modules. Resolving it
 * through a bundler at runtime is fragile across Turbopack and Webpack, so the
 * worker is served as a static asset instead and `workerSrc` points at a plain
 * URL. Running this on predev and prebuild keeps the copy in step with the
 * installed version rather than drifting as a committed binary would.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
const source = join(pdfjsRoot, "build", "pdf.worker.min.mjs");
const targetDir = join(process.cwd(), "public", "vendor");
const target = join(targetDir, "pdf.worker.min.mjs");

await mkdir(targetDir, { recursive: true });
await copyFile(source, target);

const { version } = require("pdfjs-dist/package.json");
console.log(`pdf.js worker ${version} copied to public/vendor/pdf.worker.min.mjs`);
