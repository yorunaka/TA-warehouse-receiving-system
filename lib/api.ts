import { Product, ReceivingDocument, InventoryItem, InventoryTransaction } from './types';

// Helper to get simulated active user role header
export const getActiveUserId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('wms_user_id') || '1';
  }
  return '1';
};


// PRODUCTS API

export const getProducts = async (): Promise<Product[]> => {
  const userId = getActiveUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  const res = await fetch('/api/products', { headers });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch products (Status ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.products || data.data || []);
};

export const createProduct = async (productData: { sku: string; name: string; description?: string }): Promise<Product> => {
  const userId = getActiveUserId();

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify(productData),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('Server product creation error:', errData);
    throw new Error(errData.message || 'Failed to create product');
  }

  return await res.json();
};

// RECEIVING DOCUMENTS API

export const getReceivingDocuments = async (): Promise<ReceivingDocument[]> => {
  const userId = getActiveUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  const res = await fetch('/api/receiving-documents', { headers });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch receiving documents (Status ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.documents || data.data || []);
};

export const getReceivingDocumentById = async (id: string): Promise<ReceivingDocument> => {
  const userId = getActiveUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  const res = await fetch(`/api/receiving-documents/${id}`, { headers });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch document details (Status ${res.status})`);
  }

  return await res.json();
};

export const createReceivingDocument = async (items: { product_id: string; expected_quantity: number }[]): Promise<ReceivingDocument> => {
  const userId = getActiveUserId();

  const res = await fetch('/api/receiving-documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('Server receiving document creation error:', errData);
    throw new Error(errData.message || 'Failed to create receiving document');
  }

  return await res.json();
};

// Core atomic receiving engine execution
export const recordReceipt = async (documentId: string, itemId: string, quantity: number): Promise<ReceivingDocument> => {
  const userId = getActiveUserId();

  const res = await fetch(`/api/receiving-documents/${documentId}/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify({
      item_id: itemId,
      quantity: quantity,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('Server receipt recording error:', errData);
    throw new Error(errData.message || 'Failed to record receipt');
  }

  return await res.json();
};

// INVENTORY 

export const getInventory = async (): Promise<InventoryItem[]> => {
  const userId = getActiveUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  const res = await fetch('/api/inventory', { headers });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch inventory (Status ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.inventory || data.data || []);
};

export const getTransactions = async (): Promise<InventoryTransaction[]> => {
  const userId = getActiveUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  const res = await fetch('/api/inventory/transactions', { headers });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch transaction logs (Status ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.transactions || data.data || []);
};
