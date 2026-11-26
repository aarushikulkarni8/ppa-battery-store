import { useEffect, useState } from 'react';
import { Bike, Car, Truck, Tractor, CarTaxiFront, MoreHorizontal } from 'lucide-react';
import { api, qs } from '../api/client';
import type { VehicleCategory } from '../api/types';
import { CATEGORY_LABELS } from '../lib/format';

export const PICKER_TYPES: { key: VehicleCategory; icon: typeof Car; label: string }[] = [
  { key: 'TWO_WHEELER', icon: Bike, label: 'Two wheeler' },
  { key: 'FOUR_WHEELER', icon: Car, label: 'Four wheeler' },
  { key: 'COMMERCIAL', icon: Truck, label: 'Commercial vehicle' },
  { key: 'TRACTOR', icon: Tractor, label: 'Tractor' },
  { key: 'THREE_WHEELER', icon: CarTaxiFront, label: 'Three wheeler' },
  { key: 'OTHER', icon: MoreHorizontal, label: 'Other' },
];

export interface PickedVehicle {
  _id: string;
  label: string;
  category: VehicleCategory;
}

interface Props {
  onPick: (v: PickedVehicle | null) => void;
  initialCategory?: VehicleCategory;
  /** Hide the vehicle-type control (when the parent shows its own). */
  hideType?: boolean;
  /** One dropdown per row (for narrow panels). */
  stack?: boolean;
  compact?: boolean;
}

export function VehiclePicker({ onPick, initialCategory, compact = false, hideType = false, stack = false }: Props) {
  const [category, setCategory] = useState<VehicleCategory | ''>(initialCategory ?? '');
  const [makes, setMakes] = useState<string[]>([]);
  const [make, setMake] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [variants, setVariants] = useState<{ _id: string; variant: string; fuel: string; label: string }[]>([]);
  const [variantId, setVariantId] = useState('');

  useEffect(() => {
    setMakes([]); setMake(''); setModels([]); setModel(''); setVariants([]); setVariantId(''); onPick(null);
    if (category) api<{ makes: string[] }>(`/vehicles/makes${qs({ category })}`).then((r) => setMakes(r.makes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    setModels([]); setModel(''); setVariants([]); setVariantId(''); onPick(null);
    if (category && make) api<{ models: string[] }>(`/vehicles/models${qs({ category, make })}`).then((r) => setModels(r.models));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make]);

  useEffect(() => {
    setVariants([]); setVariantId(''); onPick(null);
    if (category && make && model)
      api<{ variants: { _id: string; variant: string; fuel: string; label: string }[] }>(`/vehicles/variants${qs({ category, make, model })}`).then((r) => {
        setVariants(r.variants);
        if (r.variants.length === 1) {
          setVariantId(r.variants[0]._id);
          onPick({ _id: r.variants[0]._id, label: r.variants[0].label, category: category as VehicleCategory });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const stepCls = stack ? 'grid gap-2.5' : compact ? 'grid gap-3 sm:grid-cols-3' : 'grid gap-4 md:grid-cols-3';

  return (
    <div className="space-y-4">
      {hideType ? null : compact ? (
        <label className="block">
          <span className="label">Vehicle type</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as VehicleCategory)}>
            <option value="">Select type</option>
            {PICKER_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {CATEGORY_LABELS[t.key]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <fieldset>
          <legend className="label mb-2">1. Vehicle type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {PICKER_TYPES.map(({ key, icon: Icon, label }) => (
              <button
                type="button"
                key={key}
                onClick={() => setCategory(key)}
                aria-pressed={category === key}
                className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-semibold transition-colors ${
                  category === key ? 'border-ink bg-ink text-white' : 'border-steel bg-white text-ink hover:border-ink/40'
                }`}
              >
                <Icon className={`h-7 w-7 ${category === key ? 'text-volt' : 'text-graphite'}`} />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className={stepCls}>
        <label className="block">
          <span className="label">{compact ? 'Brand' : '2. Vehicle brand'}</span>
          <select className="input" value={make} disabled={!category} onChange={(e) => setMake(e.target.value)}>
            <option value="">{category && !makes.length ? 'No vehicles listed yet' : 'Select brand'}</option>
            {makes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{compact ? 'Model' : '3. Vehicle model'}</span>
          <select className="input" value={model} disabled={!make} onChange={(e) => setModel(e.target.value)}>
            <option value="">Select model</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{compact ? 'Variant' : '4. Variant'}</span>
          <select
            className="input"
            value={variantId}
            disabled={!model}
            onChange={(e) => {
              setVariantId(e.target.value);
              const v = variants.find((x) => x._id === e.target.value);
              onPick(v ? { _id: v._id, label: v.label, category: category as VehicleCategory } : null);
            }}
          >
            <option value="">Select variant</option>
            {variants.map((v) => (
              <option key={v._id} value={v._id}>
                {v.fuel ? `${v.variant} (${v.fuel})` : v.variant}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
