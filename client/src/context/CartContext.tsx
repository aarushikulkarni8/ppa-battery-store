import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Product } from '../api/types';
import { useAuth } from './AuthContext';

export interface CartLine {
  product: Product;
  quantity: number;
}
interface CartData {
  items: CartLine[];
  subtotal: number;
  count: number;
}
interface CartState extends CartData {
  loading: boolean;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  add: (productId: string, quantity?: number) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
}

const empty: CartData = { items: [], subtotal: 0, count: 0 };
const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const [data, setData] = useState<CartData>(empty);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!customer) return setData(empty);
    setLoading(true);
    try {
      setData(await api<CartData>('/cart'));
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setQuantity = useCallback(async (productId: string, quantity: number) => {
    setData(await api<CartData>('/cart/items', { method: 'PUT', body: { productId, quantity } }));
  }, []);

  const add = useCallback(
    async (productId: string, quantity = 1) => {
      const current = data.items.find((i) => i.product._id === productId)?.quantity ?? 0;
      await setQuantity(productId, Math.min(20, current + quantity));
    },
    [data.items, setQuantity],
  );

  const clear = useCallback(async () => {
    setData(await api<CartData>('/cart', { method: 'DELETE' }));
  }, []);

  return <CartCtx.Provider value={{ ...data, loading, setQuantity, add, clear, reload }}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const v = useContext(CartCtx);
  if (!v) throw new Error('useCart outside CartProvider');
  return v;
}
