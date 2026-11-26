import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Trash2, Upload, Star, ExternalLink } from 'lucide-react';
import { api } from '../../api/client';
import type { Brand, Product, VehicleCategory } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { ErrorNote, Field, Spinner } from '../../components/ui';
import { BatteryArt } from '../../components/BatteryArt';
import { CATEGORY_LABELS, CATEGORY_ORDER, fullName } from '../../lib/format';
import { PageHead } from './AdminLayout';

const n = (v: number | null | undefined) => (v == null ? '' : String(v));

function emptyForm() {
  return {
    productType: 'BATTERY' as 'BATTERY' | 'INVERTER' | 'PCB',
    brand: '', name: '', series: '', model: '', sku: '', batteryType: '', vehicleCategory: 'TWO_WHEELER' as VehicleCategory,
    vaRating: '', maxLoadW: '', batteriesSupported: '', waveform: '', chargingCurrentA: '', recommendedBattery: '',
    voltage: '12', capacityAh: '', cca: '', lengthMm: '', widthMm: '', heightMm: '', weightKg: '', terminalLayout: '',
    totalMonths: '', freeMonths: '', proRataMonths: '', warrantyNotes: '',
    description: '', features: '', mrp: '', sellingPrice: '', stock: '0', lowStockThreshold: '3', isActive: true, sourceUrl: '', sourceNote: '',
  };
}
type Form = ReturnType<typeof emptyForm>;

function toForm(p: Product): Form {
  return {
    productType: (p.productType ?? 'BATTERY') as 'BATTERY' | 'INVERTER' | 'PCB',
    brand: p.brand._id, name: p.name, series: p.series, model: p.model, sku: p.sku, batteryType: p.batteryType, vehicleCategory: p.vehicleCategory,
    vaRating: n(p.inverterSpecs?.vaRating), maxLoadW: n(p.inverterSpecs?.maxLoadW), batteriesSupported: n(p.inverterSpecs?.batteriesSupported),
    waveform: p.inverterSpecs?.waveform ?? '', chargingCurrentA: n(p.inverterSpecs?.chargingCurrentA), recommendedBattery: p.inverterSpecs?.recommendedBattery ?? '',
    voltage: n(p.voltage), capacityAh: n(p.capacityAh), cca: n(p.cca), lengthMm: n(p.dimensions?.lengthMm), widthMm: n(p.dimensions?.widthMm),
    heightMm: n(p.dimensions?.heightMm), weightKg: n(p.weightKg), terminalLayout: p.terminalLayout,
    totalMonths: n(p.warranty.totalMonths), freeMonths: n(p.warranty.freeMonths), proRataMonths: n(p.warranty.proRataMonths), warrantyNotes: p.warranty.notes ?? '',
    description: p.description, features: p.features.join('\n'), mrp: n(p.mrp), sellingPrice: n(p.sellingPrice), stock: n(p.stock),
    lowStockThreshold: n(p.lowStockThreshold), isActive: p.isActive, sourceUrl: p.sourceUrl ?? '', sourceNote: p.sourceNote ?? '',
  };
}

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [f, setF] = useState<Form>(emptyForm());
  const [specRows, setSpecRows] = useState<{ label: string; value: string }[]>([{ label: '', value: '' }]);
  const [loading, setLoading] = useState(!isNew);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ brands: Brand[] }>('/admin/brands').then((r) => {
      setBrands(r.brands);
      if (isNew) setF((x) => ({ ...x, brand: x.brand || r.brands[0]?._id || '' }));
    });
    if (!isNew)
      api<{ product: Product }>(`/admin/products/${id}`)
        .then((r) => { setProduct(r.product); setF(toForm(r.product)); setSpecRows(r.product.specs?.length ? r.product.specs : [{ label: '', value: '' }]); })
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false));
  }, [id, isNew]);

  const bind = (k: keyof Form) => ({
    value: f[k] as string,
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const inverter = f.productType === 'INVERTER';
    const pcb = f.productType === 'PCB';
    const body = {
      productType: f.productType,
      specs: pcb ? specRows.filter((x) => x.label.trim() && x.value.trim()) : [],
      inverterSpecs: inverter
        ? { vaRating: f.vaRating, maxLoadW: f.maxLoadW, batteriesSupported: f.batteriesSupported, waveform: f.waveform, chargingCurrentA: f.chargingCurrentA, recommendedBattery: f.recommendedBattery }
        : {},
      brand: f.brand, name: f.name, series: f.series, model: f.model, sku: f.sku, batteryType: f.batteryType, vehicleCategory: f.vehicleCategory,
      voltage: pcb ? 0 : f.voltage, capacityAh: inverter || pcb ? 0 : f.capacityAh, cca: inverter ? '' : f.cca,
      dimensions: { lengthMm: f.lengthMm, widthMm: f.widthMm, heightMm: f.heightMm },
      weightKg: f.weightKg, terminalLayout: f.terminalLayout,
      warranty: { totalMonths: pcb ? f.totalMonths || 0 : f.totalMonths, freeMonths: f.freeMonths, proRataMonths: f.proRataMonths, notes: f.warrantyNotes },
      description: f.description, features: f.features.split('\n').map((s) => s.trim()).filter(Boolean),
      mrp: f.mrp, sellingPrice: f.sellingPrice, stock: f.stock, lowStockThreshold: f.lowStockThreshold, isActive: f.isActive,
      sourceUrl: f.sourceUrl, sourceNote: f.sourceNote,
    };
    try {
      if (isNew) {
        const r = await api<{ product: Product }>('/admin/products', { body });
        toast('Product created. Add images and compatible vehicles below.');
        nav(`/admin/products/${r.product._id}`, { replace: true });
      } else {
        const r = await api<{ product: Product }>(`/admin/products/${id}`, { method: 'PUT', body });
        setProduct(r.product);
        setF(toForm(r.product));
        setSpecRows(r.product.specs?.length ? r.product.specs : [{ label: '', value: '' }]);
        toast('Product saved');
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!product || !confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await api(`/admin/products/${product._id}`, { method: 'DELETE' });
      toast('Product deleted');
      nav('/admin/products');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  if (loading) return <Spinner />;
  const brand = brands.find((b) => b._id === f.brand);

  return (
    <div className="space-y-6">
      <Link to="/admin/products" className="text-sm font-semibold text-graphite hover:underline">← Products</Link>
      <PageHead
        title={isNew ? 'Add product' : fullName(product?.brand.name, product?.name ?? '')}
        sub={isNew ? undefined : `${product?.model} · ${product?.sku}`}
        actions={!isNew && product && (
          <>
            {product.isActive && <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" className="btn-outline"><ExternalLink className="h-4 w-4" /> View in store</a>}
            <button className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</button>
          </>
        )}
      />
      <form onSubmit={save} className="space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-3">Basics</h2>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="label">Product type</span>
            <div className="inline-flex rounded-md border border-steel p-0.5" role="radiogroup" aria-label="Product type">
              {([['BATTERY', 'Battery'], ['INVERTER', 'Inverter / home UPS'], ['PCB', 'PCB']] as const).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={f.productType === k}
                  onClick={() => setF({ ...f, productType: k, ...(k === 'INVERTER' ? { vehicleCategory: 'INVERTER' as VehicleCategory } : k === 'PCB' ? { vehicleCategory: 'PCB' as VehicleCategory } : {}) })}
                  className={`rounded px-4 py-1.5 text-sm font-semibold ${f.productType === k ? 'bg-ink text-white' : 'text-graphite'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Field label="Brand">
            <select className="input" {...bind('brand')} required>
              {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Product name"><input className="input" {...bind('name')} required placeholder={f.productType === 'PCB' ? 'e.g. 12V charger control board' : f.productType === 'INVERTER' ? 'e.g. Exide home UPS 1100' : 'e.g. Amaron PRO BIKE RIDER'} /></Field>
          <Field label="Series"><input className="input" {...bind('series')} placeholder="e.g. PRO, FLO, Beta" /></Field>
          <Field label="Model"><input className="input" {...bind('model')} required /></Field>
          <Field label="SKU / part number"><input className="input" {...bind('sku')} required /></Field>
          <Field label={f.productType === 'PCB' ? 'Board type' : f.productType === 'INVERTER' ? 'Technology' : 'Battery type'}>
            <input className="input" {...bind('batteryType')} placeholder={f.productType === 'PCB' ? 'e.g. Double-sided FR4' : f.productType === 'INVERTER' ? 'e.g. Pure sine wave, MOSFET' : 'e.g. Maintenance-free, VRLA'} />
          </Field>
          <Field label="Category / vehicle type">
            <select className="input" value={f.vehicleCategory} onChange={(e) => setF({ ...f, vehicleCategory: e.target.value as VehicleCategory })}>
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium">
            <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="h-4 w-4" /> Active (visible in store)
          </label>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
          <h2 className="text-lg font-semibold sm:col-span-3 lg:col-span-6">Specifications</h2>
          {f.productType === 'PCB' ? (
            <div className="space-y-2 sm:col-span-3 lg:col-span-6">
              <p className="text-sm text-graphite">Add whatever describes the board, one line each, e.g. Board size: 100 × 80 mm, Layers: 2, Input voltage: 12 V DC, Application: inverter charger.</p>
              {specRows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input w-2/5" placeholder="e.g. Board size" value={row.label} onChange={(e) => setSpecRows(specRows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Specification name" />
                  <input className="input flex-1" placeholder="e.g. 100 × 80 mm" value={row.value} onChange={(e) => setSpecRows(specRows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} aria-label="Specification value" />
                  <button type="button" className="btn-ghost px-2 text-plus" aria-label="Remove line" onClick={() => setSpecRows(specRows.length > 1 ? specRows.filter((_, j) => j !== i) : [{ label: '', value: '' }])}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" className="btn-outline px-3 py-1.5 text-sm" onClick={() => setSpecRows([...specRows, { label: '', value: '' }])}>Add a line</button>
            </div>
          ) : f.productType === 'INVERTER' ? (
            <>
              <Field label="VA rating"><input className="input" inputMode="numeric" {...bind('vaRating')} required placeholder="e.g. 1100" /></Field>
              <Field label="Max load (W)"><input className="input" inputMode="numeric" {...bind('maxLoadW')} /></Field>
              <Field label="Battery voltage (V)"><input className="input" inputMode="numeric" {...bind('voltage')} required /></Field>
              <Field label="Batteries supported"><input className="input" inputMode="numeric" {...bind('batteriesSupported')} placeholder="e.g. 1" /></Field>
              <div className="sm:col-span-2">
                <Field label="Output waveform">
                  <select className="input" {...bind('waveform')}>
                    <option value="">Select</option>
                    <option>Pure sine wave</option>
                    <option>Modified sine wave</option>
                    <option>Square wave</option>
                  </select>
                </Field>
              </div>
              <Field label="Max charging current (A)"><input className="input" inputMode="decimal" {...bind('chargingCurrentA')} /></Field>
              <div className="sm:col-span-2 lg:col-span-3"><Field label="Recommended battery"><input className="input" {...bind('recommendedBattery')} placeholder="e.g. 150Ah tall tubular" /></Field></div>
            </>
          ) : (
            <>
              <Field label="Voltage (V)"><input className="input" inputMode="decimal" {...bind('voltage')} required /></Field>
              <Field label="Capacity (Ah)"><input className="input" inputMode="decimal" {...bind('capacityAh')} required /></Field>
              <Field label="CCA"><input className="input" inputMode="numeric" {...bind('cca')} /></Field>
            </>
          )}
          {f.productType !== 'PCB' && (
            <>
              <Field label="Length (mm)"><input className="input" inputMode="numeric" {...bind('lengthMm')} /></Field>
              <Field label="Width (mm)"><input className="input" inputMode="numeric" {...bind('widthMm')} /></Field>
              <Field label="Height (mm)"><input className="input" inputMode="numeric" {...bind('heightMm')} /></Field>
              <Field label="Weight (kg)"><input className="input" inputMode="decimal" {...bind('weightKg')} /></Field>
            </>
          )}
          {f.productType === 'BATTERY' && (
            <div className="sm:col-span-2"><Field label="Terminal layout"><input className="input" {...bind('terminalLayout')} placeholder="e.g. Left positive" /></Field></div>
          )}
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-4">
          <h2 className="text-lg font-semibold sm:col-span-4">{f.productType === 'PCB' ? 'Warranty (optional)' : "Warranty (from the manufacturer's card)"}</h2>
          <Field label="Total months"><input className="input" inputMode="numeric" {...bind('totalMonths')} required={f.productType !== 'PCB'} /></Field>
          <Field label="Free replacement months"><input className="input" inputMode="numeric" {...bind('freeMonths')} /></Field>
          <Field label="Pro-rata months"><input className="input" inputMode="numeric" {...bind('proRataMonths')} /></Field>
          <Field label="Notes"><input className="input" {...bind('warrantyNotes')} /></Field>
        </section>

        <section className={`card grid gap-4 p-5 sm:grid-cols-4 ${f.productType === 'PCB' ? 'hidden' : ''}`}>
          <h2 className="text-lg font-semibold sm:col-span-4">Price and stock</h2>
          <Field label="MRP (₹)"><input className="input" inputMode="numeric" {...bind('mrp')} /></Field>
          <Field label="Selling price (₹)" hint="Leave empty to show “Price on request”"><input className="input" inputMode="numeric" {...bind('sellingPrice')} /></Field>
          <Field label="Stock"><input className="input" inputMode="numeric" {...bind('stock')} /></Field>
          <Field label="Low-stock alert at"><input className="input" inputMode="numeric" {...bind('lowStockThreshold')} /></Field>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Description</h2>
          <Field label="Description"><textarea className="input" rows={6} {...bind('description')} /></Field>
          <Field label="Features (one per line)"><textarea className="input" rows={6} {...bind('features')} /></Field>
          <Field label="Source URL" hint="Where the specs came from, for your records"><input className="input" {...bind('sourceUrl')} /></Field>
          <Field label="Source note"><input className="input" {...bind('sourceNote')} /></Field>
        </section>

        <ErrorNote>{err}</ErrorNote>
        <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-steel bg-steel-50/95 px-4 py-3 backdrop-blur">
          <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {isNew ? 'Create product' : 'Save changes'}</button>
          <Link to="/admin/products" className="btn-ghost">Cancel</Link>
        </div>
      </form>

      {!isNew && product && (
        <>
          <Images product={product} onChange={setProduct} fallback={<BatteryArt product={{ ...product, brand: brand ?? product.brand }} className="h-32 w-full" />} />
        </>
      )}
    </div>
  );
}

function Images({ product, onChange, fallback }: { product: Product; onChange: (p: Product) => void; fallback: React.ReactNode }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [cloud, setCloud] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ uploads: boolean }>('/admin/config').then((r) => setCloud(r.uploads));
  }, []);

  async function run(p: Promise<{ product: Product }>, msg: string) {
    setBusy(true);
    try {
      onChange((await p).product);
      toast(msg);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }
  function upload(file: File) {
    const form = new FormData();
    form.append('image', file);
    run(api(`/admin/products/${product._id}/images`, { form }), 'Image uploaded');
  }

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">Images</h2>
      <p className="text-sm text-graphite">The first image is shown on product cards. Use the manufacturer's photo of this exact model.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {product.images.map((img, i) => (
          <div key={img._id} className="relative rounded-md border border-steel p-2">
            <img src={img.url} alt={img.alt} className="h-28 w-full object-contain" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-volt px-1.5 text-[11px] font-bold">Primary</span>}
            <div className="mt-1 flex justify-end gap-1">
              {i > 0 && <button className="btn-ghost p-1" title="Make primary" onClick={() => run(api(`/admin/products/${product._id}/images/${img._id}/primary`, { method: 'PATCH' }), 'Primary image set')}><Star className="h-4 w-4" /></button>}
              <button className="btn-ghost p-1 text-plus" title="Delete image" onClick={() => confirm('Delete this image?') && run(api(`/admin/products/${product._id}/images/${img._id}`, { method: 'DELETE' }), 'Image deleted')}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {!product.images.length && <div className="rounded-md border border-dashed border-steel-400 p-2"><p className="mb-1 text-center text-xs text-ink-300">Placeholder shown</p>{fallback}</div>}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className={`btn-outline cursor-pointer ${cloud === false ? 'pointer-events-none opacity-50' : ''}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy || cloud === false} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ''; }} />
        </label>
        <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) run(api(`/admin/products/${product._id}/images`, { body: { url: url.trim() } }), 'Image added').then(() => setUrl('')); }} className="flex min-w-[18rem] flex-1 gap-2">
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an image URL" />
          <button className="btn-outline" disabled={busy}>Add URL</button>
        </form>
      </div>
      {cloud === false && <p className="mt-2 text-xs text-ink-300">Photo upload needs Cloudinary keys in the server .env. Image URLs work without it.</p>}
    </section>
  );
}
