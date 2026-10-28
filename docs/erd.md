erDiagram
    USERS {
        uuid id PK
        string username
        string role "ADMIN | USER"
        datetime created_at
    }

    PRODUCTS {
        uuid id PK
        string sku UK
        string name
        string description
        datetime created_at
    }

    RECEIVING_DOCUMENTS {
        uuid id PK
        string document_number UK
        string status "DRAFT | IN_PROGRESS | COMPLETED | CANCELLED"
        uuid created_by FK
        datetime created_at
        datetime updated_at
    }

    RECEIVING_ITEMS {
        uuid id PK
        uuid receiving_document_id FK
        uuid product_id FK
        int expected_quantity
        int received_quantity
    }

    INVENTORY {
        uuid id PK
        uuid product_id FK, UK
        int available_quantity
        datetime updated_at
    }

    INVENTORY_TRANSACTIONS {
        uuid id PK
        uuid product_id FK
        uuid receiving_document_id FK
        int quantity_changed
        string transaction_type "RECEIPT"
        uuid created_by FK
        datetime created_at
    }

    USERS ||--o{ RECEIVING_DOCUMENTS : "creates"
    USERS ||--o{ INVENTORY_TRANSACTIONS : "records"
    RECEIVING_DOCUMENTS ||--|{ RECEIVING_ITEMS : "contains"
    PRODUCTS ||--|| INVENTORY : "tracks stock"
    PRODUCTS ||--o{ RECEIVING_ITEMS : "referenced in"
    PRODUCTS ||--o{ INVENTORY_TRANSACTIONS : "logged in"
    RECEIVING_DOCUMENTS ||--o{ INVENTORY_TRANSACTIONS : "originates"