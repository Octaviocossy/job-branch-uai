import react from "@repo/vitest-config/react";
import { mergeConfig } from "vitest/config";

export default mergeConfig(
  {
    resolve: {
      alias: {
        "@": new URL("./", import.meta.url).pathname,
      },
    },
    test: {
      execArgv: [`--localstorage-file=${new URL("./.vitest-localstorage.json", import.meta.url).pathname}`],
    },
  },
  react,
);
