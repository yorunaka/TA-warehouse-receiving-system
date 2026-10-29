'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getActiveUserId, setActiveUserId } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const activeUserId = getActiveUserId();

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="font-bold text-lg text-emerald-400 flex items-center gap-2">
            <span className="bg-emerald-500/20 p-1.5 rounded text-emerald-400 font-mono">WMS</span>
          </Link>
          
          <nav className="flex space-x-1 text-sm font-medium">
            {[
              { name: 'Dashboard', href: '/' },
              { name: 'Product', href: '/items' },
              { name: 'Receiving Docs', href: '/receiving-documents' },
              { name: 'Inventory & Stock', href: '/inventory' },
            ].map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* RBAC Role Switcher Simulation */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
          <span className="text-xs text-slate-400">Simulated Role:</span>
          <select
            value={activeUserId}
            onChange={(e) => setActiveUserId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="1">User 1 (Admin Supervisor)</option>
            <option value="2">User 2 (Warehouse Operator)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const safeStatus = status || 'DRAFT';
  const label = safeStatus.replace('_', ' ');

  const colorMap: Record<string, string> = {
    DRAFT: 'bg-slate-800 text-slate-300 border-slate-700',
    IN_PROGRESS: 'bg-amber-950/80 text-amber-300 border-amber-800',
    COMPLETED: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    CANCELLED: 'bg-rose-950/80 text-rose-300 border-rose-800',
  };

  return (
    <span className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded border ${colorMap[safeStatus] || colorMap.DRAFT}`}>
      {label}
    </span>
  );
}
