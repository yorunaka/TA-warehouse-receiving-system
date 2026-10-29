export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  created_at: string;
}

export type DocumentStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ReceivingItem {
  id: string;
  receiving_document_id: string;
  product_id: string;
  product_sku?: string;
  product_name?: string;
  expected_quantity: number;
  received_quantity: number;
}

export interface ReceivingDocument {
  id: string;
  document_number: string;
  status: DocumentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: ReceivingItem[];
}

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  available_quantity: number;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  receiving_document_id?: string;
  document_number?: string;
  quantity_changed: number;
  transaction_type: 'RECEIPT';
  created_by: string;
  created_at: string;
}