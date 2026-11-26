import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingCart, MessageSquareText, Truck, Store, Banknote, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { STORE } from '../config/store';
import { PhoneAction } from '../components/PhoneAction';
import type { Product } from '../api/types';
import { BatteryArt, InverterArt, PcbArt } from '../components/BatteryArt';
import { WarrantyBadge } from '../components/Warranty';
import { Price } from '../components/Price';
import { useBuy } from '../components/useBuy';
import { ProductCard } from '../components/ProductCard';
import { Empty, ErrorNote, Spinner } from '../components/ui';
import { CATEGORY_LABELS, dims, inr } from '../lib/format';

function Gallery({ product }: { product: Product }) {
  const [i, setI] = useState(0);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const imgs = product.images.filter((img) => !broken.has(img._id));
  const markBroken = (id: string) => {
    setBroken((b) => new Set(b).add(id));
    setI(0);
  };
  return (
    <div>
      <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-white p-4">
        {imgs.length ? (
          <img src={imgs[i]?.url} alt={imgs[i]?.alt || product.name} className="max-h-full max-w-full object-contain" onError={() => markBroken(imgs[i]._id)} />
        ) : product.productType === 'PCB' ? (
          <PcbArt product={product} className="h-full w-full" />
        ) : product.productType === 'INVERTER' ? (
          <InverterArt product={product} className="h-full w-full" />
        ) : (
          <BatteryArt product={product} className="h-full w-full" />
        )}
      </div>
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {imgs.map((img, idx) => (
            <button
              key={img._id}
              onClick={() => setI(idx)}
              aria-label={`Image ${idx + 1}`}
              className={`h-20 w-20 shrink-0 rounded-md border bg-white p-1 ${idx === i ? 'border-ink ring-2 ring-volt' : 'border-steel'}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      {!imgs.length && <p className="mt-2 text-xs text-ink-300">Illustration. Product photo will be added by the shop.</p>}
    </div>
  );
}

/** Other batteries in the same category, same brand first. */
function SimilarBatteries({ product }: { product: Product }) {
  const [list, setList] = useState<Product[] | null>(null);
  useEffect(() => {
    api<{ products: Product[] }>(`/products?category=${product.vehicleCategory}&limit=60`)
      .then((r) => {
        const others = r.products.filter((x) => x._id !== product._id && x.productType !== 'INVERTER');
        const score = (x: Product) => (x.brand._id === product.brand._id ? 0 : 1) + (x.series === product.series ? 0 : 0.5);
        setList(others.sort((a, b) => score(a) - score(b)).slice(0, 4));
      })
      .catch(() => setList([]));
  }, [product]);
  return (
    <section className="panel p-4 sm:p-6">
      <h2 className="font-sans text-xl font-bold tracking-normal">Similar batteries</h2>
      <p className="mt-1 text-sm text-graphite">Not sure this is the right one for your vehicle? Check the battery currently fitted, or ask us.</p>
      {list === null ? (
        <Spinner />
      ) : list.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {list.map((b) => (
            <ProductCard key={b._id} product={b} />
          ))}
        </div>
      ) : null}
      <Link to={`/enquiry?product=${product._id}&type=Product+Enquiry`} className="btn-outline mt-4">
        <MessageSquareText className="h-4 w-4" /> Ask which battery fits my vehicle
      </Link>
    </section>
  );
}

/** Inverter batteries to go with an inverter. */
function PairedBatteries() {
  const [list, setList] = useState<Product[] | null>(null);
  useEffect(() => {
    api<{ products: Product[] }>('/products?category=INVERTER&limit=30')
      .then((r) => setList(r.products.filter((x) => x.productType !== 'INVERTER')))
      .catch(() => setList([]));
  }, []);
  return (
    <section className="panel p-4 sm:p-6">
      <h2 className="font-sans text-xl font-bold tracking-normal">Batteries for this inverter</h2>
      <p className="mt-1 text-sm text-graphite">An inverter needs a battery. Match the battery voltage and ask us which capacity suits your backup needs.</p>
      {list === null ? (
        <Spinner />
      ) : list.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {list.slice(0, 4).map((b) => (
            <ProductCard key={b._id} product={b} />
          ))}
        </div>
      ) : (
        <Link to="/enquiry?type=Product+Enquiry&product_label=Inverter+battery" className="btn-outline mt-3">
          Ask us for an inverter battery
        </Link>
      )}
    </section>
  );
}

/** PCB page: details and specifications, then quantity + place order. No price is shown. */
function PcbDetail({ product: p }: { product: Product }) {
  const { customer } = useAuth();
  const [qty, setQty] = useState('1');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [placed, setPlaced] = useState<{ orderNumber: string; quantity: number } | null>(null);

  async function order(e: FormEvent) {
    e.preventDefault();
    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity < 1) return setErr('Enter the quantity as a whole number (1 or more).');
    setErr('');
    setBusy(true);
    try {
      const r = await api<{ orderNumber: string }>('/pcb-orders', { body: { productId: p._id, quantity, company, notes } });
      setPlaced({ orderNumber: r.orderNumber, quantity });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-x py-3 sm:py-4">
      <nav className="mb-3 text-[13px] text-graphite" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-link hover:underline">Home</Link>
        <span className="mx-1.5 text-ink-300">›</span>
        <Link to="/pcb" className="hover:text-link hover:underline">PCB</Link>
      </nav>
      <div className="panel grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_300px] lg:gap-8">
        <div className="lg:sticky lg:top-36 lg:self-start">
          <Gallery product={p} />
        </div>
        <div className="min-w-0">
          {p.brand?.name && <p className="text-sm font-semibold text-graphite">{p.brand.name}</p>}
          <h1 className="mt-1 font-sans text-2xl font-semibold leading-snug tracking-normal sm:text-[26px]">{p.name}</h1>
          <p className="mt-1 text-sm text-graphite">Part number {p.sku}{p.model && p.model !== p.sku ? `, model ${p.model}` : ''}</p>
          {!!p.specs?.length && (
            <>
              <h2 className="mt-5 font-sans text-base font-bold tracking-normal">Specifications</h2>
              <table className="mt-2 w-full overflow-hidden rounded-md text-sm">
                <tbody>
                  {p.specs.map((s) => (
                    <tr key={s.label} className="odd:bg-steel-50">
                      <th className="w-1/2 px-3 py-2.5 text-left font-medium text-graphite">{s.label}</th>
                      <td className="px-3 py-2.5 font-semibold">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {p.features.length > 0 && (
            <>
              <h2 className="mt-5 font-sans text-base font-bold tracking-normal">Features</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[14.5px] text-graphite marker:text-ink-300">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </>
          )}
          {p.description && (
            <>
              <h2 className="mt-5 font-sans text-base font-bold tracking-normal">Description</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-graphite">{p.description}</p>
            </>
          )}
        </div>

        <aside className="h-fit rounded-md border border-steel p-4 lg:sticky lg:top-36" aria-label="Order this PCB">
          {placed ? (
            <div>
              <p className="text-lg font-bold text-ok">Order placed</p>
              <p className="mt-1 font-mono text-sm font-semibold">{placed.orderNumber}</p>
              <p className="mt-2 text-sm text-graphite">
                {placed.quantity} × {p.name}. We will contact you on +91 {customer?.mobile} to confirm the order and pricing.
              </p>
              <Link to="/account/orders" className="btn-outline mt-4 w-full">View my orders</Link>
              <button type="button" className="mt-2 w-full text-sm font-semibold text-link hover:underline" onClick={() => { setPlaced(null); setQty('1'); setNotes(''); }}>
                Order again
              </button>
            </div>
          ) : (
            <form onSubmit={order} className="space-y-3">
              <p className="text-lg font-bold">Order this PCB</p>
              <label className="block">
                <span className="label">Quantity</span>
                <input className="input text-lg" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} aria-label="Quantity" required />
              </label>
              <label className="block">
                <span className="label">Company / firm (optional)</span>
                <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
              </label>
              <label className="block">
                <span className="label">Notes (optional)</span>
                <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Delivery date, special requirements…" />
              </label>
              {err && <ErrorNote>{err}</ErrorNote>}
              <button className="btn-buy w-full rounded-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Place order
              </button>
              <p className="text-xs text-ink-300">No payment now. We confirm the order and price with you by phone or email.</p>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { onlineShop } = useSite();
  const { slug } = useParams();
  const [data, setData] = useState<{ product: Product } | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const { addToCart, buyNow, busy } = useBuy();

  useEffect(() => {
    setData(null);
    setError('');
    setQty(1);
    api<{ product: Product }>(`/products/${slug}`).then(setData).catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <div className="container-x py-16"><Empty title="Battery not found" action={<Link className="btn-primary" to="/">Back to home</Link>}>{error}</Empty></div>;
  if (!data) return <Spinner />;
  if (data.product.productType === 'PCB') return <PcbDetail product={data.product} />;
  const { product: p } = data;
  const inverter = p.productType === 'INVERTER';
  const iv = p.inverterSpecs;
  const specRows: [string, string | number | null | undefined][] = inverter
    ? [
        ['Brand', p.brand.name],
        ['Model', p.model],
        ['Part number / SKU', p.sku],
        ['Series', p.series],
        ['Technology', p.batteryType],
        ['VA rating', iv?.vaRating ? `${iv.vaRating} VA` : null],
        ['Maximum load', iv?.maxLoadW ? `${iv.maxLoadW} W` : null],
        ['Battery voltage', p.voltage ? `${p.voltage} V` : null],
        ['Batteries supported', iv?.batteriesSupported],
        ['Output waveform', iv?.waveform],
        ['Max charging current', iv?.chargingCurrentA ? `${iv.chargingCurrentA} A` : null],
        ['Recommended battery', iv?.recommendedBattery],
        ['Dimensions (L × W × H)', dims(p.dimensions)],
        ['Weight', p.weightKg ? `${p.weightKg} kg` : null],
        ['Warranty', `${p.warranty.totalMonths} months`],
      ]
    : [
        ['Brand', p.brand.name],
        ['Model', p.model],
        ['Part number / SKU', p.sku],
        ['Series', p.series],
        ['Battery type', p.batteryType],
        ['Vehicle category', CATEGORY_LABELS[p.vehicleCategory]],
        ['Voltage', `${p.voltage} V`],
        ['Capacity', p.capacityAh ? `${p.capacityAh} Ah` : null],
        ['Cold cranking amps (CCA)', p.cca ? `${p.cca} A` : null],
        ['Dimensions (L × W × H)', dims(p.dimensions)],
        ['Weight', p.weightKg ? `${p.weightKg} kg` : null],
        ['Terminal layout', p.terminalLayout],
        ['Warranty', `${p.warranty.totalMonths} months`],
      ];
  const priced = p.sellingPrice != null;
  const outOfStock = priced && p.stock <= 0;
  const stockText = !onlineShop ? (p.stock > 0 ? 'Available at the shop' : 'Ask for availability') : !priced ? 'Price on request' : outOfStock ? 'Currently out of stock' : p.stock <= p.lowStockThreshold ? `Only ${p.stock} left in stock` : 'In stock';
  const stockTone = !onlineShop ? (p.stock > 0 ? 'text-ok' : 'text-graphite') : !priced ? 'text-graphite' : outOfStock ? 'text-plus' : p.stock <= p.lowStockThreshold ? 'text-buy' : 'text-ok';
  const maxQty = Math.max(1, Math.min(p.stock, 20));

  return (
    <div className="container-x py-3 sm:py-4">
      <nav className="mb-3 text-[13px] text-graphite" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-link hover:underline">Home</Link>
        <span className="mx-1.5 text-ink-300">›</span>
        {['FOUR_WHEELER', 'THREE_WHEELER', 'COMMERCIAL', 'TRACTOR'].includes(p.vehicleCategory) ? (
          <Link to="/search?q=automotive" className="hover:text-link hover:underline">Automotive</Link>
        ) : (
          <Link to={`/search?category=${p.vehicleCategory}`} className="hover:text-link hover:underline">{CATEGORY_LABELS[p.vehicleCategory]}</Link>
        )}
        <span className="mx-1.5 text-ink-300">›</span>
        <Link to={`/brands/${p.brand.slug}`} className="hover:text-link hover:underline">{p.brand.name}</Link>
      </nav>

      <div className="panel grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_280px] lg:gap-8">
        <div className="lg:sticky lg:top-36 lg:self-start">
          <Gallery product={p} />
        </div>

        <div className="min-w-0">
          <Link to={`/brands/${p.brand.slug}`} className="text-sm font-semibold text-link hover:underline">
            Visit the {p.brand.name} store
          </Link>
          <h1 className="mt-1 font-sans text-2xl font-semibold leading-snug tracking-normal sm:text-[26px]">{p.name}</h1>
          <p className="mt-1 text-sm text-graphite">Model {p.model}, part number {p.sku}</p>

          <div className="my-4 border-t border-steel" />
          <Price mrp={p.mrp} price={p.sellingPrice} large />
          <div className="my-4 border-t border-steel" />

          <dl className="grid grid-cols-3 gap-2 text-center">
            {(inverter
              ? [
                  ['Rating', iv?.vaRating ? `${iv.vaRating} VA` : '—'],
                  ['Battery', p.voltage ? `${p.voltage} V` : '—'],
                  [iv?.waveform ? 'Output' : 'Warranty', iv?.waveform || `${p.warranty.totalMonths} months`],
                ]
              : [
                  ['Voltage', `${p.voltage} V`],
                  ['Capacity', p.capacityAh ? `${p.capacityAh} Ah` : null],
                  [p.cca ? 'CCA' : 'Warranty', p.cca ? `${p.cca} A` : `${p.warranty.totalMonths} months`],
                ]
            ).map(([k, v]) => (
              <div key={k} className="rounded-md bg-steel-50 px-2 py-2.5">
                <dt className="text-[12px] text-graphite">{k}</dt>
                <dd className="mt-0.5 truncate text-[15px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <WarrantyBadge warranty={p.warranty} size="lg" />
          </div>

          {p.features.length > 0 && (
            <div className="mt-5">
              <h2 className="font-sans text-base font-bold tracking-normal">About this item</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[14.5px] text-graphite marker:text-ink-300">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-md border border-steel p-4 lg:sticky lg:top-36" aria-label="Buy this battery">
          {priced && <p className="text-[26px] font-bold tabular-nums leading-none">{inr(p.sellingPrice)}</p>}
          <p className={`mt-2 text-[15px] font-semibold ${stockTone}`}>{stockText}</p>
          <ul className="mt-3 space-y-2 text-[13.5px] text-graphite">
            {onlineShop ? (
              <>
                <li className="flex gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink" /> Delivery with installation in Hubballi</li>
                <li className="flex gap-2"><Store className="mt-0.5 h-4 w-4 shrink-0 text-ink" /> Or pick up at the shop</li>
                <li className="flex gap-2"><Banknote className="mt-0.5 h-4 w-4 shrink-0 text-ink" /> Cash on delivery or pay at store</li>
              </>
            ) : (
              <>
                <li className="flex gap-2"><Store className="mt-0.5 h-4 w-4 shrink-0 text-ink" /> Available at our Hubballi shop</li>
                <li className="flex gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink" /> Installation on request</li>
              </>
            )}
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {p.warranty.totalMonths} months {p.brand.name} warranty</li>
          </ul>
          {p.purchasable ? (
            <>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-graphite">Quantity</span>
                <select className="input w-auto py-1.5" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button className="btn-volt mt-3 w-full rounded-full" disabled={busy === `add-${p._id}`} onClick={() => addToCart(p, qty)}>
                <ShoppingCart className="h-4 w-4" /> Add to cart
              </button>
              <button className="btn-buy mt-2 w-full rounded-full" onClick={() => buyNow(p, qty)}>
                Buy now
              </button>
            </>
          ) : (
            <Link className="btn-buy mt-4 w-full rounded-full" to={`/enquiry?product=${p._id}&type=Product+Enquiry`}>
              {priced ? 'Ask when it is back' : 'Ask for price'}
            </Link>
          )}
          {!onlineShop && STORE.phone && (
            <div className="mt-3 flex justify-center">
              <PhoneAction phone={STORE.phone} whatsapp={STORE.whatsapp || undefined} className="text-base" />
            </div>
          )}
          <Link to={`/enquiry?product=${p._id}&type=Product+Enquiry`} className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-link hover:underline">
            <MessageSquareText className="h-4 w-4" /> Have a question? Raise an enquiry
          </Link>
        </aside>
      </div>

      <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-2">
        <section className="panel p-4 sm:p-6">
          <h2 className="mb-3 font-sans text-xl font-bold tracking-normal">Specifications</h2>
          <table className="w-full overflow-hidden rounded-md text-sm">
            <tbody>
              {specRows
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => (
                  <tr key={k} className="odd:bg-steel-50">
                    <th className="w-1/2 px-3 py-2.5 text-left font-medium text-graphite">{k}</th>
                    <td className="px-3 py-2.5 font-semibold">{v}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {p.description && (
            <>
              <h2 className="mb-2 mt-6 font-sans text-xl font-bold tracking-normal">Description</h2>
              <p className="max-w-prose whitespace-pre-line leading-relaxed text-graphite">{p.description}</p>
            </>
          )}
        </section>
        {inverter ? <PairedBatteries /> : <SimilarBatteries product={p} />}
      </div>
    </div>
  );
}
