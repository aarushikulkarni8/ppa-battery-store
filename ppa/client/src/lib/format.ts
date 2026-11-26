import type { OrderStatus, VehicleCategory, Warranty } from '../api/types';

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  TWO_WHEELER: 'Two wheeler',
  THREE_WHEELER: 'Three wheeler',
  FOUR_WHEELER: 'Four wheeler',
  COMMERCIAL: 'Commercial vehicle',
  TRACTOR: 'Tractor',
  INVERTER: 'Inverters & home UPS',
  PCB: 'PCB',
  OTHER: 'Other',
};

export const CATEGORY_ORDER: VehicleCategory[] = ['TWO_WHEELER', 'FOUR_WHEELER', 'THREE_WHEELER', 'COMMERCIAL', 'TRACTOR', 'INVERTER', 'PCB', 'OTHER'];

export const inr = (n: number | null | undefined) =>
  n == null ? '' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const date = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';

export const dateTime = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : '';

export function warrantySplit(w: Warranty) {
  if (w.freeMonths != null && w.proRataMonths != null) return `${w.freeMonths} months free replacement + ${w.proRataMonths} months pro-rata`;
  if (w.freeMonths != null) return `${w.freeMonths} months free replacement`;
  return 'Includes pro-rata period';
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  READY: 'Ready / out for fitment',
  DELIVERED: 'Delivered & installed',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  PLACED: 'bg-volt-soft text-ink',
  CONFIRMED: 'bg-sky-100 text-sky-900',
  READY: 'bg-indigo-100 text-indigo-900',
  DELIVERED: 'bg-emerald-100 text-emerald-900',
  CANCELLED: 'bg-rose-100 text-rose-900',
};

export function daysLeft(until: string | Date) {
  return Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000);
}

export function dims(d: { lengthMm: number | null; widthMm: number | null; heightMm: number | null }) {
  return d.lengthMm && d.widthMm && d.heightMm ? `${d.lengthMm} × ${d.widthMm} × ${d.heightMm} mm` : '';
}

/** "Amaron" + "Amaron PRO 50B20L" → "Amaron PRO 50B20L" (no doubled brand). */
export function fullName(brand: string | undefined | null, name: string) {
  const b = (brand ?? '').trim();
  return b && !name.toLowerCase().startsWith(b.toLowerCase()) ? `${b} ${name}` : name;
}

/** Short spec line for any product: "12V, 35Ah" for batteries, "1100VA, 12V, Pure sine wave" for inverters. */
export function specLine(p: { productType?: string; voltage: number; capacityAh: number; inverterSpecs?: { vaRating: number | null; waveform: string } | null; specs?: { label: string; value: string }[] }) {
  if (p.productType === 'PCB') return (p.specs ?? []).slice(0, 2).map((s) => `${s.label}: ${s.value}`).join(', ');
  if (p.productType === 'INVERTER') {
    return [p.inverterSpecs?.vaRating ? `${p.inverterSpecs.vaRating}VA` : '', p.voltage ? `${p.voltage}V` : '', p.inverterSpecs?.waveform ?? '']
      .filter(Boolean)
      .join(', ');
  }
  return p.capacityAh ? `${p.voltage}V, ${p.capacityAh}Ah` : `${p.voltage}V`;
}
export const isInverter = (p: { productType?: string }) => p.productType === 'INVERTER';

export const PAYMENT_LABEL: Record<string, string> = {
  COD: 'Cash on delivery',
  PAY_AT_STORE: 'Pay at store',
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
};
export const FULFILMENT_LABEL: Record<string, string> = {
  DELIVERY_INSTALL: 'Delivery + installation',
  STORE_PICKUP: 'Store pickup',
  IN_STORE: 'Bought in the shop',
};

export const PCB_STATUS_TONE: Record<string, string> = {
  New: 'bg-volt-soft text-ink',
  Confirmed: 'bg-sky-100 text-sky-900',
  'In progress': 'bg-indigo-100 text-indigo-900',
  Ready: 'bg-emerald-100 text-emerald-900',
  Delivered: 'bg-steel text-graphite',
  Cancelled: 'bg-rose-100 text-rose-900',
};
