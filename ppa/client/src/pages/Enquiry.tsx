import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { api } from '../api/client';
import { ENQUIRY_TYPES, type Order, type Product } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { ErrorNote, Field } from '../components/ui';
import { STORE } from '../config/store';
import { fullName } from '../lib/format';

export default function Enquiry() {
  const [params] = useSearchParams();
  const { customer } = useAuth();
  const productId = params.get('product') ?? '';
  const initialType = ENQUIRY_TYPES.find((t) => t === params.get('type')) ?? 'Product Enquiry';

  const [form, setForm] = useState({
    name: customer?.name ?? '',
    mobile: customer?.mobile ?? '',
    email: customer?.email ?? '',
    orderId: params.get('orderId') ?? '',
    productLabel: params.get('product_label') ?? '',
    enquiryType: initialType as string,
    message: '',
  });
  const [productName, setProductName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ message: string; enquiryNumber: string } | null>(null);

  useEffect(() => {
    if (productId)
      api<{ product: Product }>(`/products/${productId}`)
        .then((r) => {
          const label = `${fullName(r.product.brand.name, r.product.name)} (${r.product.model})`;
          setProductName(label);
          setForm((f) => ({ ...f, productLabel: label }));
        })
        .catch(() => undefined);
    api<{ orders: Order[] }>('/orders').then((r) => setOrders(r.orders)).catch(() => undefined);
  }, [productId]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api<{ message: string; enquiryNumber: string }>('/enquiries', {
        body: { ...form, productId: productName && productId ? productId : undefined },
      });
      setDone(r);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="container-x max-w-2xl py-16">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-ok" />
          <h1 className="mt-3 text-3xl font-bold">{done.message}</h1>
          <p className="mt-2 text-graphite">
            Your reference number is <span className="font-mono font-semibold text-ink">{done.enquiryNumber}</span>. Our team will contact you on +91 {form.mobile}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/account/enquiries" className="btn-primary">View my enquiries</Link>
            <button
              className="btn-outline"
              onClick={() => {
                setDone(null);
                setForm((f) => ({ ...f, message: '' }));
              }}
            >
              Raise another enquiry
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-4xl font-bold">Raise an enquiry</h1>
        <p className="mt-2 text-graphite">Questions about a battery, a warranty claim, installation or an order — the shop owner gets it straight away.</p>
        <form onSubmit={submit} className="card mt-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Name">
            <input className="input" value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" />
          </Field>
          <Field label="Mobile">
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-steel-400/70 bg-steel-50 px-3 text-graphite">+91</span>
              <input className="input rounded-l-none" value={form.mobile} inputMode="numeric" maxLength={10} pattern="[6-9]\d{9}" onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} required />
            </div>
          </Field>
          <Field label="Email (optional)">
            <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
          </Field>
          <Field label="Order ID (optional)">
            <input className="input" list="my-orders" value={form.orderId} onChange={set('orderId')} placeholder="PPA-…" />
            <datalist id="my-orders">
              {orders.map((o) => (
                <option key={o.orderId} value={o.orderId}>{o.items.map((i) => i.productName).join(', ')}</option>
              ))}
            </datalist>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Battery / product (optional)">
              <input className="input" value={form.productLabel} onChange={(e) => { setProductName(''); set('productLabel')(e); }} placeholder="e.g. Amaron FLO BH40B20L" maxLength={160} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <span className="label">Enquiry type</span>
            <div className="flex flex-wrap gap-2">
              {ENQUIRY_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setForm({ ...form, enquiryType: t })}
                  aria-pressed={form.enquiryType === t}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${form.enquiryType === t ? 'border-ink bg-ink text-white' : 'border-steel bg-white text-graphite hover:border-ink/40'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Field label="Message">
              <textarea className="input" rows={5} value={form.message} onChange={set('message')} required minLength={5} maxLength={3000} placeholder="Describe your question or the problem with your battery" />
            </Field>
          </div>
          {err && <div className="sm:col-span-2"><ErrorNote>{err}</ErrorNote></div>}
          <div className="sm:col-span-2">
            <button className="btn-volt w-full sm:w-auto" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit enquiry
            </button>
          </div>
        </form>
      </div>
      <aside className="space-y-4 lg:pt-20">
        <div className="card p-5 text-sm">
          <p className="font-display text-lg font-semibold">Warranty claims</p>
          <p className="mt-1 text-graphite">Keep your invoice or order ID handy. Bring the battery to the shop for a test; the manufacturer decides replacement as per its warranty card.</p>
        </div>
        <div className="card p-5 text-sm">
          <p className="font-display text-lg font-semibold">Visit us</p>
          <p className="mt-1 text-graphite">{STORE.name}<br />{STORE.addressLines.join(', ')}</p>
          {STORE.phone && <a className="mt-2 block font-semibold" href={`tel:${STORE.phone.replace(/\s/g, '')}`}>{STORE.phone}</a>}
        </div>
      </aside>
    </div>
  );
}
