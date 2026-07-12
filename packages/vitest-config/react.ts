import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./base.ts";

export default mergeConfig(
  base,
  defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: ["@repo/vitest-config/setup.react"],
    },
  }),
);
