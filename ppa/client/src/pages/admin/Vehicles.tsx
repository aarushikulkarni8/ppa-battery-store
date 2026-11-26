import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { VehicleCategory } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { Empty, ErrorNote, Field, Spinner } from '../../components/ui';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../lib/format';
import { PageHead } from './AdminLayout';

interface V {
  _id: string;
  category: VehicleCategory;
  make: string;
  model: string;
  variant: string;
  fuel: string;
  yearFrom: number | null;
  yearTo: number | null;
  aliases: string[];
  isActive: boolean;
  label: string;
  batteryCount: number;
}
const blank = { category: 'TWO_WHEELER' as VehicleCategory, make: '', model: '', variant: '', fuel: '', yearFrom: '', yearTo: '', aliases: '', isActive: true };

export default function Vehicles() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [list, setList] = useState<V[] | null>(null);
  const [editing, setEditing] = useState<(typeof blank & { _id?: string }) | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (e?: FormEvent) => {
    e?.preventDefault();
    setList(null);
    api<{ vehicles: V[] }>(`/admin/vehicles${qs({ q, category: cat })}`).then((r) => setList(r.vehicles));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), [cat]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr('');
    setBusy(true);
    const { _id, aliases, ...rest } = editing;
    try {
      await api(_id ? `/admin/vehicles/${_id}` : '/admin/vehicles', {
        method: _id ? 'PUT' : 'POST',
        body: { ...rest, aliases: aliases.split(',').map((s) => s.trim()).filter(Boolean) },
      });
      toast('Vehicle saved');
      setEditing(null);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(v: V) {
    if (!confirm(`Delete ${v.label}? Its battery links will be removed too.`)) return;
    await api(`/admin/vehicles/${v._id}`, { method: 'DELETE' });
    load();
  }

  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => editing && setEditing({ ...editing, [k]: e.target.value });

  return (
    <div>
      <PageHead title="Vehicles" sub="Used by Find My Battery, smart search and compatibility" actions={<button className="btn-volt" onClick={() => setEditing({ ...blank })}><Plus className="h-4 w-4" /> Add vehicle</button>} />
      {editing && (
        <form onSubmit={save} className="card mb-6 grid gap-4 p-5 sm:grid-cols-3">
          <h2 className="text-lg font-semibold sm:col-span-3">{editing._id ? 'Edit vehicle' : 'New vehicle'}</h2>
          <Field label="Type">
            <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as VehicleCategory })}>
              {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </Field>
          <Field label="Make"><input className="input" value={editing.make} onChange={set('make')} required placeholder="Honda" /></Field>
          <Field label="Model"><input className="input" value={editing.model} onChange={set('model')} required placeholder="Activa" /></Field>
          <Field label="Variant"><input className="input" value={editing.variant} onChange={set('variant')} placeholder="6G" /></Field>
          <Field label="Fuel"><input className="input" value={editing.fuel} onChange={set('fuel')} placeholder="Petrol / Diesel" /></Field>
          <Field label="Search aliases" hint="Comma separated, e.g. activa6g, scooty"><input className="input" value={editing.aliases} onChange={set('aliases')} /></Field>
          <Field label="Year from"><input className="input" inputMode="numeric" value={editing.yearFrom} onChange={set('yearFrom')} /></Field>
          <Field label="Year to"><input className="input" inputMode="numeric" value={editing.yearTo} onChange={set('yearTo')} /></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Active</label>
          {err && <div className="sm:col-span-3"><ErrorNote>{err}</ErrorNote></div>}
          <div className="flex gap-2 sm:col-span-3">
            <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save vehicle</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      <form onSubmit={load} className="mb-4 flex max-w-2xl gap-2">
        <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All types</option>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Make, model, variant" />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      {!list ? <Spinner /> : !list.length ? <Empty title="No vehicles found" /> : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Vehicle</th><th>Type</th><th>Fuel</th><th>Batteries linked</th><th /></tr></thead>
            <tbody>
              {list.map((v) => (
                <tr key={v._id} className={v.isActive ? '' : 'text-ink-300'}>
                  <td className="font-semibold">{v.label}{!!v.aliases.length && <span className="block text-xs font-normal text-ink-300">aka {v.aliases.join(', ')}</span>}</td>
                  <td>{CATEGORY_LABELS[v.category]}</td>
                  <td>{v.fuel || '—'}</td>
                  <td className={v.batteryCount ? '' : 'text-plus'}>{v.batteryCount}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-ghost px-2" aria-label="Edit" onClick={() => setEditing({ _id: v._id, category: v.category, make: v.make, model: v.model, variant: v.variant, fuel: v.fuel, yearFrom: v.yearFrom ? String(v.yearFrom) : '', yearTo: v.yearTo ? String(v.yearTo) : '', aliases: v.aliases.join(', '), isActive: v.isActive })}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-ghost px-2 text-plus" aria-label="Delete" onClick={() => remove(v)}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length >= 300 && <p className="p-3 text-xs text-ink-300">Showing the first 300. Narrow the search to see more.</p>}
        </div>
      )}
    </div>
  );
}
