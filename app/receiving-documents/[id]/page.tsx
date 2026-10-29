'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getReceivingDocumentById, recordReceipt, cancelDocument } from '@/lib/api';
import { ReceivingDocument, ReceivingItem } from '@/lib/types';
import { StatusBadge } from '@/app/src/components/navbar';

export default function ReceivingDocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
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
      if (!id) return;
      try {
        setLoading(true);
        const data = await getReceivingDocumentById(id);
        
        if (isMounted) {
          // Unwrap if API response returns an array or wrapped object
          const rawDoc = Array.isArray(data) ? data[0] : (data as any)?.data || data;
          setDocument(rawDoc || null);
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

    void fetchDocumentDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);



  const handleReceive = async (item: ReceivingItem) => {
    if (!id) return;
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
      const singleDoc = Array.isArray(updatedDoc) ? updatedDoc[0] : (updatedDoc as any)?.data || updatedDoc;

      setDocument(singleDoc);
      setActionSuccess(
        `Successfully recorded ${receiveQty} units for SKU ${item.sku || 'UNKNOWN'} (${item.product_name || 'Unnamed Product'})`
      );
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

  const handleCancelDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to cancel this document? This action cannot be undone.')) {
      return;
    }

    try {
      await cancelDocument(docId);
      router.push('/receiving-documents');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || 'Failed to cancel document');
      } else {
        setActionError('Failed to cancel document');
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 font-mono">Loading receiving document engine...</div>;
  }

  if (error || !document) {
    return (
      <div className="p-6 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg space-y-3">
        <p className="font-medium">{error || 'Receiving document not found.'}</p>
        <button
          onClick={() => router.push('/receiving-documents')}
          className="text-xs bg-rose-900 hover:bg-rose-800 text-white px-3 py-1.5 rounded transition"
        >
          ← Return to Documents List
        </button>
      </div>
    );
  }

  const docStatus = document.status || 'DRAFT';
  const isCompleted = docStatus === 'COMPLETED' || docStatus === 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-100">{document.document_number}</h1>
            <StatusBadge status={docStatus} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Created: {document.created_at ? new Date(document.created_at).toLocaleString() : 'N/A'}
          </p>
        </div>

        {docStatus !== 'COMPLETED' && docStatus !== 'CANCELLED' && (
          <button
            onClick={() => handleCancelDocument(document.id)}
            className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded hover:bg-red-600/40 text-sm"
          >
            Cancel Document
          </button>
        )}
        <button
          onClick={() => router.push('/receiving-documents')}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded transition"
        >
          Back to Documents
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
            {document.items && document.items.length > 0 ? (
              document.items.map((item) => {
                const remaining = item.expected_quantity - item.received_quantity;
                const percent = Math.min(100, Math.round((item.received_quantity / item.expected_quantity) * 100));
                const skuCode =  item.sku || 'SKU-UNKNOWN';
                const itemName = item.product_name || 'Warehouse SKU Item';

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono">
                      <div className="text-emerald-400 font-medium">{skuCode}</div>
                      <div className="text-xs text-slate-400">{itemName}</div>
                    </td>
                    <td className="p-4 text-slate-200 font-medium font-mono">{item.expected_quantity}</td>
                    <td className="p-4 text-slate-200 font-medium font-mono">{item.received_quantity}</td>
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
                      {isCompleted || remaining <= 0 ? (
                        <span className="text-xs text-slate-500 italic">Fulfilled</span>
                      ) : selectedItemId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="1"
                            max={remaining}
                            value={receiveQty}
                            onChange={(e) => setReceiveQty(Number(e.target.value))}
                            className="w-20 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded px-2 py-1 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <button
                            onClick={() => handleReceive(item)}
                            disabled={processing}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50 font-medium transition"
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
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No line items associated with this document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}