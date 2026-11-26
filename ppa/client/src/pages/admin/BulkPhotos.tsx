import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, Loader2, CheckCircle2, AlertTriangle, X, Upload } from 'lucide-react';
import { api } from '../../api/client';
import type { Product } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { ErrorNote, Spinner } from '../../components/ui';
import { fullName } from '../../lib/format';
import { PageHead } from './AdminLayout';

/* ---------- matching file names to products ---------- */

const norm = (s: string | undefined | null) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** "FLO DIN65 (2).jpg" → "FLODIN65" */
function fileKey(name: string) {
  const stem = name.replace(/\.[^.]+$/, '').replace(/\s*\(\d+\)$/, '').replace(/[-_ ](\d{1,2}|copy)$/i, '');
  return norm(stem);
}

type MatchKind = 'model' | 'range' | 'ambiguous' | 'none';
interface Match {
  kind: MatchKind;
  products: Product[];
  rangeLabel?: string;
}

function matchFile(file: string, products: Product[]): Match {
  const k = fileKey(file);
  if (!k) return { kind: 'none', products: [] };
  const keysOf = (p: Product) => {
    const brand = p.brand?.name ?? '';
    return {
      model: norm(p.model),
      sku: norm(p.sku),
      seriesModel: norm(`${p.series} ${p.model}`),
      brandSeriesModel: norm(`${brand} ${p.series} ${p.model}`),
      name: norm(p.name),
    };
  };

  // 1. exact: model, SKU, series + model, brand + series + model, or full name
  let exact = products.filter((p) => {
    const x = keysOf(p);
    return [x.model, x.sku, x.seriesModel, x.brandSeriesModel, x.name].includes(k);
  });
  if (exact.length > 1) {
    const precise = exact.filter((p) => {
      const x = keysOf(p);
      return [x.sku, x.seriesModel, x.brandSeriesModel, x.name].includes(k);
    });
    if (precise.length) exact = precise;
  }
  if (exact.length === 1) return { kind: 'model', products: exact };
  if (exact.length > 1) return { kind: 'ambiguous', products: exact };

  // 2. a whole range: "Amaron Black", "Black", "Current PRO"
  const ranges = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.series || norm(p.series).length < 2) continue;
    for (const key of [norm(p.series), norm(`${p.brand?.name ?? ''} ${p.series}`)]) {
      const list = ranges.get(key) ?? [];
      list.push(p);
      ranges.set(key, list);
    }
  }
  const range = ranges.get(k);
  if (range?.length) return { kind: 'range', products: range, rangeLabel: `${range[0].brand?.name ?? ''} ${range[0].series}`.trim() };

  // 3. the file name ends with a model, e.g. "amaron-flo-din65-front" is not handled, but "photo_DIN65" is
  const ending = products.filter((p) => {
    const x = keysOf(p);
    return x.model.length >= 4 && k.endsWith(x.model);
  });
  if (ending.length) {
    const longest = Math.max(...ending.map((p) => norm(p.model).length));
    let best = ending.filter((p) => norm(p.model).length === longest);
    const bySeries = best.filter((p) => k.endsWith(norm(`${p.series} ${p.model}`)));
    if (bySeries.length) best = bySeries;
    return { kind: best.length === 1 ? 'model' : 'ambiguous', products: best };
  }
  return { kind: 'none', products: [] };
}

/* ---------- shrinking big phone photos before upload ---------- */

async function shrink(file: File): Promise<Blob> {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size < 1_200_000) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.86));
}

/* ---------- page ---------- */

interface Row {
  id: string;
  file: File;
  preview: string;
  match: Match;
  chosen: Set<string>;
  showAll: boolean;
  state: 'ready' | 'uploading' | 'done' | 'failed' | 'skipped';
  message?: string;
}

export default function BulkPhotos() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [local, setLocal] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [primary, setPrimary] = useState(true);
  const [skipIfHasPhoto, setSkipIfHasPhoto] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api<{ uploads: boolean; localUploads: boolean }>('/admin/config').then((r) => { setCloud(r.uploads); setLocal(r.localUploads); }).catch(() => setCloud(false));
    api<{ products: Product[] }>('/admin/products').then((r) => setProducts(r.products)).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => () => rows.forEach((r) => URL.revokeObjectURL(r.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const byLabel = useMemo(() => new Map((products ?? []).map((p) => [`${fullName(p.brand?.name, p.name)} (${p.sku})`, p])), [products]);

  function addFiles(list: FileList | null) {
    if (!list || !products) return;
    const next: Row[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue;
      const match = matchFile(file.name, products);
      next.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        match,
        chosen: new Set(match.kind === 'model' || match.kind === 'range' ? match.products.map((p) => p._id) : []),
        showAll: false,
        state: 'ready',
      });
    }
    setRows((r) => [...r, ...next]);
  }

  const update = (id: string, patch: Partial<Row> | ((r: Row) => Partial<Row>)) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r)));

  function toggle(row: Row, productId: string) {
    const chosen = new Set(row.chosen);
    if (chosen.has(productId)) chosen.delete(productId);
    else chosen.add(productId);
    update(row.id, { chosen });
  }

  function addManual(row: Row, label: string) {
    const p = byLabel.get(label);
    if (!p) return;
    update(row.id, (r) => ({
      match: r.match.products.some((x) => x._id === p._id) ? r.match : { ...r.match, products: [...r.match.products, p], kind: r.match.kind === 'none' ? 'model' : r.match.kind },
      chosen: new Set([...r.chosen, p._id]),
    }));
  }

  async function uploadAll() {
    setRunning(true);
    let done = 0;
    let failed = 0;
    for (const row of rows) {
      if (row.state === 'done' || !row.chosen.size) continue;
      update(row.id, { state: 'uploading', message: undefined });
      try {
        const form = new FormData();
        const blob = await shrink(row.file);
        form.append('image', blob, row.file.name.replace(/\.[^.]+$/, blob === row.file ? row.file.name.slice(row.file.name.lastIndexOf('.')) : '.jpg'));
        form.append('productIds', JSON.stringify([...row.chosen]));
        form.append('primary', String(primary));
        form.append('skipIfHasPhoto', String(skipIfHasPhoto));
        const r = await api<{ updated: number; skipped: number }>('/admin/products/bulk-image', { form });
        done++;
        update(row.id, {
          state: r.updated ? 'done' : 'skipped',
          message: r.updated ? `Added to ${r.updated} product${r.updated === 1 ? '' : 's'}${r.skipped ? `, ${r.skipped} skipped (already had a photo)` : ''}` : 'All chosen products already had a photo',
        });
      } catch (e) {
        failed++;
        update(row.id, { state: 'failed', message: (e as Error).message });
      }
    }
    setRunning(false);
    toast(failed ? `${done} photo(s) uploaded, ${failed} failed` : `${done} photo(s) uploaded`, failed ? 'error' : undefined);
    api<{ products: Product[] }>('/admin/products').then((r) => setProducts(r.products));
  }

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!products || cloud === null) return <Spinner />;

  const ready = rows.filter((r) => r.state !== 'done' && r.chosen.size);
  const unmatched = rows.filter((r) => r.state === 'ready' && !r.chosen.size).length;
  const withoutPhoto = products.filter((p) => p.isActive && !p.images?.length).length;

  return (
    <div className="space-y-6">
      <PageHead
        title="Bulk photos"
        sub={`${withoutPhoto} active product${withoutPhoto === 1 ? '' : 's'} still without a photo`}
        actions={<Link to="/admin/products" className="btn-outline">Products</Link>}
      />

      {!cloud && (
        <ErrorNote>
          Photo upload needs Cloudinary. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to server/.env and restart the server.
        </ErrorNote>
      )}
      {local && (
        <p className="rounded-md border border-volt bg-volt-soft px-3 py-2 text-sm">
          Cloudinary isn't set up, so photos are saved on this computer (in server/uploads). That's fine for trying things out; set up Cloudinary before the site goes live, or photos won't carry over.
        </p>
      )}

      <section className="card p-5 text-sm text-graphite">
        <p className="font-semibold text-ink">Name each photo after what it shows</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>One battery:</b> the model or part number, e.g. <code>DIN65.jpg</code>, <code>AR150TT54.jpg</code>, <code>AP-BTZ5L.png</code>.</li>
          <li><b>Same model in two ranges:</b> add the range, e.g. <code>FLO DIN65.jpg</code> and <code>GO DIN65.jpg</code>.</li>
          <li><b>A whole range that looks the same:</b> the range name, e.g. <code>Amaron Black.jpg</code> or <code>Current PRO.jpg</code>.</li>
        </ul>
        <p className="mt-2">You can check and change every match below before anything is uploaded.</p>
      </section>

      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-steel-400 bg-white p-8 text-center hover:border-ink ${!cloud ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <ImagePlus className="h-8 w-8 text-ink-300" />
        <span className="font-semibold">Choose photos, or drag them here</span>
        <span className="text-xs text-ink-300">JPG, PNG or WebP. Select many at once. Large phone photos are resized automatically.</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={!cloud} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Make it the main photo</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={skipIfHasPhoto} onChange={(e) => setSkipIfHasPhoto(e.target.checked)} /> Skip products that already have a photo</label>
            {unmatched > 0 && <span className="flex items-center gap-1 font-semibold text-plus"><AlertTriangle className="h-4 w-4" /> {unmatched} photo{unmatched === 1 ? '' : 's'} not matched yet</span>}
          </div>

          <ul className="space-y-3">
            {rows.map((row) => {
              const list = row.match.products;
              const collapsed = row.match.kind === 'range' && !row.showAll;
              return (
                <li key={row.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
                  <img src={row.preview} alt="" className="h-28 w-28 shrink-0 rounded-md border border-steel bg-white object-contain" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="break-all font-mono text-sm font-semibold">{row.file.name}</p>
                      {row.state !== 'uploading' && row.state !== 'done' && (
                        <button className="btn-ghost p-1" aria-label={`Remove ${row.file.name}`} onClick={() => setRows((rs) => rs.filter((x) => x.id !== row.id))}><X className="h-4 w-4" /></button>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm">
                      {row.match.kind === 'model' && <span className="text-ok">Matched</span>}
                      {row.match.kind === 'range' && <span className="text-ok">Whole range: {row.match.rangeLabel} ({list.length} products)</span>}
                      {row.match.kind === 'ambiguous' && <span className="font-semibold text-buy">Matches {list.length} products; tick the right one(s)</span>}
                      {row.match.kind === 'none' && <span className="font-semibold text-plus">No match; choose the product below</span>}
                    </p>

                    {list.length > 0 && !collapsed && (
                      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                        {list.map((p) => (
                          <li key={p._id}>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={row.chosen.has(p._id)} onChange={() => toggle(row, p._id)} disabled={row.state === 'done'} />
                              <span className="truncate">{fullName(p.brand?.name, p.name)}</span>
                              {!!p.images?.length && <span className="shrink-0 text-xs text-ink-300">has photo</span>}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                    {collapsed && (
                      <button className="mt-1 text-sm font-semibold text-link hover:underline" onClick={() => update(row.id, { showAll: true })}>
                        Show the {list.length} products ({row.chosen.size} ticked)
                      </button>
                    )}

                    {row.state !== 'done' && (
                      <input
                        className="input mt-2 max-w-md py-1.5 text-sm"
                        list="bulk-photo-products"
                        placeholder="Add a product: type its name or part number"
                        onChange={(e) => {
                          if (byLabel.has(e.target.value)) {
                            addManual(row, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    )}

                    {row.state === 'uploading' && <p className="mt-2 flex items-center gap-1 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</p>}
                    {row.state === 'done' && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-ok"><CheckCircle2 className="h-4 w-4" /> {row.message}</p>}
                    {row.state === 'skipped' && <p className="mt-2 text-sm text-graphite">{row.message}</p>}
                    {row.state === 'failed' && <p className="mt-2 text-sm font-semibold text-plus">Failed: {row.message}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <datalist id="bulk-photo-products">
            {[...byLabel.keys()].map((l) => <option key={l} value={l} />)}
          </datalist>

          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-steel bg-page/95 px-4 py-3 backdrop-blur">
            <button className="btn-volt" disabled={running || !ready.length || !cloud} onClick={uploadAll}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload {ready.length} photo{ready.length === 1 ? '' : 's'}
            </button>
            <span className="text-sm text-graphite">
              to {new Set(ready.flatMap((r) => [...r.chosen])).size} product{new Set(ready.flatMap((r) => [...r.chosen])).size === 1 ? '' : 's'}
            </span>
            {rows.some((r) => r.state === 'done') && (
              <button className="btn-ghost ml-auto" onClick={() => setRows((rs) => rs.filter((r) => r.state !== 'done'))}>Clear finished</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
