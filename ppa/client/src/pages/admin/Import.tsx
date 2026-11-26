import { useState } from 'react';
import Papa from 'papaparse';
import { Download, FileSpreadsheet, Loader2, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ErrorNote } from '../../components/ui';
import { PageHead } from './AdminLayout';

const COLUMNS: [string, string, string][] = [
  ['productType', '', 'battery or inverter. Defaults to battery.'],
  ['brand', 'New products', 'Amaron, Exide, Bosch… A brand that does not exist yet is created.'],
  ['name', 'New products', 'Product name as on the price list, e.g. Exide Mileage ML38B20L'],
  ['series', '', 'e.g. Mileage, Matrix, PRO, FLO'],
  ['model', 'New products', 'Model code, e.g. ML38B20L'],
  ['sku', 'Always', 'Part number / SKU. Rows are matched on this: a new SKU creates a product, an existing SKU updates it.'],
  ['category', 'New products', 'two wheeler, three wheeler, four wheeler, commercial, tractor, inverter or other'],
  ['batteryType', '', 'e.g. Maintenance-free, Tubular, VRLA'],
  ['voltage', '', 'Defaults to 12'],
  ['capacityAh', 'New batteries', 'Number only, e.g. 35'],
  ['cca', '', 'Cold cranking amps'],
  ['lengthMm, widthMm, heightMm', '', 'Dimensions in mm'],
  ['weightKg', '', ''],
  ['terminalLayout', '', 'e.g. Left positive'],
  ['vaRating', 'New inverters', 'Inverter VA rating, e.g. 1100. For inverters, capacityAh is not needed.'],
  ['maxLoadW, batteriesSupported, chargingCurrentA', '', 'Inverter specs: max load in watts, number of batteries, charging current in amps'],
  ['waveform', '', 'Inverter output, e.g. Pure sine wave'],
  ['recommendedBattery', '', 'e.g. 150Ah tall tubular'],
  ['warrantyTotalMonths', 'New products', 'Total warranty in months, from the warranty card'],
  ['warrantyFreeMonths, warrantyProRataMonths', '', 'Split of the total, if published. Must add up to the total.'],
  ['warrantyNotes', '', 'Anything else, e.g. “Commercial use: 12 months FOC”'],
  ['mrp', '', 'MRP in rupees, number only'],
  ['sellingPrice', '', 'Your price. Leave empty to show “Price on request”.'],
  ['stock', '', 'Units in the shop. Sets the stock to this number.'],
  ['active', '', 'yes / no. Defaults to yes for new products.'],
  ['description', '', ''],
  ['features', '', 'Separate with |   e.g. Zero maintenance | Long life'],
  ['sourceNote', '', 'Where the data came from, e.g. “Exide MRCP list, 1 Jan 2026”'],
];
const HEADER = [
  'productType', 'brand', 'name', 'series', 'model', 'sku', 'category', 'batteryType', 'voltage', 'capacityAh', 'cca', 'lengthMm', 'widthMm', 'heightMm',
  'weightKg', 'terminalLayout', 'vaRating', 'maxLoadW', 'batteriesSupported', 'waveform', 'chargingCurrentA', 'recommendedBattery', 'warrantyTotalMonths', 'warrantyFreeMonths', 'warrantyProRataMonths', 'warrantyNotes', 'mrp', 'sellingPrice',
  'stock', 'active', 'description', 'features', 'sourceNote',
];

function downloadCsv(filename: string, rows: Record<string, string>[], columns: string[]) {
  // BOM so Excel opens ₹ and other characters correctly
  const csv = '\uFEFF' + Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => r[c] ?? '')) });
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Problem { line: number; sku: string; errors: string[] }
interface Result {
  created: number;
  updated: number;
  brandsCreated: number;
  results: { line: number; sku: string; action: string }[];
}

export default function Import() {
  const toast = useToast();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [parseErr, setParseErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState('');

  function readFile(file: File) {
    setRows(null);
    setProblems(null);
    setResult(null);
    setErr('');
    setParseErr('');
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setParseErr('Please choose a .csv file. In Excel use File → Save As → “CSV UTF-8 (Comma delimited)”.');
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
      complete: (out) => {
        if (!out.data.length) return setParseErr('No rows found in this file.');
        if (!out.meta.fields?.includes('sku')) return setParseErr('The first row must be the column names, and it must include “sku”. Download the template to see the format.');
        const unknown = (out.meta.fields ?? []).filter((f) => f && !HEADER.includes(f));
        if (unknown.length) toast(`Ignoring unknown column(s): ${unknown.join(', ')}`, 'error');
        setRows(out.data);
      },
      error: (e) => setParseErr(e.message),
    });
  }

  async function runImport() {
    if (!rows) return;
    setBusy(true);
    setErr('');
    setProblems(null);
    try {
      const r = await api<Result>('/admin/import/products', { body: { rows, firstLine: 2 } });
      setResult(r);
      setRows(null);
      toast(`Imported: ${r.created} new, ${r.updated} updated`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && (e.data as { problems?: Problem[] })?.problems) {
        setProblems((e.data as { problems: Problem[] }).problems);
        setErr((e as Error).message);
      } else setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function exportAll() {
    try {
      const r = await api<{ columns: string[]; rows: Record<string, string>[] }>('/admin/import/products/export');
      downloadCsv(`ppa-products-${new Date().toISOString().slice(0, 10)}.csv`, r.rows, r.columns);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div className="space-y-6">
      <PageHead
        title="Bulk import"
        sub="Add or update many products at once from a spreadsheet"
        actions={
          <>
            <button className="btn-outline" onClick={() => downloadCsv('ppa-import-template.csv', [], HEADER)}><Download className="h-4 w-4" /> Empty template</button>
            <button className="btn-outline" onClick={exportAll}><FileSpreadsheet className="h-4 w-4" /> Export current products</button>
          </>
        }
      />

      <section className="card p-5 text-sm text-graphite">
        <p className="font-semibold text-ink">How to use</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Download the empty template, or export the current products to edit prices and stock you already have.</li>
          <li>Open it in Excel or Google Sheets and fill one row per battery from the official price list and application chart.</li>
          <li>Save as <b>CSV UTF-8</b> (Excel: File → Save As → “CSV UTF-8 (Comma delimited)”; Google Sheets: File → Download → CSV).</li>
          <li>Upload it below. Every row is checked first; if any row has a problem, nothing is imported and you see which line to fix.</li>
        </ol>
        <p className="mt-2">For a quick price update, a sheet with only the <b>sku</b>, <b>sellingPrice</b> and <b>stock</b> columns is enough. Empty cells never erase existing values.</p>
      </section>

      <section className="card p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-steel-400 p-8 text-center hover:border-ink">
          <Upload className="h-8 w-8 text-ink-300" />
          <span className="font-semibold">{fileName || 'Choose a CSV file'}</span>
          <span className="text-xs text-ink-300">Up to 2000 rows per file</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
        </label>
        {parseErr && <div className="mt-3"><ErrorNote>{parseErr}</ErrorNote></div>}

        {rows && (
          <div className="mt-4">
            <p className="text-sm"><b>{rows.length}</b> row{rows.length === 1 ? '' : 's'} found. Preview of the first {Math.min(5, rows.length)}:</p>
            <div className="mt-2 overflow-x-auto rounded border border-steel">
              <table className="table-base text-xs">
                <thead><tr><th>Line</th><th>brand</th><th>sku</th><th>name</th><th>category</th><th>Ah</th><th>warranty</th><th>MRP</th><th>price</th><th>stock</th></tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td>{i + 2}</td><td>{r.brand}</td><td>{r.sku}</td><td>{r.name}</td><td>{r.category}</td><td>{r.capacityAh}</td>
                      <td>{r.warrantyTotalMonths}</td><td>{r.mrp}</td><td>{r.sellingPrice}</td><td>{r.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-volt mt-4" disabled={busy} onClick={runImport}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import {rows.length} row{rows.length === 1 ? '' : 's'}
            </button>
          </div>
        )}

        {err && <div className="mt-4"><ErrorNote>{err}</ErrorNote></div>}
        {problems && (
          <div className="mt-3 overflow-x-auto rounded border border-plus/40">
            <table className="table-base text-sm">
              <thead><tr><th>Line</th><th>SKU</th><th>Fix this</th></tr></thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.line}>
                    <td className="font-semibold">{p.line}</td>
                    <td>{p.sku || '—'}</td>
                    <td><ul className="list-disc pl-4">{p.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-ok/30 bg-emerald-50 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-ok"><CheckCircle2 className="h-5 w-5" /> Import finished</p>
            <p className="mt-1">
              {result.created} products created, {result.updated} updated
              {result.brandsCreated ? `, ${result.brandsCreated} new brand(s)` : ''}.
            </p>
            {result.results.some((r) => r.action === 'created') && (
              <p className="mt-2 flex items-start gap-1 text-graphite"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> New products show a drawn placeholder until you add a photo in Products.</p>
            )}
          </div>
        )}
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="text-lg font-semibold">Columns</h2>
        <table className="table-base mt-3 text-sm">
          <thead><tr><th>Column</th><th>Required</th><th>What to put</th></tr></thead>
          <tbody>
            {COLUMNS.map(([c, req, d]) => (
              <tr key={c}><td className="whitespace-nowrap font-mono text-xs font-semibold">{c}</td><td className="whitespace-nowrap">{req || '—'}</td><td>{d}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
