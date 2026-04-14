# 💳 PayFlow — E-Wallet SOA (Midterm Project)

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│              Frontend (HTML/JS) — Port 8080              │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP Request
┌──────────────────────────▼──────────────────────────────┐
│                    API GATEWAY — Port 3000               │
│         (Single Entry Point + Swagger Unified Docs)      │
└─────────────────┬────────────────────┬──────────────────┘
                  │                    │
    ┌─────────────▼───────┐ ┌─────────▼──────────────┐
    │   USER SERVICE       │ │   PAYMENT SERVICE        │
    │     Port 3001        │ │     Port 3002            │
    │  - GET /users        │ │  - GET /transactions     │
    │  - POST /users       │ │  - POST /transfer  ──────┼──► calls User Service
    │  - PUT /users/:id    │ │  - POST /topup     ──────┼──► calls User Service
    │  - DELETE /users/:id │ │  - GET /transactions/:id │
    │  - PATCH /balance    │ │                          │
    └─────────────┬───────┘ └─────────────────────────┘
                  │
    ┌─────────────▼────────────────────────────────────┐
    │                 MySQL Database                     │
    │           tables: users, transactions              │
    └───────────────────────────────────────────────────┘
```

## Teknologi yang Digunakan

| Komponen | Teknologi |
|---------|-----------|
| Backend | Node.js + Express |
| Database | MySQL 8.0 |
| Dokumentasi | Swagger (OpenAPI 3.0) |
| Containerization | Docker + Docker Compose |
| Frontend | HTML + CSS + Vanilla JS |

## Cara Menjalankan

### Prasyarat
- Docker Desktop sudah terinstall

### Langkah 1 — Clone & masuk folder
```bash
cd ewallet
```

### Langkah 2 — Jalankan semua service
```bash
docker compose up --build
```

Tunggu sampai semua container running (sekitar 30-60 detik).

### Langkah 3 — Akses aplikasi

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost:8080 |
| 🔀 API Gateway | http://localhost:3000 |
| 📚 Swagger Docs | http://localhost:3000/api-docs |
| 👤 User Service | http://localhost:3001 |
| 💳 Payment Service | http://localhost:3002 |

### Langkah 4 — Stop aplikasi
```bash
docker compose down
```

## Endpoint API (via Gateway)

### Users
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/users | Ambil semua user |
| GET | /api/users/:id | Ambil user by ID |
| POST | /api/users | Buat user baru |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Hapus user |

### Transactions
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/transactions | Semua transaksi |
| GET | /api/transactions/:id | Transaksi by ID |
| GET | /api/transactions/user/:id | Transaksi by user |
| POST | /api/transactions/transfer | Transfer antar user |
| POST | /api/transactions/topup | Top up saldo |
| DELETE | /api/transactions/:id | Hapus record |

## Contoh API Call (Postman/curl)

### Top Up Saldo
```bash
curl -X POST http://localhost:3000/api/transactions/topup \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "amount": 100000}'
```

### Transfer
```bash
curl -X POST http://localhost:3000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 50000, "description": "Bayar makan"}'
```

## Poin Penting untuk Presentasi

1. **SOA/Microservices**: Setiap service punya tanggung jawab sendiri
2. **API Communication**: Payment Service memanggil User Service secara internal
3. **API Gateway**: Satu titik masuk untuk semua client
4. **Swagger**: Dokumentasi lengkap di `/api-docs`
5. **Docker**: Semua service berjalan dalam container terpisah
