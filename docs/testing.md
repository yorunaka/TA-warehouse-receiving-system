# Testing & Quality Assurance Document

## 1. Automated Test Suite Overview

The test suite covers core business rules, API input validation, atomic inventory updates, and document state transitions.

| Test Category | Scope / Target |
| :--- | :--- |
| **Unit Tests** | Validation helper logic, state transition checks. |
| **Integration Tests** | API endpoints, DB transaction rollbacks, duplicate requests. |
| **Business Rule End-to-End** | Full receiving process flow from DRAFT creation to COMPLETION. |

---

## 2. Key Business Rule Test Scenarios

### Test Case 1: Over-Receipt Prevention
* **Goal:** Verify that receiving more than expected is rejected.
* **Steps:**
  1. Create document with expected quantity = 10.
  2. Receive 5 units (Status 200 OK, Received = 5).
  3. Attempt to receive 6 units.
* **Expected Result:** API returns `400 Bad Request` with message: `"Received quantity exceeds remaining expected quantity."` Inventory remains 5.

### Test Case 2: Automatic Stock Increment & Log
* **Goal:** Confirm inventory stock increments accurately upon receipt.
* **Steps:**
  1. Record receipt of 4 units for product SKU `SKU-100`.
* **Expected Result:** `inventory.available_quantity` increments by +4 and an entry is added to `inventory_transactions`.

### Test Case 3: Document Completion Condition
* **Goal:** Verify automatic completion transition.
* **Steps:**
  1. Item A (Expected 5, Received 5), Item B (Expected 2, Received 1) -> Status remains `IN_PROGRESS`.
  2. Receive 1 unit on Item B (Received 2 of 2) -> Status transitions to `COMPLETED`.

---

## 3. Known Limitations & Future Improvements
1. **Concurrency Lock Timeout:** Under extremely high concurrent updates on the exact same line item, lock wait timeouts could occur.
2. **Batch Receiving UI:** Current UI allows receiving one line item at a time rather than multi-item bulk submission.