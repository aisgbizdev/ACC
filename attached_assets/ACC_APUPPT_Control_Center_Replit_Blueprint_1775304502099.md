# ACC – APUPPT Control Center
## Prompt Blueprint Replit Agent – Solid Group

Anda adalah AI Developer yang bertugas membangun aplikasi web **ACC (APUPPT Control Center)** untuk Solid Group.

Fokus aplikasi ini **bukan** sistem AML kompleks, **bukan** engine analitik berat, dan **bukan** workflow compliance berlapis.  
Aplikasi ini harus menjadi **dashboard monitoring harian yang ringan, cepat, mudah dipakai, dan tidak membebani user**.

---

## 1. Tujuan Aplikasi

Bangun aplikasi web internal untuk memonitor aktivitas harian APUPPT di 5 PT dalam Solid Group:

- SGB
- RFB
- BPF
- KPF
- EWF

Setiap PT memiliki **1 orang staff APUPPT**.

Aplikasi ini harus memungkinkan:

1. Staff APUPPT mengisi **1 log aktivitas per hari**
2. Mencatat temuan / follow up compliance secara singkat
3. Menampilkan dashboard ringkas untuk:
   - Direktur Kepatuhan (DK)
   - Direktur Utama (DU)
   - Owner / Group Management
4. Menampilkan status warna per PT:
   - Hijau
   - Kuning
   - Merah
5. Membuat laporan harian, mingguan, dan bulanan secara otomatis

---

## 2. Prinsip Utama Sistem

Aplikasi harus mengikuti prinsip berikut:

- sangat sederhana
- sangat cepat dipakai
- minim input manual
- mobile friendly
- formal, rapi, profesional
- tidak terasa seperti alat audit berat
- tidak terasa seperti alat menghukum user
- sekali input harus menghasilkan banyak output

Filosofi aplikasi:

**“Sedikit input, banyak manfaat.”**

---

## 3. Nama Aplikasi

Nama sistem:

**ACC – APUPPT Control Center**

Subjudul yang bisa tampil di login atau header:

**Solid Group Compliance Monitoring System**

---

## 4. User Role

Buat role user berikut:

### A. APUPPT Staff
Scope:
- hanya untuk PT masing-masing
- input aktivitas harian
- lihat temuan PT sendiri
- lihat laporan PT sendiri

### B. Direktur Kepatuhan (DK)
Scope:
- melihat seluruh PT
- melihat seluruh aktivitas
- melihat seluruh temuan
- melihat semua laporan
- melihat dashboard grup

### C. Direktur Utama (DU)
Scope:
- melihat dashboard ringkasan grup
- melihat laporan per PT
- melihat status PT

### D. Owner / Group Management
Scope:
- melihat dashboard seluruh grup
- melihat ringkasan semua PT
- melihat laporan mingguan dan bulanan

---

## 5. Menu Utama Aplikasi

Buat menu utama sesederhana mungkin, hanya:

1. Dashboard
2. Aktivitas Harian
3. Temuan / Follow Up
4. Laporan

Tidak perlu menu kompleks lain pada versi awal.

---

## 6. Dashboard – Desain dan Isi

Dashboard adalah halaman utama setelah login.

### A. Bagian Atas: 5 Kartu PT
Tampilkan 5 kartu PT:

- SGB
- RFB
- BPF
- KPF
- EWF

Setiap kartu menampilkan:

- nama PT
- status warna
- status update hari ini
- jumlah temuan
- jumlah pending

Contoh isi kartu:

- SGB – Hijau – Sudah Update – Temuan 1 – Pending 0
- RFB – Kuning – Sudah Update – Temuan 2 – Pending 1
- KPF – Merah – Belum Update – Temuan 3 – Pending 2

### B. Bagian Tengah: Ringkasan Harian
Tampilkan 4 summary cards:

- Total PT sudah update
- Total temuan hari ini
- Total pending terbuka
- Total temuan selesai

### C. Bagian Bawah: Tabel Ringkas
Buat tabel sederhana:

| PT | Aktivitas Hari Ini | Temuan | Pending | Status |
|----|-------------------|--------|---------|--------|

Karena per PT hanya 1 orang APUPPT, maka “Aktivitas Hari Ini” cukup menampilkan 1 log utama.

---

## 7. Compliance Traffic Light

Gunakan sistem warna sederhana untuk status PT:

### Hijau
- aktivitas hari ini sudah diinput
- tidak ada pending lama
- tidak ada temuan yang mengkhawatirkan

### Kuning
- aktivitas hari ini sudah diinput
- ada temuan / follow up yang masih berjalan

### Merah
- belum update aktivitas hari ini
- atau ada temuan yang pending lebih dari 3 hari

Gunakan rule otomatis sederhana:

- Hijau = update masuk + tidak ada pending lama
- Kuning = update masuk + ada pending aktif
- Merah = belum update atau pending > 3 hari

---

## 8. Halaman Aktivitas Harian

Halaman ini dipakai oleh APUPPT Staff.

### Tujuan:
Mengisi 1 log aktivitas harian yang sangat singkat.

### Form input wajib:
- Tanggal
- PT
- Aktivitas utama hari ini
- Jumlah item direview
- Ada temuan? (Ya / Tidak)
- Jika ada temuan, deskripsi singkat
- Status temuan
- Catatan singkat

### Jenis aktivitas dropdown:
- Review transaksi harian
- Review dokumen KYC
- Follow up cabang
- Analisa transaksi
- Verifikasi source of fund
- Penyusunan laporan
- Meeting / koordinasi
- Sosialisasi APUPPT

### Status temuan dropdown:
- Tidak Ada
- Pending
- Follow Up
- Selesai

### UX rule:
- form harus bisa diisi kurang dari 30 detik
- lebih banyak dropdown daripada mengetik
- tampilan bersih dan sederhana

---

## 9. Halaman Temuan / Follow Up

Halaman ini menampilkan daftar temuan yang masih hidup atau sudah selesai.

### Kolom tabel:
- Tanggal
- PT
- Temuan
- Status
- Umur
- Catatan

### Status:
- Pending
- Follow Up
- Selesai

### Filter sederhana:
- Semua
- Pending
- Follow Up
- Selesai

### Rule umur temuan:
- hitung otomatis berdasarkan tanggal input
- jika lebih dari 3 hari dan belum selesai, bisa memicu status merah pada PT

---

## 10. Halaman Laporan

Sediakan 3 jenis laporan:

1. Harian
2. Mingguan
3. Bulanan

### Isi laporan per PT:
- jumlah hari update
- total aktivitas
- total item review
- total temuan
- total pending
- total temuan selesai
- status rata-rata PT (Hijau/Kuning/Merah)

### Tambahkan ringkasan grup:
- PT paling stabil
- PT paling banyak temuan
- PT yang paling sering pending
- PT yang belum konsisten update

Sediakan tombol:
- Lihat laporan
- Print
- Export PDF (opsional)
- Export Excel (opsional)

Untuk versi awal, jika print/export memperlambat development, prioritaskan tampilan laporan dulu.

---

## 11. Detail PT

Saat kartu PT di dashboard diklik, buka halaman detail PT.

### Isi halaman detail PT:
- nama PT
- status hari ini
- aktivitas hari ini
- jumlah item direview
- daftar temuan aktif
- riwayat status 7 hari terakhir

Contoh riwayat status:
- 08 Mar – Hijau
- 09 Mar – Hijau
- 10 Mar – Kuning
- 11 Mar – Hijau
- 12 Mar – Merah

---

## 12. Database / Data Model

Gunakan data model sederhana.

### Tabel utama:

#### users
- id
- name
- email
- password_hash
- role
- pt_code
- is_active
- created_at
- updated_at

#### activities
- id
- date
- pt_code
- activity_type
- items_reviewed
- has_finding
- finding_summary
- finding_status
- notes
- created_by
- created_at
- updated_at

#### findings
- id
- date
- pt_code
- finding_text
- status
- notes
- created_by
- created_at
- updated_at

#### reports
- id
- report_type
- period_start
- period_end
- generated_data_json
- created_at

Catatan:
- jika ingin lebih efisien, finding bisa berasal dari activity yang memiliki temuan
- tetapi jika lebih rapi, temuan dapat dibuat tabel terpisah

---

## 13. Tech Stack yang Disarankan

Gunakan stack yang sederhana, modern, dan cepat dikembangkan.

### Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend:
- Node.js
- Express.js

### Database:
- PostgreSQL
atau
- Supabase PostgreSQL

### ORM:
- Drizzle ORM
atau
- Prisma

### Auth:
- login sederhana berbasis role

Jika ingin mempercepat development, stack Supabase + React juga diperbolehkan.

---

## 14. UI / Visual Style

Gaya tampilan harus:

- profesional
- ringan
- clean
- corporate
- tidak berlebihan
- mudah dibaca

### Warna:
- utama: navy blue
- background: putih / abu muda
- indikator status:
  - hijau
  - kuning
  - merah

### Karakter visual:
- kartu sederhana
- font jelas
- tombol besar dan mudah disentuh di mobile
- tabel tidak terlalu padat
- minim elemen dekoratif

Jangan buat tampilannya terasa seperti aplikasi audit yang menegangkan.  
Tampilan harus lebih seperti **control panel yang rapi dan elegan**.

---

## 15. Mobile Friendly

Aplikasi harus responsive.

Prioritas tampilan mobile:
- dashboard tetap nyaman dibuka dari HP
- kartu PT tampil vertikal saat di mobile
- form aktivitas harian tetap mudah diisi di layar kecil
- tabel bisa di-scroll horizontal jika perlu

Karena owner, DK, atau DU mungkin akan memantau dari HP.

---

## 16. Workflow Harian Sistem

### Untuk APUPPT Staff:
1. login
2. buka menu Aktivitas Harian
3. isi 1 log aktivitas harian
4. simpan
5. jika ada temuan, status akan masuk ke daftar Temuan / Follow Up

### Untuk DK:
1. login
2. lihat dashboard seluruh PT
3. cek PT yang berstatus kuning atau merah
4. buka detail PT jika perlu
5. lihat laporan mingguan / bulanan

### Untuk DU / Owner:
1. login
2. lihat dashboard grup
3. lihat warna status masing-masing PT
4. buka laporan jika perlu

---

## 17. Seed Data / Default Data

Saat aplikasi pertama kali dibuat, siapkan default PT berikut:

- SGB
- RFB
- BPF
- KPF
- EWF

Siapkan juga contoh user dummy:
- 1 APUPPT per PT
- 1 DK
- 1 DU
- 1 Owner

Agar aplikasi bisa langsung dites.

---

## 18. Hal yang Harus Dihindari

Jangan membuat fitur yang terlalu rumit pada versi awal, seperti:

- AI AML detection
- workflow approval berlapis
- case management kompleks
- scoring KPI berat
- integrasi transaksi real-time
- multi-step compliance review
- notifikasi yang terlalu rumit

Versi awal harus fokus pada:
- log aktivitas
- daftar temuan
- dashboard status
- laporan sederhana

---

## 19. Output yang Diharapkan dari Development

Bangun aplikasi web yang sudah memiliki:

- login
- dashboard utama
- status warna per PT
- input aktivitas harian
- daftar temuan / follow up
- laporan harian, mingguan, bulanan
- halaman detail PT
- role-based access sederhana
- responsive design

---

## 20. Tujuan Bisnis Aplikasi

Aplikasi ini dibuat agar:

- aktivitas APUPPT tiap PT terlihat jelas
- DK, DU, dan owner bisa memantau secara langsung
- kerja compliance menjadi lebih transparan
- tidak perlu tanya manual satu per satu
- tidak menambah beban kerja berlebihan

ACC harus terasa sebagai:

**alat bantu monitoring kerja compliance yang ringan dan efektif**

bukan sebagai:

**alat audit berat yang menambah administrasi**

---

## 21. Permintaan Tambahan untuk Developer / Replit Agent

Mohon bangun aplikasi ini dengan pendekatan berikut:

1. Mulai dari versi paling sederhana tapi benar-benar berfungsi
2. Prioritaskan UX yang cepat dan ringan
3. Buat struktur kode rapi dan mudah dikembangkan
4. Gunakan komponen UI yang profesional
5. Hindari overengineering
6. Fokus pada kejelasan dashboard dan kemudahan input
7. Siapkan agar nanti mudah dikembangkan ke versi berikutnya jika dibutuhkan

---

## 22. Ringkasan Singkat

ACC adalah aplikasi internal Solid Group untuk memonitor aktivitas APUPPT 5 PT secara sederhana.

Fitur inti:
- 1 log aktivitas per hari per PT
- daftar temuan / follow up
- dashboard warna hijau-kuning-merah
- laporan otomatis
- akses untuk APUPPT, DK, DU, dan Owner

Kata kunci utama development:
- sederhana
- ringan
- jelas
- profesional
- mobile friendly
- tidak membebani user
