import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { api } from '../../api/client';
import { Logo } from '../../components/Logo';
import { ErrorNote, Field } from '../../components/ui';
import { useAdmin, type AdminUser } from './AdminLayout';

export default function AdminLogin() {
  const { admin, setAdmin } = useAdmin();
  const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/admin') ? params.get('next')! : '/admin';
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (admin) return <Navigate to={next} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api<{ admin: AdminUser }>('/admin/auth/login', { body: { email, password } });
      setAdmin(r.admin);
      nav(next, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-7 shadow-plate">
        <Logo />
        <h1 className="mt-6 flex items-center gap-2 text-2xl font-bold"><LockKeyhole className="h-5 w-5" /> Admin console</h1>
        <div className="mt-5 space-y-4">
          <Field label="Email"><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Password"><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <ErrorNote>{err}</ErrorNote>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in</button>
        </div>
      </form>
    </div>
  );
}
