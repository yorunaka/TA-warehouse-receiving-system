// app/api/docs/spec/openapi-schema.ts

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Warehouse Receiving System API",
    version: "1.0.0",
    description: "API Specification for Warehouse Receiving System assessment."
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Docker / Development Server"
    }
  ],
  paths: {
    "/api/health": {
      get: {
        summary: "System Health & Readiness Check",
        responses: {
          "200": { description: "System and database are healthy" },
          "500": { description: "Database connection failed" }
        }
      }
    },
    "/api/items": {
      get: {
        summary: "List all items",
        responses: {
          "200": { description: "List of items" }
        }
      },
      post: {
        summary: "Create a new item (Admin only)",
        parameters: [
          {
            name: "x-user-id",
            in: "header",
            required: false,
            schema: { type: "string", example: "1" },
            description: "User ID (1 for Admin, 2 for Operator)"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sku", "name"],
                properties: {
                  sku: { type: "string", example: "SKU-KEYBOARD-01" },
                  name: { type: "string", example: "Mechanical Keyboard" },
                  description: { type: "string", example: "RGB Gaming Keyboard" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Product created successfully" },
          "400": { description: "Invalid input" },
          "403": { description: "Forbidden - Admin required" },
          "409": { description: "SKU already exists" }
        }
      }
    },
    "/api/receiving-documents": {
      get: {
        summary: "List all receiving documents",
        responses: {
          "200": { description: "List of receiving documents" }
        }
      },
      post: {
        summary: "Create receiving document header and line items (Admin only)",
        parameters: [
          {
            name: "x-user-id",
            in: "header",
            required: false,
            schema: { type: "string", example: "1" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["document_number", "items"],
                properties: {
                  document_number: { type: "string", example: "REC-2026-001" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["product_id", "expected_quantity"],
                      properties: {
                        product_id: { type: "integer", example: 1 },
                        expected_quantity: { type: "integer", example: 10 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Document created" },
          "400": { description: "Invalid payload" }
        }
      }
    },
    "/api/receiving-documents/{id}": {
      get: {
        summary: "Get receiving document details with items",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          "200": { description: "Document details" },
          "404": { description: "Document not found" }
        }
      }
    },
    "/api/receiving-documents/{id}/receive": {
      post: {
        summary: "Record receiving item (Atomic Stock Increment & Transaction Log)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" }
          },
          {
            name: "x-user-id",
            in: "header",
            required: false,
            schema: { type: "string", example: "2" },
            description: "User ID (Operator or Admin)"
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["item_id", "quantity_received"],
                properties: {
                  item_id: { type: "integer", example: 1 },
                  quantity_received: { type: "integer", example: 5 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Receiving successful" },
          "400": { description: "Over-receiving error or document closed" },
          "404": { description: "Document or item not found" }
        }
      }
    },
    "/api/inventory": {
      get: {
        summary: "List available stock per product",
        responses: {
          "200": { description: "List of inventory items" }
        }
      }
    },
    "/api/inventory/transactions": {
      get: {
        summary: "Get immutable inventory transaction history logs",
        responses: {
          "200": { description: "Transaction history" }
        }
      }
    }
  }
};