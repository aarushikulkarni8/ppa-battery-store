import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BrandGroup } from '../api/types';
import { ProductGrid } from './ProductCard';

export function BrandGroups({ groups, vehicleHint, enquiryText }: { groups: BrandGroup[]; vehicleHint?: string; enquiryText?: string }) {
  const [tab, setTab] = useState<string>('all');
  const total = groups.reduce((s, g) => s + g.products.length, 0);
  const shown = useMemo(() => (tab === 'all' ? groups : groups.filter((g) => g.brand.slug === tab)), [groups, tab]);

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-steel" role="tablist">
        {[{ slug: 'all', name: 'All brands', count: total, color: '#14213D' }, ...groups.map((g) => ({ slug: g.brand.slug, name: g.brand.name, count: g.products.length, color: g.brand.accentColor || '#14213D' }))].map((t) => (
          <button
            key={t.slug}
            role="tab"
            aria-selected={tab === t.slug}
            onClick={() => setTab(t.slug)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-[3px] px-4 py-2.5 font-display text-lg font-semibold transition-colors ${
              tab === t.slug ? 'text-ink' : 'border-transparent text-ink-300 hover:text-ink'
            }`}
            style={tab === t.slug ? { borderColor: t.color } : undefined}
          >
            {t.name}
            <span className="rounded bg-steel px-1.5 text-xs font-sans font-semibold text-graphite">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {shown.map((g) => (
          <section key={g.brand._id} aria-labelledby={`brand-${g.brand.slug}`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-6 w-1.5 rounded-full" style={{ background: g.brand.accentColor || '#14213D' }} />
              <h2 id={`brand-${g.brand.slug}`} className="text-2xl font-bold">
                {g.brand.name}
              </h2>
              <Link to={`/brands/${g.brand.slug}`} className="ml-auto text-sm font-semibold text-graphite hover:underline">
                All {g.brand.name} batteries
              </Link>
            </div>
            {g.products.length ? (
              <ProductGrid products={g.products} vehicleHint={vehicleHint} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-steel-400/70 bg-white px-5 py-4 text-sm text-graphite">
                <span>No {g.brand.name} battery listed online for this yet. We can still check stock at the shop.</span>
                <Link
                  to={`/enquiry?type=Product+Enquiry&product_label=${encodeURIComponent(`${g.brand.name} battery${enquiryText ? ` for ${enquiryText}` : ''}`)}`}
                  className="font-semibold text-ink underline-offset-4 hover:underline"
                >
                  Ask for a {g.brand.name} battery
                </Link>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
