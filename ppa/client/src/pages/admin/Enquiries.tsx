import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, MailWarning, Search } from 'lucide-react';
import { api, qs } from '../../api/client';
import type { Enquiry, EnquiryStatus, OrderStatus } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { Empty, ErrorNote, Field, Spinner, StatusPill } from '../../components/ui';
import { date, dateTime, inr } from '../../lib/format';
import { EnquiryPill } from '../Account';
import { PageHead } from './AdminLayout';

const STATUSES: EnquiryStatus[] = ['New', 'In Progress', 'Resolved', 'Closed'];

export default function Enquiries() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const [term, setTerm] = useState(q);
  const [data, setData] = useState<{ enquiries: Enquiry[]; counts: Record<string, number> } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null);
    api<{ enquiries: Enquiry[]; counts: Record<string, number> }>(`/admin/enquiries${qs({ status, q })}`).then(setData).catch((e) => setErr(e.message));
  }, [status, q]);

  const set = (patch: Record<string, string>) => {
    const next: Record<string, string> = { ...(status ? { status } : {}), ...(q ? { q } : {}), ...patch };
    Object.keys(next).forEach((k) => !next[k] && delete next[k]);
    setParams(next);
  };

  return (
    <div>
      <PageHead title="Enquiries" />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...STATUSES].map((s) => (
          <button key={s} onClick={() => set({ status: s })} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${status === s ? 'border-ink bg-ink text-white' : 'border-steel bg-white'}`}>
            {s || 'All'} {s && data?.counts[s] != null && <span className="opacity-70">({data.counts[s]})</span>}
          </button>
        ))}
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); set({ q: term.trim() }); }} className="mb-4 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input className="input pl-9" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name, mobile, email, enquiry no., order ID" />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      <ErrorNote>{err}</ErrorNote>
      {!data ? <Spinner /> : !data.enquiries.length ? <Empty title="No enquiries" /> : (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Enquiry</th><th>Date</th><th>Customer</th><th>Type</th><th>Product / order</th><th>Status</th><th>Email</th></tr></thead>
            <tbody>
              {data.enquiries.map((e) => (
                <tr key={e._id} className="hover:bg-steel-50">
                  <td><Link to={`/admin/enquiries/${e._id}`} className="font-mono text-xs font-semibold hover:underline">{e.enquiryNumber}</Link></td>
                  <td className="whitespace-nowrap">{dateTime(e.createdAt)}</td>
                  <td>{e.name}<br /><span className="text-xs text-ink-300">{e.mobile}</span></td>
                  <td>{e.enquiryType}</td>
                  <td className="max-w-[16rem]">{[e.productLabel, e.orderId].filter(Boolean).join(' · ') || '—'}</td>
                  <td><EnquiryPill status={e.status} /></td>
                  <td>{e.emailStatus === 'SENT' ? <Mail className="h-4 w-4 text-ok" aria-label="Emailed" /> : <MailWarning className="h-4 w-4 text-plus" aria-label={e.emailStatus} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Detail {
  enquiry: Enquiry;
  customer: { _id: string; name: string; mobile: string; email: string; createdAt: string } | null;
  order: { orderId: string; total: number; status: OrderStatus; createdAt: string } | null;
}

export function EnquiryDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState<EnquiryStatus>('New');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Detail>(`/admin/enquiries/${id}`).then((r) => { setD(r); setStatus(r.enquiry.status); }).catch((e) => setErr(e.message));
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ enquiry: Enquiry }>(`/admin/enquiries/${id}`, { method: 'PATCH', body: { status, note } });
      setD((x) => x && { ...x, enquiry: { ...r.enquiry, product: x.enquiry.product } });
      setNote('');
      toast('Enquiry updated');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!d) return <Spinner />;
  const e = d.enquiry;
  const product = typeof e.product === 'object' && e.product ? e.product : null;

  return (
    <div className="space-y-4">
      <Link to="/admin/enquiries" className="text-sm font-semibold text-graphite hover:underline">← Enquiries</Link>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold">{e.enquiryNumber}</h1>
            <EnquiryPill status={e.status} />
            <span className="text-sm text-ink-300">{dateTime(e.createdAt)}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="label">Customer</dt><dd>{e.name}</dd></div>
            <div><dt className="label">Mobile</dt><dd><a href={`tel:+91${e.mobile}`} className="font-semibold hover:underline">+91 {e.mobile}</a></dd></div>
            <div><dt className="label">Email</dt><dd>{e.email ? <a href={`mailto:${e.email}`} className="hover:underline">{e.email}</a> : '—'}</dd></div>
            <div><dt className="label">Enquiry type</dt><dd className="font-semibold">{e.enquiryType}</dd></div>
            <div><dt className="label">Product</dt><dd>{product ? <Link className="hover:underline" to={`/admin/products/${product._id}`}>{e.productLabel}</Link> : e.productLabel || '—'}</dd></div>
            <div>
              <dt className="label">Order ID</dt>
              <dd>
                {d.order ? (
                  <span className="flex flex-wrap items-center gap-2"><Link to={`/admin/orders/${d.order.orderId}`} className="font-mono font-semibold hover:underline">{d.order.orderId}</Link><StatusPill status={d.order.status} /> {inr(d.order.total)} · {date(d.order.createdAt)}</span>
                ) : e.orderId || '—'}
              </dd>
            </div>
          </dl>
          <p className="label mt-4">Message</p>
          <p className="whitespace-pre-line rounded-md bg-steel-50 p-4">{e.message}</p>
          <p className="mt-3 text-xs text-ink-300">
            Owner email: {e.emailStatus === 'SENT' ? 'sent' : e.emailStatus === 'NOT_CONFIGURED' ? 'not sent — SMTP is not configured' : `failed${e.emailError ? ` (${e.emailError})` : ''}`}
          </p>
          {d.customer && <Link to={`/admin/customers/${d.customer._id}`} className="btn-outline mt-4">Open customer profile</Link>}
          {!!e.notes.length && (
            <>
              <p className="label mt-6">Activity</p>
              <ol className="space-y-2 border-l-2 border-steel pl-4 text-sm">
                {e.notes.map((n, i) => (
                  <li key={i}><b>{n.status}</b> <span className="text-ink-300">· {n.by} · {dateTime(n.at)}</span>{n.text && <span className="block">{n.text}</span>}</li>
                ))}
              </ol>
            </>
          )}
        </div>
        <form onSubmit={save} className="card h-fit space-y-4 p-5">
          <h2 className="text-lg font-semibold">Update</h2>
          <Field label="Status">
            <select className="input" value={status} onChange={(ev) => setStatus(ev.target.value as EnquiryStatus)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Internal note (optional)">
            <textarea className="input" rows={3} value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={1000} />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
        </form>
      </div>
    </div>
  );
}
