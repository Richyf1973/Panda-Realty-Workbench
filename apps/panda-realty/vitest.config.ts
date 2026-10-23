import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.join(__dirname, "test/shims/server-only.js"),
      "@": path.join(__dirname, "."),
      "@admin-context": path.join(__dirname, "lib/admin/admin-context.ts"),
      "@admin-client-context": path.join(
        __dirname,
        "lib/admin/admin-client-context.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "components/**/*.test.ts"],
    passWithNoTests: false,
  },
})
