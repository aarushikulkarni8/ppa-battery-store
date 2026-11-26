import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { OrderStatus } from '../api/types';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '../lib/format';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-300" role="status">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-steel-400/70 bg-white px-6 py-10 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-graphite">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-plus/30 bg-rose-50 px-3 py-2 text-sm text-plus" role="alert">
      {children}
    </p>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_TONE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-300">{hint}</span>}
    </label>
  );
}
