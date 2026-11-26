import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ProductImage } from '../components/BatteryArt';
import { WarrantyBadge } from '../components/Warranty';
import { Empty, Spinner } from '../components/ui';
import { inr, specLine } from '../lib/format';

export default function Cart() {
  const cart = useCart();
  const toast = useToast();
  const nav = useNavigate();

  async function setQty(id: string, q: number) {
    try {
      await cart.setQuantity(id, q);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  if (cart.loading && !cart.items.length) return <Spinner />;

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-bold">Your cart</h1>
      {cart.items.length === 0 ? (
        <div className="mt-8">
          <Empty title="Your cart is empty" action={<Link to="/" className="btn-primary">Shop batteries</Link>}>
            Search by vehicle or battery capacity to find the right battery.
          </Empty>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4">
            {cart.items.map(({ product: p, quantity }) => {
              const unavailable = p.sellingPrice == null || p.stock <= 0 || !p.isActive;
              return (
                <li key={p._id} className="card flex flex-col gap-4 p-4 sm:flex-row">
                  <Link to={`/product/${p.slug}`} className="shrink-0 rounded-md bg-steel-50 p-2 sm:w-36">
                    <ProductImage product={p} className="mx-auto h-28 w-full" />
                  </Link>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: p.brand.accentColor }}>{p.brand.name}</p>
                        <Link to={`/product/${p.slug}`} className="font-display text-xl font-semibold hover:underline">{p.name}</Link>
                        <p className="text-sm text-ink-300">Model {p.model}, {specLine(p)}</p>
                      </div>
                      <p className="font-display text-xl font-bold">{inr((p.sellingPrice ?? 0) * quantity)}</p>
                    </div>
                    <WarrantyBadge warranty={p.warranty} />
                    {unavailable && <p className="text-sm font-semibold text-plus">Currently unavailable. Remove it to check out.</p>}
                    {!unavailable && p.stock < quantity && <p className="text-sm font-semibold text-plus">Only {p.stock} left in stock</p>}
                    <div className="mt-auto flex items-center gap-3">
                      <div className="flex items-center rounded-md border border-steel">
                        <button className="px-3 py-2 disabled:opacity-40" aria-label="Decrease" disabled={quantity <= 1} onClick={() => setQty(p._id, quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
                        <button className="px-3 py-2 disabled:opacity-40" aria-label="Increase" disabled={quantity >= Math.min(20, p.stock)} onClick={() => setQty(p._id, quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-sm text-ink-300">{inr(p.sellingPrice)} each</span>
                      <button className="btn-ghost ml-auto px-2 text-plus" onClick={() => setQty(p._id, 0)}>
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside className="card h-fit p-5 lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Items</dt><dd>{cart.count}</dd></div>
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(cart.subtotal)}</dd></div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-steel pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-3xl font-bold">{inr(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-300">Prices include taxes. Pay on delivery or at the shop.</p>
            <button
              className="btn-volt mt-5 w-full"
              disabled={cart.items.some(({ product: p, quantity }) => p.sellingPrice == null || p.stock < quantity || !p.isActive)}
              onClick={() => nav('/checkout')}
            >
              <ShoppingCart className="h-4 w-4" /> Proceed to checkout <ArrowRight className="h-4 w-4" />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
