import crypto from 'node:crypto';

function stamp() {
  const ist = new Date(Date.now() + 330 * 60 * 1000);
  const yy = String(ist.getUTCFullYear()).slice(2);
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}
const rand = (n: number) =>
  Array.from(crypto.randomBytes(n), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

export const newOrderId = () => `PPA-${stamp()}-${rand(5)}`;
export const newPcbOrderNumber = () => `PCB-${stamp()}-${rand(4)}`;
export const newEnquiryNumber = () => `ENQ-${stamp()}-${rand(4)}`;
