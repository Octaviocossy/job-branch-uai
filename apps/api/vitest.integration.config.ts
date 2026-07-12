import base from "@repo/vitest-config/base";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/**/*.int.spec.ts"],
      exclude: ["**/dist/**", "**/node_modules/**"],
      globalSetup: ["./test/setup/global-db.ts"],
      testTimeout: 30000,
      fileParallelism: false,
    },
  }),
);
