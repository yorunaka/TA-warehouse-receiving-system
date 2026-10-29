'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getReceivingDocuments, createReceivingDocument, getProducts, getActiveUserId } from '@/lib/api';
import { ReceivingDocument, Product } from '@/lib/types';
import { StatusBadge } from '@/app/src/components/navbar';

export default function ReceivingDocumentsPage() {
  const [documents, setDocuments] = useState<ReceivingDocument[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Creation Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [lineItems, setLineItems] = useState<{ product_id: string; expected_quantity: number }[]>([
    { product_id: '', expected_quantity: 1 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = getActiveUserId() === '1';

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsData, itemsData] = await Promise.all([
        getReceivingDocuments(),
        getProducts(),
      ]);
      setDocuments(docsData);
      setItems(itemsData);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to load receiving documents');
      } else {
        setError('Failed to load receiving documents');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        setLoading(true);
        const [docsData, itemsData] = await Promise.all([
          getReceivingDocuments(),
          getProducts(),
        ]);
        if (isMounted) {
          setDocuments(docsData);
          setItems(itemsData);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load receiving documents');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchAll();

    return () => {
      isMounted = false;
    };
  }, []);

  // Form Handlers for Line Items
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { product_id: '', expected_quantity: 1 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: 'item_id' | 'expected_quantity', value: unknown) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate line items
    const hasInvalidItem = lineItems.some((item) => !item.product_id || item.expected_quantity <= 0);
    if (hasInvalidItem) {
      setFormError('Please select a valid item SKU and an expected quantity greater than 0 for all rows.');
      return;
    }

    try {
      setSubmitting(true);
      await createReceivingDocument(lineItems);
      setIsOpen(false);
      setLineItems([{ product_id: '', expected_quantity: 1 }]);
      
      // Reload updated documents list
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message || 'Failed to create receiving document');
      } else {
        setFormError('Failed to create receiving document');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered document list
  const filteredDocuments = statusFilter === 'ALL'
    ? documents
    : documents.filter((d) => d.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Inbound Receiving Documents</h1>
          <p className="text-sm text-slate-400">Manage inbound delivery manifests and process physical receipts.</p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-medium text-sm transition self-start sm:self-auto"
          >
            + Create New Document
          </button>
        ) : (
          <span className="text-xs text-amber-500 bg-amber-950/40 border border-amber-800/50 px-3 py-1.5 rounded self-start sm:self-auto">
            Operator View (Admin Required to Create Documents)
          </span>
        )}
      </div>

      {error && <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-md text-sm">{error}</div>}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        {['ALL', 'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-md transition ${
              statusFilter === status
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">Document</th>
              <th className="p-4">Status</th>
              <th className="p-4">Line Items</th>
              <th className="p-4">Total Expected</th>
              <th className="p-4">Total Received</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading documents...</td></tr>
            ) : filteredDocuments.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">No documents found.</td></tr>
            ) : (
              filteredDocuments.map((doc) => {
                const totalExpected = doc.items?.reduce((sum, i) => sum + i.expected_quantity, 0) || 0;
                const totalReceived = doc.items?.reduce((sum, i) => sum + i.received_quantity, 0) || 0;

                return (
                  <tr key={doc.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-medium text-emerald-400">{doc.document_number}</td>
                    <td className="p-4"><StatusBadge status={doc.status} /></td>
                    <td className="p-4 text-slate-300">{doc.items?.length || 0} line item(s)</td>
                    <td className="p-4 text-slate-200 font-mono">{totalExpected}</td>
                    <td className="p-4 text-slate-200 font-mono">{totalReceived}</td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/receiving-documents/${doc.id}`}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs px-3 py-1.5 rounded font-medium transition inline-block"
                      >
                        Inspect / Receive →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100">Create Receiving Document (Draft)</h3>
            <p className="text-xs text-slate-400">Select items from catalog and assign expected units.</p>

            {formError && <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-xs">{formError}</div>}

            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-300">Inbound Line Items *</label>

                {lineItems.map((row, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-800/50 p-3 rounded border border-slate-800">
                    <div className="flex-1">
                      <select
                        required
                        value={row.product_id}
                        onChange={(e) => handleLineItemChange(index, 'item_id', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded px-2.5 py-2 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Select SKU Item --</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.sku} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.expected_quantity}
                        onChange={(e) => handleLineItemChange(index, 'expected_quantity', Number(e.target.value))}
                        placeholder="Qty"
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded px-2.5 py-2 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        className="text-rose-400 hover:text-rose-300 text-xs p-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-xs text-emerald-400 hover:underline font-medium pt-1 inline-block"
                >
                  + Add Another SKU Item
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
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
                  {submitting ? 'Creating...' : 'Create Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}