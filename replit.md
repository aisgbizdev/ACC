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

| Role       | Dashboard   | Aktivitas     | Temuan                    | Review (DK)   | Sign-Off (DU)  | Laporan       | Audit Log |
|-----------|-------------|---------------|---------------------------|---------------|----------------|---------------|-----------|
| APUPPT    | Own PT only | Input/edit    | View/create/edit own PT   | No access     | No access      | No access     | No        |
| DK        | All PTs     | View + Review | View/create/edit all      | Review & approve activities | No access | View all      | No        |
| DU        | All PTs     | No access     | No access                 | No access     | Sign-off DK-reviewed | View + Signoff | No       |
| Owner     | All PTs     | No access     | View all (read-only)      | No access     | No access      | View all      | No        |
| Superadmin| All PTs     | View + Review | Full access               | No access     | No access      | Full access   | Yes       |

## Phase 7 Features (Task #8 — KPI & Rekap Cabang)

- **KPI APUPPT**: Scorecard per APUPPT — update_rate, nasabah_diperiksa, temuan breakdown, avg_resolution_days, kpi_score (0-100). Ranking table di `/kpi`
- **KPI DK**: review_rate, avg_review_time_hours, ticket_comments, 24h_response_rate
- **KPI DU**: sign_off_rate, total_signed_off, total_eligible
- **Rekap Cabang**: Tab baru di PTDetail — tabel per cabang dengan update_rate, nasabah, temuan terbuka, traffic_light
- **Period filter**: Mingguan / Bulanan / Kustom (date range)
- **Export CSV**: Per section di halaman KPI

## Phase 6 Features (Task #7 — Push Notification)

- **VAPID Push Notifications**: Notif otomatis ke browser (PWA) berdasarkan role
  - APUPPT → notifikasi komentar baru di temuan mereka
  - DK → notifikasi aktivitas baru, temuan baru, perlu review
  - DU → notifikasi ketika ada laporan yang perlu sign-off
  - Owner/Superadmin → ringkasan harian, notifikasi PT merah
- **Daily Cron**: 17:00 WIB — cek PT merah, kirim ringkasan ke Owner/Superadmin
- **push_subscriptions** table: simpan endpoint per user (multi-device)
- **NotificationBanner**: banner ajakan aktifkan notif untuk user baru
- **NotificationSettings** page (`/notification-settings`): toggle notif, daftar tipe notif per role
- **Env secrets required**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`

## User Profile Feature

- **Profile page** (`/profile`): upload avatar, edit nama inline, ganti password
- **avatarUrl** column di tabel `users`
- Avatar tampil di Navbar (dropdown) dan BottomNav (mobile)
- Upload avatar via `POST /api/auth/profile/avatar` (multer, simpan di `/uploads/avatars/`)
- Edit nama via `PUT /api/auth/profile`

## Phase 4 Features (Task #5)

- **DK Review**: DK can review/acknowledge each APUPPT activity report. Badge shows "Sudah Ditinjau" after review
- **DU Sign-Off**: DU can sign-off laporan per period (weekly/monthly). Locked after sign-off
- **Ticketing System**: Findings now have full ticket workflow: Pending → In Progress → Menunggu Verifikasi → Selesai
  - Deadline, assignedTo, comment thread, escalation (level 0 → 1 → 2)
  - Automatic system log entries on status/assignment changes
- **Audit Trail**: Full audit log in `audit_logs` table. Superadmin can view at `/audit-log`
- **Reports with Period**: Harian/Mingguan/Bulanan tabs with date picker. Group insights
- **PT Detail 7-Day History**: Colored badge strip showing 7-day traffic light history

## Traffic Light Logic

- **Green**: Updated today + no open findings older than 3 days
- **Yellow**: Updated today + has open findings (≤ 3 days old)
- **Red**: NOT updated today OR any finding overdue > 3 days

## Database Tables

- `pts` — 5 PTs (SGB=Solid Gold Berjangka, RFB=Rifan Financindo Berjangka, BPF=Best Profit Futures, KPF=Kontak Perkasa Futures, EWF=Equity World Futures)
- `users` — seed accounts per PT + dk, du, owner, superadmin. Col: `avatarUrl`
- `daily_activities` — unique `(pt_id, date)` constraint
- `findings` — status: pending / in_progress / awaiting_verification / completed / follow_up. Cols: deadline, assigned_to, escalated_at, escalation_level
- `activity_reviews` — DK review records for APUPPT activity reports
- `report_signoffs` — DU sign-off records per period (weekly/monthly)
- `ticket_comments` — comment thread per finding (system + manual entries)
- `audit_logs` — full audit trail for all actions
- `push_subscriptions` — Web Push subscriptions per user (multi-device support)

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
- `GET /api/findings/:id` — get finding detail
- `POST /api/findings` — create finding
- `PUT /api/findings/:id` — update finding (findingText, status, deadline, assignedTo, notes)
- `PATCH /api/findings/:id/complete` — complete finding (backward compat)
- `POST /api/findings/:id/acknowledge` — DK acknowledges finding (adds dkAcknowledgedAt, dkNotes)
- `GET /api/findings/:id/comments` — get ticket comments
- `POST /api/findings/:id/comments` — add comment to ticket
- `GET /api/reports/summary` — reports summary per PT (supports startDate/endDate/periodType)
- `GET /api/reports/signoff` — list DU sign-offs
- `POST /api/reports/signoff` — DU sign-off a period
- `GET /api/activities/:id/review` — get DK review for activity
- `POST /api/activities/:id/review` — DK review an activity
- `GET /api/pts/:id/history` — get 7-day traffic light history
- `GET /api/audit-logs` — list audit logs (superadmin only)
- `PUT /api/auth/profile` — update user name
- `POST /api/auth/profile/avatar` — upload avatar (multer, saves to /uploads/avatars/)
- `GET /api/kpi/apuppt` — APUPPT scorecard per user (ranking, kpi_score)
- `GET /api/kpi/dk` — DK engagement metrics
- `GET /api/kpi/du` — DU sign-off rate
- `GET /api/branches/analytics` — per-branch analytics for a PT (requires ptId)
- `GET /api/notifications/vapid-public-key` — VAPID public key for push sub
- `POST /api/notifications/subscribe` — save push subscription
- `DELETE /api/notifications/subscribe` — remove push subscription
- `GET /api/notifications/status` — check if user has active subscriptions

## Review Status Filter (GET /api/activities?reviewStatus=)
- `pending_review` — dkReviewedAt IS NULL
- `reviewed` — dkReviewedAt IS NOT NULL AND duSignedOffAt IS NULL
- `signed_off` — duSignedOffAt IS NOT NULL

## Vite Proxy

Frontend Vite dev server proxies `/api` requests to `http://localhost:8080` (API server).
