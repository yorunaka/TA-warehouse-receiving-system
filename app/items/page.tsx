'use client';

import { useState, useEffect } from 'react';
import { getProducts, createProduct, getActiveUserId } from '@/lib/api';
import { Product } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form State
  const [isOpen, setIsOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = getActiveUserId() === '1';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load products');
      } else {
        setError('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createProduct({ sku, name, description });
      setIsOpen(false);
      setSku('');
      setName('');
      setDescription('');
      fetchProducts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message || 'Failed to create product');
      } else {
        setFormError('Failed to create product');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Product Catalog</h1>
          <p className="text-sm text-slate-400">Master listing of registered warehouse SKUs and catalog items.</p>
        </div>
        {isAdmin ? (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-medium text-sm transition"
          >
            + Create New SKU
          </button>
        ) : (
          <span className="text-xs text-amber-500 bg-amber-950/40 border border-amber-800/50 px-3 py-1.5 rounded">
            Operator View Only (Admin Required to Create SKU)
          </span>
        )}
      </div>

      {error && <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-md text-sm">{error}</div>}

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">SKU Code</th>
              <th className="p-4">Product Name</th>
              <th className="p-4">Description</th>
              <th className="p-4">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading catalog...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">No products found.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="p-4 font-mono font-medium text-emerald-400">{p.sku}</td>
                  <td className="p-4 font-medium text-slate-200">{p.name}</td>
                  <td className="p-4 text-slate-400">{p.description || '-'}</td>
                  <td className="p-4 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Add New Product</h3>
            {formError && <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs">{formError}</div>}
            
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">SKU Code *</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-1002"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mechanical Keyboard"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional item details..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}