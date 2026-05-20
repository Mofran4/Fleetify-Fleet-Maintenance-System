# Fleetify – Fleet Maintenance System

Sistem internal manajemen pemeliharaan armada kendaraan dengan dua peran: **Service Advisor (SA)** dan **Approval (Manajemen)**.

---

## Tech Stack

| Layer      | Teknologi                          |
|------------|------------------------------------|
| Backend    | Go 1.21 + GoFiber v2 + GORM        |
| Database   | MySQL 8.0                          |
| Frontend   | Vanilla JS + Bootstrap 5           |
| DevOps     | Docker + Docker Compose            |

---

## Cara Menjalankan (Docker)

### Prasyarat
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) terinstall dan berjalan
- Port **8080** dan **3307** tidak sedang digunakan

### Langkah

```bash
# 1. Clone / extract project
git clone <repo-url>
cd fleetify

# 2. Jalankan semua service (sekali perintah)
docker-compose up --build

# 3. Buka browser
open http://localhost:8080
```

> Seeder otomatis berjalan saat aplikasi pertama kali start — tidak perlu langkah manual.

---

## Akun Testing

| Username        | Role       | X-User-ID |
|-----------------|------------|-----------|
| `budi_sa`       | SA         | 1         |
| `siti_sa`       | SA         | 2         |
| `andi_approval` | APPROVAL   | 3         |

> Pilih akun dari dropdown di sidebar kiri pada tampilan web.

---

## Environment Variables

Konfigurasi ada di `docker-compose.yml`. Opsional, buat `.env` dari template:

```bash
cp .env.example .env
```

| Variable      | Default        | Keterangan              |
|---------------|----------------|-------------------------|
| `DB_HOST`     | `db`           | Hostname MySQL (Docker) |
| `DB_PORT`     | `3306`         | Port MySQL              |
| `DB_USER`     | `fleetify`     | Username DB             |
| `DB_PASSWORD` | `fleetify123`  | Password DB             |
| `DB_NAME`     | `fleetify_db`  | Nama database           |
| `APP_PORT`    | `8080`         | Port aplikasi Go        |
| `WEBHOOK_URL` | *(kosong)*     | URL tujuan webhook POST |

---

## Dokumentasi API

Semua endpoint membutuhkan header: `X-User-ID: <id>`

### Master Data

| Method | Endpoint          | Role  | Deskripsi         |
|--------|-------------------|-------|-------------------|
| GET    | `/api/users`      | any   | Daftar semua user |
| GET    | `/api/vehicles`   | any   | Daftar kendaraan  |
| GET    | `/api/master-items` | any | Daftar part/jasa  |

### Laporan Pemeliharaan

| Method | Endpoint                        | Role     | Deskripsi                              |
|--------|---------------------------------|----------|----------------------------------------|
| GET    | `/api/reports`                  | any      | Semua laporan (dengan relasi)          |
| GET    | `/api/reports/:id`              | any      | Detail laporan                         |
| POST   | `/api/reports`                  | SA       | Buat laporan baru (multipart/form-data)|
| PATCH  | `/api/reports/:id/approve`      | APPROVAL | Setujui laporan → APPROVED             |
| PATCH  | `/api/reports/:id/complete`     | SA       | Selesaikan → COMPLETED + foto bukti    |

### POST `/api/reports` — Form Fields

| Field           | Type   | Wajib | Keterangan                     |
|-----------------|--------|-------|--------------------------------|
| `vehicle_id`    | int    | ✅    | ID kendaraan                   |
| `odometer`      | int    | ✅    | Pembacaan odometer (km)        |
| `complaint`     | string | ✅    | Deskripsi keluhan              |
| `initial_photo` | file   | ❌    | Foto awal kendaraan (simulasi) |
| `item_ids[]`    | int[]  | ❌    | Array ID master item           |
| `quantities[]`  | int[]  | ❌    | Array jumlah per item          |

### PATCH `/api/reports/:id/complete` — Form Fields

| Field         | Type | Wajib | Keterangan            |
|---------------|------|-------|-----------------------|
| `proof_photo` | file | ❌    | Foto bukti pengerjaan |

---

## Skema Database (ERD Ringkas)

```
users (id, username, role[SA/APPROVAL])
  | maintenance_reports.created_by

vehicles (id, license_plate, model)
  | maintenance_reports.vehicle_id

master_items (id, item_name, type[PART/SERVICE], price)
  | report_items.item_id

maintenance_reports (id, vehicle_id, created_by, odometer, complaint,
                     status, initial_photo, proof_photo, created_at)
  | report_items.report_id

report_items (id, report_id, item_id, quantity, price_snapshot)
```

> `price_snapshot` menyimpan harga saat laporan dibuat (bukan harga saat ini).

---

## Fitur yang Diimplementasikan

### Wajib
- [x] **F-01** SA membuat laporan → status `PENDING_APPROVAL`
- [x] **F-02** Approval meninjau & menyetujui → `APPROVED`
- [x] **F-03** SA menyelesaikan pekerjaan + foto → `COMPLETED`
- [x] **F-04** Riwayat laporan lengkap dengan search filter

### Bonus
- [x] **B-01** Export CSV Native JS (tanpa library pihak ketiga)
- [x] **B-02** Webhook Goroutine async saat `APPROVED` / `COMPLETED`

### Teknis
- [x] GORM Atomic Transaction (header + detail items)
- [x] Repository Pattern
- [x] Role-Based Access Control via `X-User-ID` header
- [x] DOM manipulation via `createElement` / `DocumentFragment` (no `.innerHTML`)
- [x] Bootstrap 5 responsive layout
- [x] Docker Compose one-command deploy
- [x] Auto seeder (2+ user, 3 kendaraan, 5 master items)

---

## Struktur Project

```
fleetify/
| cmd/
│   | main.go                  # Entry point, routing
| internal/
│   | handler/
│   │   | handler.go           # Semua HTTP handler
│   │   | webhook.go           # Async webhook goroutine
│   |middleware/
│   │   |auth.go              # Auth + RBAC middleware
│   |model/
│   │   |model.go             # GORM models
│   |repository/
│   │   |master_repo.go       # Users, Vehicles, MasterItems repos
│   │   |report_repo.go       # Report + atomic transaction
│   |seeder/
│       |seeder.go            # Auto data seeder
|frontend/
│   | index.html               # Single-page HTML
│   | css/style.css            # Custom styling
│   | js/app.js                # Vanilla JS (no frameworks)
| Dockerfile                   # Multi-stage build
| docker-compose.yml           # App + MySQL services
| go.mod / go.sum              # Go modules
| .env.example                 # Template env vars
```