# AI Agent Workflow Documentation

This document records the interaction patterns and prompts used with the AI coding agent during system implementation.

## Strategy & Approach
Development followed a specification-driven workflow:
1. Provide core documentation (`/docs/prd.md` and `/docs/technical-spec.md`) as contextual inputs.
2. Direct the AI agent to generate database migrations, backend models, API routes, and tests incrementally based strictly on the PRD specification.
3. Review generated code against business rules (over-receipt prevention, atomic updates).

---

## Key Prompts & AI Directives

### Prompt 1: Database Setup & Migration Script
> **Prompt:** "Using `/docs/technical-spec.md`, generate SQL migration scripts for PostgreSQL. Include check constraints for over-receipt prevention on line items, indices for SKUs and document statuses, and an default inventory row trigger or initial script."

### Prompt 2: Core Receiving API & Atomic Transaction Logic
> **Prompt:** "Implement the backend endpoint `POST /api/receiving-documents/:id/receive` using the business rules in `/docs/prd.md`. Ensure that checking existing quantities and performing inventory increment occurs within a single PostgreSQL database transaction using row-level locking (`FOR UPDATE`) to handle concurrent receipts safely."

### Prompt 3: Unit & Integration Tests Generation
> **Prompt:** "Generate automated API tests (using Jest/Supertest or PyTest) that verify business rules: 1) Over-receipt attempts return 400 Bad Request, 2) Stock updates automatically increment, and 3) Document auto-completes only when all items are fully received."