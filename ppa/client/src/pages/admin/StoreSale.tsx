import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Search, Trash2, UserRound, UserPlus, ShieldCheck, Store } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { Product } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { ErrorNote, Field } from '../../components/ui';
import { ProductImage } from '../../components/BatteryArt';
import { fullName, inr, specLine } from '../../lib/format';
import { PageHead } from './AdminLayout';

interface FoundCustomer {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  orders: number;
  totalSpent: number;
}
interface Line {
  product: Product;
  quantity: string;
  unitPrice: string;
}

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the browser's (India) time

export default function StoreSale() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();

  // customer
  const [mobile, setMobile] = useState((params.get('mobile') ?? '').replace(/\D/g, '').slice(-10));
  const [existing, setExisting] = useState<FoundCustomer | null | undefined>(undefined); // undefined = not looked up yet
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // products
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const searchBox = useRef<HTMLInputElement>(null);

  // sale
  const [saleDate, setSaleDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [paid, setPaid] = useState(true);
  const [vehicleText, setVehicleText] = useState('');
  const [reg, setReg] = useState('');
  const [notes, setNotes] = useState('');
  const [reduceStock, setReduceStock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Look the customer up as soon as a full mobile number is typed.
  useEffect(() => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setExisting(undefined);
      return;
    }
    let live = true;
    api<{ customers: FoundCustomer[] }>(`/admin/customers${qs({ q: mobile })}`)
      .then((r) => live && setExisting(r.customers.find((c) => c.mobile === mobile) ?? null))
      .catch(() => live && setExisting(null));
    return () => {
      live = false;
    };
  }, [mobile]);

  // Product search (small debounce).
  useEffect(() => {
    const t = term.trim();
    if (t.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const h = setTimeout(() => {
      api<{ products: Product[] }>(`/admin/products${qs({ q: t })}`)
        .then((r) => setResults(r.products.slice(0, 8)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(h);
  }, [term]);

  function addProduct(p: Product) {
    setLines((ls) =>
      ls.some((l) => l.product._id === p._id)
        ? ls.map((l) => (l.product._id === p._id ? { ...l, quantity: String(Number(l.quantity || 0) + 1) } : l))
        : [...ls, { product: p, quantity: '1', unitPrice: p.sellingPrice != null ? String(p.sellingPrice) : '' }],
    );
    setTerm('');
    setResults([]);
    searchBox.current?.focus();
  }
  const setLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.product._id === id ? { ...l, ...patch } : l)));

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0), [lines]);
  const validMobile = /^[6-9]\d{9}$/.test(mobile);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!validMobile) return setErr('Enter the customer’s 10-digit mobile number.');
    if (existing === null && name.trim().length < 2) return setErr('Enter the customer’s name.');
    if (!lines.length) return setErr('Add at least one product.');
    const bad = lines.find((l) => !(Number(l.quantity) >= 1) || l.unitPrice === '' || !(Number(l.unitPrice) >= 0));
    if (bad) return setErr(`Check the quantity and price for ${bad.product.name}.`);

    setBusy(true);
    try {
      const r = await api<{ orderId: string; newCustomer: boolean; warnings: string[] }>('/admin/sales', {
        body: {
          customer: { mobile, name: existing ? existing.name : name, email },
          items: lines.map((l) => ({ productId: l.product._id, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
          saleDate,
          paymentMethod,
          paid,
          vehicleText,
          registrationNumber: reg,
          notes,
          reduceStock,
        },
      });
      toast(`Sale ${r.orderId} saved${r.newCustomer ? ', new customer added' : ''}`);
      r.warnings.forEach((w) => toast(w, 'error'));
      nav(`/admin/orders/${r.orderId}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead
        title="Record shop sale"
        sub="For batteries sold at the counter. The sale is saved to the customer's history and their warranty starts from the sale date."
      />
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* 1. Customer */}
          <section className="card p-5">
            <h2 className="text-lg font-semibold">1. Customer</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Mobile number">
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-steel-400/70 bg-steel-50 px-3 text-graphite">+91</span>
                  <input
                    className="input rounded-l-none"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="98xxxxxxxx"
                    autoFocus={!mobile}
                    required
                  />
                </div>
              </Field>
              <div className="flex items-end">
                {existing && (
                  <div className="flex w-full items-center gap-3 rounded-md border border-ok/30 bg-emerald-50 p-3 text-sm">
                    <UserRound className="h-5 w-5 shrink-0 text-ok" />
                    <div className="min-w-0">
                      <p className="font-semibold">{existing.name || 'Existing customer'}</p>
                      <p className="text-graphite">
                        {existing.orders} previous order{existing.orders === 1 ? '' : 's'}, {inr(existing.totalSpent)} spent
                      </p>
                    </div>
                    <Link to={`/admin/customers/${existing._id}`} target="_blank" className="ml-auto text-xs font-semibold text-link hover:underline">
                      Profile
                    </Link>
                  </div>
                )}
                {existing === null && (
                  <p className="flex items-center gap-2 pb-3 text-sm text-graphite">
                    <UserPlus className="h-4 w-4" /> New customer. Enter their name below.
                  </p>
                )}
              </div>
              {existing && !existing.email && (
                <div className="sm:col-span-2 sm:max-w-sm">
                  <Field label="Add their email (optional)" hint="Needed for the half-yearly servicing reminder emails">
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </div>
              )}
              {existing === null && (
                <>
                  <Field label="Customer name">
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
                  </Field>
                  <Field label="Email (optional)" hint="Needed for the half-yearly servicing reminder emails">
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          </section>

          {/* 2. Products */}
          <section className="card p-5">
            <h2 className="text-lg font-semibold">2. Products sold</h2>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <input
                ref={searchBox}
                className="input pl-9"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search by model, name or SKU, e.g. DIN65, AR150, BTZ5L"
                aria-label="Search products"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-300" />}
              {results.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-steel bg-white shadow-xl">
                  {results.map((p) => (
                    <li key={p._id}>
                      <button type="button" onClick={() => addProduct(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-steel-50">
                        <ProductImage product={p} className="h-10 w-12 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{fullName(p.brand?.name, p.name)}</span>
                          <span className="block text-xs text-graphite">
                            {p.model} · {specLine(p)} · {p.warranty.totalMonths} mo warranty · stock {p.stock}
                            {!p.isActive && ' · inactive'}
                          </span>
                        </span>
                        <span className="text-sm font-semibold">{p.sellingPrice != null ? inr(p.sellingPrice) : 'no price'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {term.trim().length >= 2 && !searching && !results.length && (
                <p className="mt-2 text-sm text-graphite">
                  No product matches “{term}”. Add it first in <Link to="/admin/products/new" className="text-link underline">Products</Link>.
                </p>
              )}
            </div>

            {lines.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>Product</th><th className="w-24">Qty</th><th className="w-32">Price each (₹)</th><th className="text-right">Amount</th><th /></tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.product._id}>
                        <td>
                          <p className="font-semibold">{fullName(l.product.brand?.name, l.product.name)}</p>
                          <p className="flex items-center gap-1 text-xs text-ok">
                            <ShieldCheck className="h-3.5 w-3.5" /> {l.product.warranty.totalMonths} months warranty from the sale date
                          </p>
                        </td>
                        <td>
                          <input className="input px-2 py-1.5" inputMode="numeric" value={l.quantity} onChange={(e) => setLine(l.product._id, { quantity: e.target.value.replace(/\D/g, '') })} aria-label="Quantity" />
                        </td>
                        <td>
                          <input
                            className={`input px-2 py-1.5 ${l.unitPrice === '' ? 'border-plus' : ''}`}
                            inputMode="numeric"
                            value={l.unitPrice}
                            placeholder="Enter price"
                            onChange={(e) => setLine(l.product._id, { unitPrice: e.target.value.replace(/[^\d.]/g, '') })}
                            aria-label="Price each"
                          />
                        </td>
                        <td className="whitespace-nowrap text-right font-semibold">{inr((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}</td>
                        <td>
                          <button type="button" className="btn-ghost p-1 text-plus" aria-label={`Remove ${l.product.name}`} onClick={() => setLines((ls) => ls.filter((x) => x !== l))}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-300">Search above and click a product to add it.</p>
            )}
          </section>

          {/* 3. Details */}
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">3. Sale details</h2>
            <Field label="Date of sale" hint="Warranty is counted from this date">
              <input className="input" type="date" value={saleDate} max={today()} onChange={(e) => setSaleDate(e.target.value)} required />
            </Field>
            <div>
              <span className="label">Payment</span>
              <div className="inline-flex rounded-md border border-steel p-0.5" role="radiogroup" aria-label="Payment method">
                {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === m}
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded px-4 py-1.5 text-sm font-semibold ${paymentMethod === m ? 'bg-ink text-white' : 'text-graphite'}`}
                  >
                    {m === 'CASH' ? 'Cash' : m === 'UPI' ? 'UPI' : 'Card'}
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4" /> Payment received
              </label>
            </div>
            <Field label="Vehicle (optional)">
              <input className="input" value={vehicleText} onChange={(e) => setVehicleText(e.target.value)} placeholder="e.g. Maruti Swift Dzire" maxLength={120} />
            </Field>
            <Field label="Registration number (optional)">
              <input className="input uppercase" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="KA 25 AB 1234" maxLength={20} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes (optional)">
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Old battery exchanged, invoice number, fitted by…" />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={reduceStock} onChange={(e) => setReduceStock(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                <span className="font-medium">Reduce stock on the website</span>
                <span className="block text-graphite">Untick if this battery was never counted in the website's stock.</span>
              </span>
            </label>
          </section>
        </div>

        <aside className="card h-fit p-5 xl:sticky xl:top-6">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Store className="h-5 w-5" /> Summary
          </p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-graphite">Customer</dt><dd className="truncate text-right font-medium">{existing?.name || name || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-graphite">Mobile</dt><dd className="font-medium">{validMobile ? `+91 ${mobile}` : '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-graphite">Items</dt><dd className="font-medium">{lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)}</dd></div>
          </dl>
          <div className="mt-3 flex items-baseline justify-between border-t border-steel pt-3">
            <span className="font-semibold">Total</span>
            <span className="font-display text-3xl font-bold">{inr(total)}</span>
          </div>
          {err && <div className="mt-3"><ErrorNote>{err}</ErrorNote></div>}
          <button className="btn-volt mt-4 w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save sale
          </button>
          <p className="mt-2 text-xs text-ink-300">
            The customer can log in on the website with this mobile number to see the battery and its warranty.
          </p>
        </aside>
      </form>
    </div>
  );
}
