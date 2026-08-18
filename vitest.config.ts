import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Force the same react instance across app + testing-library.
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  test: {
    environmentMatchGlobs: [
      ["components/**/*.test.tsx", "happy-dom"],
      ["lib/**/*.test.{ts,mts}", "node"],
    ],
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "lib/**/*.test.mts",
      "components/**/*.test.ts",
      "components/**/*.test.tsx",
    ],
  },
});
