export type VehicleCategory = 'TWO_WHEELER' | 'THREE_WHEELER' | 'FOUR_WHEELER' | 'COMMERCIAL' | 'TRACTOR' | 'INVERTER' | 'PCB' | 'OTHER';
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type EnquiryStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed';

export interface BrandRef {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  accentColor?: string;
  description?: string;
  isActive?: boolean;
}
export interface Brand extends BrandRef {
  description: string;
  manufacturer: string;
  website: string;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
}

export interface Warranty {
  totalMonths: number;
  freeMonths: number | null;
  proRataMonths: number | null;
  notes?: string;
}

export type ProductType = 'BATTERY' | 'INVERTER' | 'PCB';

export interface InverterSpecs {
  vaRating: number | null;
  maxLoadW: number | null;
  batteriesSupported: number | null;
  waveform: string;
  chargingCurrentA: number | null;
  recommendedBattery: string;
}

export interface Product {
  _id: string;
  productType?: ProductType;
  inverterSpecs?: InverterSpecs;
  specs?: { label: string; value: string }[];
  brand: BrandRef;
  name: string;
  slug: string;
  series: string;
  model: string;
  sku: string;
  batteryType: string;
  vehicleCategory: VehicleCategory;
  voltage: number;
  capacityAh: number;
  cca: number | null;
  dimensions: { lengthMm: number | null; widthMm: number | null; heightMm: number | null };
  weightKg: number | null;
  terminalLayout: string;
  warranty: Warranty;
  description: string;
  features: string[];
  mrp: number | null;
  sellingPrice: number | null;
  images: { _id: string; url: string; publicId?: string; alt?: string }[];
  isActive: boolean;
  sourceUrl?: string;
  sourceNote?: string;
  stock: number;
  lowStockThreshold: number;
  purchasable: boolean;
  compatibleVehicleCount?: number;
}

export interface BrandGroup {
  brand: BrandRef;
  products: Product[];
}

export interface VehicleLite {
  _id: string;
  label: string;
  category: VehicleCategory;
  make?: string;
  model?: string;
  variant?: string;
}

export interface Customer {
  _id: string;
  mobile: string;
  name: string;
  email: string;
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  reminderEmails?: boolean;
  hasPassword?: boolean;
  profileComplete: boolean;
  createdAt: string;
}

export interface OrderItem {
  _id: string;
  product: string;
  brandName: string;
  productName: string;
  model: string;
  sku: string;
  capacityAh: number;
  voltage: number;
  imageUrl: string;
  warranty: Warranty;
  mrp: number | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Purchase {
  _id: string;
  remindersSent?: number;
  lastReminderAt?: string | null;
  lastReminderError?: string;
  /** admin customer view only */
  reminderEligible?: boolean;
  nextReminder?: string | null;
  orderId: string;
  product: string;
  brandName: string;
  productName: string;
  model: string;
  sku: string;
  capacityAh: number;
  imageUrl: string;
  vehicleLabel: string;
  registrationNumber: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  purchaseDate: string;
  warrantyMonths: number;
  freeReplacementMonths: number | null;
  proRataMonths: number | null;
  freeReplacementUntil: string | null;
  warrantyExpiry: string;
  status: 'ACTIVE' | 'VOID';
  orderStatus?: OrderStatus;
}

export interface Order {
  _id: string;
  orderId: string;
  customer: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  items: OrderItem[];
  vehicle: { vehicleId: string | null; label: string; registrationNumber: string };
  channel?: 'ONLINE' | 'STORE';
  fulfilment: 'DELIVERY_INSTALL' | 'STORE_PICKUP' | 'IN_STORE';
  address?: { line1: string; line2: string; city: string; state: string; pincode: string };
  paymentMethod: 'COD' | 'PAY_AT_STORE' | 'CASH' | 'UPI' | 'CARD';
  paymentStatus: 'PENDING' | 'PAID';
  itemCount: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; note: string; at: string }[];
  notes: string;
  createdAt: string;
  purchases?: Purchase[];
}

export interface Enquiry {
  _id: string;
  enquiryNumber: string;
  customer: string | null;
  name: string;
  mobile: string;
  email: string;
  orderId: string;
  product: string | { _id: string; name: string; model: string; slug: string } | null;
  productLabel: string;
  enquiryType: string;
  message: string;
  status: EnquiryStatus;
  notes: { text: string; by: string; status: string; at: string }[];
  emailStatus: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  emailError?: string;
  createdAt: string;
}

export interface SavedVehicle {
  _id: string;
  vehicle: VehicleLite & { make: string; model: string; variant: string };
  label: string;
  nickname: string;
  registrationNumber: string;
}

export interface SearchResult {
  query: string;
  heading: string;
  interpretation: {
    category: VehicleCategory | null;
    categoryLabel: string | null;
    brand: { name: string; slug: string } | null;
    capacityAh: number | null;
    nearestAh?: number[];
    vaRating?: number | null;
    nearestVa?: number[];
    terms: string[];
    vehicles: VehicleLite[];
  };
  total: number;
  groups: BrandGroup[];
}

export const ENQUIRY_TYPES = [
  'Product Enquiry',
  'Battery Problem',
  'Warranty',
  'Replacement',
  'Order Issue',
  'Installation',
  'Complaint',
  'Other',
] as const;

export type PcbOrderStatus = 'New' | 'Confirmed' | 'In progress' | 'Ready' | 'Delivered' | 'Cancelled';
export interface PcbOrder {
  _id: string;
  orderNumber: string;
  customer: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  company: string;
  product: string;
  productName: string;
  partNumber: string;
  model: string;
  brandName: string;
  quantity: number;
  notes: string;
  status: PcbOrderStatus;
  statusHistory: { status: string; note: string; by: string; at: string }[];
  emailStatus: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  createdAt: string;
}
