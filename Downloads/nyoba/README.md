# 🛒 E-Commerce SOA Microservice

Aplikasi E-Commerce berbasis **Service-Oriented Architecture (SOA)** dengan multiple microservices yang berkomunikasi melalui REST API.

## 📐 Arsitektur

```
┌──────────────────────────────────────────────────┐
│                 FRONTEND (8080)                   │
│              HTML + CSS + JavaScript              │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│              API GATEWAY (3000)                   │
│         Express + http-proxy-middleware           │
│            Swagger UI: /api-docs                  │
└──────┬──────────┬─────────────────┬──────────────┘
       │          │                 │
       ▼          ▼                 ▼
┌──────────┐ ┌───────────┐  ┌──────────────┐
│   USER   │ │  PRODUCT  │  │    ORDER     │
│ SERVICE  │ │  SERVICE  │  │   SERVICE    │
│  (3001)  │ │  (3002)   │  │   (3003)    │
└────┬─────┘ └─────┬─────┘  └──┬───┬──────┘
     │             │            │   │
     │             │       ┌────┘   └────┐
     │             │       │ calls user  │ calls product
     │             │       │  service    │  service
     ▼             ▼       ▼             ▼
┌──────────────────────────────────────────────────┐
│                MongoDB (27017)                    │
│         users_db | products_db | orders_db        │
└──────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend | Node.js + Express |
| Database | MongoDB 7 |
| API Documentation | Swagger (OpenAPI 3.0) |
| API Gateway | Express + http-proxy-middleware |
| Frontend | HTML + CSS + Vanilla JavaScript |
| Containerization | Docker + Docker Compose |

## 🚀 Cara Menjalankan

### Prasyarat
- [Docker](https://www.docker.com/products/docker-desktop/) terinstall di komputer

### Langkah-langkah

1. **Clone/Download** project ini

2. **Jalankan dengan Docker Compose:**
   ```bash
   docker-compose up --build
   ```

3. **Akses aplikasi:**

   | Service | URL |
   |---------|-----|
   | 🖥️ Frontend | http://localhost:8080 |
   | 🌐 API Gateway | http://localhost:3000 |
   | 📖 Gateway Swagger | http://localhost:3000/api-docs |
   | 👤 User Service Swagger | http://localhost:3001/api-docs |
   | 📦 Product Service Swagger | http://localhost:3002/api-docs |
   | 🛍️ Order Service Swagger | http://localhost:3003/api-docs |

4. **Untuk menghentikan:**
   ```bash
   docker-compose down
   ```

## 📡 API Endpoints

### User Service (Port 3001)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/users` | Mendapatkan semua user |
| GET | `/api/users/:id` | Mendapatkan user by ID |
| POST | `/api/users` | Membuat user baru |
| PUT | `/api/users/:id` | Mengupdate user |
| DELETE | `/api/users/:id` | Menghapus user |

### Product Service (Port 3002)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/products` | Mendapatkan semua produk |
| GET | `/api/products/:id` | Mendapatkan produk by ID |
| POST | `/api/products` | Menambahkan produk baru |
| PUT | `/api/products/:id` | Mengupdate produk |
| DELETE | `/api/products/:id` | Menghapus produk |

### Order Service (Port 3003)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/orders` | Mendapatkan semua order |
| GET | `/api/orders/:id` | Mendapatkan order by ID |
| POST | `/api/orders` | Membuat order baru* |
| PUT | `/api/orders/:id/status` | Update status order |
| DELETE | `/api/orders/:id` | Menghapus order |

> **\*Integrasi SOA:** POST `/api/orders` memanggil **User Service** untuk validasi user dan **Product Service** untuk validasi & mengambil data produk sebelum membuat order.

## 🔗 Integrasi Antar Service

Fitur utama SOA ada di **Order Service**:
1. Saat membuat order, Order Service memanggil **User Service** (`GET /api/users/:id`) untuk memverifikasi user
2. Kemudian memanggil **Product Service** (`GET /api/products/:id`) untuk mengambil data & validasi stok produk
3. Setelah validasi berhasil, order disimpan dengan data dari kedua service

```
Client → API Gateway → Order Service → User Service (validasi user)
                                      → Product Service (validasi produk)
                                      → MongoDB (simpan order)
```

## 📂 Struktur Folder

```
ecommerce-soa/
├── docker-compose.yml          # Orchestration semua service
├── README.md
├── api-gateway/                # API Gateway (Port 3000)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js
├── user-service/               # User Service (Port 3001)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── swagger.js
│       ├── models/
│       │   └── User.js
│       └── routes/
│           └── userRoutes.js
├── product-service/            # Product Service (Port 3002)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── swagger.js
│       ├── models/
│       │   └── Product.js
│       └── routes/
│           └── productRoutes.js
├── order-service/              # Order Service (Port 3003)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── swagger.js
│       ├── models/
│       │   └── Order.js
│       └── routes/
│           └── orderRoutes.js
└── frontend/                   # Frontend (Port 8080)
    ├── Dockerfile
    ├── nginx.conf
    ├── index.html
    ├── style.css
    └── app.js
```

## 📝 Catatan

- Semua komunikasi antar service menggunakan **HTTP REST API** dengan format **JSON**
- Setiap service memiliki **database terpisah** (microservice pattern)
- **API Gateway** sebagai single entry point untuk frontend
- **Swagger/OpenAPI** documentation tersedia di setiap service
- Menggunakan **Docker** untuk containerization dan deployment
