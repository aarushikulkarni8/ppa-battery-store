import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client';
import type { SearchResult } from '../api/types';
import { BrandGroups } from '../components/BrandGroups';
import { Empty, ErrorNote, Spinner } from '../components/ui';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const type = params.get('type') ?? '';
  const [data, setData] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError('');
    api<SearchResult>(`/search${qs({ q, category, type })}`, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ctrl.abort();
  }, [q, category, type]);

  const vehicles = data?.interpretation.vehicles ?? [];
  const vehicleHint = vehicles.length === 1 ? vehicles[0].label : undefined;

  return (
    <div className="container-x py-10">
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data && !error && <Spinner label="Searching" />}
      {data && (
        <>
          <header className="mb-6">
            <h1 className="text-4xl font-bold">{data.heading}</h1>
            <p className="mt-1 text-graphite">
              {data.total} {type === 'INVERTER' ? (data.total === 1 ? 'inverter' : 'inverters') : category === 'INVERTER' && !type ? (data.total === 1 ? 'product' : 'products') : data.total === 1 ? 'battery' : 'batteries'}
              {q && <> for “{q}”</>}
            </p>
            {category === 'INVERTER' && !q && (
              <div className="mt-4 inline-flex rounded-md border border-steel bg-white p-0.5" role="tablist" aria-label="Show">
                {([['', 'All'], ['INVERTER', 'Inverters'], ['BATTERY', 'Inverter batteries']] as const).map(([k, label]) => (
                  <Link
                    key={k}
                    role="tab"
                    aria-selected={type === k}
                    to={`/search?category=INVERTER${k ? `&type=${k}` : ''}`}
                    className={`rounded px-4 py-1.5 text-sm font-semibold ${type === k ? 'bg-ink text-white' : 'text-graphite hover:text-ink'}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
            {!!data.interpretation.nearestVa?.length && (
              <p className="mt-3 rounded-md border border-volt bg-volt-soft px-3 py-2 text-sm">
                No {data.interpretation.vaRating}VA inverter is listed yet. Showing the closest rating ({data.interpretation.nearestVa.map((a) => `${a}VA`).join(', ')}), or{' '}
                <Link className="font-semibold underline" to={`/enquiry?type=Product+Enquiry&product_label=${encodeURIComponent(`${data.interpretation.vaRating}VA inverter`)}`}>ask the shop</Link>.
              </p>
            )}
            {!!data.interpretation.nearestAh?.length && (
              <p className="mt-3 rounded-md border border-volt bg-volt-soft px-3 py-2 text-sm">
                No {data.interpretation.capacityAh}Ah battery is listed yet. Showing the closest capacity ({data.interpretation.nearestAh.map((a) => `${a}Ah`).join(', ')}). Always match the capacity your vehicle maker specifies, or{' '}
                <Link className="font-semibold underline" to={`/enquiry?type=Product+Enquiry&product_label=${encodeURIComponent(`${data.interpretation.capacityAh}Ah battery`)}`}>ask the shop</Link>.
              </p>
            )}
          </header>
          {data.total === 0 && vehicles.length === 0 && !data.interpretation.category && !data.interpretation.brand ? (
            <Empty
              title="No batteries matched that search"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link to="/search?q=automotive" className="btn-primary">Automotive batteries</Link>
                  <Link to={`/enquiry?type=Product+Enquiry&product_label=${encodeURIComponent(q)}`} className="btn-outline">Ask the shop</Link>
                </div>
              }
            >
              Try a battery type like “automotive” or “two wheeler”, a model such as “DIN65”, a brand, or a capacity such as “35Ah”.
            </Empty>
          ) : (
            <BrandGroups groups={data.groups} vehicleHint={vehicleHint} enquiryText={vehicleHint ?? q} />
          )}
        </>
      )}
    </div>
  );
}
