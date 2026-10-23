# Panda Realty — Workbench

Private working copy of the Panda Realty app, owned by Panda Realty (applications@mypandarealty.com.au).

- Code base: June 2026 source backup, plus workbench fixes.
- Database design: matches the live system as of 23 Oct 2026 (114 tables), see
  `apps/panda-realty/db/live-snapshot/`.
- Test data only. Never point this deployment at the live Supabase project.

## Deploy (Vercel)
- Root Directory: `apps/panda-realty`
- Install: pnpm (workspace root `pnpm-workspace.yaml`)
- Env vars: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Local
`PANDA_LOCAL_AUTH_BYPASS=1` in `.env.local` skips sign-in (development only).
