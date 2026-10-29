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


