import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import type { Order } from '../api/types';
import { ErrorNote, Spinner } from '../components/ui';
import { date, inr, fullName, PAYMENT_LABEL } from '../lib/format';

export default function OrderConfirmed() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<{ order: Order }>(`/orders/${orderId}`).then((r) => setOrder(r.order)).catch((e) => setErr(e.message));
  }, [orderId]);

  if (err) return <div className="container-x py-10"><ErrorNote>{err}</ErrorNote></div>;
  if (!order) return <Spinner />;

  return (
    <div className="container-x max-w-3xl py-12">
      <div className="card overflow-hidden">
        <div className="bg-ink px-6 py-8 text-white">
          <CheckCircle2 className="h-10 w-10 text-volt" />
          <h1 className="mt-3 text-4xl font-bold">Order confirmed</h1>
          <p className="mt-1 text-white/80">
            Order <span className="font-mono font-semibold text-volt">{order.orderId}</span> placed on {date(order.createdAt)}. We will call +91 {order.customerMobile} to confirm.
          </p>
        </div>
        <div className="p-6">
          <h2 className="text-lg font-semibold">Batteries and warranty</h2>
          <ul className="mt-3 divide-y divide-steel">
            {order.purchases?.map((p) => (
              <li key={p._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{fullName(p.brandName, p.productName)} <span className="text-ink-300">× {p.quantity}</span></p>
                  <p className="text-sm text-ink-300">Model {p.model}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-ok">
                    <ShieldCheck className="h-4 w-4" /> {p.warrantyMonths} months warranty, valid until {date(p.warrantyExpiry)}
                    {p.freeReplacementUntil && ` (free replacement until ${date(p.freeReplacementUntil)})`}
                  </p>
                </div>
                <p className="font-semibold">{inr(p.amount)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-steel pt-4">
            <span className="font-semibold">Total ({PAYMENT_LABEL[order.paymentMethod].toLowerCase()})</span>
            <span className="font-display text-2xl font-bold">{inr(order.total)}</span>
          </div>
          <p className="mt-4 text-sm text-graphite">
            {order.fulfilment === 'STORE_PICKUP' ? 'Pick up at the shop.' : `Delivery with installation to ${[order.address?.line1, order.address?.city].filter(Boolean).join(', ')}.`}
            {order.vehicle?.label && ` Vehicle: ${order.vehicle.label}${order.vehicle.registrationNumber ? ` (${order.vehicle.registrationNumber})` : ''}.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/account/batteries" className="btn-primary">View my batteries</Link>
            <Link to="/account/orders" className="btn-outline">My orders</Link>
            <Link to="/" className="btn-ghost">Continue shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
