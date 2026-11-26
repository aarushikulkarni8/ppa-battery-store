import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, MessageSquareText } from 'lucide-react';
import { api } from '../api/client';
import type { Brand, Product, VehicleCategory } from '../api/types';
import { ProductGrid } from '../components/ProductCard';
import { Empty, ErrorNote, Spinner } from '../components/ui';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/format';
import { BrandLogo } from './Brands';

export default function BrandDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<{ brand: Brand; products: Product[] } | null>(null);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState<VehicleCategory | 'ALL'>('ALL');

  useEffect(() => {
    setData(null);
    setErr('');
    setCat('ALL');
    api<{ brand: Brand; products: Product[] }>(`/brands/${slug}`).then(setData).catch((e) => setErr(e.message));
  }, [slug]);

  const cats = useMemo(() => CATEGORY_ORDER.filter((c) => data?.products.some((p) => p.vehicleCategory === c)), [data]);
  const shown = data?.products.filter((p) => cat === 'ALL' || p.vehicleCategory === cat) ?? [];

  if (err) return <div className="container-x py-10"><ErrorNote>{err}</ErrorNote></div>;
  if (!data) return <Spinner />;
  const { brand } = data;

  return (
    <div>
      <section className="border-b border-steel bg-white">
        <div className="h-1.5" style={{ background: brand.accentColor }} />
        <div className="container-x py-10">
          <nav className="mb-4 text-sm text-ink-300">
            <Link to="/brands" className="hover:text-ink">Brands</Link> / <span className="text-graphite">{brand.name}</span>
          </nav>
          <BrandLogo brand={brand} className="h-12" />
          {brand.manufacturer && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-300">{brand.manufacturer}</p>}
          <p className="mt-3 max-w-3xl text-graphite">{brand.description}</p>
          {brand.website && (
            <a href={brand.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
              Manufacturer website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </section>
      <div className="container-x py-8">
        {data.products.length === 0 ? (
          <Empty
            title={`${brand.name} batteries are available at the shop`}
            action={
              <Link to={`/enquiry?type=Product+Enquiry&product_label=${encodeURIComponent(brand.name + ' battery')}`} className="btn-primary">
                <MessageSquareText className="h-4 w-4" /> Ask for a {brand.name} battery
              </Link>
            }
          >
            The online catalogue for {brand.name} is being added. Tell us your vehicle and we will quote the right battery.
          </Empty>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-2" role="tablist">
              {(['ALL', ...cats] as const).map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={cat === c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${cat === c ? 'border-ink bg-ink text-white' : 'border-steel bg-white text-graphite hover:border-ink/40'}`}
                >
                  {c === 'ALL' ? `All (${data.products.length})` : CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <ProductGrid products={shown} />
          </>
        )}
      </div>
    </div>
  );
}
