# ACC — APUPPT Control Center
# Dokumentasi Teknis

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Production

---

## Daftar Isi

1. [Gambaran Sistem](#1-gambaran-sistem)
2. [Arsitektur](#2-arsitektur)
3. [Stack Teknologi](#3-stack-teknologi)
4. [Struktur Monorepo](#4-struktur-monorepo)
5. [Skema Database](#5-skema-database)
6. [Autentikasi & Otorisasi](#6-autentikasi--otorisasi)
7. [API Endpoints](#7-api-endpoints)
8. [Logika Bisnis Utama](#8-logika-bisnis-utama)
9. [Frontend — Halaman & Komponen](#9-frontend--halaman--komponen)
10. [Sistem Notifikasi Push (PWA)](#10-sistem-notifikasi-push-pwa)
11. [KPI & Analytics](#11-kpi--analytics)
12. [Export & Laporan](#12-export--laporan)
13. [Environment Variables & Secrets](#13-environment-variables--secrets)
14. [Perintah Pengembangan](#14-perintah-pengembangan)
15. [Deployment](#15-deployment)

---

## 1. Gambaran Sistem

ACC (APUPPT Control Center) adalah sistem manajemen kepatuhan internal untuk memantau aktivitas 5 Perusahaan Terdaftar (PT) dalam industri perdagangan berjangka komoditi.

**5 PT yang dimonitor:**
| Kode | Nama Lengkap |
|------|-------------|
| SGB | Solid Gold Berjangka |
| RFB | Rifan Financindo Berjangka |
| BPF | Best Profit Futures |
| KPF | Kontak Perkasa Futures |
| EWF | Equity World Futures |

**Alur kerja utama:**
```
APUPPT mengisi aktivitas harian
    ↓
DK (Direktur Kepatuhan) mereview & menilai
    ↓
DU (Direktur Utama) melakukan sign-off periode
    ↓
Owner / Superadmin memantau KPI & laporan
```

---

## 2. Arsitektur

```
┌─────────────────────────────────────────────────────┐
│  Browser (PWA)                                       │
│  React + Vite (acc-dashboard)                        │
│  Port: dynamic (via PORT env)                        │
└─────────────┬───────────────────────────────────────┘
              │ HTTP (proxied via Replit)
              ▼
┌─────────────────────────────────────────────────────┐
│  Express 5 API Server (api-server)                   │
│  Port: 8080                                          │
│  - Session-based auth (express-session)              │
│  - Drizzle ORM                                       │
│  - Multer (avatar upload)                            │
│  - web-push (VAPID notifications)                    │
│  - SheetJS xlsx (Excel export)                       │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  PostgreSQL Database                                 │
│  (Replit managed, via DATABASE_URL)                  │
└─────────────────────────────────────────────────────┘
```

**Shared libraries (pnpm workspace):**
- `lib/db` — Drizzle ORM schema + client
- `lib/api-client-react` — React hooks dari OpenAPI (codegen via Orval)
- `lib/api-spec` — OpenAPI spec (YAML) + konfigurasi Orval
- `lib/api-zod` — Zod schemas dari OpenAPI spec

---

## 3. Stack Teknologi

| Layer | Teknologi | Versi |
|-------|----------|-------|
| Runtime | Node.js | 24 |
| Package manager | pnpm workspaces | latest |
| TypeScript | TypeScript | 5.9 |
| Frontend framework | React | 19 |
| Frontend build | Vite | 7 |
| Frontend router | wouter | 3 |
| HTTP client | fetch (custom apiFetch) | built-in |
| State/query | @tanstack/react-query | 5 |
| Styling | Tailwind CSS | 4 |
| Icons | lucide-react | latest |
| Charts | Recharts | latest |
| Backend framework | Express | 5 |
| ORM | Drizzle ORM | latest |
| DB driver | node-postgres (pg) | latest |
| Auth | express-session + bcryptjs | latest |
| File upload | multer | latest |
| Push notification | web-push (VAPID) | latest |
| Excel export | xlsx (SheetJS) | latest |
| API codegen | Orval | 8 |
| Validation | Zod | v3 (api-server), v4 (lib/db) |

---

## 4. Struktur Monorepo

```
/
├── artifacts/
│   ├── acc-dashboard/          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── pages/          # Halaman utama
│   │   │   ├── components/     # Komponen reusable
│   │   │   ├── contexts/       # React contexts (AuthContext)
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── lib/            # Utilities (apiFetch)
│   │   └── public/
│   │       └── sw.js           # Service Worker (PWA + Push)
│   └── api-server/             # Express backend
│       └── src/
│           ├── routes/         # Route handlers
│           ├── middlewares/    # Auth middleware
│           └── lib/            # Business logic utilities
├── lib/
│   ├── db/                     # Drizzle schema + client
│   │   └── src/schema/         # Tabel definitions
│   ├── api-client-react/       # Generated React hooks
│   ├── api-spec/               # OpenAPI YAML + Orval config
│   └── api-zod/                # Generated Zod schemas
├── docs/                       # Dokumentasi
├── scripts/                    # Seed + post-merge scripts
└── replit.md                   # Project overview (untuk AI)
```

---

## 5. Skema Database

### `pts` — Perusahaan Terdaftar
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | ID unik PT |
| code | varchar(10) | Kode PT (SGB, RFB, dll) |
| name | varchar(255) | Nama lengkap PT |
| createdAt | timestamp | Waktu dibuat |

### `users` — Pengguna Sistem
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | ID unik user |
| name | varchar(255) | Nama lengkap |
| username | varchar(255) UNIQUE | Username login |
| email | varchar(255) UNIQUE | Email |
| passwordHash | varchar(255) | Hash bcrypt |
| role | enum | apuppt / dk / du / owner / superadmin |
| ptId | uuid FK | Link ke PT (null jika global role) |
| avatarUrl | varchar(500) | Path avatar (nullable) |
| isActive | boolean | Status aktif (default: true) |
| createdAt / updatedAt | timestamp | Audit waktu |

### `daily_activities` — Aktivitas Harian APUPPT
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | |
| ptId | uuid FK | Referensi PT |
| userId | uuid FK | APUPPT yang mengisi |
| date | date | Tanggal aktivitas |
| activityType | enum | kyc / cdd / screening / monitoring_transaksi / sosialisasi / lainnya |
| itemsReviewed | integer | Jumlah nasabah diperiksa |
| hasFinding | boolean | Ada temuan? |
| notes | text | Catatan |
| customerRiskCategories | jsonb | Kategori risiko nasabah |
| dkReviewedAt | timestamp | Waktu DK review |
| dkNotes | text | Catatan DK |
| duSignedOffAt | timestamp | Waktu DU sign-off |
| createdAt / updatedAt | timestamp | |

**Constraint:** UNIQUE `(ptId, date, activityType)` — satu tipe aktivitas per PT per hari.

### `findings` — Temuan / Tiket
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | |
| ptId | uuid FK | Referensi PT |
| reportedBy | uuid FK | User yang melaporkan |
| findingText | text | Deskripsi temuan |
| status | enum | pending / in_progress / awaiting_verification / completed / follow_up |
| deadline | date | Batas waktu penyelesaian |
| assignedTo | uuid FK | User yang ditugaskan |
| notes | text | Catatan tambahan |
| escalationLevel | integer | Level eskalasi (0/1/2) |
| escalatedAt | timestamp | Waktu eskalasi |
| dkAcknowledgedAt | timestamp | Waktu DK acknowledge |
| dkNotes | text | Catatan acknowledge DK |
| createdAt / updatedAt / closedAt | timestamp | |

### `ticket_comments` — Komentar Tiket
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | |
| findingId | uuid FK | Referensi temuan |
| userId | uuid FK | Penulis (null = sistem) |
| content | text | Isi komentar |
| isSystemComment | boolean | true jika otomatis dari sistem |
| createdAt | timestamp | |

### `activity_reviews` — Review DK
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | |
| activityId | uuid FK | Referensi aktivitas |
| reviewedBy | uuid FK | DK yang mereview |
| status | enum | reviewed / needs_revision |
| notes | text | Catatan review |
| reviewedAt | timestamp | |

### `report_signoffs` — Sign-Off DU
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | |
| ptId | uuid FK | Referensi PT |
| signedBy | uuid FK | DU yang sign-off |
| periodType | enum | weekly / monthly |
| periodStart | date | Awal periode |
| periodEnd | date | Akhir periode |
| notes | text | Catatan |
| signedAt | timestamp | |

### `audit_logs` — Audit Trail
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | |
| action | varchar | Nama aksi (create_user, update_finding, dll) |
| entityType | varchar | Tipe entitas (user, finding, activity) |
| entityId | varchar | ID entitas yang diubah |
| performedBy | uuid FK | User yang melakukan |
| beforeData | jsonb | Data sebelum perubahan |
| afterData | jsonb | Data setelah perubahan |
| ipAddress | varchar | IP client |
| createdAt | timestamp | |

### `push_subscriptions` — Langganan Push Notification
| Kolom | Tipe | Keterangan |
|-------|------|-----------|
| id | uuid PK | |
| userId | uuid FK | Referensi user |
| endpoint | text | Push endpoint browser |
| p256dh | text | Public key enkripsi |
| auth | text | Auth secret |
| createdAt | timestamp | |

---

## 6. Autentikasi & Otorisasi

### Mekanisme
- **Session-based**: menggunakan `express-session` dengan cookie HttpOnly
- **Password**: di-hash dengan bcrypt (cost factor 10)
- **"Ingat Saya"**: session maxAge 30 hari jika dipilih, session biasa jika tidak

### Role & Akses
| Role | Scope | Akses |
|------|-------|-------|
| `apuppt` | Per-PT | Isi aktivitas, lihat temuan PT sendiri |
| `dk` | Per-PT | Review aktivitas, kelola temuan, lihat KPI, DK Quick Panel |
| `du` | Per-PT | Sign-off laporan, lihat KPI |
| `owner` | Global | View-only dashboard, KPI, laporan semua PT |
| `superadmin` | Global | Full access + User Management + Audit Log |

### Middleware
```
requireAuth     → cek session.user ada, isActive = true
requireRole()   → cek role user ada di allowed list
```

### isActive Check
User dengan `isActive = false`:
- Tidak bisa login (ditolak di endpoint login)
- Session yang sudah aktif diblokir oleh `requireAuth` middleware (return 403)

---

## 7. API Endpoints

Base URL: `/api`

### Auth
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| POST | `/auth/login` | Public | Login dengan username + password |
| POST | `/auth/logout` | Any | Logout & hapus session |
| GET | `/auth/me` | Any auth | Data user saat ini |
| PUT | `/auth/profile` | Any auth | Update nama user |
| POST | `/auth/profile/avatar` | Any auth | Upload avatar (max 2MB) |
| POST | `/auth/change-password` | Any auth | Ganti password |
| POST | `/auth/reset-password` | superadmin | Reset password user lain |

### PT (Perusahaan Terdaftar)
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/pts` | Any auth | List semua PT (atau PT sendiri jika APUPPT) |
| GET | `/pts/:id` | Any auth | Detail PT + status traffic light |
| GET | `/pts/:id/status` | Any auth | Status traffic light PT |
| GET | `/pts/:id/history` | Any auth | Riwayat traffic light 7 hari |

### Dashboard
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/dashboard/summary` | Any auth | Ringkasan semua PT (status + consecutiveRedDays) |
| GET | `/dashboard/kpi` | Any auth | KPI ringkasan bulan ini |

### Aktivitas
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/activities` | dk, superadmin, apuppt | List aktivitas (filter: ptId, date, reviewStatus) |
| POST | `/activities` | apuppt | Buat aktivitas harian |
| PUT | `/activities/:id` | apuppt | Update aktivitas |
| GET | `/activities/:id/review` | dk, superadmin, apuppt | Detail review DK |
| POST | `/activities/:id/review` | dk, superadmin | DK review aktivitas |
| POST | `/activities/:id/signoff` | du | DU sign-off aktivitas |

### Temuan (Findings)
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/findings` | All auth | List temuan (filter: ptId, status) |
| GET | `/findings/:id` | All auth | Detail temuan |
| POST | `/findings` | apuppt, dk | Buat temuan baru |
| PUT | `/findings/:id` | apuppt, dk, superadmin | Update temuan |
| PATCH | `/findings/:id/complete` | dk, superadmin | Tandai selesai |
| POST | `/findings/:id/acknowledge` | dk | DK acknowledge temuan |
| GET | `/findings/:id/comments` | All auth | List komentar tiket |
| POST | `/findings/:id/comments` | All auth | Tambah komentar |

### Laporan
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/reports/summary` | dk, du, owner, superadmin | Ringkasan per PT (filter period) |
| GET | `/reports/export` | dk, du, owner, superadmin | Download Excel (.xlsx) |
| GET | `/reports/signoff` | dk, du, owner, superadmin | List sign-off |
| POST | `/reports/signoff` | du, superadmin | Buat sign-off periode |
| GET | `/reports/trend` | dk, du, owner, superadmin | Data tren per bulan (max 12 bulan) |
| GET | `/reports/monthly-recap` | dk, du, owner, superadmin | Rekap bulanan + delta vs bulan lalu |

### KPI
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/kpi/apuppt` | dk, du, owner, superadmin, apuppt | Scorecard APUPPT (ranking, kpi_score) |
| GET | `/kpi/dk` | dk, du, owner, superadmin | Engagement metrics DK |
| GET | `/kpi/du` | dk, du, owner, superadmin | Sign-off rate DU |
| GET | `/branches/analytics` | dk, du, owner, superadmin | Analitik per cabang PT |

### User Management
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/users` | dk, superadmin | List semua user + PT info |
| POST | `/users` | superadmin | Buat user baru |
| PUT | `/users/:id` | superadmin | Update user (nama/role/email/ptId) |
| PATCH | `/users/:id/deactivate` | superadmin | Nonaktifkan user |
| PATCH | `/users/:id/activate` | superadmin | Aktifkan kembali user |

### Notifikasi
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/notifications/vapid-public-key` | Any auth | VAPID public key |
| POST | `/notifications/subscribe` | Any auth | Daftarkan push subscription |
| DELETE | `/notifications/subscribe` | Any auth | Hapus push subscription |
| GET | `/notifications/status` | Any auth | Cek status subscription |

### Audit Log
| Method | Path | Role | Deskripsi |
|--------|------|------|-----------|
| GET | `/audit-logs` | superadmin | List audit trail |

---

## 8. Logika Bisnis Utama

### Traffic Light Per PT

File: `artifacts/api-server/src/lib/traffic-light.ts`

```
RED:    lastActivityDate !== hari_ini
        ATAU ada finding overdue (createdAt > 3 hari + status bukan completed)

YELLOW: lastActivityDate === hari_ini
        DAN ada open findings (belum completed, tapi belum overdue)

GREEN:  lastActivityDate === hari_ini
        DAN tidak ada open findings
```

### Consecutive RED Days

Dihitung di `GET /api/dashboard/summary`:
- Jika PT merah hari ini → hitung mundur hingga 6 hari sebelumnya
- Tiap hari lalu dicek dengan `computeTrafficLight` menggunakan data historis
- Menggunakan `closedAt` timestamp untuk akurasi: finding dianggap terbuka jika `closedAt IS NULL OR closedAt > akhir_hari_itu`

### KPI Score APUPPT

Formula di `GET /api/kpi/apuppt`:
```
kpiScore = (updateRate × 40) + (resolveRate × 35) + (speedBonus × 25)

updateRate  = hari_aktif_update / total_hari_kerja × 100
resolveRate = findings_selesai / total_findings × 100
speedBonus  = max(0, 100 - avgResolutionDays × 10)
```

Nilai 0–100. Warna badge: ≥80 hijau, 60–79 kuning, <60 merah.

### Eskalasi Otomatis

Cron job (`artifacts/api-server/src/lib/escalation.ts`) berjalan setiap 5 menit:
- Level 0 → 1: finding overdue > 3 hari tanpa respons
- Level 1 → 2: sudah dinotifikasi tapi belum ada aksi 24 jam

### Activity Type Rules

- `sosialisasi`: TIDAK memerlukan data nasabah (itemsReviewed bisa 0)
- Semua tipe lain: WAJIB `itemsReviewed > 0` DAN `customerRiskCategories` terisi

---

## 9. Frontend — Halaman & Komponen

### Halaman (Pages)

| Route | File | Role | Deskripsi |
|-------|------|------|-----------|
| `/login` | Login.tsx | Public | Halaman login |
| `/dashboard` | Dashboard.tsx | All | Dashboard status PT |
| `/pt/:id` | PTDetail.tsx | All | Detail PT + 7-day history + Rekap Cabang |
| `/activity` | Activity.tsx | apuppt | Form isi aktivitas harian |
| `/activities` | Activities.tsx | dk, superadmin | List aktivitas semua PT |
| `/findings` | Findings.tsx | All | List temuan |
| `/findings/:id` | FindingDetail.tsx | All | Detail tiket temuan |
| `/review` | DKReview.tsx | dk, superadmin | Review aktivitas + DK Quick Panel |
| `/signoff` | DUSignOff.tsx | du, superadmin | Sign-off laporan |
| `/kpi` | KPI.tsx | dk, du, owner, superadmin | KPI scorecard + trend chart |
| `/reports` | Reports.tsx | dk, du, owner, superadmin | Laporan + Export |
| `/monthly-recap` | MonthlyRecap.tsx | dk, du, owner, superadmin | Rekap bulanan |
| `/audit-log` | AuditLog.tsx | superadmin | Audit trail |
| `/users` | UserManagement.tsx | superadmin | Kelola user |
| `/profile` | Profile.tsx | All | Profil & avatar |
| `/notification-settings` | NotificationSettings.tsx | All | Pengaturan notifikasi |
| `/change-password` | ChangePassword.tsx | All | Ganti password |
| `/forgot-password` | ForgotPassword.tsx | Public | Lupa password |

### Komponen Kunci

| Komponen | Deskripsi |
|---------|-----------|
| `Navbar.tsx` | Navbar desktop: menu navigasi + dropdown user + avatar |
| `BottomNav.tsx` | Bottom navigation bar mobile (PWA) |
| `NotificationBanner.tsx` | Banner ajakan aktifkan push notification |
| `InstallBanner.tsx` | Banner ajakan install PWA |
| `ProtectedRoute.tsx` | Wrapper route yang cek auth + role |

### AuthContext

File: `artifacts/acc-dashboard/src/contexts/AuthContext.tsx`

```typescript
interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;       // "apuppt" | "dk" | "du" | "owner" | "superadmin"
  ptId: string | null;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
}
```

---

## 10. Sistem Notifikasi Push (PWA)

### Setup VAPID
Environment variables yang diperlukan:
```
VAPID_PUBLIC_KEY=<base64url public key>
VAPID_PRIVATE_KEY=<base64url private key>
VAPID_EMAIL=mailto:admin@acc.local
```

### Service Worker
File: `artifacts/acc-dashboard/public/sw.js`
- Handle event `push`: tampilkan notifikasi ke user
- Handle event `notificationclick`: buka URL yang relevan

### Trigger Notifikasi
| Event | Siapa yang dinotifikasi |
|-------|------------------------|
| POST /api/findings | DK + Owner + Superadmin |
| POST /api/findings/:id/comments | Semua peserta PT (APUPPT + DK + DU) |
| POST /api/activities | DK + Owner + Superadmin |
| Daily cron 17:00 WIB | DK (PT merah), Owner + Superadmin (ringkasan) |

### Cron Harian
File: `artifacts/api-server/src/lib/daily-notif-cron.ts`
- Jadwal: 17:00 WIB (10:00 UTC)
- Untuk tiap PT yang merah: notifikasi ke DK PT tersebut
- Ringkasan harian ke Owner dan Superadmin

---

## 11. KPI & Analytics

### Endpoint Trend
`GET /api/reports/trend?ptId=&months=3`

Mengembalikan data per bulan untuk setiap PT:
```json
{
  "pts": [
    {
      "ptId": "...",
      "ptCode": "SGB",
      "ptName": "Solid Gold Berjangka",
      "months": [
        {
          "month": "2026-02",
          "updateRate": 85.7,
          "totalActivities": 18,
          "totalItemsReviewed": 450,
          "openFindings": 1,
          "completedFindings": 3,
          "kpiScore": 78.5
        }
      ]
    }
  ]
}
```

### Endpoint Rekap Bulanan
`GET /api/reports/monthly-recap?year=2026&month=4`

Mengembalikan per PT: data bulan ini + delta vs bulan lalu:
```json
{
  "year": 2026,
  "month": 4,
  "pts": [
    {
      "ptId": "...",
      "ptCode": "SGB",
      "totalActiveDays": 18,
      "totalItemsReviewed": 450,
      "openFindings": 2,
      "completedFindings": 5,
      "dkReviewPct": 94.4,
      "updateRate": 85.7,
      "kpiScore": 78.5,
      "duSignoff": { "signedOffAt": "...", "signerName": "..." },
      "delta": {
        "totalActiveDays": +3,
        "openFindings": -1,
        "kpiScore": +5.2
      }
    }
  ]
}
```

---

## 12. Export & Laporan

### Export Excel
`GET /api/reports/export?startDate=&endDate=&ptId=&periodType=`

- Library: SheetJS (`xlsx`)
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="laporan-acc-[periode].xlsx"`
- Kolom: Kode PT, Nama PT, Total Aktivitas, Nasabah Diperiksa, Temuan Terbuka, Temuan Selesai, % Review DK, Status Sign-Off DU, Status Traffic Light

### Cetak PDF
- Memanggil `window.print()` browser
- Print stylesheet tersedia di Reports.tsx (inline `<style media="print">`)
- Header: logo ACC + judul periode + tanggal cetak
- Footer: "Sistem ACC — Laporan Compliance"

### Export CSV Rekap Bulanan
- Client-side: data dari API dikonversi ke CSV string dan di-download via Blob
- Nama file: `rekap-bulanan-YYYY-MM.csv`

---

## 13. Environment Variables & Secrets

| Variabel | Keterangan | Wajib |
|---------|-----------|-------|
| `DATABASE_URL` | PostgreSQL connection string | Ya |
| `SESSION_SECRET` | Secret untuk express-session | Ya |
| `VAPID_PUBLIC_KEY` | VAPID public key (base64url) | Ya (notif) |
| `VAPID_PRIVATE_KEY` | VAPID private key (base64url) | Ya (notif) |
| `VAPID_EMAIL` | Email untuk VAPID | Ya (notif) |
| `PORT` | Port frontend Vite (auto dari Replit) | Auto |
| `VITE_API_URL` | Base URL API dari frontend | Auto (proxy) |

---

## 14. Perintah Pengembangan

```bash
# Install semua dependencies
pnpm install

# Jalankan semua development servers
pnpm run dev

# TypeScript check — backend
cd artifacts/api-server && npx tsc --noEmit

# TypeScript check — frontend
cd artifacts/acc-dashboard && npx tsc --noEmit

# Rebuild lib/db setelah schema change
cd lib/db && npx tsc --build

# Push schema ke database (development)
pnpm --filter @workspace/db run push

# Regenerate API client dari OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Rebuild api-client-react setelah codegen
cd lib/api-client-react && npx tsc --build

# Seed database dengan data awal
pnpm --filter @workspace/scripts run seed
```

### Alur ketika mengubah schema database:
1. Edit file di `lib/db/src/schema/`
2. `pnpm --filter @workspace/db run push` — push ke DB
3. `cd lib/db && npx tsc --build` — rebuild types
4. Restart API server

### Alur ketika mengubah OpenAPI spec:
1. Edit `lib/api-spec/openapi.yaml`
2. `pnpm --filter @workspace/api-spec run codegen` — generate ulang hooks + zod
3. `cd lib/api-client-react && npx tsc --build` — rebuild declarations

---

## 15. Deployment

Aplikasi di-deploy melalui Replit Deployments. Saat deploy:
- API server berjalan di port 8080
- Frontend Vite di-serve sebagai static files
- Environment variables dibaca dari Replit Secrets
- Database PostgreSQL: Replit managed (production instance terpisah)

Untuk deploy ulang setelah perubahan:
1. Pastikan TypeScript 0 error (frontend + backend)
2. Klik "Publish" / "Deploy" di Replit UI

**URL Production:** `https://[app-slug].replit.app`
