import { Product, ReceivingDocument, InventoryItem, InventoryTransaction } from './types';

// Helper to simulate network latency
const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to get simulated active user role header
export const getActiveUserId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('wms_user_id') || '1';
  }
  return '1';
};
export const setActiveUserId = (userId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('wms_user_id', userId);
    window.location.reload();
  }
};

// ==========================================
// MOCK DATABASE STATE
// ==========================================

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    sku: 'SKU-LOGI-01',
    name: 'Logitech MX Master 3S',
    description: 'Ergonomic Wireless Mouse',
    created_at: new Date('2026-10-01').toISOString(),
  },
  {
    id: 'prod-2',
    sku: 'SKU-KEY-02',
    name: 'Keychron K2 Mechanical Keyboard',
    description: '75% Layout Wireless Keyboard',
    created_at: new Date('2026-10-05').toISOString(),
  },
  {
    id: 'prod-3',
    sku: 'SKU-MON-03',
    name: 'Dell UltraSharp 27" Monitor',
    description: '4K IPS USB-C Monitor',
    created_at: new Date('2026-10-10').toISOString(),
  },
];

const mockInventory: InventoryItem[] = [
  { id: 'inv-1', product_id: 'prod-1', sku: 'SKU-LOGI-01', name: 'Logitech MX Master 3S', available_quantity: 12, updated_at: new Date().toISOString() },
  { id: 'inv-2', product_id: 'prod-2', sku: 'SKU-KEY-02', name: 'Keychron K2 Mechanical Keyboard', available_quantity: 5, updated_at: new Date().toISOString() },
  { id: 'inv-3', product_id: 'prod-3', sku: 'SKU-MON-03', name: 'Dell UltraSharp 27" Monitor', available_quantity: 0, updated_at: new Date().toISOString() },
];

const mockDocuments: ReceivingDocument[] = [
  {
    id: 'doc-101',
    document_number: 'REC-2026-001',
    status: 'IN_PROGRESS',
    created_by: '1',
    created_at: new Date('2026-10-20').toISOString(),
    updated_at: new Date('2026-10-21').toISOString(),
    items: [
      { id: 'item-1', receiving_document_id: 'doc-101', product_id: 'prod-1', product_sku: 'SKU-LOGI-01', product_name: 'Logitech MX Master 3S', expected_quantity: 20, received_quantity: 12 },
      { id: 'item-2', receiving_document_id: 'doc-101', product_id: 'prod-2', product_sku: 'SKU-KEY-02', product_name: 'Keychron K2 Mechanical Keyboard', expected_quantity: 10, received_quantity: 5 },
    ],
  },
  {
    id: 'doc-102',
    document_number: 'REC-2026-002',
    status: 'DRAFT',
    created_by: '1',
    created_at: new Date('2026-10-28').toISOString(),
    updated_at: new Date('2026-10-28').toISOString(),
    items: [
      { id: 'item-3', receiving_document_id: 'doc-102', product_id: 'prod-3', product_sku: 'SKU-MON-03', product_name: 'Dell UltraSharp 27" Monitor', expected_quantity: 15, received_quantity: 0 },
    ],
  },
];

const mockTransactions: InventoryTransaction[] = [
  {
    id: 'tx-1',
    product_id: 'prod-1',
    sku: 'SKU-LOGI-01',
    product_name: 'Logitech MX Master 3S',
    receiving_document_id: 'doc-101',
    document_number: 'REC-2026-001',
    quantity_changed: 12,
    transaction_type: 'RECEIPT',
    created_by: '2',
    created_at: new Date('2026-10-21T10:30:00Z').toISOString(),
  },
  {
    id: 'tx-2',
    product_id: 'prod-2',
    sku: 'SKU-KEY-02',
    product_name: 'Keychron K2 Mechanical Keyboard',
    receiving_document_id: 'doc-101',
    document_number: 'REC-2026-001',
    quantity_changed: 5,
    transaction_type: 'RECEIPT',
    created_by: '2',
    created_at: new Date('2026-10-21T11:00:00Z').toISOString(),
  },
];

// ==========================================
// MOCK PRODUCTS API
// ==========================================

export const getProducts = async (): Promise<Product[]> => {
  await delay();
  return [...mockProducts];
};

export const createProduct = async (productData: { sku: string; name: string; description?: string }): Promise<Product> => {
  await delay();
  
  // RBAC Simulation check
  if (getActiveUserId() !== '1') {
    throw new Error('HTTP 403 Forbidden: Only Admin (User 1) can create products');
  }

  // Duplicate SKU validation check
  if (mockProducts.some((p) => p.sku.toLowerCase() === productData.sku.toLowerCase())) {
    throw new Error('Product SKU already exists');
  }

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    sku: productData.sku,
    name: productData.name,
    description: productData.description,
    created_at: new Date().toISOString(),
  };

  mockProducts.push(newProduct);

  // Initialize stock in inventory
  mockInventory.push({
    id: `inv-${Date.now()}`,
    product_id: newProduct.id,
    sku: newProduct.sku,
    name: newProduct.name,
    available_quantity: 0,
    updated_at: new Date().toISOString(),
  });

  return newProduct;
};

// ==========================================
// MOCK RECEIVING DOCUMENTS API
// ==========================================

export const getReceivingDocuments = async (): Promise<ReceivingDocument[]> => {
  await delay();
  return [...mockDocuments];
};

export const getReceivingDocumentById = async (id: string): Promise<ReceivingDocument> => {
  await delay();
  const doc = mockDocuments.find((d) => d.id === id);
  if (!doc) throw new Error('Receiving document not found');
  return { ...doc };
};

export const createReceivingDocument = async (items: { product_id: string; expected_quantity: number }[]): Promise<ReceivingDocument> => {
  await delay();

  if (getActiveUserId() !== '1') {
    throw new Error('HTTP 403 Forbidden: Only Admin (User 1) can create receiving documents');
  }

  const newDoc: ReceivingDocument = {
    id: `doc-${Date.now()}`,
    document_number: `REC-2026-${String(mockDocuments.length + 1).padStart(3, '0')}`,
    status: 'DRAFT',
    created_by: getActiveUserId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: items.map((item, idx) => {
      const p = mockProducts.find((prod) => prod.id === item.product_id);
      return {
        id: `item-${Date.now()}-${idx}`,
        receiving_document_id: `doc-${Date.now()}`,
        product_id: item.product_id,
        product_sku: p?.sku || 'UNKNOWN',
        product_name: p?.name || 'Unknown Product',
        expected_quantity: item.expected_quantity,
        received_quantity: 0,
      };
    }),
  };

  mockDocuments.push(newDoc);
  return newDoc;
};

// Core atomic receiving engine execution (Mock implementation of Rule 1, 2, and 3)
export const recordReceipt = async (documentId: string, itemId: string, quantity: number): Promise<ReceivingDocument> => {
  await delay();

  const docIndex = mockDocuments.findIndex((d) => d.id === documentId);
  if (docIndex === -1) throw new Error('Receiving document not found');

  const doc = mockDocuments[docIndex];

  // Business Rule 3: Closed State Lock check
  if (doc.status === 'COMPLETED' || doc.status === 'CANCELLED') {
    throw new Error(`Cannot perform receipt on document in ${doc.status} status.`);
  }

  const itemIndex = doc.items?.findIndex((i) => i.id === itemId) ?? -1;
  if (itemIndex === -1 || !doc.items) throw new Error('Line item not found in document');

  const item = doc.items[itemIndex];
  const newTotalReceived = item.received_quantity + quantity;

  // Business Rule 1: Over-Receipt Protection
  if (newTotalReceived > item.expected_quantity) {
    const remaining = item.expected_quantity - item.received_quantity;
    throw new Error(`Over-receipt protection error: Cannot receive ${quantity} units. Remaining expected quantity is ${remaining}.`);
  }

  // Update line item received quantity
  item.received_quantity = newTotalReceived;

  // Update Inventory stock
  const invItem = mockInventory.find((i) => i.product_id === item.product_id);
  if (invItem) {
    invItem.available_quantity += quantity;
    invItem.updated_at = new Date().toISOString();
  }

  // Create immutable transaction log entry
  mockTransactions.unshift({
    id: `tx-${Date.now()}`,
    product_id: item.product_id,
    sku: item.product_sku || '',
    product_name: item.product_name || '',
    receiving_document_id: doc.id,
    document_number: doc.document_number,
    quantity_changed: quantity,
    transaction_type: 'RECEIPT',
    created_by: getActiveUserId(),
    created_at: new Date().toISOString(),
  });

  // Business Rule 3: State Progression Check
  const allFullyReceived = doc.items.every((i) => i.received_quantity === i.expected_quantity);
  doc.status = allFullyReceived ? 'COMPLETED' : 'IN_PROGRESS';
  doc.updated_at = new Date().toISOString();

  mockDocuments[docIndex] = doc;
  return { ...doc };
};

// ==========================================
// MOCK INVENTORY & AUDIT LOGS API
// ==========================================

export const getInventory = async (): Promise<InventoryItem[]> => {
  await delay();
  return [...mockInventory];
};

export const getTransactions = async (): Promise<InventoryTransaction[]> => {
  await delay();
  return [...mockTransactions];
};