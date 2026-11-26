import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Upload, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { Brand } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { ErrorNote, Field, Spinner } from '../../components/ui';
import { BrandLogo } from '../Brands';
import { PageHead } from './AdminLayout';

const blank = { name: '', description: '', manufacturer: '', website: '', logoUrl: '', accentColor: '#14213D', isActive: true, sortOrder: 100 };

export default function AdminBrands() {
  const toast = useToast();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [editing, setEditing] = useState<(typeof blank & { _id?: string }) | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<{ brands: Brand[] }>('/admin/brands').then((r) => setBrands(r.brands));
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr('');
    setBusy(true);
    try {
      const { _id, ...body } = editing;
      await api(_id ? `/admin/brands/${_id}` : '/admin/brands', { method: _id ? 'PUT' : 'POST', body });
      toast('Brand saved');
      setEditing(null);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(b: Brand, file: File) {
    const form = new FormData();
    form.append('image', file);
    try {
      await api(`/admin/brands/${b._id}/logo`, { form });
      toast('Logo updated');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(b: Brand) {
    if (!confirm(`Delete ${b.name}?`)) return;
    try {
      await api(`/admin/brands/${b._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => editing && setEditing({ ...editing, [k]: e.target.value });

  return (
    <div>
      <PageHead title="Brands" actions={<button className="btn-volt" onClick={() => setEditing({ ...blank })}><Plus className="h-4 w-4" /> Add brand</button>} />
      {editing && (
        <form onSubmit={save} className="card mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">{editing._id ? `Edit ${editing.name}` : 'New brand'}</h2>
          <Field label="Name"><input className="input" value={editing.name} onChange={set('name')} required minLength={2} /></Field>
          <Field label="Manufacturer"><input className="input" value={editing.manufacturer} onChange={set('manufacturer')} /></Field>
          <Field label="Website"><input className="input" value={editing.website} onChange={set('website')} placeholder="https://" /></Field>
          <Field label="Logo URL" hint="Or upload a logo after saving"><input className="input" value={editing.logoUrl} onChange={set('logoUrl')} /></Field>
          <Field label="Accent colour"><div className="flex gap-2"><input type="color" className="h-11 w-14 rounded border border-steel" value={editing.accentColor} onChange={set('accentColor')} /><input className="input" value={editing.accentColor} onChange={set('accentColor')} /></div></Field>
          <Field label="Sort order"><input className="input" inputMode="numeric" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={4} value={editing.description} onChange={set('description')} /></Field></div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active (shown in store)</label>
          {err && <div className="sm:col-span-2"><ErrorNote>{err}</ErrorNote></div>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save brand</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {!brands ? <Spinner /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((b) => (
            <div key={b._id} className={`card p-5 ${b.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <BrandLogo brand={b} className="h-9" />
                {!b.isActive && <span className="rounded bg-steel px-2 text-xs font-semibold">Inactive</span>}
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-graphite">{b.description || 'No description yet.'}</p>
              <p className="mt-2 text-sm"><Link to={`/admin/products?brand=${b._id}`} className="font-semibold hover:underline">{b.productCount ?? 0} products</Link></p>
              <div className="mt-4 flex flex-wrap gap-1">
                <button className="btn-outline px-3 py-1.5 text-sm" onClick={() => setEditing({ _id: b._id, name: b.name, description: b.description, manufacturer: b.manufacturer, website: b.website, logoUrl: b.logoUrl ?? '', accentColor: b.accentColor || '#14213D', isActive: b.isActive, sortOrder: b.sortOrder })}><Pencil className="h-4 w-4" /> Edit</button>
                <label className="btn-outline cursor-pointer px-3 py-1.5 text-sm"><Upload className="h-4 w-4" /> Logo<input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(b, f); e.target.value = ''; }} /></label>
                {!b.productCount && <button className="btn-danger px-3 py-1.5 text-sm" onClick={() => remove(b)}><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
