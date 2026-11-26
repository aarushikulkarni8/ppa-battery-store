import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Wrench, BadgeCheck, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';
import { api } from '../api/client';
import type { Customer } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { ErrorNote } from '../components/ui';
import { STORE } from '../config/store';

type Step = 'mobile' | 'password' | 'register' | 'verify-email' | 'sent';

export function PasswordInput({ value, onChange, label, autoComplete, autoFocus }: { value: string; onChange: (v: string) => void; label: string; autoComplete: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-steel-400/70 bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-volt/60">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-base focus:outline-none"
          required
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="px-3 text-graphite hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </label>
  );
}

export const passwordProblem = (p: string, confirm?: string) =>
  p.length < 8
    ? 'Password must be at least 8 characters'
    : !/[A-Za-z]/.test(p) || !/\d/.test(p)
      ? 'Use at least one letter and one number in the password'
      : confirm !== undefined && p !== confirm
        ? 'The two passwords do not match'
        : '';

export default function Login() {
  const { customer, setCustomer, loading } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const nav = useNavigate();

  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [existing, setExisting] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && customer) return <Navigate to={customer.profileComplete ? next : `/welcome?next=${encodeURIComponent(next)}`} replace />;

  async function run(fn: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const done = (c: Customer) => {
    setCustomer(c);
    nav(next, { replace: true });
  };
  const back = () => {
    setStep('mobile');
    setPassword('');
    setConfirm('');
    setError('');
  };

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) return setError('Enter a valid 10-digit mobile number');
    run(async () => {
      const r = await api<{ next: Step; emailHint?: string; existing?: boolean; name?: string }>('/auth/lookup', { body: { mobile } });
      setExisting(Boolean(r.existing));
      if (r.name) setName(r.name);
      setEmailHint(r.emailHint ?? '');
      setStep(r.next);
    });
  };
  const login = (e: FormEvent) => {
    e.preventDefault();
    run(async () => done((await api<{ customer: Customer }>('/auth/login', { body: { mobile, password } })).customer));
  };
  const register = (e: FormEvent) => {
    e.preventDefault();
    const p = passwordProblem(password, confirm);
    if (p) return setError(p);
    run(async () => done((await api<{ customer: Customer }>('/auth/register', { body: { mobile, name, email, password } })).customer));
  };
  const sendLink = () =>
    run(async () => {
      const r = await api<{ emailHint: string; sent: boolean; devLink?: string }>('/auth/password/forgot', { body: { mobile } });
      setEmailHint(r.emailHint);
      setDevLink(r.devLink ?? '');
      setStep('sent');
    });

  const numberLine = (
    <p className="text-sm text-graphite">
      +91 {mobile}{' '}
      <button type="button" onClick={back} className="font-semibold text-link hover:underline">
        Change
      </button>
    </p>
  );
  const submit = (label: string): ReactNode => (
    <button className="btn-primary w-full py-3 text-base" disabled={busy}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />} {label}
    </button>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="mt-auto max-w-md">
          <h1 className="text-5xl font-bold leading-[1.02]">The right battery for your vehicle, from the brands you trust.</h1>
          <p className="mt-4 text-white/70">Amaron, Exide and Bosch, matched to your bike, car, truck or tractor. Installation on request, backed by the manufacturer’s warranty.</p>
          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex gap-3"><ShieldCheck className="h-5 w-5 text-volt" /> Warranty tracked against every battery you buy</li>
            <li className="flex gap-3"><Wrench className="h-5 w-5 text-volt" /> Installation on request, at our Hubballi shop</li>
            <li className="flex gap-3"><BadgeCheck className="h-5 w-5 text-volt" /> Genuine stock, with invoice</li>
          </ul>
        </div>
        <p className="mt-12 text-xs text-white/50">{STORE.addressLines.join(', ')}</p>
        <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-16 top-24 h-80 w-80 opacity-[0.07]">
          <path d="M120 10 50 115h45L80 190l70-105h-45z" fill="#FFC629" />
        </svg>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          {step === 'mobile' && (
            <form onSubmit={lookup} className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold">Log in or create an account</h2>
                <p className="mt-1 text-sm text-graphite">Start with your mobile number.</p>
              </div>
              <label className="block">
                <span className="label">Mobile number</span>
                <div className="flex overflow-hidden rounded-md border border-steel-400/70 bg-white focus-within:border-ink focus-within:ring-2 focus-within:ring-volt/60">
                  <span className="flex items-center border-r border-steel bg-steel-50 px-3 font-semibold text-graphite">+91</span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Mobile number"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-lg tracking-wide focus:outline-none"
                    aria-label="Mobile number"
                  />
                </div>
              </label>
              <ErrorNote>{error}</ErrorNote>
              {submit('Continue')}
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={login} className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold">Welcome back</h2>
                {numberLine}
              </div>
              <PasswordInput label="Password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
              <ErrorNote>{error}</ErrorNote>
              {submit('Log in')}
              <button type="button" onClick={sendLink} disabled={busy} className="block w-full text-center text-sm font-semibold text-link hover:underline">
                Forgot password?
              </button>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={register} className="space-y-4">
              <div>
                <h2 className="text-3xl font-bold">{existing ? 'Set up your account' : 'Create your account'}</h2>
                {numberLine}
                {existing && <p className="mt-2 rounded-md bg-emerald-50 p-2.5 text-sm text-emerald-900">We found your purchases from the shop. Add your email and a password to see them.</p>}
              </div>
              <label className="block">
                <span className="label">Full name</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80} autoFocus={!existing || !name} />
              </label>
              <label className="block">
                <span className="label">Gmail / email address</span>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="yourname@gmail.com" required />
                <span className="mt-1 block text-xs text-ink-300">For password resets, order updates and battery servicing reminders.</span>
              </label>
              <PasswordInput label="Create a password" value={password} onChange={setPassword} autoComplete="new-password" />
              <PasswordInput label="Type the password again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              <p className="text-xs text-ink-300">At least 8 characters, with a letter and a number.</p>
              <ErrorNote>{error}</ErrorNote>
              {submit(existing ? 'Save and continue' : 'Create account')}
            </form>
          )}

          {step === 'verify-email' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold">Set your password</h2>
                {numberLine}
              </div>
              <p className="text-graphite">
                This number already has purchases with us. To keep your account safe, we’ll email a link to set your password to <b className="text-ink">{emailHint}</b>.
              </p>
              <ErrorNote>{error}</ErrorNote>
              <button className="btn-primary w-full py-3 text-base" disabled={busy} onClick={sendLink}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Email me the link
              </button>
              <p className="text-xs text-ink-300">Not your email? Please contact the shop{STORE.phone ? ` on ${STORE.phone}` : ''}.</p>
            </div>
          )}

          {step === 'sent' && (
            <div className="space-y-5">
              <MailCheck className="h-10 w-10 text-ok" />
              <div>
                <h2 className="text-3xl font-bold">Check your email</h2>
                <p className="mt-2 text-graphite">
                  We sent a link to <b className="text-ink">{emailHint}</b>. Open it to set your password. It works for 30 minutes; check the spam folder if you don’t see it.
                </p>
              </div>
              {devLink && (
                <p className="break-all rounded-md border border-dashed border-steel-400 bg-steel-50 p-3 text-xs text-graphite">
                  Email isn't set up on this computer, so here is the link (testing only): <a className="text-link underline" href={devLink}>{devLink}</a>
                </p>
              )}
              <ErrorNote>{error}</ErrorNote>
              <button type="button" onClick={back} className="btn-outline w-full">
                <ArrowLeft className="h-4 w-4" /> Back to log in
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
