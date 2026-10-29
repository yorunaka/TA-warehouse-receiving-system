import { Product, ReceivingDocument, InventoryItem, InventoryTransaction, User } from './types';

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


// PRODUCTS API

export const getProducts = async (): Promise<Product[]> => {
  const userId = getActiveUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  const res = await fetch('/api/items', { headers });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to fetch products (Status ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.products || data.data || []);
};

export const createProduct = async (productData: { sku: string; name: string; description?: string }): Promise<Product> => {
  const userId = getActiveUserId();

  const res = await fetch('/api/items', {
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
    throw new Error(errData.error || errData.message || 'Failed to create product');
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

export const createReceivingDocument = async (
  payload: { document_number?: string; items: { product_id: string; expected_quantity: number }[] } | { product_id: string; expected_quantity: number }[]
): Promise<ReceivingDocument> => {
  const userId = getActiveUserId();

  let nextSeq = 1;
  try {
    const existingRes = await fetch('/api/receiving-documents', {
      headers: { 'x-user-id': userId },
    });
    if (existingRes.ok) {
      const existingData = await existingRes.json();
      const list = Array.isArray(existingData) ? existingData : existingData.data || [];
      nextSeq = list.length + 1;
    }
  } catch (err) {
    console.warn('Could not fetch existing count, defaulting to 1', err);
  }

  // Dynamic document number 
  const autoDocNumber = `REC-2026-${nextSeq}`;

  let bodyPayload: { document_number: string; items: { product_id: string; expected_quantity: number }[] };

  if (Array.isArray(payload)) {
    bodyPayload = {
      document_number: autoDocNumber,
      items: payload.map((item: any) => ({
        product_id: String(item.product_id || item.item_id),
        expected_quantity: Number(item.expected_quantity),
      })),
    };
  } else {
    bodyPayload = {
      document_number: payload.document_number?.trim() || autoDocNumber,
      items: payload.items.map((item) => ({
        product_id: String(item.product_id),
        expected_quantity: Number(item.expected_quantity),
      })),
    };
  }

  const res = await fetch('/api/receiving-documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || 'Failed to create receiving document');
  }

  const result = await res.json();
  return result.data || result;
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
      item_id: Number(itemId),
      quantity: Number(quantity),
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


// Document Cancellation/Deletion API
export const cancelDocument = async (docId: string) => {

  const res = await fetch(`/api/receiving-documents/${docId}/cancel`, {
    method: 'POST',
    headers: {
      'x-user-id': localStorage.getItem('simulated_user_id') || '1',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Failed to cancel document');
    return;
  }

  // Refresh page or list state
  window.location.reload();
};

// login API
//  export const login = async (username: string, password: string): Promise<{ token: string; userId: string }> => {
//   const res = await fetch('/api/auth/login', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ username, password }),
//   });

//   const data = await res.json();
//   if (!res.ok) {
//     throw new Error(data.error || 'Login failed');
//   }

//   return { token: data.token, userId: data.userId };
// };

// // auth headers
// export const getAuthHeaders = (): Record<string, string> => {
//   const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
//   const userId = typeof window !== 'undefined' ? localStorage.getItem('x-user-id') : '1';

//   const headers: Record<string, string> = {
//     'Content-Type': 'application/json',
//     'x-user-id': userId || '1',
//   };

//   if (token) {
//     headers['Authorization'] = `Bearer ${token}`;
//   }

//   return headers;
// };

// // user API
// export async function getUsers(): Promise<User[]> {
//   const activeUserId = localStorage.getItem('simulated_user_id') || '1';
//   const res = await fetch('/api/users', {
//     headers: {
//       'x-user-id': activeUserId,
//     },
//   });

//   const data = await res.json();
//   if (!res.ok) {
//     throw new Error(data.error || 'Failed to fetch users');
//   }

//   return data.data;
// }

// export async function createUser(payload: {
//   username: string;
//   password_hash?: string;
//   password?: string;
//   role: 'USER' | 'ADMIN';
// }): Promise<User> {
//   const activeUserId = localStorage.getItem('simulated_user_id') || '1';

//   const res = await fetch('/api/users', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'x-user-id': activeUserId,
//     },
//     body: JSON.stringify(payload),
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     throw new Error(data.error || 'Failed to create user');
//   }

//   return data.data;
// }