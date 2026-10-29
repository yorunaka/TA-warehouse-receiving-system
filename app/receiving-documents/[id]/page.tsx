'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getReceivingDocumentById, recordReceipt } from '@/lib/mockapi';
import { ReceivingDocument, ReceivingItem } from '@/lib/types';
import { StatusBadge } from '@/app/src/components/navbar';

export default function ReceivingDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [document, setDocument] = useState<ReceivingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receiving state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState<number>(1);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDocumentDetail = async () => {
      try {
        setLoading(true);
        const data = await getReceivingDocumentById(id);
        
        if (isMounted) {
          const singleDoc = Array.isArray(data) ? data[0] : data;
          setDocument(singleDoc || null);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch document details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      void fetchDocumentDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleReceive = async (item: ReceivingItem) => {
    setActionError(null);
    setActionSuccess(null);

    const remaining = item.expected_quantity - item.received_quantity;

    if (receiveQty <= 0) {
      setActionError('Quantity must be greater than zero');
      return;
    }
    if (receiveQty > remaining) {
      setActionError(`Cannot receive more than the remaining expected quantity (${remaining} remaining).`);
      return;
    }

    try {
      setProcessing(true);
      const updatedDoc = await recordReceipt(id, item.id, Number(receiveQty));
      const singleDoc = Array.isArray(updatedDoc) ? updatedDoc[0] : updatedDoc;

      setDocument(singleDoc);
      setActionSuccess(`Successfully recorded ${receiveQty} units for SKU ${item.product_sku || item.product_id}`);
      setSelectedItemId(null);
      setReceiveQty(1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || 'Failed to submit receiving transaction');
      } else {
        setActionError('Failed to submit receiving transaction');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading receiving document engine...</div>;
  if (error || !document) return <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded">{error || 'Document not found'}</div>;

  const isCompleted = document.status === 'COMPLETED' || document.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-100">{document.document_number}</h1>
            <StatusBadge status={document.status} />
          </div>
          <p className="text-xs text-slate-400 mt-1">Created: {new Date(document.created_at).toLocaleString()}</p>
        </div>

        <button
          onClick={() => router.push('/receiving-documents')}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded"
        >
          ← Back to Documents
        </button>
      </div>

      {/* Notifications */}
      {actionError && <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded text-sm">{actionError}</div>}
      {actionSuccess && <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded text-sm">{actionSuccess}</div>}

      {/* Items Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">Line Items & Receipt Status</h2>
          {isCompleted && (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800">
              Document Fully Processed & Locked
            </span>
          )}
        </div>

        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">SKU / Item</th>
              <th className="p-4">Expected Qty</th>
              <th className="p-4">Received Qty</th>
              <th className="p-4">Progress Bar</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {document.items?.map((item) => {
              const remaining = item.expected_quantity - item.received_quantity;
              const percent = Math.min(100, Math.round((item.received_quantity / item.expected_quantity) * 100));

              return (
                <tr key={item.id} className="hover:bg-slate-800/30">
                  <td className="p-4 font-mono">
                    <div className="text-emerald-400 font-medium">{item.product_sku || item.product_id}</div>
                    <div className="text-xs text-slate-400">{item.product_name || 'Warehouse SKU'}</div>
                  </td>
                  <td className="p-4 text-slate-200 font-medium">{item.expected_quantity}</td>
                  <td className="p-4 text-slate-200 font-medium">{item.received_quantity}</td>
                  <td className="p-4 w-1/4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-mono w-10">{percent}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {isCompleted || remaining === 0 ? (
                      <span className="text-xs text-slate-500 italic">Fulfilled</span>
                    ) : selectedItemId === item.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="1"
                          max={remaining}
                          value={receiveQty}
                          onChange={(e) => setReceiveQty(Number(e.target.value))}
                          className="w-20 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => handleReceive(item)}
                          disabled={processing}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50 font-medium"
                        >
                          {processing ? 'Saving...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setSelectedItemId(null)}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setReceiveQty(remaining);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs px-3 py-1.5 rounded font-medium transition"
                      >
                        + Receive Units
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}