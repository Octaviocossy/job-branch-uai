import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server (.next/standalone) for a minimal Docker runtime image.
  output: "standalone",
  // Monorepo: trace files from the repo root so workspace deps are included correctly.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
