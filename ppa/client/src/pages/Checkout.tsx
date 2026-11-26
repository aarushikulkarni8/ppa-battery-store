import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Store, Truck, Banknote, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import type { Product } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useCart, type CartLine } from '../context/CartContext';
import { ProductImage } from '../components/BatteryArt';
import { ErrorNote, Field, Spinner } from '../components/ui';
import { inr, warrantySplit, fullName } from '../lib/format';
import { STORE } from '../config/store';


export default function Checkout() {
  const [params] = useSearchParams();
  const buyId = params.get('buy');
  const buyQty = Math.max(1, Math.min(20, Number(params.get('qty')) || 1));
  const { customer, refresh } = useAuth();
  const cart = useCart();
  const nav = useNavigate();

  const [buyProduct, setBuyProduct] = useState<Product | null>(null);
  const [loadErr, setLoadErr] = useState('');

  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [vehicleText, setVehicleText] = useState('');
  const [reg, setReg] = useState('');
  const [fulfilment, setFulfilment] = useState<'DELIVERY_INSTALL' | 'STORE_PICKUP'>('DELIVERY_INSTALL');
  const [address, setAddress] = useState({
    line1: customer?.address.line1 ?? '',
    line2: customer?.address.line2 ?? '',
    city: customer?.address.city || 'Hubballi',
    state: customer?.address.state || 'Karnataka',
    pincode: customer?.address.pincode ?? '',
  });
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (buyId) api<{ product: Product }>(`/products/${buyId}`).then((r) => setBuyProduct(r.product)).catch((e) => setLoadErr(e.message));
  }, [buyId]);

  const lines: CartLine[] = useMemo(
    () => (buyId ? (buyProduct ? [{ product: buyProduct, quantity: buyQty }] : []) : cart.items),
    [buyId, buyProduct, buyQty, cart.items],
  );
  const total = lines.reduce((s, l) => s + (l.product.sellingPrice ?? 0) * l.quantity, 0);

  if (!buyId && !cart.loading && cart.items.length === 0) return <Navigate to="/cart" replace />;
  if (loadErr) return <div className="container-x py-10"><ErrorNote>{loadErr}</ErrorNote></div>;
  if (!lines.length) return <Spinner />;

  const unavailable = lines.find((l) => l.product.sellingPrice == null || l.product.stock < l.quantity);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const body = {
      name,
      email,
      vehicleText: vehicleText.trim() || undefined,
      registrationNumber: reg.trim().toUpperCase(),
      fulfilment,
      address: fulfilment === 'DELIVERY_INSTALL' ? address : undefined,
      paymentMethod: fulfilment === 'DELIVERY_INSTALL' ? 'COD' : 'PAY_AT_STORE',
      notes,
      buyNow: buyId ? { productId: buyId, quantity: buyQty } : undefined,
    };
    setPlacing(true);
    try {
      const r = await api<{ orderId: string }>('/orders', { body });
      await Promise.all([cart.reload(), refresh()]);
      nav(`/orders/${r.orderId}/confirmed`, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
      setPlacing(false);
    }
  }

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-bold">Checkout</h1>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-xl font-semibold">1. Contact</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
              </Field>
              <Field label="Mobile">
                <input className="input bg-steel-50" value={`+91 ${customer?.mobile ?? ''}`} readOnly />
              </Field>
              <Field label="Email (for order updates)">
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-semibold">2. Vehicle (optional)</h2>
            <p className="mt-1 text-sm text-graphite">We note the vehicle on your warranty record so claims are easier.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Vehicle make and model">
                <input className="input" value={vehicleText} onChange={(e) => setVehicleText(e.target.value)} placeholder="e.g. Maruti Swift Dzire" maxLength={120} />
              </Field>
              <Field label="Registration number">
                <input className="input uppercase" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="KA 25 AB 1234" maxLength={20} />
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-semibold">3. Delivery and payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['DELIVERY_INSTALL', Truck, 'Delivery with installation', 'Pay cash on delivery'],
                  ['STORE_PICKUP', Store, 'Pick up at the shop', 'Pay at the store'],
                ] as const
              ).map(([k, Icon, t, d]) => (
                <label key={k} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${fulfilment === k ? 'border-ink ring-2 ring-volt/60' : 'border-steel'}`}>
                  <input type="radio" className="sr-only" name="fulfilment" checked={fulfilment === k} onChange={() => setFulfilment(k)} />
                  <Icon className="h-6 w-6 shrink-0" />
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="flex items-center gap-1 text-sm text-graphite"><Banknote className="h-4 w-4" /> {d}</span>
                  </span>
                </label>
              ))}
            </div>
            {fulfilment === 'DELIVERY_INSTALL' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <input className="input" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} required minLength={3} autoComplete="address-line1" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Landmark / area (optional)">
                    <input className="input" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} autoComplete="address-line2" />
                  </Field>
                </div>
                <Field label="City">
                  <input className="input" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />
                </Field>
                <Field label="Pincode">
                  <input className="input" value={address.pincode} inputMode="numeric" pattern="\d{6}" maxLength={6} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })} required />
                </Field>
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-steel-50 p-3 text-sm text-graphite">
                Collect from {STORE.name}, {STORE.addressLines.join(', ')}. We will call you when it is ready.
              </p>
            )}
            <div className="mt-4">
              <Field label="Notes for the shop (optional)">
                <textarea className="input" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferred time, directions, old battery exchange…" />
              </Field>
            </div>
          </section>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">Your order</h2>
          <ul className="mt-4 divide-y divide-steel">
            {lines.map(({ product: p, quantity }) => (
              <li key={p._id} className="flex gap-3 py-3">
                <div className="w-16 shrink-0 rounded bg-steel-50 p-1"><ProductImage product={p} className="h-14 w-full" /></div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{fullName(p.brand.name, p.name)}</p>
                  <p className="text-ink-300">{p.model} · Qty {quantity}</p>
                  <p className="mt-1 flex items-start gap-1 text-xs text-ok">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span><b>{p.warranty.totalMonths} months warranty</b> — {warrantySplit(p.warranty)}</span>
                  </p>
                </div>
                <p className="font-semibold">{inr((p.sellingPrice ?? 0) * quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t border-steel pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-display text-3xl font-bold">{inr(total)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-300">Warranty starts on the purchase date and is honoured by the manufacturer as per its warranty card.</p>
          {unavailable && <div className="mt-3"><ErrorNote>{unavailable.product.name} is not available in that quantity right now.</ErrorNote></div>}
          {err && <div className="mt-3"><ErrorNote>{err}</ErrorNote></div>}
          <button className="btn-volt mt-4 w-full" disabled={placing || !!unavailable}>
            {placing && <Loader2 className="h-4 w-4 animate-spin" />} Place order
          </button>
          {!buyId && <Link to="/cart" className="mt-3 block text-center text-sm font-semibold hover:underline">Edit cart</Link>}
        </aside>
      </form>
    </div>
  );
}
