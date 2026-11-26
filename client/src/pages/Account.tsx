import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { UserRound, Package, History, BatteryCharging, ShieldCheck, MessageSquareText, Plus, Loader2, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import type { Enquiry, Order, PcbOrder, Purchase } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { PasswordInput, passwordProblem } from './Login';
import { useToast } from '../context/ToastContext';
import { Empty, ErrorNote, Field, Spinner, StatusPill } from '../components/ui';
import { date, dateTime, daysLeft, inr, ORDER_STATUS_LABEL, fullName, FULFILMENT_LABEL, PAYMENT_LABEL, PCB_STATUS_TONE } from '../lib/format';

const TABS = [
  { to: '/account', label: 'Profile', icon: UserRound, end: true },
  { to: '/account/orders', label: 'My orders', icon: Package },
  { to: '/account/purchases', label: 'Purchase history', icon: History },
  { to: '/account/batteries', label: 'My batteries', icon: BatteryCharging },
  { to: '/account/warranty', label: 'Warranty', icon: ShieldCheck },
  { to: '/account/enquiries', label: 'My enquiries', icon: MessageSquareText },
];

export default function AccountLayout() {
  const { customer } = useAuth();
  return (
    <div className="container-x py-10">
      <p className="font-display text-sm font-semibold uppercase tracking-widest text-ink-300">My account</p>
      <h1 className="text-4xl font-bold">Hello, {customer?.name?.split(' ')[0]}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Account sections">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-ink text-white' : 'text-graphite hover:bg-white'}`
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState('');
  const reload = () => api<T>(path).then(setData).catch((e) => setErr(e.message));
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return { data, err, reload };
}

/* ---------- Profile ---------- */
export function Profile() {
  const { customer, setCustomer } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [reminders, setReminders] = useState(customer?.reminderEmails !== false);
  const [address, setAddress] = useState(customer?.address ?? { line1: '', line2: '', city: '', state: '', pincode: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api<{ customer: typeof customer }>('/auth/profile', { method: 'PUT', body: { name, email, address, reminderEmails: reminders } });
      setCustomer(r.customer);
      toast('Profile saved');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card grid gap-4 p-5 sm:grid-cols-2">
      <h2 className="text-2xl font-semibold sm:col-span-2">Profile</h2>
      <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></Field>
      <Field label="Mobile (login)"><input className="input bg-steel-50" readOnly value={`+91 ${customer?.mobile}`} /></Field>
      <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Member since"><input className="input bg-steel-50" readOnly value={date(customer?.createdAt)} /></Field>
      <div className="sm:col-span-2"><Field label="Address"><input className="input" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} /></Field></div>
      <div className="sm:col-span-2"><Field label="Landmark / area"><input className="input" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} /></Field></div>
      <Field label="City"><input className="input" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></Field>
      <Field label="Pincode"><input className="input" inputMode="numeric" maxLength={6} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })} /></Field>
      {err && <div className="sm:col-span-2"><ErrorNote>{err}</ErrorNote></div>}
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={reminders} onChange={(e) => setReminders(e.target.checked)} />
        <span>
          <span className="font-medium">Email me half-yearly battery servicing reminders</span>
          <span className="block text-graphite">For car, commercial, tractor and inverter batteries bought from us. Needs an email address above.</span>
        </span>
      </label>
      <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</button></div>
    </form>
  );
}

/* ---------- Password ---------- */
export function ChangePassword() {
  const { customer, refresh } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const has = customer?.hasPassword;

  async function save(e: FormEvent) {
    e.preventDefault();
    const p = passwordProblem(password, confirm);
    if (p) return setErr(p);
    setErr('');
    setBusy(true);
    try {
      await api('/auth/password/change', { body: { current, password } });
      setCurrent('');
      setPassword('');
      setConfirm('');
      await refresh();
      toast('Password saved');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card mt-6 grid gap-4 p-5 sm:grid-cols-2">
      <h2 className="text-2xl font-semibold sm:col-span-2">{has ? 'Change password' : 'Set a password'}</h2>
      {has && (
        <div className="sm:col-span-2 sm:max-w-sm">
          <PasswordInput label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
        </div>
      )}
      <PasswordInput label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordInput label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      {err && <div className="sm:col-span-2"><ErrorNote>{err}</ErrorNote></div>}
      <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password</button></div>
    </form>
  );
}

/* ---------- Orders ---------- */
export function MyOrders() {
  const { data, err } = useLoad<{ orders: Order[] }>('/orders');
  const pcb = useLoad<{ orders: PcbOrder[] }>('/pcb-orders');
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data || !pcb.data) return <Spinner />;
  const none = !data.orders.length && !pcb.data.orders.length;
  if (none) return <Empty title="No orders yet" action={<Link to="/" className="btn-primary">Shop batteries</Link>} />;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">My orders</h2>
      {data.orders.map((o) => (
        <Link key={o._id} to={`/account/orders/${o.orderId}`} className="card flex flex-wrap items-center gap-4 p-4 hover:border-ink">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-semibold">{o.orderId}</p>
            <p className="truncate font-semibold">{o.items.map((i) => fullName(i.brandName, i.productName)).join(', ')}</p>
            <p className="text-sm text-ink-300">{dateTime(o.createdAt)} · {o.itemCount} item{o.itemCount > 1 ? 's' : ''}</p>
          </div>
          <StatusPill status={o.status} />
          <p className="font-display text-xl font-bold">{inr(o.total)}</p>
          <ChevronRight className="h-5 w-5 text-ink-300" />
        </Link>
      ))}
      {pcb.data.orders.length > 0 && (
        <>
          <h3 className="pt-4 text-lg font-semibold">PCB orders</h3>
          {pcb.data.orders.map((o) => (
            <div key={o._id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                <p className="truncate font-semibold">{o.quantity} × {o.productName}</p>
                <p className="text-sm text-ink-300">{dateTime(o.createdAt)} · part no. {o.partNumber}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PCB_STATUS_TONE[o.status] ?? ''}`}>{o.status}</span>
            </div>
          ))}
          <p className="text-xs text-ink-300">We confirm PCB orders and pricing with you directly.</p>
        </>
      )}
    </div>
  );
}

export function MyOrderDetail() {
  const { orderId } = useParams();
  const { data, err } = useLoad<{ order: Order }>(`/orders/${orderId}`);
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data) return <Spinner />;
  const o = data.order;
  return (
    <div className="space-y-4">
      <Link to="/account/orders" className="text-sm font-semibold text-graphite hover:underline">← All orders</Link>
      <OrderView order={o} />
      <Link to={`/enquiry?orderId=${o.orderId}&type=Order+Issue`} className="btn-outline"><MessageSquareText className="h-4 w-4" /> Enquire about this order</Link>
    </div>
  );
}

/** Shared order view, also used by the admin console. */
export function OrderView({ order: o }: { order: Order }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-semibold">{o.orderId}</p>
          <p className="text-sm text-ink-300">Placed {dateTime(o.createdAt)}</p>
        </div>
        <StatusPill status={o.status} />
      </div>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div><p className="label">Customer</p><p>{o.customerName}<br />+91 {o.customerMobile}{o.customerEmail && <><br />{o.customerEmail}</>}</p></div>
        <div><p className="label">Vehicle</p><p>{o.vehicle?.label || '—'}{o.vehicle?.registrationNumber && <><br />{o.vehicle.registrationNumber}</>}</p></div>
        <div>
          <p className="label">{FULFILMENT_LABEL[o.fulfilment]}</p>
          <p>{o.fulfilment === 'DELIVERY_INSTALL' ? [o.address?.line1, o.address?.line2, o.address?.city, o.address?.pincode].filter(Boolean).join(', ') : o.fulfilment === 'IN_STORE' ? 'Sold at the counter' : 'Collect at the shop'}</p>
          <p className="mt-1 text-ink-300">{PAYMENT_LABEL[o.paymentMethod]} · {o.paymentStatus === 'PAID' ? 'Paid' : 'Payment pending'}</p>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Battery</th><th>Model</th><th>Qty</th><th>Price</th><th>Warranty</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {o.items.map((i) => {
              const p = o.purchases?.find((x) => x.product === i.product);
              return (
                <tr key={i._id}>
                  <td className="font-semibold">{fullName(i.brandName, i.productName)}<br /><span className="font-normal text-ink-300">SKU {i.sku}</span></td>
                  <td>{i.model}<br /><span className="text-ink-300">{i.capacityAh ? `${i.voltage}V ${i.capacityAh}Ah` : `${i.voltage}V`}</span></td>
                  <td>{i.quantity}</td>
                  <td>{inr(i.unitPrice)}</td>
                  <td>
                    {i.warranty.totalMonths} months
                    {p && o.status !== 'CANCELLED' && <><br /><span className="text-ink-300">until {date(p.warrantyExpiry)}</span></>}
                  </td>
                  <td className="text-right font-semibold">{inr(i.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td colSpan={5} className="pt-3 text-right font-semibold">Total</td><td className="pt-3 text-right font-display text-xl font-bold">{inr(o.total)}</td></tr></tfoot>
        </table>
      </div>
      {o.notes && <p className="mt-4 rounded bg-steel-50 p-3 text-sm"><b>Notes:</b> {o.notes}</p>}
      <div className="mt-5">
        <p className="label">Status history</p>
        <ol className="mt-2 space-y-2 border-l-2 border-steel pl-4 text-sm">
          {o.statusHistory.map((h, idx) => (
            <li key={idx}><b>{ORDER_STATUS_LABEL[h.status]}</b> <span className="text-ink-300">· {dateTime(h.at)}</span>{h.note && <span className="block text-graphite">{h.note}</span>}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ---------- Purchases / batteries / warranty ---------- */
export function WarrantyStatus({ p }: { p: Purchase }) {
  if (p.status === 'VOID') return <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900">Void (order cancelled)</span>;
  const left = daysLeft(p.warrantyExpiry);
  if (left < 0) return <span className="rounded bg-steel px-2 py-0.5 text-xs font-semibold text-graphite">Expired</span>;
  const free = p.freeReplacementUntil && daysLeft(p.freeReplacementUntil) >= 0;
  return (
    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
      {free ? 'Free replacement period' : p.freeReplacementUntil ? 'Pro-rata period' : 'Active'} · {left} days left
    </span>
  );
}

export function PurchaseTable({ purchases, orderLink }: { purchases: Purchase[]; orderLink: (orderId: string) => string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="table-base">
        <thead><tr><th>Date</th><th>Battery</th><th>Brand</th><th>Vehicle</th><th>Amount</th><th>Warranty</th><th>Order ID</th></tr></thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={p._id} className={p.status === 'VOID' ? 'opacity-60' : ''}>
              <td className="whitespace-nowrap">{date(p.purchaseDate)}</td>
              <td className="font-semibold">{p.productName}<br /><span className="font-normal text-ink-300">{p.model} × {p.quantity}</span></td>
              <td>{p.brandName}</td>
              <td>{p.vehicleLabel || '—'}{p.registrationNumber && <><br /><span className="text-ink-300">{p.registrationNumber}</span></>}</td>
              <td className="whitespace-nowrap">{inr(p.amount)}</td>
              <td className="whitespace-nowrap">{p.warrantyMonths} months<br /><WarrantyStatus p={p} /></td>
              <td><Link to={orderLink(p.orderId)} className="font-mono text-xs font-semibold underline-offset-2 hover:underline">{p.orderId}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function usePurchases() {
  return useLoad<{ purchases: Purchase[] }>('/me/purchases');
}

export function PurchaseHistoryTab() {
  const { data, err } = usePurchases();
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">Purchase history</h2>
      {data.purchases.length ? <PurchaseTable purchases={data.purchases} orderLink={(id) => `/account/orders/${id}`} /> : <Empty title="No purchases yet" />}
    </div>
  );
}

export function MyBatteries() {
  const { data, err } = usePurchases();
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data) return <Spinner />;
  const active = data.purchases.filter((p) => p.status === 'ACTIVE');
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">My batteries</h2>
      {!active.length && <Empty title="No batteries yet" action={<Link to="/" className="btn-primary">Shop batteries</Link>} />}
      <div className="grid gap-4 md:grid-cols-2">
        {active.map((p) => (
          <div key={p._id} className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-300">{p.brandName}</p>
            <p className="font-display text-xl font-semibold">{p.productName}</p>
            <p className="text-sm text-ink-300">Model {p.model}{p.capacityAh ? `, ${p.capacityAh}Ah` : ''}, qty {p.quantity}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-ink-300">Purchased</dt><dd className="font-semibold">{date(p.purchaseDate)}</dd></div>
              <div><dt className="text-ink-300">Price</dt><dd className="font-semibold">{inr(p.amount)}</dd></div>
              <div><dt className="text-ink-300">Warranty</dt><dd className="font-semibold">{p.warrantyMonths} months</dd></div>
              <div><dt className="text-ink-300">Expires</dt><dd className="font-semibold">{date(p.warrantyExpiry)}</dd></div>
              <div><dt className="text-ink-300">Vehicle</dt><dd className="font-semibold">{p.vehicleLabel || '—'}</dd></div>
              <div><dt className="text-ink-300">Order ID</dt><dd><Link className="font-mono text-xs font-semibold hover:underline" to={`/account/orders/${p.orderId}`}>{p.orderId}</Link></dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <WarrantyStatus p={p} />
              {p.orderStatus && <span className="text-xs text-ink-300">Order: {ORDER_STATUS_LABEL[p.orderStatus]}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WarrantyTab() {
  const { data, err } = usePurchases();
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data) return <Spinner />;
  const list = data.purchases.filter((p) => p.status === 'ACTIVE');
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">Warranty information</h2>
      <p className="text-sm text-graphite">Warranty runs from the purchase date. During the free replacement period a battery found faulty is replaced free; after that, pro-rata terms of the manufacturer apply.</p>
      {!list.length && <Empty title="No warranties to show" />}
      {list.map((p) => {
        const total = p.warrantyMonths * 30.44;
        const used = Math.min(1, Math.max(0, (Date.now() - new Date(p.purchaseDate).getTime()) / 86_400_000 / total));
        const freeFrac = p.freeReplacementMonths != null ? p.freeReplacementMonths / p.warrantyMonths : null;
        return (
          <div key={p._id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{fullName(p.brandName, p.productName)} <span className="text-ink-300">({p.model})</span></p>
                <p className="text-sm text-ink-300">Order {p.orderId} · bought {date(p.purchaseDate)}</p>
              </div>
              <WarrantyStatus p={p} />
            </div>
            <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-steel" aria-hidden>
              {freeFrac != null && <div className="absolute inset-y-0 left-0 bg-emerald-200" style={{ width: `${freeFrac * 100}%` }} />}
              <div className="absolute inset-y-0 left-0 bg-ok" style={{ width: `${used * 100}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-graphite">
              <span>Start {date(p.purchaseDate)}</span>
              {p.freeReplacementUntil && <span>Free replacement until <b>{date(p.freeReplacementUntil)}</b> ({p.freeReplacementMonths} mo)</span>}
              <span>Expires <b>{date(p.warrantyExpiry)}</b> ({p.warrantyMonths} mo)</span>
            </div>
            <Link to={`/enquiry?type=Warranty&orderId=${p.orderId}&product=${p.product}`} className="btn-outline mt-4 px-3 py-1.5 text-sm">Raise warranty claim</Link>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Enquiries ---------- */
const ENQ_TONE: Record<string, string> = {
  New: 'bg-volt-soft text-ink',
  'In Progress': 'bg-sky-100 text-sky-900',
  Resolved: 'bg-emerald-100 text-emerald-900',
  Closed: 'bg-steel text-graphite',
};
export function EnquiryPill({ status }: { status: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${ENQ_TONE[status] ?? ''}`}>{status}</span>;
}

export function MyEnquiries() {
  const { data, err } = useLoad<{ enquiries: Enquiry[] }>('/me/enquiries');
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My enquiries</h2>
        <Link to="/enquiry" className="btn-primary"><Plus className="h-4 w-4" /> New enquiry</Link>
      </div>
      {!data.enquiries.length && <Empty title="No enquiries yet" />}
      {data.enquiries.map((e) => (
        <div key={e._id} className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">{e.enquiryNumber}</span>
            <span className="text-sm text-graphite">· {e.enquiryType}</span>
            <span className="ml-auto"><EnquiryPill status={e.status} /></span>
          </div>
          {(e.productLabel || e.orderId) && <p className="mt-1 text-sm text-ink-300">{[e.productLabel, e.orderId].filter(Boolean).join(' · ')}</p>}
          <p className="mt-2 whitespace-pre-line text-sm">{e.message}</p>
          <p className="mt-2 text-xs text-ink-300">{dateTime(e.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}
