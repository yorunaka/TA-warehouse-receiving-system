-- 001_initial_schema.sql

-- 1. Users Table (Roles: ADMIN | USER)
CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE products (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inventory Table (1-to-1 track stock per product)
CREATE TABLE inventory (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    product_id BIGINT UNIQUE NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Receiving Documents Table
CREATE TABLE receiving_documents (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    document_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Receiving Items Table
CREATE TABLE receiving_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    receiving_document_id BIGINT NOT NULL REFERENCES receiving_documents(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    expected_quantity INT NOT NULL CHECK (expected_quantity > 0),
    received_quantity INT NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    
    -- Enforce Over-receipt constraint at DB level (FR-5 / Rule 1)
    CONSTRAINT chk_received_not_exceed_expected CHECK (received_quantity <= expected_quantity),
    CONSTRAINT uq_receiving_doc_product UNIQUE (receiving_document_id, product_id)
);

-- 6. Inventory Transactions Log Table
CREATE TABLE inventory_transactions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    receiving_document_id BIGINT REFERENCES receiving_documents(id) ON DELETE SET NULL,
    quantity_changed INT NOT NULL CHECK (quantity_changed > 0),
    transaction_type VARCHAR(20) NOT NULL DEFAULT 'RECEIPT',
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & lookups
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_receiving_docs_status ON receiving_documents(status);
CREATE INDEX idx_receiving_items_doc_id ON receiving_items(receiving_document_id);
CREATE INDEX idx_inventory_tx_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_tx_doc_id ON inventory_transactions(receiving_document_id);

-- Trigger: Automatically initialize inventory record when a new product is created
CREATE OR REPLACE FUNCTION fn_auto_create_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (product_id, available_quantity)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_inventory
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_inventory();

-- Trigger: Automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_receiving_docs_updated_at BEFORE UPDATE ON receiving_documents FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Seed Default Admin & Operator Users for Assessment Testing
-- User ID 1 = admin_supervisor, User ID 2 = warehouse_operator
INSERT INTO users (username, role) VALUES 
('admin_supervisor', 'ADMIN'),
('warehouse_operator', 'USER')
ON CONFLICT (username) DO NOTHING;