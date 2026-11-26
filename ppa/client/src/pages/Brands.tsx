import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import type { Brand } from '../api/types';
import { ErrorNote, Spinner } from '../components/ui';

export function BrandLogo({ brand, className = 'h-10' }: { brand: Pick<Brand, 'name' | 'logoUrl' | 'accentColor'>; className?: string }) {
  if (brand.logoUrl) return <img src={brand.logoUrl} alt={`${brand.name} logo`} className={`w-auto object-contain ${className}`} />;
  return (
    <span className="inline-flex items-center rounded px-3 py-1 font-display text-2xl font-bold tracking-wider text-white" style={{ background: brand.accentColor || '#14213D' }}>
      {brand.name.toUpperCase()}
    </span>
  );
}

export default function Brands() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<{ brands: Brand[] }>('/brands').then((r) => setBrands(r.brands)).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="container-x py-10">
      <p className="font-display text-sm font-semibold uppercase tracking-widest text-ink-300">Our brands</p>
      <h1 className="mt-1 text-4xl font-bold">Batteries from the makers you trust</h1>
      <p className="mt-2 max-w-2xl text-graphite">Every battery we sell carries the manufacturer's own warranty. Pick a brand to see its full range.</p>
      <div className="mt-8">
        <ErrorNote>{err}</ErrorNote>
        {!brands && !err && <Spinner />}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {brands?.map((b) => (
            <Link key={b._id} to={`/brands/${b.slug}`} className="group flex flex-col overflow-hidden rounded-lg border border-steel bg-white hover:border-ink">
              <div className="h-1.5" style={{ background: b.accentColor }} />
              <div className="flex flex-1 flex-col p-6">
                <BrandLogo brand={b} />
                {b.manufacturer && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-300">{b.manufacturer}</p>}
                <p className="mt-2 line-clamp-4 text-sm text-graphite">{b.description}</p>
                <p className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold">
                  <span>{b.productCount ? `${b.productCount} batteries` : 'Catalogue coming soon'}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
