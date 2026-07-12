import base from "@repo/vitest-config/base";
import swc from "unplugin-swc";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      environment: "node",
      include: ["test/**/*.e2e-spec.ts"],
      exclude: ["**/dist/**", "**/node_modules/**"],
      globalSetup: ["./test/setup/global-db.ts"],
      testTimeout: 30000,
      fileParallelism: false,
    },
    // Boots the full AppModule through Nest's DI container, which resolves
    // constructor params like `logger: AppLogger` (no explicit @Inject) via
    // emitted `design:paramtypes` metadata. Vitest's default esbuild transform
    // strips that metadata, so DI silently receives `undefined` — SWC restores it.
    plugins: [
      swc.vite({
        jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } },
      }),
    ],
  }),
);
