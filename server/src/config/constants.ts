export const VEHICLE_CATEGORIES = [
  'TWO_WHEELER',
  'THREE_WHEELER',
  'FOUR_WHEELER',
  'COMMERCIAL',
  'TRACTOR',
  'INVERTER',
  'PCB',
  'OTHER',
] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

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

export const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

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

export const ENQUIRY_STATUSES = ['New', 'In Progress', 'Resolved', 'Closed'] as const;
