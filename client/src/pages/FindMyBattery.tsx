import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { api } from '../api/client';
import type { BrandGroup, SavedVehicle } from '../api/types';
import { VehiclePicker, type PickedVehicle } from '../components/VehiclePicker';
import { BrandGroups } from '../components/BrandGroups';
import { Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';

interface Result {
  vehicle: { _id: string; label: string };
  total: number;
  groups: BrandGroup[];
}

export default function FindMyBattery() {
  const [params, setParams] = useSearchParams();
  const vehicleId = params.get('vehicle');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedVehicle[]>([]);
  const toast = useToast();

  useEffect(() => {
    api<{ vehicles: SavedVehicle[] }>('/me/vehicles').then((r) => setSaved(r.vehicles)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!vehicleId) return setResult(null);
    setLoading(true);
    api<Result>(`/vehicles/${vehicleId}/batteries`)
      .then(setResult)
      .finally(() => setLoading(false));
  }, [vehicleId]);

  const onPick = useCallback((v: PickedVehicle | null) => {
    if (v) setParams({ vehicle: v._id });
  }, [setParams]);

  async function saveVehicle() {
    if (!result) return;
    try {
      await api('/me/vehicles', { body: { vehicleId: result.vehicle._id } });
      toast(`${result.vehicle.label} saved to your vehicles`);
      const r = await api<{ vehicles: SavedVehicle[] }>('/me/vehicles');
      setSaved(r.vehicles);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-bold">Find my battery</h1>
      <p className="mt-1 text-graphite">Choose your vehicle and we’ll show the batteries recommended for it, brand by brand.</p>

      {saved.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-graphite">Your vehicles:</span>
          {saved.map((s) => (
            <button key={s._id} onClick={() => setParams({ vehicle: s.vehicle._id })} className={`rounded-full border px-3 py-1 text-sm ${vehicleId === s.vehicle._id ? 'border-ink bg-ink text-white' : 'border-steel bg-white hover:border-ink'}`}>
              {s.nickname || s.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-steel bg-white p-5 sm:p-6">
        <VehiclePicker onPick={onPick} />
      </div>

      {loading && <Spinner label="Finding batteries" />}
      {result && !loading && (
        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-graphite">Compatible batteries for</p>
              <h2 className="text-3xl font-bold">{result.vehicle.label}</h2>
            </div>
            <button className="btn-outline" onClick={saveVehicle}>
              <Bookmark className="h-4 w-4" /> Save this vehicle
            </button>
          </div>
          {result.total === 0 && (
            <p className="mb-6 rounded-md border border-volt bg-volt-soft px-4 py-3 text-sm">
              We haven’t listed a battery for this vehicle online yet.{' '}
              <Link className="font-semibold underline" to={`/enquiry?type=Product+Enquiry&product_label=${encodeURIComponent(`Battery for ${result.vehicle.label}`)}`}>
                Raise an enquiry
              </Link>{' '}
              and we’ll call you with options and prices.
            </p>
          )}
          <BrandGroups groups={result.groups} vehicleHint={result.vehicle.label} enquiryText={result.vehicle.label} />
        </section>
      )}
    </div>
  );
}
