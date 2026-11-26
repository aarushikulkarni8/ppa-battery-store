import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Send, BellRing, MailWarning, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ErrorNote, Spinner } from '../../components/ui';
import { date } from '../../lib/format';
import { PageHead } from './AdminLayout';

interface Row {
  purchaseId: string;
  customerId: string;
  customerName: string;
  mobile: string;
  email: string;
  reminderEmails: boolean;
  product: string;
  model: string;
  purchaseDate: string;
  nextReminder: string | null;
  lastReminderAt: string | null;
  lastReminderError: string;
  remindersSent: number;
}
interface Data {
  enabled: boolean;
  emailReady: boolean;
  sendHours: [number, number];
  everyMonths: number;
  subject: string;
  body: string;
  counts: { tracked: number; dueNow: number; next30: number; sentLast30: number; withoutEmail: number };
  upcoming: Row[];
  recent: Row[];
}
interface RunResult {
  ran: boolean;
  reason?: string;
  emailsSent: number;
  batteriesCovered: number;
  noEmail: number;
  optedOut: number;
  failed: number;
  errors: string[];
}

function Who({ r }: { r: Row }) {
  return (
    <>
      <Link to={`/admin/customers/${r.customerId}`} className="font-semibold hover:underline">{r.customerName || r.mobile}</Link>
      <span className="block text-xs text-ink-300">{r.mobile}</span>
    </>
  );
}

export default function Reminders() {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  const load = () => api<Data>('/admin/reminders').then(setD).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function runNow() {
    setRunning(true);
    try {
      const r = await api<RunResult>('/admin/reminders/run', { method: 'POST' });
      if (!r.ran) toast(r.reason ?? 'Nothing was sent', 'error');
      else {
        const bits = [`${r.emailsSent} email${r.emailsSent === 1 ? '' : 's'} sent`];
        if (r.noEmail) bits.push(`${r.noEmail} due but no email address`);
        if (r.failed) bits.push(`${r.failed} failed`);
        toast(bits.join(', '), r.failed ? 'error' : undefined);
      }
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setRunning(false);
    }
  }

  async function sendTest(e: FormEvent) {
    e.preventDefault();
    setTesting(true);
    try {
      const r = await api<{ to: string }>('/admin/reminders/test', { body: testTo ? { to: testTo } : {} });
      toast(`Test reminder sent to ${r.to}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setTesting(false);
    }
  }

  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!d) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHead
        title="Service reminders"
        sub={`Emails go out every ${d.everyMonths} months after purchase, for automotive and inverter batteries, while under warranty. Sent between ${d.sendHours[0]}:00 and ${d.sendHours[1]}:00.`}
        actions={
          <button className="btn-volt" disabled={running || !d.emailReady || !d.enabled} onClick={runNow}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send due reminders now
          </button>
        }
      />

      {!d.enabled && <ErrorNote>Reminders are turned off (SERVICE_REMINDERS=off in server/.env).</ErrorNote>}
      {d.enabled && !d.emailReady && <ErrorNote>Email is not set up yet (SMTP settings in server/.env), so reminders can't be sent.</ErrorNote>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Due now', d.counts.dueNow, 'will go out on the next check'],
          ['Due in next 30 days', d.counts.next30, ''],
          ['Sent in last 30 days', d.counts.sentLast30, 'batteries reminded'],
          ['Batteries without an email', d.counts.withoutEmail, 'these customers get no reminder'],
        ].map(([l, v, sub], i) => (
          <div key={l as string} className="card flex items-start gap-3 p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${i === 3 && Number(v) > 0 ? 'bg-volt' : 'bg-steel'}`}>
              {i === 3 ? <MailWarning className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
            </span>
            <span>
              <span className="block text-sm text-graphite">{l}</span>
              <span className="block font-display text-3xl font-bold leading-tight">{v}</span>
              {sub && <span className="block text-xs text-ink-300">{sub}</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Coming up (next 30 days)</h2>
          {d.upcoming.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Customer</th><th>Battery</th><th>Bought</th><th>Reminder</th><th>Email</th></tr></thead>
                <tbody>
                  {d.upcoming.map((r) => (
                    <tr key={r.purchaseId}>
                      <td><Who r={r} /></td>
                      <td>{r.product}</td>
                      <td className="whitespace-nowrap">{date(r.purchaseDate)}</td>
                      <td className="whitespace-nowrap">{r.nextReminder && new Date(r.nextReminder) <= new Date() ? <b>Due now</b> : date(r.nextReminder)}</td>
                      <td>
                        {!r.reminderEmails ? (
                          <span className="text-ink-300">Switched off</span>
                        ) : r.email ? (
                          <span className="break-all text-sm">{r.email}</span>
                        ) : (
                          <Link to={`/admin/customers/${r.customerId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-plus hover:underline">
                            <AlertTriangle className="h-3.5 w-3.5" /> No email
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-graphite">No reminders due in the next 30 days.</p>
          )}

          <h2 className="mt-8 text-lg font-semibold">Recently sent</h2>
          {d.recent.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Customer</th><th>Battery</th><th>Last sent</th><th>Total sent</th></tr></thead>
                <tbody>
                  {d.recent.map((r) => (
                    <tr key={r.purchaseId}>
                      <td><Who r={r} /></td>
                      <td>{r.product}</td>
                      <td className="whitespace-nowrap">
                        {r.lastReminderAt ? date(r.lastReminderAt) : '—'}
                        {r.lastReminderError && <span className="block max-w-xs text-xs text-plus">Last attempt failed: {r.lastReminderError}</span>}
                      </td>
                      <td>{r.remindersSent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-graphite">No reminders sent yet.</p>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-lg font-semibold">The email</h2>
            <p className="mt-2 text-sm"><span className="text-graphite">Subject:</span> <b>{d.subject}</b></p>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-steel-50 p-3 font-sans text-sm">{d.body}</pre>
            <p className="mt-2 text-xs text-ink-300">To change the wording, edit server/src/config/reminders.ts and restart the server.</p>
          </section>
          <form onSubmit={sendTest} className="card p-5">
            <h2 className="text-lg font-semibold">Send a test</h2>
            <p className="mt-1 text-sm text-graphite">See exactly what customers receive. Leave empty to send it to the owner's email.</p>
            <input className="input mt-3" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="email address (optional)" />
            <button className="btn-outline mt-3 w-full" disabled={testing || !d.emailReady}>
              {testing && <Loader2 className="h-4 w-4 animate-spin" />} Send test email
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
