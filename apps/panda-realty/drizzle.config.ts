import path from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadEnv } from "dotenv"
import { defineConfig } from "drizzle-kit"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, ".env") })
loadEnv({ path: path.resolve(__dirname, ".env.local"), override: true })

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
})
