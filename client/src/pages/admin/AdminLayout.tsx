import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, BatteryCharging, Tags, MessageSquareText, Receipt, BellRing, CircuitBoard, LogOut, ExternalLink, Menu, X, FileSpreadsheet, Images } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { LogoMark } from '../../components/Logo';
import { Spinner } from '../../components/ui';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}
const AdminCtx = createContext<{ admin: AdminUser | null; setAdmin: (a: AdminUser | null) => void }>({ admin: null, setAdmin: () => undefined });
export const useAdmin = () => useContext(AdminCtx);

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/sales/new', label: 'Record shop sale', icon: Receipt },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/pcb-orders', label: 'PCB orders', icon: CircuitBoard },
  { to: '/admin/products', label: 'Products', icon: BatteryCharging },
  { to: '/admin/brands', label: 'Brands', icon: Tags },
  { to: '/admin/import', label: 'Bulk import', icon: FileSpreadsheet },
  { to: '/admin/photos', label: 'Bulk photos', icon: Images },
  { to: '/admin/enquiries', label: 'Enquiries', icon: MessageSquareText },
  { to: '/admin/reminders', label: 'Service reminders', icon: BellRing },
];

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  return <AdminCtx.Provider value={{ admin, setAdmin }}>{children}</AdminCtx.Provider>;
}

export default function AdminLayout() {
  const { admin, setAdmin } = useAdmin();
  const [checking, setChecking] = useState(!admin);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    if (admin) return;
    api<{ admin: AdminUser }>('/admin/auth/me')
      .then((r) => setAdmin(r.admin))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      })
      .finally(() => setChecking(false));
  }, [admin, setAdmin]);

  useEffect(() => setOpen(false), [loc.pathname]);

  if (checking) return <Spinner />;
  if (!admin) return <Navigate to={`/admin/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;

  const sidebar = (
    <>
      <Link to="/admin" className="flex items-center gap-2 px-4 py-5">
        <LogoMark className="h-8 w-8" />
        <span className="font-display text-lg font-bold leading-tight text-white">PPA Admin</span>
      </Link>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-volt text-ink' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3 text-sm">
        <p className="px-2 text-white/60">{admin.name}<br /><span className="text-xs">{admin.email}</span></p>
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded px-2 py-1.5 text-white/75 hover:text-white">
          <ExternalLink className="h-4 w-4" /> View store
        </a>
        <button
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-white/75 hover:text-white"
          onClick={async () => {
            await api('/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
            setAdmin(null);
            nav('/admin/login');
          }}
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-ink lg:flex">{sidebar}</aside>
      <div className="flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <span className="font-display font-bold text-white">PPA Admin</span>
        <button className="text-white" aria-label="Menu" onClick={() => setOpen((o) => !o)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <aside className="flex flex-col bg-ink lg:hidden">{sidebar}</aside>}
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {sub && <p className="text-sm text-graphite">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
