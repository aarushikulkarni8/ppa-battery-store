import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../api/client';
import type { Customer } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { ErrorNote } from '../components/ui';
import { PasswordInput, passwordProblem } from './Login';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { setCustomer } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const p = passwordProblem(password, confirm);
    if (p) return setError(p);
    setError('');
    setBusy(true);
    try {
      const r = await api<{ customer: Customer }>('/auth/password/reset', { body: { token, password } });
      setCustomer(r.customer);
      nav(r.customer.profileComplete ? '/' : '/welcome', { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-steel-50 px-5 py-12">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl bg-white p-7 shadow-plate">
        <Logo />
        <div>
          <h1 className="text-3xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-graphite">At least 8 characters, with a letter and a number.</p>
        </div>
        {!token ? (
          <ErrorNote>This link is incomplete. Open the link from the email again, or ask for a new one.</ErrorNote>
        ) : (
          <>
            <PasswordInput label="New password" value={password} onChange={setPassword} autoComplete="new-password" autoFocus />
            <PasswordInput label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            <ErrorNote>{error}</ErrorNote>
            <button className="btn-primary w-full py-3 text-base" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password and log in
            </button>
          </>
        )}
        <Link to="/login" className="block text-center text-sm font-semibold text-link hover:underline">Back to log in</Link>
      </form>
    </div>
  );
}
