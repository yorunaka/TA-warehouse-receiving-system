'use client';

import { useState, useEffect } from 'react';
import { getInventory, getTransactions } from '@/lib/api';
import { InventoryItem, InventoryTransaction } from '@/lib/types';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        if (activeTab === 'stock') {
          const data = await getInventory();
          if (isMounted) {
            setInventory(data);
            setError(null);
          }
        } else {
          const data = await getTransactions();
          if (isMounted) {
            setTransactions(data);
            setError(null);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load inventory data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const handlePrintPdfReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print PDF Custom Styles */}
      <style jsx global>{`
        @media print {
          header, nav, button, select, .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-area {
            background-color: white !important;
            color: black !important;
            border: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            color: black !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px !important;
            color: black !important;
          }
          th {
            background-color: #f1f5f9 !important;
          }
        }
      `}</style>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Inventory Ledger & Stock</h1>
          <p className="text-sm text-slate-400">Track real-time stock balances and generate official receiving audit reports.</p>
        </div>

        <div className="flex items-center gap-3">
            <button
              onClick={handlePrintPdfReport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-md font-medium transition flex items-center gap-2"
            >
              📄 Export PDF Report
            </button>
          {/* PDF Export Button (Visible on Audit History tab) */}
          {/* {activeTab === 'history' && (
          )} */}

          <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'stock' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Available Stock
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Transaction Audit Logs
            </button>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded text-sm no-print">{error}</div>}

      {/* Available Stock View */}
      {activeTab === 'stock' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-4">SKU Code</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Available Quantity</th>
                <th className="p-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading stock data...</td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">No inventory balances recorded.</td></tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-medium text-emerald-400">{item.sku}</td>
                    <td className="p-4 font-medium text-slate-200">{item.name}</td>
                    <td className="p-4 font-mono text-lg font-bold text-slate-100">{item.available_quantity}</td>
                    <td className="p-4 text-slate-500 text-xs">{new Date(item.updated_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit History Log View */}
      {activeTab === 'history' && (
        <div className="print-area bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 hidden print:block">
            <h2 className="text-xl font-bold">Warehouse Receiving Audit Report</h2>
            <p className="text-xs text-gray-600">Generated on: {new Date().toLocaleString()}</p>
          </div>

          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Item SKU</th>
                <th className="p-4">Origin Document</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Quantity Added</th>
                <th className="p-4">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading transaction audit history...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No stock transactions logged yet.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 font-mono text-xs">
                    <td className="p-4 text-slate-400">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="p-4 font-medium text-emerald-400">{tx.sku}</td>
                    <td className="p-4 text-slate-300">{tx.document_number || '-'}</td>
                    <td className="p-4 text-slate-200">{tx.product_name}</td>
                    <td className="p-4 text-emerald-400 font-bold">+{tx.quantity_changed}</td>
                    <td className="p-4">
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                        {tx.transaction_type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}