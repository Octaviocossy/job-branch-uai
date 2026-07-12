import base from "@repo/vitest-config/base";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/**/*.spec.ts"],
      exclude: ["**/dist/**", "**/node_modules/**", "**/*.int.spec.ts", "**/*.e2e-spec.ts"],
    },
  }),
);
