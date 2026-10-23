import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"

function requireDatabaseUrl(): string {
  // DATABASE_URL (set by hand) wins; POSTGRES_URL is what the Supabase → Vercel
  // integration sets automatically, so the workbench works with either.
  const url = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL)?.trim()
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Add the Postgres connection URI from Supabase (Project Settings → Database) to .env.local.",
    )
  }
  return url
}

const globalForDb = globalThis as typeof globalThis & {
  __pandaRealtyPostgres?: ReturnType<typeof postgres>
}

function getPostgresClient() {
  if (globalForDb.__pandaRealtyPostgres) {
    return globalForDb.__pandaRealtyPostgres
  }
  const poolMax = (() => {
    const raw = process.env.DATABASE_POOL_MAX?.trim()
    if (raw == null || raw === "") return 10
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 10
  })()

  const client = postgres(requireDatabaseUrl(), {
    max: poolMax,
    prepare: false,
  })
  globalForDb.__pandaRealtyPostgres = client
  return client
}

export const db = drizzle(getPostgresClient(), { schema })
