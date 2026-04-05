# ACC — APUPPT Control Center
# Buku Panduan Pengguna

**Versi:** 1.1  
**Tanggal:** April 2026  
**Bahasa:** Indonesia

---

## Daftar Isi

1. [Pengenalan Sistem](#1-pengenalan-sistem)
2. [Cara Masuk (Login)](#2-cara-masuk-login)
3. [Panduan APUPPT — Mengisi Aktivitas Harian](#3-panduan-apuppt--mengisi-aktivitas-harian)
4. [Panduan DK — Review & Monitoring](#4-panduan-dk--review--monitoring)
5. [Panduan DU — Sign-Off Laporan](#5-panduan-du--sign-off-laporan)
6. [Panduan Owner — Monitoring Keseluruhan](#6-panduan-owner--monitoring-keseluruhan)
7. [Panduan Superadmin — Manajemen Sistem](#7-panduan-superadmin--manajemen-sistem)
8. [Fitur Umum — Semua Pengguna](#8-fitur-umum--semua-pengguna)
9. [Sistem Temuan (Ticketing)](#9-sistem-temuan-ticketing)
10. [Notifikasi Push](#10-notifikasi-push)
11. [Pertanyaan Umum (FAQ)](#11-pertanyaan-umum-faq)

---

## 1. Pengenalan Sistem

ACC (APUPPT Control Center) adalah sistem pemantauan kepatuhan untuk 5 Perusahaan Terdaftar (PT) dalam industri perdagangan berjangka.

### Fungsi Utama
- Pencatatan aktivitas kepatuhan harian oleh APUPPT
- Review dan penilaian oleh DK (Direktur Kepatuhan)
- Sign-off periodik oleh DU (Direktur Utama)
- Pemantauan KPI dan laporan oleh Owner dan Superadmin
- Sistem tiket untuk temuan kepatuhan

### 5 PT yang Dipantau
| Kode | Nama Perusahaan |
|------|----------------|
| SGB | Solid Gold Berjangka |
| RFB | Rifan Financindo Berjangka |
| BPF | Best Profit Futures |
| KPF | Kontak Perkasa Futures |
| EWF | Equity World Futures |

### Sistem Lampu Lalu Lintas
Status setiap PT ditampilkan dalam 3 warna:

| Warna | Artinya | Kondisi |
|-------|---------|---------|
| 🟢 **Hijau** | Aman | Update hari ini + tidak ada temuan terbuka |
| 🟡 **Kuning** | Perlu Perhatian | Update hari ini + ada temuan terbuka (belum overdue) |
| 🔴 **Merah** | Kritis | Belum update hari ini ATAU ada temuan overdue (>3 hari) |

> **Penting:** Jika PT berwarna Merah 2 hari atau lebih berturut-turut, akan muncul badge oranye "Merah N hari" sebagai peringatan khusus.

---

## 2. Cara Masuk (Login)

### Langkah Login
1. Buka aplikasi ACC di browser
2. Pilih akun dari dropdown **"Jabatan / Akun"**
3. Masukkan password
4. Centang **"Ingat Saya"** jika ingin tetap login selama 30 hari
5. Klik **"Masuk"**

### Lupa Password
1. Klik tautan **"Lupa Password?"** di halaman login
2. Hubungi Superadmin untuk reset password

### Logout
- Klik nama Anda di pojok kanan atas → pilih **"Keluar"**

---

## 3. Panduan APUPPT — Mengisi Aktivitas Harian

Sebagai APUPPT, tugas utama Anda adalah mengisi laporan aktivitas kepatuhan setiap hari kerja.

### 3.1 Tampilan Halaman Aktivitas

Halaman **"Aktivitas"** terdiri dari dua bagian:

**Banner Status Hari Ini** (di bagian atas)
- **Oranye/Amber**: belum ada aktivitas hari ini — tombol **"+ Isi Aktivitas Hari Ini"** ditampilkan di sini dan juga mengambang di pojok kanan bawah (mobile)
- **Hijau**: sudah mengisi aktivitas hari ini — menampilkan jumlah aktivitas yang sudah tercatat

**Riwayat Aktivitas** (di bawah banner)
- Daftar semua aktivitas yang sudah diisi, diurutkan dari terbaru
- Klik kartu untuk **membuka detail** termasuk data lengkap + **thread komentar** bersama DK

### 3.2 Mengisi Aktivitas Harian

**Cara mengisi:**
1. Klik menu **"Aktivitas"** di navigasi
2. Klik tombol **"+ Isi Aktivitas Hari Ini"** (dari banner atau tombol mengambang)
3. Pilih **Jenis Kegiatan** dari grid visual (klik kartu dengan emoji + label)
4. Isi formulir yang muncul:
   - **Jumlah Nasabah Diperiksa**: isi jumlah (wajib untuk tipe yang memerlukan data nasabah)
   - **Kategori Risiko Nasabah**: pilih satu atau lebih (Rendah / Menengah / Tinggi)
   - **Ada Temuan?**: aktifkan jika ditemukan pelanggaran/masalah
   - **Catatan**: tambahkan keterangan jika diperlukan
5. Klik **"Simpan Aktivitas"**

### Jenis Kegiatan
| Kode | Nama | Perlu Data Nasabah? |
|------|------|---------------------|
| KYC | Know Your Customer | Ya |
| CDD | Customer Due Diligence | Ya |
| Screening | Pemeriksaan/Screening | Ya |
| Monitoring Transaksi | Pemantauan transaksi | Ya |
| Sosialisasi | Sosialisasi/edukasi | **Tidak** |
| Pelaporan | Laporan kepatuhan | Ya |
| Lainnya | Aktivitas lain | Ya |
| Libur | Hari Libur / Tidak Masuk | **Tidak** |

> **Perhatian:** Semua jenis kegiatan **KECUALI Sosialisasi dan Libur** WAJIB mengisi jumlah nasabah diperiksa (minimal 1) dan kategori risiko nasabah.

> **Catatan:** Aktivitas hanya bisa diisi untuk **hari ini** (tanggal sistem). Satu jenis kegiatan hanya bisa diisi satu kali per hari.

### 3.3 Membaca Komentar dari DK

DK dapat memberikan komentar atau catatan langsung pada aktivitas Anda.

1. Buka halaman **"Aktivitas"**
2. Klik kartu aktivitas yang ingin dibaca → kartu akan terbuka/expand
3. Gulir ke bawah untuk melihat **thread komentar**
4. Anda bisa membalas komentar DK — ketik pesan → tekan **Enter** atau klik tombol kirim

Komentar ditampilkan dalam format chat-bubble: pesan Anda di kanan (biru), pesan DK di kiri (abu).

### 3.4 Membuat Temuan

Jika dalam aktivitas Anda menemukan masalah atau pelanggaran:
1. Klik menu **"Temuan"** → **"+ Buat Temuan"**
2. Pilih PT (otomatis PT Anda)
3. Isi deskripsi temuan dengan jelas dan detail
4. Klik **"Buat Temuan"**

Temuan akan otomatis masuk ke sistem tiket dan DK akan dinotifikasi.

### 3.5 Melihat Status PT Anda

- Menu **"Dashboard"** menampilkan status real-time PT Anda
- Cek warna lampu lalu lintas setiap hari untuk memastikan status Hijau

---

## 4. Panduan DK — Review & Monitoring

Sebagai DK (Direktur Kepatuhan), Anda bertugas mereview laporan aktivitas APUPPT dan memantau kondisi seluruh PT.

### 4.1 Panel "⚠ Butuh Perhatian Sekarang"

Panel peringatan ini tampil di **dua tempat**: halaman **Dashboard** dan halaman **Review** — sehingga masalah aktif selalu terlihat di mana pun Anda berada.

Panel muncul otomatis jika ada masalah aktif dan mengelompokkan isu berdasarkan urgensi:

| Kategori | Kondisi | Visual |
|---------|---------|--------|
| PT Merah Hari Ini | PT berstatus Merah sekarang | Badge merah |
| Merah Berturut-turut | Sudah Merah ≥ 2 hari | Badge oranye 🔥 + jumlah hari |
| Temuan Overdue | Ada temuan melebihi deadline | Badge kuning |
| Belum Update | Tidak mengisi aktivitas hari ini | Badge abu |

**Cara menggunakan:**
- Klik header panel untuk menciutkan/membuka (collapse)
- Klik nama PT di dalam panel untuk langsung ke halaman detail PT
- Panel **tidak bisa ditutup permanen** — selalu muncul kembali selama ada masalah aktif (dirancang agar masalah tidak bisa diabaikan)

### 4.2 Mereview Aktivitas APUPPT

**Cara review satu per satu:**
1. Buka menu **"Review"**
2. Tab **"Perlu Direview"** menampilkan aktivitas yang belum direview
3. Klik kartu aktivitas untuk membuka detailnya
4. Periksa data aktivitas: jenis, jumlah nasabah, kategori risiko
5. Klik **"Setujui"** atau **"Minta Revisi"**
6. Tambahkan catatan jika diperlukan

> **Target:** Review sebaiknya dilakukan dalam 24 jam setelah APUPPT mengisi laporan.

### 4.2.1 Review Banyak Sekaligus (Batch Review)

Fitur ini memudahkan DK mereview banyak aktivitas sekaligus tanpa harus klik satu per satu.

**Cara menggunakan:**
1. Di halaman **"Review"**, klik tombol **"Pilih Banyak"** (pojok kanan atas)
2. Mode batch aktif — muncul checkbox di setiap kartu aktivitas
3. Centang aktivitas-aktivitas yang ingin direview sekaligus
4. Atau klik **"Pilih Semua"** untuk centang semua sekaligus
5. Klik tombol **"Review [N] Aktivitas"** (di bawah layar, mobile) atau di atas
6. Modal konfirmasi muncul — isi catatan opsional jika perlu
7. Klik **"Konfirmasi Review"**

Semua aktivitas yang dipilih langsung ditandai sebagai "Disetujui" dalam satu aksi.

> **Catatan:** Hanya aktivitas yang belum direview yang bisa dipilih dalam mode batch. Aktivitas yang sudah pernah direview tidak akan terpengaruh.

### 4.2.2 Berkomunikasi via Komentar

DK bisa meninggalkan komentar langsung pada setiap aktivitas untuk berkomunikasi dengan APUPPT.

1. Klik kartu aktivitas untuk membuka detailnya
2. Gulir ke bawah ke bagian **"Komentar"**
3. Ketik pesan → tekan **Enter** atau klik tombol kirim
4. APUPPT akan melihat komentar Anda di halaman Aktivitas mereka

Komentar berguna untuk meminta klarifikasi tanpa harus membuat temuan formal.

### 4.3 Mengelola Temuan

**Melihat semua temuan:**
1. Klik menu **"Temuan"**
2. Filter berdasarkan status: Pending, Sedang Dikerjakan, Menunggu Verifikasi, Selesai

**Mengelola tiket temuan:**
1. Klik temuan yang ingin ditangani
2. Bisa:
   - **Acknowledge**: DK mengakui temuan dengan catatan
   - **Update Status**: ubah dari Pending → Sedang Dikerjakan → Menunggu Verifikasi → Selesai
   - **Assign**: tugaskan ke anggota tim
   - **Set Deadline**: tentukan batas waktu penyelesaian
   - **Tambah Komentar**: komunikasi dalam tiket

### 4.4 Memantau KPI

Menu **"KPI"** menampilkan:
- **Scorecard APUPPT**: ranking semua APUPPT berdasarkan kpi_score (0–100)
  - Hijau ≥ 80: performa baik
  - Kuning 60–79: perlu perhatian
  - Merah < 60: perlu tindakan
- **KPI DK Anda**: review rate, rata-rata waktu review, respons tiket
- **Tren 3 Bulan**: chart update_rate per PT untuk 3 bulan terakhir

### 4.5 Melihat Laporan

Menu **"Laporan"**:
- Pilih periode (Harian/Mingguan/Bulanan)
- Lihat ringkasan per PT: total aktivitas, nasabah diperiksa, temuan
- Tombol **"Export Excel"**: download laporan ke file Excel
- Tombol **"Cetak PDF"**: print/simpan sebagai PDF

Menu **"Rekap Bulanan"**:
- Pilih bulan dan tahun
- Lihat rekap lengkap + indikator tren (▲/▼ vs bulan lalu)

---

## 5. Panduan DU — Sign-Off Laporan

Sebagai DU (Direktur Utama), tugas utama Anda adalah memberikan sign-off pada laporan periode tertentu setelah direview oleh DK.

### 5.1 Melakukan Sign-Off

1. Buka menu **"Sign-Off"**
2. Pilih PT yang ingin di-sign-off
3. Pilih jenis periode:
   - **Mingguan**: pilih minggu spesifik
   - **Bulanan**: pilih bulan
4. Periksa data: total aktivitas, % review DK, temuan
5. Tambahkan catatan jika diperlukan
6. Klik **"Sign-Off Laporan"**

> **Catatan:** Sign-off mengunci laporan periode tersebut. Pastikan DK sudah mereview cukup aktivitas sebelum sign-off.

### 5.2 Melihat KPI

Menu **"KPI"** → tab **"DU"** menampilkan:
- Sign-off rate: persentase periode yang sudah di-sign-off
- Total laporan yang sudah ditandatangani

### 5.3 Melihat Laporan

Menu **"Laporan"**: lihat status sign-off semua PT untuk periode yang dipilih.

---

## 6. Panduan Owner — Monitoring Keseluruhan

Sebagai Owner, Anda memiliki akses view-only untuk memantau semua PT.

### 6.1 Dashboard Utama

Halaman **"Dashboard"** dirancang agar masalah tidak bisa diabaikan. Tersusun dari atas ke bawah:

**1. Panel "⚠ Butuh Perhatian Sekarang"** *(muncul jika ada masalah aktif)*
- Kotak merah bold di paling atas
- Menampilkan PT merah hari ini, PT merah berturut-turut 🔥, temuan overdue, PT belum update
- Klik nama PT di dalam panel untuk langsung ke halaman detailnya
- Bisa diciutkan tapi tidak bisa ditutup permanen

**2. Kartu Ringkasan Warna** *(3 kotak: Merah / Kuning / Hijau)*
- Menampilkan jumlah PT di masing-masing status

**3. KPI Cepat** *(4 angka di bawah kartu warna)*
- Total Temuan Overdue — berapa temuan yang sudah lewat deadline
- PT Belum Update — berapa PT yang tidak mengisi hari ini
- PT Kritis (Merah) — jumlah PT berstatus merah
- PT Aman (Hijau) — jumlah PT berstatus hijau

**4. Ranking PT** *(2 kolom berdampingan)*
- "Perlu Tindakan" — 3 PT terburuk saat ini (paling kritis di atas)
- "Terbaik Saat Ini" — 3 PT dengan performa terbaik

**5. Daftar Semua PT**
- Diurutkan dari paling kritis ke paling aman
- Setiap card menampilkan: status + alasan detail + tanggal update terakhir + badge 🔥 jika merah berturut-turut

Klik nama PT untuk melihat detail termasuk riwayat 7 hari dan rekap cabang.

### 6.2 KPI Menyeluruh

Menu **"KPI"** menampilkan performa semua PT dan semua APUPPT dalam satu tampilan.

Gunakan **filter periode** untuk membandingkan minggu/bulan tertentu.

### 6.3 Rekap Bulanan

Menu **"Rekap Bulanan"**: ringkasan lengkap semua PT per bulan, termasuk:
- Update rate, nasabah diperiksa, temuan
- Status sign-off DU
- Indikator tren vs bulan sebelumnya (▲ naik = membaik, ▼ turun = perlu perhatian)
  - Khusus temuan terbuka: ▼ justru berarti membaik (berkurang)

---

## 7. Panduan Superadmin — Manajemen Sistem

Superadmin memiliki akses penuh termasuk manajemen user dan audit log.

### 7.1 Manajemen User

Menu **"Manajemen User"** (dropdown atas kanan):

**Melihat semua user:**
- Tabel berisi semua pengguna: nama, username, email, jabatan, PT, status aktif

**Membuat user baru:**
1. Klik **"+ Tambah User"**
2. Isi formulir:
   - Nama lengkap
   - Username (unik, tidak bisa diubah setelah dibuat)
   - Email (unik)
   - Jabatan: pilih role
   - PT: wajib diisi jika role adalah APUPPT, DK, atau DU
   - Password awal (minimal 6 karakter)
3. Klik **"Buat User"**
4. Sampaikan username dan password awal ke pengguna tersebut

**Mengedit user:**
1. Klik ikon edit (pensil) pada baris user
2. Bisa mengubah: nama, jabatan, PT, email
3. Klik **"Simpan"**

**Menonaktifkan user:**
- Klik tombol **"Nonaktifkan"** pada baris user
- User tidak bisa login lagi, tapi data historisnya tetap tersimpan
- User yang sudah nonaktif bisa diaktifkan kembali kapan saja

> **Catatan:** Superadmin tidak bisa menonaktifkan akun dirinya sendiri.

**Reset password user lain:**
- Klik ikon kunci pada baris user (atau melalui menu reset password)
- Masukkan password baru
- Sampaikan password baru ke user yang bersangkutan

### 7.2 Audit Log

Menu **"Audit Log"** mencatat semua aksi penting dalam sistem:
- Siapa yang melakukan aksi
- Aksi apa yang dilakukan
- Kapan dilakukan
- Data sebelum dan sesudah perubahan

Gunakan Audit Log untuk investigasi jika ada data yang berubah tidak seharusnya.

### 7.3 Akses Penuh

Superadmin juga bisa:
- Melihat dan mengelola semua temuan semua PT
- Mereview aktivitas seperti DK
- Sign-off laporan seperti DU
- Mengakses semua halaman laporan dan KPI

---

## 8. Fitur Umum — Semua Pengguna

### 8.1 Profil & Avatar

1. Klik nama Anda di pojok kanan atas → **"Profil Saya"**
2. Di halaman profil:
   - **Ganti Foto**: klik foto atau ikon kamera → pilih file (JPG/PNG, maks 2MB)
   - **Edit Nama**: klik ikon pensil di samping nama → ketik nama baru → Enter atau klik ✓
   - **Ganti Password**: isi password lama + password baru (min 6 karakter) → klik "Ganti Password"

### 8.2 Detail PT

Klik nama PT manapun di dashboard untuk melihat:
- **Tab Overview**: status detail + riwayat 7 hari terakhir (strip warna)
- **Tab Rekap Cabang** (DK, DU, Owner, Superadmin): tabel per cabang dengan update_rate, nasabah diperiksa, temuan terbuka, dan status lampu lalu lintas cabang

### 8.3 Riwayat 7 Hari

Di halaman detail PT, strip warna menunjukkan status tiap hari selama 7 hari terakhir:
- 🟢 Kotak hijau = hari itu status Hijau
- 🟡 Kotak kuning = hari itu status Kuning
- 🔴 Kotak merah = hari itu status Merah
- ⬜ Kotak abu = tidak ada data (hari libur atau sebelum sistem digunakan)

### 8.4 Filter Laporan & KPI

Halaman Laporan, KPI, dan Rekap Bulanan memiliki filter:
- **Mingguan**: pilih minggu spesifik
- **Bulanan**: pilih bulan
- **Kustom**: pilih rentang tanggal bebas
- **Filter PT** (Owner/Superadmin): lihat data untuk PT tertentu saja

---

## 9. Sistem Temuan (Ticketing)

Temuan adalah catatan formal atas pelanggaran atau masalah kepatuhan yang ditemukan.

### 9.1 Status Temuan

```
Pending → Sedang Dikerjakan → Menunggu Verifikasi → Selesai
                ↓
          Follow Up (jika perlu tindak lanjut lebih lanjut)
```

| Status | Artinya |
|--------|---------|
| Pending | Baru dilaporkan, belum ada yang menangani |
| Sedang Dikerjakan | Sudah diassign, sedang dalam proses penyelesaian |
| Menunggu Verifikasi | Sudah diselesaikan, menunggu verifikasi DK |
| Selesai | Temuan sudah terverifikasi selesai |
| Follow Up | Perlu tindak lanjut tambahan |

### 9.2 Eskalasi Otomatis

Sistem otomatis meningkatkan level eskalasi temuan jika tidak ditangani:
- **Level 0 → 1**: temuan overdue > 3 hari tanpa respons
- **Level 1 → 2**: sudah diescalate ke level 1 tapi belum ada aksi 24 jam

> Temuan dengan eskalasi tinggi mendapat notifikasi ke DK dan Owner/Superadmin.

### 9.3 Komentar Tiket

Di dalam halaman detail temuan:
- Lihat riwayat semua komentar (termasuk komentar sistem otomatis)
- Tambah komentar baru untuk komunikasi antar tim
- Komentar sistem (warna berbeda) mencatat perubahan status otomatis

### 9.4 Overdue Findings

Temuan dianggap **overdue** jika:
- Status bukan "Selesai"
- DAN sudah lebih dari 3 hari sejak dibuat

Temuan overdue menjadikan PT berstatus Merah dan mendapat perhatian khusus di dashboard.

---

## 10. Notifikasi Push

ACC mendukung notifikasi push langsung ke browser (PWA).

### 10.1 Mengaktifkan Notifikasi

1. Setelah login, muncul banner biru **"Aktifkan Notifikasi"**
2. Klik banner tersebut atau buka menu **"Pengaturan Notifikasi"** (dropdown atas kanan)
3. Klik tombol **"Aktifkan Notifikasi"**
4. Izinkan notifikasi saat browser meminta konfirmasi
5. Notifikasi akan aktif di perangkat tersebut

### 10.2 Jenis Notifikasi per Role

| Role | Jenis Notifikasi yang Diterima |
|------|-------------------------------|
| APUPPT | Pengingat pagi (09:00 WIB) jika belum isi aktivitas; komentar baru pada temuan di PT Anda |
| DK | Aktivitas harian baru dari APUPPT, temuan baru, perlu review; peringatan sore PT merah |
| DU | Laporan siap di-sign-off |
| Owner | Ringkasan harian, notifikasi PT kritis |
| Superadmin | Ringkasan harian, notifikasi PT kritis |

### 10.3 Notifikasi Harian Otomatis

**Pukul 09:00 WIB (Senin–Jumat):**
- APUPPT yang belum mengisi aktivitas hari ini akan mendapat pengingat otomatis
- Sabtu dan Minggu tidak ada pengingat

**Pukul 17:00 WIB (Senin–Jumat):**
- DK: peringatan jika PT-nya berstatus Merah
- Owner & Superadmin: ringkasan kondisi semua PT (jumlah Hijau/Kuning/Merah)

### 10.4 Menonaktifkan Notifikasi

Buka **"Pengaturan Notifikasi"** → klik **"Nonaktifkan Notifikasi"**.

---

## 11. Pertanyaan Umum (FAQ)

**Q: Saya lupa password, bagaimana cara resetnya?**  
A: Hubungi Superadmin untuk meminta reset password. Superadmin bisa reset melalui menu Manajemen User.

**Q: Saya sudah mengisi aktivitas hari ini tapi PT masih berwarna Merah, kenapa?**  
A: Ada kemungkinan PT Anda memiliki temuan overdue (lebih dari 3 hari belum selesai). Cek halaman Temuan dan selesaikan yang sudah overdue.

**Q: Bisakah saya mengisi aktivitas untuk hari kemarin?**  
A: Tidak. Formulir aktivitas hanya bisa diisi untuk **hari ini**. Jika kemarin terlewat, segera hubungi DK atau Superadmin untuk pencatatan manual.

**Q: Berapa jenis aktivitas yang bisa diisi dalam satu hari?**  
A: Bisa lebih dari satu, tapi masing-masing jenis aktivitas hanya bisa diisi sekali per hari. Misalnya: KYC 1 kali, CDD 1 kali, Screening 1 kali dalam hari yang sama.

**Q: Kenapa ada badge oranye "Merah 3 hari" di PT saya?**  
A: PT tersebut sudah berstatus Merah selama 3 hari berturut-turut. Ini adalah peringatan prioritas tinggi yang memerlukan tindakan segera.

**Q: Apa itu "Rekap Cabang" di detail PT?**  
A: Ini menampilkan data kepatuhan per cabang dari PT tersebut, bukan per PT keseluruhan. Berguna untuk melihat cabang mana yang butuh perhatian lebih.

**Q: Bagaimana cara mengunduh laporan?**  
A: Buka menu **"Laporan"**, pilih periode yang diinginkan, lalu klik **"Export Excel"** untuk file Excel atau **"Cetak PDF"** untuk print/PDF.

**Q: Apa bedanya "Rekap Bulanan" dengan "Laporan"?**  
A: Laporan menampilkan data periode yang dipilih saja. Rekap Bulanan menampilkan data per bulan **plus perbandingan** (tren naik/turun) dengan bulan sebelumnya, cocok untuk evaluasi bulanan manajemen.

**Q: Apakah data yang sudah di-sign-off oleh DU bisa diubah?**  
A: Tidak. Setelah DU melakukan sign-off, laporan periode tersebut dikunci dan tidak bisa diubah. Ini untuk menjaga integritas data kepatuhan.

**Q: Apakah user yang dinonaktifkan bisa diaktifkan kembali?**  
A: Ya. Superadmin bisa mengaktifkan kembali user yang sudah dinonaktifkan kapan saja melalui menu Manajemen User.

**Q: Apa yang terjadi jika saya tidak mengisi aktivitas hari ini?**  
A: PT Anda akan otomatis berstatus **Merah** (Kritis) karena tidak ada update hari ini. DK dan Owner/Superadmin akan melihat PT Anda dalam daftar perhatian.

**Q: Notifikasi tidak muncul meski sudah diaktifkan, apa solusinya?**  
A: Pastikan:
1. Browser mengizinkan notifikasi (cek pengaturan browser)
2. Perangkat tidak dalam mode "Jangan Ganggu"
3. Coba nonaktifkan dan aktifkan ulang dari menu Pengaturan Notifikasi

**Q: Apa itu fitur "Pilih Banyak" di halaman Review?**  
A: Fitur Batch Review yang memungkinkan DK mereview banyak aktivitas sekaligus dalam satu klik. Aktifkan dengan tombol "Pilih Banyak", centang aktivitas yang ingin direview, lalu konfirmasi. Sangat berguna jika ada banyak aktivitas yang menumpuk.

**Q: Apa bedanya komentar di aktivitas dengan komentar di temuan?**  
A: Komentar di **aktivitas** (halaman Aktivitas / Review) adalah komunikasi informal antara APUPPT dan DK seputar laporan harian — misalnya klarifikasi data. Komentar di **temuan** (halaman detail tiket) adalah komunikasi formal terkait penanganan pelanggaran yang tercatat dalam audit trail sistem.

**Q: Apakah ada pengingat otomatis jika saya lupa isi aktivitas?**  
A: Ya. Setiap hari kerja pukul **09:00 WIB**, sistem akan otomatis mengirim notifikasi push kepada APUPPT yang belum mengisi aktivitas hari itu. Pastikan notifikasi sudah diaktifkan di perangkat Anda.

**Q: Mengapa jenis kegiatan "Libur" tidak memerlukan data nasabah?**  
A: Karena pada hari libur tidak ada kegiatan operasional. Mengisi "Libur" cukup sebagai penanda bahwa PT memang tidak beroperasi pada hari tersebut, tanpa perlu data nasabah atau jumlah pemeriksaan.

---

*Dokumen ini dibuat untuk membantu pengguna ACC dalam memahami dan menggunakan sistem secara optimal. Untuk pertanyaan teknis lebih lanjut, hubungi Superadmin.*

*Sistem ACC — APUPPT Control Center | April 2026 | Versi 1.1*
