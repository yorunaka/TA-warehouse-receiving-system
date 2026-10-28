# Product Requirements Document (PRD)

**Project Name:** Warehouse Receiving System  
**Document Version:** 1.0  
**Target Audience:** Internship Assessor / AI Coding Agent  

---

## 1. Problem Statement & Business Objectives

### 1.1 Problem Statement
The warehouse currently tracks incoming inventory manually using spreadsheets. This manual workflow results in key operational risks:
* Over-receiving errors due to lack of real-time validation.
* Lack of real-time visibility into inbound shipment statuses.
* Untracked stock adjustments and absence of an immutable transaction audit log.

### 1.2 Business Objectives
* **Strict Validation:** Prevent users from receiving more than the remaining expected quantity for any given line item.
* **Automated Stock Management:** Automatically update available inventory levels upon receiving items.
* **Process Enforcement:** Enforce status progression (`DRAFT` → `IN_PROGRESS` → `COMPLETED`) and block document completion until all items are fully received.
* **Auditability:** Provide complete visibility into current inventory stock levels and inventory transaction history.

---

## 2. User Roles & Responsibilities

| Role | Description | Core Responsibilities |
| :--- | :--- | :--- |
| **User** | Warehouse Operator | • View product catalogue and inventory levels.<br>• Record partial or full item receipts on inbound documents.<br>• View transaction history logs. |
| **Admin** | Warehouse Supervisor | • Create and manage product master records (SKU, Name, Description).<br>• Create inbound receiving documents and define expected item quantities.<br>• Oversee receiving status and system configurations. |
| **Warehouse System** | Automated System Service | • Enforce business rules independently on the backend API.<br>• Perform atomic database transactions for inventory stock updates.<br>• Maintain status transitions and audit logging. |

---

## 3. Scope of Application

### 3.1 In-Scope (MVP Core Workflows)
1. **Product Management:** Product listing, SKU creation, and uniqueness checks.
2. **Receiving Document Management:** Creating inbound receiving documents, assigning expected item line items, and tracking lifecycle status.
3. **Receiving Workflow:** Partial and full receipt processing with upper-limit expected quantity checks.
4. **Inventory & History:** Real-time stock availability and item transaction history logs.
5. **Authentication & Authorization:** Simple role-based access control (RBAC) separating `User` and `Admin` permissions.

### 3.2 Out-of-Scope
* Multi-warehouse or multi-location/bin management.
* Barcode/QR code scanning hardware integrations.
* Supplier purchase order integration or automated vendor returns.
* Analytics dashboards and financial reporting.

---

## 4. Functional Requirements

| ID | Module | Description | Actor |
| :--- | :--- | :--- | :--- |
| **FR-1** | Products | Create new products with a unique SKU, name, and optional description. | Admin |
| **FR-2** | Products | List and search registered products. | User, Admin |
| **FR-3** | Receiving | Create a new inbound receiving document in `DRAFT` status. | Admin |
| **FR-4** | Receiving | Add items (Product SKU and Expected Quantity > 0) to a receiving document. | Admin |
| **FR-5** | Receiving | Record received quantities (partial or full) for items in active receiving documents. | User |
| **FR-6** | Inventory | View current available inventory levels per product SKU. | User, Admin |
| **FR-7** | Inventory | View historical inventory transaction logs associated with receiving operations. | User, Admin |

---

## 5. Business Rules & Validation Requirements

1. **Over-Receipt Prevention:**
   $$\text{New Received Quantity} + \text{Previously Received Quantity} \le \text{Expected Quantity}$$
   Any attempt to exceed this threshold must return a `400 Bad Request` validation error.

2. **Document Completion Rule:**
   A receiving document can only transition to `COMPLETED` when **every** line item within the document satisfies:
   $$\text{Received Quantity} = \text{Expected Quantity}$$

3. **Status Lifecycle:**
   * Valid state transitions: `DRAFT` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` (or `CANCELLED`).
   * Documents marked as `COMPLETED` or `CANCELLED` become read-only and cannot receive further updates.

4. **Atomic Inventory & Transaction Logging:**
   When a receipt is submitted, the **Warehouse System** must perform the following within a single atomic database transaction:
   * Increment item's `received_quantity`.
   * Increment product's `available_quantity` in the inventory table.
   * Append an immutable record to the `inventory_transactions` audit log.
   * Update the document's overall status (`IN_PROGRESS` or `COMPLETED`).

5. **Backend Enforcement:**
   All validations must be enforced in backend services regardless of frontend client validations.

---

## 6. User Stories & Acceptance Criteria

### Story 1: Record Receiving Item (User)
* **As a** User  
* **I want to** submit the actual received quantity for a line item  
* **So that** stock counts are updated accurately in real time.  
* **Acceptance Criteria:**
  * **AC 1.1:** Submitting valid quantity increases item `received_quantity` and product `available_quantity`.
  * **AC 1.2:** Submitting a quantity where `(received + new_quantity) > expected` returns error: `"Received quantity exceeds remaining expected quantity."`
  * **AC 1.3:** If all items in the document reach expected quantity, document status automatically updates to `COMPLETED`.

### Story 2: Create Inbound Receiving Document (Admin)
* **As an** Admin  
* **I want to** create a receiving document with products and expected quantities  
* **So that** operators know what inventory to process upon arrival.  
* **Acceptance Criteria:**
  * **AC 2.1:** Creation requires a valid list of existing product IDs and expected quantities $> 0$.
  * **AC 2.2:** Document is initialized in `DRAFT` status with a unique document number.

---

## 7. Non-Functional Requirements

* **Data Integrity:** Database updates for stock changes must be ACID-compliant.
* **Security:** API routes must check role permissions (`User` vs `Admin`).
* **Deployability:** Fully containerized using Docker and Docker Compose.
* **Performance:** Standard API endpoints must respond in under 200ms.

---

## 8. Assumptions, Constraints, & Decisions

* **Assumption 1:** Admin handles setup (Products, Receiving Docs), while User handles physical warehouse operations (Receiving items, viewing inventory).
* **Assumption 2:** Partial receipts are permissible across multiple batches until total expected quantity is met.
* **Constraint:** Assessment execution window requires prioritizing correctness, API validation, and business rule test coverage over visual UI polish.
* **Decision:** Inventory stock is updated immediately upon each receipt entry rather than held until document completion.