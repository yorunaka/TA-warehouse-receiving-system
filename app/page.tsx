'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProducts, getReceivingDocuments, getInventory, getTransactions, getActiveUserId } from '@/lib/mockapi';
import { ReceivingDocument, InventoryItem } from '@/lib/types';
import { StatusBadge } from '@/app/src/components/navbar';

export default function DashboardPage() {
  const [itemCount, setItemCount] = useState(0);
  const [documents, setDocuments] = useState<ReceivingDocument[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recentTxCount, setRecentTxCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const activeUserId = getActiveUserId();
  const isAdmin = activeUserId === '1';

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [itemsData, docsData, invData, txData] = await Promise.all([
          getProducts(),
          getReceivingDocuments(),
          getInventory(),
          getTransactions(),
        ]);

        if (isMounted) {
          setItemCount(itemsData.length);
          setDocuments(docsData);
          setInventory(invData);
          setRecentTxCount(txData.length);
        }
      } catch (err: unknown) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalAvailableStock = inventory.reduce((sum, item) => sum + item.available_quantity, 0);
  const activeDocs = documents.filter((d) => d.status === 'IN_PROGRESS' || d.status === 'DRAFT');

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Inbound Warehouse Control Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Logged in as <span className="text-emerald-400 font-semibold">{isAdmin ? 'Admin Supervisor' : 'Warehouse Operator'}</span>
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <Link
              href="/receiving-documents"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2.5 rounded font-medium transition"
            >
              + Create Receiving Doc
            </Link>
          )}
          <Link
            href="/items"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2.5 rounded font-medium border border-slate-700 transition"
          >
            Catalog SKUs
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered SKUs</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">{loading ? '...' : itemCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Inbound Docs</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">{loading ? '...' : activeDocs.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Stock Available</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">{loading ? '...' : totalAvailableStock}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logged Receipts</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">{loading ? '...' : recentTxCount}</div>
        </div>
      </div>

      {/* Active Inbound Deliveries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">Active Inbound Documents</h2>
          <Link href="/receiving-documents" className="text-xs text-emerald-400 hover:underline">
            View All Documents →
          </Link>
        </div>

        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4">Document</th>
              <th className="p-4">Status</th>
              <th className="p-4">Line Items</th>
              <th className="p-4">Created At</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading active documents...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">No receiving documents created yet.</td></tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/30">
                  <td className="p-4 font-mono font-medium text-emerald-400">{doc.document_number}</td>
                  <td className="p-4"><StatusBadge status={doc.status} /></td>
                  <td className="p-4 text-slate-300">{doc.items?.length || 0} SKU line item(s)</td>
                  <td className="p-4 text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/receiving-documents/${doc.id}`}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs px-3 py-1.5 rounded font-medium transition"
                    >
                      Open Document
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}