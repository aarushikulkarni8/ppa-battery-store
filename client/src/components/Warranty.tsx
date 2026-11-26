import { ShieldCheck } from 'lucide-react';
import type { Warranty } from '../api/types';
import { warrantySplit } from '../lib/format';

export function WarrantyBadge({ warranty, size = 'sm' }: { warranty: Warranty; size?: 'sm' | 'lg' }) {
  if (size === 'lg') {
    return (
      <div className="flex items-stretch overflow-hidden rounded-lg border border-ok/25 bg-emerald-50">
        <div className="flex flex-col items-center justify-center bg-ok px-5 py-3 text-white">
          <span className="font-display text-4xl font-bold leading-none">{warranty.totalMonths}</span>
          <span className="text-xs font-semibold">months</span>
        </div>
        <div className="px-4 py-3">
          <p className="flex items-center gap-1.5 font-semibold text-ok">
            <ShieldCheck className="h-4 w-4" /> Manufacturer warranty
          </p>
          <p className="mt-0.5 text-sm text-graphite">{warrantySplit(warranty)}</p>
          {warranty.notes && <p className="mt-1 text-xs text-ink-300">{warranty.notes}</p>}
        </div>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-sm">
      <ShieldCheck className="h-4 w-4 shrink-0 text-ok" />
      <span className="font-semibold text-ok">{warranty.totalMonths} months warranty</span>
      {warranty.freeMonths != null && <span className="text-ink-300">({warranty.freeMonths} free)</span>}
    </p>
  );
}
