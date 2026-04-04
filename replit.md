# ACC — APUPPT Control Center

## Overview

Internal tool for monitoring 5 PTs (SGB, RFB, BPF, KPF, EWF) with 4 roles: APUPPT, DK, DU, Owner.

pnpm workspace monorepo using TypeScript.

## Architecture

- **Frontend**: React + Vite (`artifacts/acc-dashboard`) — port assigned via `PORT` env
- **Backend**: Express 5 + PostgreSQL + Drizzle ORM (`artifacts/api-server`) — port 8080
- **API client**: Generated from OpenAPI spec via Orval (`lib/api-client-react`)
- **Database schema**: `lib/db/src/schema/index.ts`
- **OpenAPI spec**: `lib/api-spec/openapi.yaml`
- **Zod schemas**: `lib/api-zod/`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod v3, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend router**: wouter
- **HTTP client**: Custom fetch with `credentials: "include"` for session cookies
- **Auth**: express-session + bcryptjs (session-based, no JWT)

## Roles and Access

| Role   | Dashboard   | Aktivitas      | Temuan                   | Review (DK)   | Sign-Off (DU)  | Laporan    |
|--------|-------------|----------------|--------------------------|---------------|----------------|------------|
| APUPPT | Own PT only | Input/edit own | View/create own PT       | No access     | No access      | No access  |
| DK     | All PTs     | No access      | View/acknowledge all     | Review & approve activities | No access | View all |
| DU     | All PTs     | No access      | No access                | No access     | Sign-off DK-reviewed | View all |
| Owner  | All PTs     | No access      | View all (read-only)     | No access     | No access      | View all   |

## Traffic Light Logic

- **Green**: Updated today + no open findings older than 3 days
- **Yellow**: Updated today + has open findings (≤ 3 days old)
- **Red**: NOT updated today OR any finding overdue > 3 days

## Database Tables

- `pts` — 5 PTs (SGB, RFB, BPF, KPF, EWF)
- `users` — 8 seed accounts
- `daily_activities` — unique `(pt_id, date)` constraint
- `findings` — status: pending / follow_up / completed

## Seed Accounts (all password: `password123`)

- `apuppt.sgb@acc.local` — APUPPT for SGB
- `apuppt.rfb@acc.local` — APUPPT for RFB
- `apuppt.bpf@acc.local` — APUPPT for BPF
- `apuppt.kpf@acc.local` — APUPPT for KPF
- `apuppt.ewf@acc.local` — APUPPT for EWF
- `dk@acc.local` — DK (Dewan Komisaris)
- `du@acc.local` — DU (Direksi Utama)
- `owner@acc.local` — Owner

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- After rebuilding `api-client-react`: `cd lib/api-client-react && npx tsc --build` to update declaration files

## API Routes (all under `/api`)

- `POST /api/auth/login` — login with { email, password }
- `POST /api/auth/logout` — logout
- `GET /api/auth/me` — get current session user
- `GET /api/pts` — list all PTs
- `GET /api/pts/:id` — get PT detail
- `GET /api/pts/:id/status` — get traffic light status
- `GET /api/dashboard/summary` — dashboard summary with PT statuses
- `GET /api/activities` — list activities (filtered by ptId/date/reviewStatus)
- `POST /api/activities` — create activity
- `PUT /api/activities/:id` — update activity
- `POST /api/activities/:id/review` — DK reviews/approves activity (adds dkReviewedAt, dkNotes)
- `POST /api/activities/:id/signoff` — DU signs off activity (adds duSignedOffAt)
- `GET /api/findings` — list findings
- `POST /api/findings` — create finding
- `PUT /api/findings/:id` — update finding
- `POST /api/findings/:id/complete` — complete finding
- `POST /api/findings/:id/acknowledge` — DK acknowledges finding (adds dkAcknowledgedAt, dkNotes)
- `GET /api/reports/summary` — reports summary per PT

## Review Status Filter (GET /api/activities?reviewStatus=)
- `pending_review` — dkReviewedAt IS NULL
- `reviewed` — dkReviewedAt IS NOT NULL AND duSignedOffAt IS NULL
- `signed_off` — duSignedOffAt IS NOT NULL

## Vite Proxy

Frontend Vite dev server proxies `/api` requests to `http://localhost:8080` (API server).
