import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Customer } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { ErrorNote, Field, Spinner } from '../components/ui';

export default function Welcome() {
  const { customer, setCustomer, loading } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (!customer) return <Navigate to="/login" replace />;
  if (customer.profileComplete) return <Navigate to={next} replace />;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ customer: Customer }>('/auth/profile', { method: 'PUT', body: { name, email } });
      setCustomer(r.customer);
      nav(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={save} className="w-full max-w-sm space-y-5">
        <Logo />
        <div>
          <h1 className="text-3xl font-bold">One last step</h1>
          <p className="mt-1 text-sm text-graphite">Your name goes on your invoice and warranty records.</p>
        </div>
        <Field label="Full name">
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} />
        </Field>
        <Field label="Email (optional)" hint="For order and warranty updates.">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-primary h-12 w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
