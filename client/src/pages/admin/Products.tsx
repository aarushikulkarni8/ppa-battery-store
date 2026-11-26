import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, EyeOff, Pencil } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { Brand, Product, VehicleCategory } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { ProductImage } from '../../components/BatteryArt';
import { Empty, ErrorNote, Spinner } from '../../components/ui';
import { CATEGORY_LABELS, CATEGORY_ORDER, inr, specLine } from '../../lib/format';
import { PageHead } from './AdminLayout';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const f = { q: params.get('q') ?? '', brand: params.get('brand') ?? '', category: params.get('category') ?? '', status: params.get('status') ?? '', lowStock: params.get('lowStock') ?? '' };
  const [term, setTerm] = useState(f.q);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Record<string, { price?: string; stock?: string }>>({});
  const toast = useToast();

  const load = () => {
    setProducts(null);
    api<{ products: Product[] }>(`/admin/products${qs(f)}`).then((r) => setProducts(r.products)).catch((e) => setErr(e.message));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [params]);
  useEffect(() => {
    api<{ brands: Brand[] }>('/admin/brands').then((r) => setBrands(r.brands));
  }, []);

  const set = (patch: Record<string, string>) => {
    const next: Record<string, string> = { ...f, ...patch };
    Object.keys(next).forEach((k) => !next[k] && delete next[k]);
    setParams(next);
  };

  async function patch(p: Product, path: string, body: unknown, msg: string) {
    try {
      const r = await api<{ product: Product }>(`/admin/products/${p._id}/${path}`, { method: 'PATCH', body });
      setProducts((list) => list?.map((x) => (x._id === p._id ? { ...x, ...r.product } : x)) ?? null);
      setEdit((e) => ({ ...e, [p._id]: {} }));
      toast(msg);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div>
      <PageHead title="Products" sub="Prices, stock, warranty and compatibility for every battery" actions={<><Link to="/admin/photos" className="btn-outline">Bulk photos</Link><Link to="/admin/import" className="btn-outline">Bulk import</Link><Link to="/admin/products/new" className="btn-volt"><Plus className="h-4 w-4" /> Add product</Link></>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); set({ q: term.trim() }); }} className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input className="input pl-9" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name, model, SKU" />
        </form>
        <select className="input w-auto" value={f.brand} onChange={(e) => set({ brand: e.target.value })}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className="input w-auto" value={f.category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select className="input w-auto" value={f.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Active + inactive</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={!!f.lowStock} onChange={(e) => set({ lowStock: e.target.checked ? '1' : '' })} /> Low stock only
        </label>
      </div>
      <ErrorNote>{err}</ErrorNote>
      {!products ? <Spinner /> : !products.length ? <Empty title="No products match" /> : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th /><th>Product</th><th>Category</th><th>Spec</th><th>Warranty</th><th>Price (₹)</th><th>Stock</th><th /></tr></thead>
            <tbody>
              {products.map((p) => {
                const e = edit[p._id] ?? {};
                const low = p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p._id} className={p.isActive ? '' : 'bg-steel-50 text-ink-300'}>
                    <td className="w-16"><ProductImage product={p} className="h-12 w-14" /></td>
                    <td>
                      <Link to={`/admin/products/${p._id}`} className="font-semibold text-ink hover:underline">{p.brand?.name} {p.name}</Link>
                      <br /><span className="text-xs">{p.model} · {p.sku}</span>
                      {!p.isActive && <span className="ml-2 rounded bg-steel px-1.5 text-xs font-semibold">Inactive</span>}
                    </td>
                    <td className="whitespace-nowrap">{CATEGORY_LABELS[p.vehicleCategory as VehicleCategory]}</td>
                    <td className="whitespace-nowrap">{specLine(p)}</td>
                    <td className="whitespace-nowrap">{p.warranty.totalMonths} mo</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <input className="input w-24 px-2 py-1" inputMode="numeric" value={e.price ?? p.sellingPrice ?? ''} placeholder="on request" onChange={(ev) => setEdit({ ...edit, [p._id]: { ...e, price: ev.target.value.replace(/[^\d]/g, '') } })} />
                        {e.price !== undefined && String(e.price) !== String(p.sellingPrice ?? '') && (
                          <button className="btn-primary px-2 py-1 text-xs" onClick={() => patch(p, 'price', { mrp: p.mrp, sellingPrice: e.price === '' ? null : Number(e.price) }, 'Price updated')}>Save</button>
                        )}
                      </div>
                      {p.mrp != null && <span className="text-xs text-ink-300">MRP {inr(p.mrp)}</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <input className={`input w-16 px-2 py-1 ${low ? 'border-plus text-plus' : ''}`} inputMode="numeric" value={e.stock ?? p.stock} onChange={(ev) => setEdit({ ...edit, [p._id]: { ...e, stock: ev.target.value.replace(/[^\d]/g, '') } })} />
                        {e.stock !== undefined && e.stock !== '' && Number(e.stock) !== p.stock && (
                          <button className="btn-primary px-2 py-1 text-xs" onClick={() => patch(p, 'stock', { quantity: Number(e.stock) }, 'Stock updated')}>Save</button>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <Link to={`/admin/products/${p._id}`} className="btn-ghost px-2" aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
                      <button className="btn-ghost px-2" aria-label={p.isActive ? 'Deactivate' : 'Activate'} title={p.isActive ? 'Deactivate' : 'Activate'} onClick={() => patch(p, 'active', { isActive: !p.isActive }, p.isActive ? 'Deactivated' : 'Activated')}>
                        {p.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
