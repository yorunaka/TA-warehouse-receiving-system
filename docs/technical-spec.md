# Technical Specification

## 1. System Architecture

The Warehouse Receiving System follows a classic containerized multi-tier architecture:

```
+-------------------------------------------------------+
|                    Frontend UI                        |
|             (React / Next.js / HTML SPA)              |
+-------------------------------------------------------+
                           |
                           | HTTP / REST API (JSON)
                           v
+-------------------------------------------------------+
|                    Backend API                        |
|              (Node.js / Python / Go)                  |
|  - Role Authentication (User / Admin)                 |
|  - Business Rule Validation Engine                    |
|  - Transaction Management                             |
+-------------------------------------------------------+
                           |
                           | Database Queries / Transactions
                           v
+-------------------------------------------------------+
|                Relational Database                    |
|                    (PostgreSQL)                       |
+-------------------------------------------------------+
```

### Components & Responsibilities
* **Frontend:** Renders UI forms for Product, Receiving Document, and Inventory management. Validates basic inputs client-side.
* **Backend API:** Enforces authentication/authorization, executes business logic validation (over-receipt checks, document status transitions), and wraps database mutations in explicit SQL transactions.
* **PostgreSQL Database:** Provides persistent, ACID-compliant storage for system entities and enforces dynamic data integrity constraints.

---

## 2. Database Schema & Migration Strategy

### Tables & Indexes

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_products_sku ON products(sku);

-- Inventory Table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Receiving Documents Table
CREATE TABLE receiving_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_receiving_docs_status ON receiving_documents(status);

-- Receiving Items Table
CREATE TABLE receiving_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_document_id UUID NOT NULL REFERENCES receiving_documents(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    expected_quantity INT NOT NULL CHECK (expected_quantity > 0),
    received_quantity INT NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    CONSTRAINT chk_received_not_exceed_expected CHECK (received_quantity <= expected_quantity)
);

-- Inventory Transactions Log Table
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    receiving_document_id UUID REFERENCES receiving_documents(id),
    quantity_changed INT NOT NULL CHECK (quantity_changed > 0),
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'RECEIPT',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Strategy
Database changes are handled through sequential, idempotent SQL migration scripts (e.g., `001_initial_schema.sql`). These migrations are executed automatically during docker setup before the backend application process starts.

---

## 3. State Transitions

Valid status progression for `ReceivingDocument`:

```
 [DRAFT] ----(Add Items / First Receipt)---> [IN_PROGRESS]
    |                                              |
    |--(Cancel)--> [CANCELLED]                     |--(All Items Received)--> [COMPLETED]
```

* **Rules:**
  * Terminal states (`COMPLETED`, `CANCELLED`) accept no modifications or receipt operations.
  * Direct manual transition to `COMPLETED` is rejected if any line item has `received_quantity < expected_quantity`.

---

## 4. Authorization Matrix

| Endpoint / Action | User (Operator) | Admin (Supervisor) |
| :--- | :---: | :---: |
| List Products / Inventory / Logs | Yes | Yes |
| Create Product | No | Yes |
| Create Receiving Document | No | Yes |
| Record Receipt Quantities | Yes | Yes |
| Cancel Receiving Document | No | Yes |

---

## 5. Main Receiving API Workflow Sequence

```
User -> Backend: POST /api/receiving-documents/:id/receive (item_id, quantity)
Backend -> DB: BEGIN TRANSACTION
Backend -> DB: SELECT item, doc WHERE id = item_id FOR UPDATE
Backend -> Check: Is doc.status IN ('DRAFT', 'IN_PROGRESS')?
                  Is (item.received_quantity + input_qty) <= item.expected_quantity?
   IF INVALID:
      Backend -> User: 400 Bad Request (Rollback)
   IF VALID:
      Backend -> DB: UPDATE receiving_items SET received_quantity = received_quantity + input_qty
      Backend -> DB: UPDATE inventory SET available_quantity = available_quantity + input_qty
      Backend -> DB: INSERT INTO inventory_transactions (...)
      Backend -> DB: Check if all doc items are fully received
         IF ALL FULLY RECEIVED: UPDATE receiving_documents SET status = 'COMPLETED'
         ELSE: UPDATE receiving_documents SET status = 'IN_PROGRESS'
Backend -> DB: COMMIT TRANSACTION
Backend -> User: 200 OK (Updated item & document details)
```