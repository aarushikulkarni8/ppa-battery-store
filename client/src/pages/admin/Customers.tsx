import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { api, qs } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type { Customer, Enquiry, Order, PcbOrder, Purchase } from '../../api/types';
import { Empty, ErrorNote, Spinner, StatusPill } from '../../components/ui';
import { date, dateTime, inr, fullName } from '../../lib/format';
import { EnquiryPill, PurchaseTable, WarrantyStatus } from '../Account';
import { PageHead } from './AdminLayout';
import { PcbPill } from './PcbOrders';

interface Row {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  createdAt: string;
  orders: number;
  totalSpent: number;
  lastPurchase: string | null;
}

export default function Customers() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;
  const [term, setTerm] = useState(q);
  const [data, setData] = useState<{ customers: Row[]; total: number; pages: number } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    api<{ customers: Row[]; total: number; pages: number }>(`/admin/customers${qs({ q, page })}`).then(setData).catch((e) => setErr(e.message));
  }, [q, page]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setParams(term.trim() ? { q: term.trim() } : {});
  }

  return (
    <div>
      <PageHead title="Customers" sub="Search by name, mobile number or email" actions={<Link to="/admin/sales/new" className="btn-volt">Record shop sale</Link>} />
      <form onSubmit={submit} className="mb-5 flex max-w-2xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300" />
          <input className="input pl-10 text-base" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. Rahul Sharma, 0000000000, rahul@…" autoFocus />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      <ErrorNote>{err}</ErrorNote>
      {!data ? (
        <Spinner />
      ) : !data.customers.length ? (
        <Empty title={q ? `No customer matches “${q}”` : 'No customers yet'} />
      ) : (
        <>
          <p className="mb-2 text-sm text-graphite">{data.total} customer{data.total === 1 ? '' : 's'}</p>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Orders</th><th>Total spent</th><th>Last purchase</th><th /></tr></thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c._id} className="hover:bg-steel-50">
                    <td className="font-semibold"><Link to={`/admin/customers/${c._id}`} className="hover:underline">{c.name || <span className="text-ink-300">(no name)</span>}</Link></td>
                    <td className="whitespace-nowrap">{c.mobile}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.orders}</td>
                    <td className="whitespace-nowrap">{inr(c.totalSpent)}</td>
                    <td className="whitespace-nowrap">{c.lastPurchase ? date(c.lastPurchase) : '—'}</td>
                    <td><Link to={`/admin/customers/${c._id}`} aria-label="Open"><ChevronRight className="h-4 w-4" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="mt-4 flex gap-2">
              <button className="btn-outline" disabled={page <= 1} onClick={() => setParams({ ...(q ? { q } : {}), page: String(page - 1) })}>Previous</button>
              <span className="self-center text-sm">Page {page} of {data.pages}</span>
              <button className="btn-outline" disabled={page >= data.pages} onClick={() => setParams({ ...(q ? { q } : {}), page: String(page + 1) })}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface Detail {
  customer: Customer & { lastLoginAt?: string; savedVehicles: { _id: string; label: string; nickname: string; registrationNumber: string }[] };
  summary: { totalOrders: number; totalPurchases: number; totalSpent: number; lastPurchase: string | null };
  orders: Order[];
  purchases: Purchase[];
  enquiries: Enquiry[];
  pcbOrders?: PcbOrder[];
}

function ContactEdit({ customer, onSaved }: { customer: Customer & { passwordSetAt?: string | null }; onSaved: (p: Partial<Customer>) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(customer.email);
  const [reminders, setReminders] = useState(customer.reminderEmails !== false);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const r = await api<{ customer: Partial<Customer> }>(`/admin/customers/${customer._id}`, { method: 'PATCH', body: { email, reminderEmails: reminders } });
      onSaved({ email: r.customer.email, reminderEmails: r.customer.reminderEmails });
      setEditing(false);
      toast('Customer updated');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }
  async function sendLink() {
    setBusy(true);
    try {
      const r = await api<{ to: string; sent: boolean }>(`/admin/customers/${customer._id}/password-link`, { method: 'POST' });
      toast(r.sent ? `Link sent to ${r.to}` : 'Email is not set up; the link was printed in the server terminal', r.sent ? undefined : 'error');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }
  if (!editing)
    return (
      <div>
        <span className="label">Email</span>
        {customer.email || <span className="font-semibold text-plus">None, so no servicing reminders</span>}
        {customer.email && customer.reminderEmails === false && <span className="block text-xs text-ink-300">Servicing reminders switched off</span>}
        <button type="button" className="ml-2 text-xs font-semibold text-link hover:underline" onClick={() => setEditing(true)}>
          {customer.email ? 'Edit' : 'Add email'}
        </button>
        <span className="mt-2 block text-xs text-graphite">
          Website login: {customer.passwordSetAt ? 'password set' : 'no password yet'}
          {customer.email && (
            <button type="button" className="ml-2 font-semibold text-link hover:underline" onClick={sendLink} disabled={busy}>
              {customer.passwordSetAt ? 'Email a reset link' : 'Email a set-password link'}
            </button>
          )}
        </span>
      </div>
    );
  return (
    <div className="space-y-2">
      <span className="label">Email</span>
      <input className="input py-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} /> Send servicing reminders
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-sm" disabled={busy} onClick={save}>Save</button>
        <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}

function DeleteCustomer({ customer, orders, pcbOrders }: { customer: Customer; orders: number; pcbOrders: number }) {
  const toast = useToast();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const hasOrders = orders > 0 || pcbOrders > 0;
  const ready = !hasOrders || typed.replace(/\D/g, '').slice(-10) === customer.mobile;

  async function remove() {
    if (!hasOrders && !confirm(`Delete ${customer.name || customer.mobile}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/admin/customers/${customer._id}`, { method: 'DELETE', body: { confirmMobile: typed } });
      toast('Customer deleted');
      nav('/admin/customers', { replace: true });
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-plus/30 bg-rose-50/40 p-5">
      <h2 className="text-lg font-semibold">Delete customer</h2>
      {!open ? (
        <>
          <p className="mt-1 text-sm text-graphite">
            {hasOrders
              ? `Deletes this customer together with their ${orders} order(s), purchase history and warranty records, ${pcbOrders} PCB order(s) and their enquiries. Sales totals on the dashboard will drop. Stock is not added back.`
              : 'This customer has no orders. Deleting removes their account and enquiries.'}
          </p>
          <button type="button" className="btn-danger mt-3" onClick={() => (hasOrders ? setOpen(true) : remove())} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete customer
          </button>
        </>
      ) : (
        <div className="mt-2 max-w-md space-y-3">
          <p className="text-sm">
            This cannot be undone. To confirm, type the customer's mobile number <b>{customer.mobile}</b>:
          </p>
          <input className="input" inputMode="numeric" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Mobile number" autoFocus />
          <div className="flex gap-2">
            <button type="button" className="btn-danger" disabled={!ready || busy} onClick={remove}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete customer and all their records
            </button>
            <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setTyped(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<Detail>(`/admin/customers/${id}`).then(setD).catch((e) => setErr(e.message));
  }, [id]);
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!d) return <Spinner />;
  const c = d.customer;
  const addr = [c.address?.line1, c.address?.line2, c.address?.city, c.address?.pincode].filter(Boolean).join(', ');
  const activeWarranties = d.purchases.filter((p) => p.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/admin/customers" className="text-sm font-semibold text-graphite hover:underline">← Customers</Link>
        <Link to={`/admin/sales/new?mobile=${c.mobile}`} className="btn-volt">Record a shop sale for this customer</Link>
      </div>
      <div className="card p-5">
        <h1 className="text-3xl font-bold uppercase">{c.name || 'Unnamed customer'}</h1>
        <p className="font-display text-xl">{c.mobile}</p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <ContactEdit customer={c} onSaved={(patch) => setD((x) => (x ? { ...x, customer: { ...x.customer, ...patch } } : x))} />
          <p><span className="label">Address</span>{addr || '—'}</p>
          <p><span className="label">Customer since</span>{date(c.createdAt)}</p>
        </div>
        {!!c.savedVehicles?.length && (
          <p className="mt-3 text-sm"><span className="label">Saved vehicles</span>{c.savedVehicles.map((v) => `${v.label}${v.registrationNumber ? ` (${v.registrationNumber})` : ''}`).join(' · ')}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Orders', d.summary.totalOrders],
          ['Batteries purchased', d.summary.totalPurchases],
          ['Total amount spent', inr(d.summary.totalSpent)],
          ['Last purchase', d.summary.lastPurchase ? date(d.summary.lastPurchase) : '—'],
        ].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-sm text-graphite">{l}</p><p className="font-display text-2xl font-bold">{v}</p></div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Purchase history</h2>
        {d.purchases.length ? <PurchaseTable purchases={d.purchases} orderLink={(o) => `/admin/orders/${o}`} /> : <Empty title="No purchases" />}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Order history</h2>
        {d.orders.length ? (
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Order ID</th><th>Date</th><th>Items</th><th>Vehicle</th><th>Status</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {d.orders.map((o) => (
                  <tr key={o._id}>
                    <td><Link to={`/admin/orders/${o.orderId}`} className="font-mono text-xs font-semibold hover:underline">{o.orderId}</Link></td>
                    <td className="whitespace-nowrap">{dateTime(o.createdAt)}</td>
                    <td>{o.items.map((i) => `${i.quantity}× ${i.brandName} ${i.model}`).join(', ')}</td>
                    <td>{o.vehicle?.label || '—'}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="text-right font-semibold">{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No orders" />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Warranty information</h2>
        {activeWarranties.length ? (
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Battery</th><th>Purchased</th><th>Free replacement until</th><th>Warranty expiry</th><th>Status</th><th>Servicing reminder</th></tr></thead>
              <tbody>
                {activeWarranties.map((p) => (
                  <tr key={p._id}>
                    <td className="font-semibold">{fullName(p.brandName, p.productName)}<br /><span className="font-normal text-ink-300">{p.model} · {p.warrantyMonths} months</span></td>
                    <td>{date(p.purchaseDate)}</td>
                    <td>{p.freeReplacementUntil ? date(p.freeReplacementUntil) : '—'}</td>
                    <td>{date(p.warrantyExpiry)}</td>
                    <td><WarrantyStatus p={p} /></td>
                    <td className="text-sm">
                      {!p.reminderEligible ? (
                        <span className="text-ink-300">Not for this type</span>
                      ) : c.reminderEmails === false ? (
                        <span className="text-ink-300">Switched off by customer</span>
                      ) : !c.email ? (
                        <span className="font-semibold text-plus">No email on file</span>
                      ) : p.nextReminder ? (
                        <>
                          Next {date(p.nextReminder)}
                          {p.lastReminderAt && <span className="block text-xs text-ink-300">last sent {date(p.lastReminderAt)}</span>}
                          {p.lastReminderError && <span className="block text-xs text-plus">last attempt failed</span>}
                        </>
                      ) : (
                        <span className="text-ink-300">Finished (warranty over)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No active warranties" />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">PCB orders</h2>
        {d.pcbOrders?.length ? (
          <div className="card divide-y divide-steel">
            {d.pcbOrders.map((o) => (
              <Link key={o._id} to={`/admin/pcb-orders/${o.orderNumber}`} className="flex flex-wrap items-center gap-3 p-3 hover:bg-steel-50">
                <span className="font-mono text-xs font-semibold">{o.orderNumber}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{o.quantity} × {o.productName}</span>
                <span className="text-xs text-ink-300">{date(o.createdAt)}</span>
                <PcbPill status={o.status} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No PCB orders" />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Enquiries</h2>
        {d.enquiries.length ? (
          <div className="card divide-y divide-steel">
            {d.enquiries.map((e) => (
              <Link key={e._id} to={`/admin/enquiries/${e._id}`} className="flex flex-wrap items-center gap-3 p-3 hover:bg-steel-50">
                <span className="font-mono text-xs font-semibold">{e.enquiryNumber}</span>
                <span className="text-sm">{e.enquiryType}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-graphite">{e.message}</span>
                <span className="text-xs text-ink-300">{date(e.createdAt)}</span>
                <EnquiryPill status={e.status} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No enquiries" />
        )}
      </section>

      <DeleteCustomer customer={c} orders={d.orders.length} pcbOrders={d.pcbOrders?.length ?? 0} />
    </div>
  );
}
