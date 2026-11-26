import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import type { Product } from '../api/types';

export function useBuy() {
  const cart = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const { customer } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  async function addToCart(p: Product, qty = 1) {
    if (!customer) return nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`);
    setBusy(`add-${p._id}`);
    try {
      await cart.add(p._id, qty);
      toast(`${p.name} added to cart`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  function buyNow(p: Product, qty = 1) {
    nav(`/checkout?buy=${p._id}&qty=${qty}`);
  }

  return { addToCart, buyNow, busy };
}
