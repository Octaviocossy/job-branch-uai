import node from "@repo/vitest-config/node";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  node,
  defineConfig({
    test: {
      include: ["src/**/*.test.ts"],
    },
  }),
);
