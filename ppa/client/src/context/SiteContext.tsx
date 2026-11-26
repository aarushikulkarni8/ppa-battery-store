import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';

/** Site-wide settings from the server (ONLINE_SHOP in server/.env). */
export interface SiteSettings {
  /** true = prices, cart and checkout are on; false = catalogue with enquiries only */
  onlineShop: boolean;
  loaded: boolean;
}

const SiteCtx = createContext<SiteSettings>({ onlineShop: false, loaded: false });
export const useSite = () => useContext(SiteCtx);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteSettings>({ onlineShop: false, loaded: false });
  useEffect(() => {
    api<{ onlineShop: boolean }>('/site')
      .then((r) => setSite({ onlineShop: r.onlineShop, loaded: true }))
      .catch(() => setSite({ onlineShop: false, loaded: true }));
  }, []);
  return <SiteCtx.Provider value={site}>{children}</SiteCtx.Provider>;
}

/** Cart and checkout pages only exist when online ordering is on. */
export function ShopOnly({ children }: { children: ReactNode }) {
  const { onlineShop, loaded } = useSite();
  if (!loaded) return null;
  return onlineShop ? <>{children}</> : <Navigate to="/" replace />;
}
