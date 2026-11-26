import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, MailWarning, Search } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { PcbOrder, PcbOrderStatus } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { Empty, ErrorNote, Field, Spinner } from '../../components/ui';
import { dateTime, PCB_STATUS_TONE } from '../../lib/format';
import { PageHead } from './AdminLayout';

const STATUSES: PcbOrderStatus[] = ['New', 'Confirmed', 'In progress', 'Ready', 'Delivered', 'Cancelled'];
export const PcbPill = ({ status }: { status: string }) => (
  <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${PCB_STATUS_TONE[status] ?? ''}`}>{status}</span>
);

export default function PcbOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const [term, setTerm] = useState(q);
  const [data, setData] = useState<{ orders: PcbOrder[]; open: number } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    api<{ orders: PcbOrder[]; open: number }>(`/admin/pcb-orders${qs({ status, q })}`).then(setData).catch((e) => setErr(e.message));
  }, [status, q]);

  const set = (patch: Record<string, string>) => {
    const next: Record<string, string> = { ...(status ? { status } : {}), ...(q ? { q } : {}), ...patch };
    Object.keys(next).forEach((k) => !next[k] && delete next[k]);
    setParams(next);
  };

  return (
    <div>
      <PageHead title="PCB orders" sub={data ? `${data.open} open` : undefined} actions={<Link to="/admin/products?category=PCB" className="btn-outline">PCB products</Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...STATUSES].map((s) => (
          <button key={s} onClick={() => set({ status: s })} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${status === s ? 'border-ink bg-ink text-white' : 'border-steel bg-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); set({ q: term.trim() }); }} className="mb-4 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input className="input pl-9" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Order number, customer, mobile, company, part number" />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      <ErrorNote>{err}</ErrorNote>
      {!data ? <Spinner /> : !data.orders.length ? <Empty title="No PCB orders yet" /> : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>PCB</th><th className="text-right">Qty</th><th>Status</th><th>Email</th></tr></thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o._id} className="hover:bg-steel-50">
                  <td><Link to={`/admin/pcb-orders/${o.orderNumber}`} className="font-mono text-xs font-semibold hover:underline">{o.orderNumber}</Link></td>
                  <td className="whitespace-nowrap">{dateTime(o.createdAt)}</td>
                  <td>{o.customerName}{o.company && <span className="block text-xs">{o.company}</span>}<span className="block text-xs text-ink-300">{o.customerMobile}</span></td>
                  <td>{o.productName}<span className="block text-xs text-ink-300">{o.partNumber}</span></td>
                  <td className="text-right font-display text-lg font-bold">{o.quantity}</td>
                  <td><PcbPill status={o.status} /></td>
                  <td>{o.emailStatus === 'SENT' ? <Mail className="h-4 w-4 text-ok" aria-label="Emailed to owner" /> : <MailWarning className="h-4 w-4 text-plus" aria-label={o.emailStatus} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PcbOrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [o, setO] = useState<PcbOrder | null>(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState<PcbOrderStatus>('New');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ order: PcbOrder }>(`/admin/pcb-orders/${id}`).then((r) => { setO(r.order); setStatus(r.order.status); }).catch((e) => setErr(e.message));
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ order: PcbOrder }>(`/admin/pcb-orders/${id}`, { method: 'PATCH', body: { status, note } });
      setO(r.order);
      setNote('');
      toast('PCB order updated');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!o) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <Link to="/admin/pcb-orders" className="text-sm font-semibold text-graphite hover:underline">← PCB orders</Link>
        <Link to={`/admin/customers/${o.customer}`} className="text-sm font-semibold hover:underline">Open customer profile →</Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold">{o.orderNumber}</h1>
            <PcbPill status={o.status} />
            <span className="text-sm text-ink-300">{dateTime(o.createdAt)}</span>
          </div>
          <div className="mt-5 rounded-md bg-steel-50 p-4">
            <p className="text-sm text-graphite">PCB</p>
            <p className="text-lg font-semibold">{o.productName}</p>
            <p className="text-sm text-graphite">Part number {o.partNumber}{o.model && o.model !== o.partNumber ? `, model ${o.model}` : ''}{o.brandName ? `, ${o.brandName}` : ''}</p>
            <p className="mt-3 text-sm text-graphite">Quantity</p>
            <p className="font-display text-4xl font-bold">{o.quantity}</p>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="label">Customer</dt><dd>{o.customerName}</dd></div>
            <div><dt className="label">Company</dt><dd>{o.company || '—'}</dd></div>
            <div><dt className="label">Mobile</dt><dd><a href={`tel:+91${o.customerMobile}`} className="font-semibold hover:underline">+91 {o.customerMobile}</a></dd></div>
            <div><dt className="label">Email</dt><dd>{o.customerEmail ? <a href={`mailto:${o.customerEmail}`} className="hover:underline">{o.customerEmail}</a> : '—'}</dd></div>
          </dl>
          {o.notes && (
            <>
              <p className="label mt-4">Customer notes</p>
              <p className="whitespace-pre-line rounded-md bg-steel-50 p-3 text-sm">{o.notes}</p>
            </>
          )}
          <p className="mt-3 text-xs text-ink-300">
            Owner email: {o.emailStatus === 'SENT' ? 'sent' : o.emailStatus === 'NOT_CONFIGURED' ? 'not sent (email not set up)' : 'failed to send'}
          </p>
          <p className="label mt-5">History</p>
          <ol className="space-y-2 border-l-2 border-steel pl-4 text-sm">
            {o.statusHistory.map((h, i) => (
              <li key={i}><b>{h.status}</b> <span className="text-ink-300">· {h.by} · {dateTime(h.at)}</span>{h.note && <span className="block">{h.note}</span>}</li>
            ))}
          </ol>
        </div>
        <form onSubmit={save} className="card h-fit space-y-4 p-5">
          <h2 className="text-lg font-semibold">Update</h2>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PcbOrderStatus)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Note (optional)">
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Quoted price, delivery date…" />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
          <p className="text-xs text-ink-300">The customer sees the status in My orders.</p>
        </form>
      </div>
    </div>
  );
}
