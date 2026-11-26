import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, UserRound, MapPin, LogOut, ChevronDown, CarFront } from 'lucide-react';
import { api } from '../api/client';
import type { Brand } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Logo } from './Logo';
import { HeaderSearch } from './SearchBox';
import { useSite } from '../context/SiteContext';
import { PhoneAction } from './PhoneAction';
import { Spinner } from './ui';
import { STORE } from '../config/store';

const CATEGORY_LINKS = [
  { to: '/search?category=TWO_WHEELER', label: 'Two wheeler' },
];

const ACCOUNT_LINKS = [
  ['/account/orders', 'My orders'],
  ['/account/batteries', 'My batteries'],
  ['/account/warranty', 'Warranty'],
  ['/account/enquiries', 'My enquiries'],
  ['/account', 'Profile'],
];

const INVERTER_LINKS = [
  { to: '/search?category=INVERTER&type=INVERTER', label: 'Inverters', hint: 'Inverters and home UPS units' },
  { to: '/search?category=INVERTER&type=BATTERY', label: 'Inverter batteries', hint: 'Tubular batteries for inverters' },
];

/** "Inverters ▾" in the category strip. The strip scrolls sideways, so the menu is positioned on the page, not inside it. */
function InverterMenu({ className }: { className: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const loc = useLocation();

  useEffect(() => setPos(null), [loc.pathname, loc.search]);
  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'mousedown' && (menu.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setPos(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={!!pos}
        className={`${className} flex items-center gap-1`}
        onClick={() => {
          if (pos) return setPos(null);
          const r = btn.current!.getBoundingClientRect();
          setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 256) });
        }}
      >
        Inverters <ChevronDown className={`h-3.5 w-3.5 transition-transform ${pos ? 'rotate-180' : ''}`} />
      </button>
      {pos && (
        <div ref={menu} role="menu" className="fixed z-50 w-60 overflow-hidden rounded-md border border-steel bg-white py-1 shadow-xl" style={{ top: pos.top, left: pos.left }}>
          {INVERTER_LINKS.map((l) => (
            <Link key={l.to} role="menuitem" to={l.to} className="block px-4 py-2.5 hover:bg-steel-50">
              <span className="block text-[14px] font-semibold text-ink">{l.label}</span>
              <span className="block text-[12.5px] text-graphite">{l.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Header() {
  const { customer, logout } = useAuth();
  const { count } = useCart();
  const { onlineShop } = useSite();
  const [menu, setMenu] = useState(false);
  const [brands, setBrands] = useState<Pick<Brand, '_id' | 'name' | 'slug'>[]>([]);
  const loc = useLocation();
  const nav = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const here = loc.pathname + loc.search;

  useEffect(() => setMenu(false), [loc.pathname, loc.search]);
  useEffect(() => {
    api<{ brands: Brand[] }>('/brands').then((r) => setBrands(r.brands)).catch(() => undefined);
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const strip = (active: boolean) =>
    `whitespace-nowrap px-3 py-2.5 text-[14px] font-medium border-b-2 ${active ? 'border-volt text-ink' : 'border-transparent text-graphite hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-40 shadow-[0_1px_3px_rgba(20,33,61,.15)]">
      <div className="bg-ink">
        <div className="container-x flex flex-wrap items-center gap-x-4 gap-y-2.5 py-2.5 md:flex-nowrap">
          <Link to="/" aria-label="Prashant and Prashant Associates, home" className="mr-auto rounded md:mr-0">
            <Logo light />
          </Link>
          <HeaderSearch className="order-last w-full md:order-none md:mx-2 md:flex-1" />
          {!customer && (
            <Link
              to={`/login?next=${encodeURIComponent(here)}`}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-[14px] font-semibold text-white hover:ring-1 hover:ring-white/40"
            >
              <UserRound className="h-5 w-5" /> Log in
            </Link>
          )}
          {customer && (
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2 rounded px-2 py-1 text-left text-white hover:ring-1 hover:ring-white/40"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
            >
              <UserRound className="h-5 w-5 sm:hidden" />
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-[9rem] truncate text-[12px] text-white/70">Hello, {customer?.name?.split(' ')[0] || 'there'}</span>
                <span className="flex items-center gap-0.5 text-[14px] font-semibold">
                  Account &amp; orders <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </span>
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-md border border-steel bg-white p-1.5 text-ink shadow-xl">
                <p className="px-3 pb-2 pt-1.5 text-xs text-ink-300">Signed in as +91 {customer?.mobile}</p>
                {ACCOUNT_LINKS.map(([to, label]) => (
                  <Link key={to} role="menuitem" to={to} className="block rounded px-3 py-2 text-sm hover:bg-steel-50">
                    {label}
                  </Link>
                ))}
                <button
                  role="menuitem"
                  className="mt-1 flex w-full items-center gap-2 rounded border-t border-steel px-3 py-2 text-left text-sm text-plus hover:bg-rose-50"
                  onClick={async () => {
                    // leave the page first: a login-only page would otherwise redirect to the login screen
                    nav('/');
                    await logout();
                  }}
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
          )}
          {onlineShop && (
            <Link to="/cart" className="flex items-center gap-1.5 rounded px-2 py-1 text-white hover:ring-1 hover:ring-white/40" aria-label={`Cart, ${count} items`}>
              <span className="relative">
                <ShoppingCart className="h-6 w-6" />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-volt px-1 text-[11px] font-bold text-ink">{count}</span>
                )}
              </span>
              <span className="hidden text-[14px] font-semibold sm:inline">Cart</span>
            </Link>
          )}
        </div>
      </div>
      <nav aria-label="Categories" className="border-b border-steel bg-white">
        <div className="container-x no-scrollbar flex items-center overflow-x-auto">
          <Link to="/search?q=automotive" className={`${strip(here === '/search?q=automotive')} flex items-center gap-1.5 font-semibold text-ink`}>
            <CarFront className="h-4 w-4" /> Automotive
          </Link>
          <span className="mx-1 h-5 w-px shrink-0 bg-steel" />
          {CATEGORY_LINKS.map((c) => (
            <Link key={c.to} to={c.to} className={strip(here === c.to)}>
              {c.label}
            </Link>
          ))}
          <InverterMenu className={strip(loc.search.includes('category=INVERTER'))} />
          <Link to="/pcb" className={strip(loc.pathname === '/pcb')}>
            PCB
          </Link>
          <span className="mx-1 h-5 w-px shrink-0 bg-steel" />
          {brands.map((b) => (
            <Link key={b._id} to={`/brands/${b.slug}`} className={strip(loc.pathname === `/brands/${b.slug}`)}>
              {b.name}
            </Link>
          ))}
          <Link to="/contact" className={`${strip(loc.pathname === '/contact')} ml-auto`}>
            Contact us
          </Link>
          <Link to="/enquiry" className={strip(loc.pathname === '/enquiry')}>
            Enquiry
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-12 bg-ink text-white/80">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-sm">{STORE.tagline}. Amaron, Exide and Bosch batteries with manufacturer warranty, installation on request and help with warranty claims.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-base font-semibold text-white">Visit the shop</p>
          <p className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
            <span>
              {STORE.addressLines.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
              <a href={STORE.mapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-white underline-offset-4 hover:underline">
                Open in Maps
              </a>
            </span>
          </p>
          {STORE.phone && <PhoneAction phone={STORE.phone} whatsapp={STORE.whatsapp || undefined} light openUp />}
          {STORE.hours && <p>{STORE.hours}</p>}
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-base font-semibold text-white">Help</p>
          <Link to="/search?q=automotive" className="block hover:text-white">Automotive batteries</Link>
          <Link to="/enquiry?type=Warranty" className="block hover:text-white">Warranty claim</Link>
          <Link to="/enquiry?type=Installation" className="block hover:text-white">Book installation</Link>
          <Link to="/account/orders" className="block hover:text-white">Track my order</Link>
          <Link to="/contact" className="block hover:text-white">About and contact</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-x py-4 text-xs text-white/50">
          © {new Date().getFullYear()} {STORE.name}. Brand names and logos belong to their owners. Warranty is provided by the battery manufacturer as per their warranty card.
        </p>
      </div>
    </footer>
  );
}

/** Pages that need an account (enquiries, orders, cart, account). Browsing does not. */
export function RequireLogin({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const loc = useLocation();
  if (!customer) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

export function CustomerLayout() {
  const { customer, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (customer && !customer.profileComplete) return <Navigate to={`/welcome?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
