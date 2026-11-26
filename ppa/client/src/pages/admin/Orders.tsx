import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { Order, OrderStatus } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { Empty, ErrorNote, Field, Spinner, StatusPill } from '../../components/ui';
import { dateTime, inr, ORDER_STATUS_LABEL } from '../../lib/format';
import { OrderView } from '../Account';
import { PageHead } from './AdminLayout';

const STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED'];

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;
  const [term, setTerm] = useState(q);
  const [data, setData] = useState<{ orders: Order[]; total: number; pages: number } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    api<{ orders: Order[]; total: number; pages: number }>(`/admin/orders${qs({ status, q, page })}`).then(setData).catch((e) => setErr(e.message));
  }, [status, q, page]);

  const set = (patch: Record<string, string>) => {
    const next = { ...(status ? { status } : {}), ...(q ? { q } : {}), ...patch };
    Object.keys(next).forEach((k) => !next[k as keyof typeof next] && delete next[k as keyof typeof next]);
    setParams(next);
  };

  return (
    <div>
      <PageHead title="Orders" actions={<Link to="/admin/sales/new" className="btn-volt">Record shop sale</Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...STATUSES].map((s) => (
          <button key={s} onClick={() => set({ status: s, page: '' })} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${status === s ? 'border-ink bg-ink text-white' : 'border-steel bg-white'}`}>
            {s ? ORDER_STATUS_LABEL[s as OrderStatus] : 'All'}
          </button>
        ))}
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); set({ q: term.trim(), page: '' }); }} className="mb-4 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input className="input pl-9" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Order ID, customer, mobile, vehicle" />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      <ErrorNote>{err}</ErrorNote>
      {!data ? <Spinner /> : !data.orders.length ? <Empty title="No orders found" /> : (
        <>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Batteries</th><th>Type</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o._id} className="hover:bg-steel-50">
                    <td><Link to={`/admin/orders/${o.orderId}`} className="font-mono text-xs font-semibold hover:underline">{o.orderId}</Link></td>
                    <td className="whitespace-nowrap">{dateTime(o.createdAt)}</td>
                    <td>{o.customerName}<br /><span className="text-xs text-ink-300">{o.customerMobile}</span></td>
                    <td>{o.items.map((i) => `${i.quantity}× ${i.brandName} ${i.model}`).join(', ')}</td>
                    <td className="whitespace-nowrap">{o.channel === 'STORE' ? <span className="rounded bg-volt-soft px-1.5 py-0.5 text-xs font-semibold">Shop sale</span> : o.fulfilment === 'STORE_PICKUP' ? 'Pickup' : 'Delivery'}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="text-right font-semibold">{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="mt-4 flex gap-2">
              <button className="btn-outline" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</button>
              <span className="self-center text-sm">Page {page} of {data.pages}</span>
              <button className="btn-outline" disabled={page >= data.pages} onClick={() => set({ page: String(page + 1) })}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function OrderDetail() {
  const { orderId } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState<OrderStatus>('PLACED');
  const [paid, setPaid] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ order: Order }>(`/admin/orders/${orderId}`)
      .then((r) => { setOrder(r.order); setStatus(r.order.status); setPaid(r.order.paymentStatus === 'PAID'); })
      .catch((e) => setErr(e.message));
  }, [orderId]);

  async function update(e: FormEvent) {
    e.preventDefault();
    if (status === 'CANCELLED' && !confirm('Cancel this order? Stock will be returned and the warranty records voided.')) return;
    setBusy(true);
    try {
      const r = await api<{ order: Order }>(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status, note, paymentStatus: paid ? 'PAID' : 'PENDING' } });
      setOrder(r.order);
      setNote('');
      toast('Order updated');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!order) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <Link to="/admin/orders" className="text-sm font-semibold text-graphite hover:underline">← Orders</Link>
        <Link to={`/admin/customers/${order.customer}`} className="text-sm font-semibold hover:underline">Open customer profile →</Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <OrderView order={order} />
        <form onSubmit={update} className="card h-fit space-y-4 p-5">
          <h2 className="text-lg font-semibold">Update order</h2>
          {order.status === 'CANCELLED' ? (
            <p className="text-sm text-graphite">This order is cancelled. Stock was returned.</p>
          ) : (
            <>
              <Field label="Status">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4" /> Payment received
              </label>
              <Field label="Note (optional)">
                <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              </Field>
              <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
            </>
          )}
          <div className="border-t border-steel pt-3 text-sm">
            <StatusPill status={order.status} />
          </div>
        </form>
      </div>
    </div>
  );
}
