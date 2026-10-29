# 📦 Warehouse Receiving System (Inbound Operations)

> A containerized, full-stack Next.js application built for managing inbound logistical receiving workflows, inventory transaction logs, and role-based access control (RBAC).

---

## 🏛️ Architecture & Overview

This project leverages Next.js (App Router) using the **Backend-for-Frontend (BFF)** pattern. By serving both the interactive UI dashboard and serverless API routes under a single unified Next.js instance, deployment is streamlined into a single containerized unit.

```
                  ┌─────────────────────────────────────────┐
                  │          Next.js App Container          │
                  │  ┌──────────────────┐ ┌──────────────┐  │
                  │  │  React Frontend   │ │ App Router   │  │
───────────────►  │  │  Client Dashboard│ │ API Routes   │  │
 HTTP / HTTPS     │  └────────┬─────────┘ └──────┬───────┘  │
                  └───────────┼──────────────────┼──────────┘
                              │                  │
                              ▼                  ▼
                   ┌──────────────────────────────────────┐
                   │        PostgreSQL 16 Engine          │
                   └──────────────────────────────────────┘
```

### ⚡ Key Specifications
* **Framework:** Next.js (TypeScript, App Router)
* **Database:** PostgreSQL 16 (Alpine)
* **Containerization:** Docker & Docker Compose
* **Authentication:** Simulated Header & Cookie-based RBAC (`ADMIN` Supervisor & `USER` Operator)
* **Scope:** Strictly **Inbound Operations** (Catalog Management, Inbound Receiving Documents, Item Receipt Processing, Stock Aggregation, Audit Trails, and Administrative User Management). *Outbound dispatch is explicitly excluded by design.*

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Application Port
PORT=3000
NODE_ENV=development

# Database Configuration (Host Machine Access for DBeaver/DataGrip)
POSTGRES_USER=warehouse_user
POSTGRES_PASSWORD=warehouse_pass
POSTGRES_DB=warehouse_db
POSTGRES_PORT=5433

# Database Connection URL (Container-to-Container via Docker Bridge Network)
DATABASE_URL=postgresql://warehouse_user:warehouse_pass@postgres:5432/warehouse_db
```

> 💡 **Port Architecture Note:** Inside the internal Docker bridge network, PostgreSQL listens on standard port `5432`. Setting `POSTGRES_PORT=5433` maps this internal port to your host machine for external GUI tools (*DBeaver*, *DataGrip*, etc.).

---

## 🚀 Setup & Quickstart

### Prerequisites
* [Docker Desktop](https://www.docker.com/) (v20.10+)
* [Node.js](https://nodejs.org/) (v18+) *— optional, if running natively outside Docker*

### 1. Build and Run
Launch both the Next.js application and PostgreSQL database with a single command:

```bash
docker compose up -d --build
```

### 2. Verify Container Health
Check that both services are up and healthy:

```bash
docker ps
```

---

## 🌐 Accessing the Application

Once containers are active, access the web application and backend API:

| Interface / Resource | URL / Address | Credentials / Details |
| :--- | :--- | :--- |
| **Web UI Dashboard** | `http://localhost:3000` | Frontend Receiving Interface |
| **Interactive API Tester** | `http://localhost:3000/host` | In-browser API Test Suite |
| **PostgreSQL Host Access** | `localhost:5433` | User: `warehouse_user` \| DB: `warehouse_db` |

---

## 📡 Inbound Operations API Reference

### 📦 Inbound Receiving Documents

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/receiving-documents` | List manifests with pre-aggregated line item totals |
| `POST` | `/api/receiving-documents` | Create a new receiving document draft *(ADMIN)* |
| `GET` | `/api/receiving-documents/[id]` | Retrieve specific manifest with detailed line items |
| `POST` | `/api/receiving-documents/[id]/receive` | Record item receipt, update stock, log transaction |
| `POST` | `/api/receiving-documents/[id]/cancel` | Cancel draft or in-progress manifest *(ADMIN)* |

### 📊 Inventory & Stock Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/inventory` | Retrieve catalog SKUs and available stock levels also fetch full audit log history |
---

## 🧪 Testing & Verification

A built-in interactive client dashboard is included to easily test and verify API endpoints directly in your browser:

👉 **[http://localhost:3000/host](http://localhost:3000/host)**

---

## 🚢 Production Deployment

### 1. Environment Hardening
* Update `POSTGRES_USER` and `POSTGRES_PASSWORD` with strong production credentials.
* Ensure `NODE_ENV=production`.
* Enforce secret encryption for session cookies and token management.

### 2. Standalone Container Deployment
For cloud infrastructure (AWS EC2, GCP Compute Engine, DigitalOcean App Platform):

```bash
# Build standalone production image
docker build -t warehouse-receiving-system:latest .

# Run containerized application
docker run -d \
  --name warehouse_app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@your-db-host:5432/warehouse_db" \
  warehouse-receiving-system:latest
```

### 3. Volume Persistence & Maintenance

```bash
# Export production DB dump
docker exec -t warehouse_db pg_dump -U warehouse_user warehouse_db > backup_$(date +%Y%m%d).sql

# Apply schema migrations manually
docker exec -i warehouse_db psql -U warehouse_user -d warehouse_db < migrations/001_initial_schema.sql
```