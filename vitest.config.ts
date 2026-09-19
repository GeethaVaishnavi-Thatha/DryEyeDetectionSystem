import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the build there uses vite-plugin-singlefile,
// which has no business running during tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      include: ["src/lib/**"],
      reporter: ["text", "lcov"],
    },
  },
});
