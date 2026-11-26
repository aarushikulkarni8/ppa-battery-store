import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, Car, BatteryCharging, ShieldCheck, Wrench, Banknote, Store, Search } from 'lucide-react';
import { api } from '../api/client';
import type { Brand, Product, VehicleCategory } from '../api/types';
import { ProductRail } from '../components/ProductCard';
import { ProductImage } from '../components/BatteryArt';
import { BrandLogo } from './Brands';
import { STORE } from '../config/store';
import { useSite } from '../context/SiteContext';

const AUTOMOTIVE: VehicleCategory[] = ['FOUR_WHEELER', 'THREE_WHEELER', 'COMMERCIAL', 'TRACTOR'];

const TYPES: { to: string; label: string; icon: typeof Car; keys: VehicleCategory[]; noun: string }[] = [
  { to: '/search?q=automotive', label: 'Automotive', icon: Car, keys: AUTOMOTIVE, noun: 'batteries' },
  { to: '/search?category=TWO_WHEELER', label: 'Two wheeler', icon: Bike, keys: ['TWO_WHEELER'], noun: 'batteries' },
  { to: '/search?category=INVERTER', label: 'Inverter & UPS', icon: BatteryCharging, keys: ['INVERTER'], noun: 'products' },
];
const EXAMPLES = ['Amaron PRO', 'Amaron GO', 'DIN65', '35Ah', 'Hi-Way'];

function Finder() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  return (
    <div className="min-w-0 rounded-md bg-white p-4 text-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] sm:p-5">
      <p className="text-lg font-bold">Find your battery</p>
      <form
        className="mt-3 flex h-12 overflow-hidden rounded-md border border-steel-400/70 focus-within:border-ink focus-within:ring-2 focus-within:ring-volt"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Battery model, series or capacity"
          placeholder="Model, series or capacity, e.g. DIN65"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-[15px] focus:outline-none"
        />
        <button className="btn-buy rounded-none px-4" aria-label="Search">
          <Search className="h-5 w-5" />
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <Link key={ex} to={`/search?q=${encodeURIComponent(ex)}`} className="rounded-full border border-steel px-2.5 py-0.5 text-[12.5px] text-graphite hover:border-ink hover:text-ink">
            {ex}
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold">Or browse by type</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {TYPES.map(({ to, label, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-md border px-1 py-2 text-center text-[11.5px] font-semibold leading-tight ${
              i === 0 ? 'border-ink bg-ink text-white' : 'border-steel text-graphite hover:border-ink/40 hover:text-ink'
            }`}
          >
            <Icon className={`h-5 w-5 ${i === 0 ? 'text-volt' : ''}`} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { onlineShop } = useSite();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [rails, setRails] = useState<Record<string, Product[]>>({});
  const [automotiveRail, setAutomotiveRail] = useState<Product[]>([]);

  useEffect(() => {
    api<{ brands: Brand[] }>('/brands').then((r) => setBrands(r.brands));
    // same order as the Automotive page: batteries you can order online first
    api<{ groups: { products: Product[] }[] }>('/search?q=automotive').then((r) => setAutomotiveRail(r.groups.flatMap((g) => g.products).slice(0, 15)));
    api<{ categories: { key: string; productCount: number }[] }>('/categories').then((r) => {
      setCounts(Object.fromEntries(r.categories.map((c) => [c.key, c.productCount])));
      r.categories
        .filter((c) => c.productCount > 0 && !AUTOMOTIVE.includes(c.key as VehicleCategory))
        .forEach((c) =>
          api<{ products: Product[] }>(`/products?category=${c.key}&limit=${c.key === 'INVERTER' ? 40 : 15}`).then((p) =>
            setRails((x) => ({ ...x, [c.key]: [...p.products].sort((a, b) => Number(b.sellingPrice != null) - Number(a.sellingPrice != null)) })),
          ),
        );
    });
  }, []);

  const showcase = [...automotiveRail, ...Object.values(rails).flat()].filter((p) => p.sellingPrice != null && p.productType !== 'INVERTER').slice(0, 2);


  return (
    <div className="container-x space-y-3 py-3 sm:space-y-4 sm:py-4">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-md bg-ink text-white">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-volt" />
        <div className="relative grid grid-cols-1 items-center gap-6 p-3 sm:p-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12 lg:p-8">
          <Finder />
          <div className="hidden lg:block">
            <h1 className="max-w-lg text-[44px] font-bold leading-[1.02]">Amaron, Exide and Bosch batteries in Sample City</h1>
            <p className="mt-3 max-w-md text-white/75">
              Automotive, two wheeler and inverter batteries, with the manufacturer's warranty recorded against every battery you buy.
            </p>
            <div className="mt-6 flex items-end gap-2">
              {showcase.map((p, i) => (
                <Link key={p._id} to={`/product/${p.slug}`} className={`block ${i === 0 ? 'w-64' : 'w-44'}`} aria-label={p.name}>
                  <ProductImage product={p} className="h-auto w-full drop-shadow-[0_10px_20px_rgba(0,0,0,.35)]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="panel p-3 sm:p-4" aria-label="Shop by type">
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(({ to, label, icon: Icon, keys, noun }) => {
            const n = keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
            return (
              <Link key={to} to={to} className="group flex flex-col items-center gap-2 rounded-md p-2 text-center hover:bg-steel-50">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-steel-50 group-hover:bg-volt-soft sm:h-16 sm:w-16">
                  <Icon className="h-7 w-7 text-ink" />
                </span>
                <span className="text-[13.5px] font-semibold leading-tight sm:text-[15px]">{label}</span>
                <span className="-mt-1.5 text-[12px] text-ink-300">{n ? `${n} ${noun}` : 'Ask in store'}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <ProductRail title="Automotive batteries" products={automotiveRail} viewAll="/search?q=automotive" />
      <ProductRail title="Two wheeler batteries" products={rails.TWO_WHEELER ?? []} viewAll="/search?category=TWO_WHEELER" />
      <ProductRail title="Inverters and home UPS" products={(rails.INVERTER ?? []).filter((p) => p.productType === 'INVERTER')} viewAll="/search?category=INVERTER&type=INVERTER" />
      <ProductRail title="Inverter batteries" products={(rails.INVERTER ?? []).filter((p) => p.productType !== 'INVERTER')} viewAll="/search?category=INVERTER&type=BATTERY" />

      {/* Brands */}
      <section className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-sans text-xl font-bold tracking-normal sm:text-[22px]">Shop by brand</h2>
          <Link to="/brands" className="text-sm font-semibold text-link hover:underline">All brands</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {brands.map((b) => (
            <Link key={b._id} to={`/brands/${b.slug}`} className="flex items-center justify-between gap-3 rounded-md border border-steel p-4 hover:border-ink/40">
              <BrandLogo brand={b} className="h-8" />
              <span className="text-right text-[13px] text-graphite">{b.productCount ? `${b.productCount} batteries` : 'Ask in store'}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why buy here */}
      <section className="panel grid grid-cols-2 gap-px overflow-hidden bg-steel md:grid-cols-4" aria-label="Why buy from us">
        {[
          { icon: ShieldCheck, t: 'Manufacturer warranty', d: 'Recorded against your number, so claims are easy.' },
          { icon: Wrench, t: 'Installation on request', d: 'Delivery with installation, or pick up at the shop.' },
          onlineShop
            ? { icon: Banknote, t: 'Pay on delivery', d: 'Cash on delivery or pay at the store.' }
            : { icon: Banknote, t: 'Ask for a price', d: 'Tap “Ask for price” on any battery, or call the shop.' },
          { icon: Store, t: 'Local shop', d: STORE.addressLines.join(', ') },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="flex gap-3 bg-white p-4">
            <Icon className="mt-0.5 h-6 w-6 shrink-0 text-ok" />
            <div>
              <p className="text-[15px] font-semibold">{t}</p>
              <p className="mt-0.5 text-[13px] text-graphite">{d}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
