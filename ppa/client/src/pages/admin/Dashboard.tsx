import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, IndianRupee, CalendarRange, BatteryCharging, AlertTriangle, Clock, MessageSquareText, CircuitBoard } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import type { OrderStatus } from '../../api/types';
import { ErrorNote, Spinner, StatusPill } from '../../components/ui';
import { dateTime, inr } from '../../lib/format';
import { PageHead } from './AdminLayout';

interface Stats {
  totalCustomers: number;
  totalOrders: number;
  todaySales: number;
  todayOrders: number;
  monthlySales: number;
  monthlyOrders: number;
  totalProducts: number;
  lowStockCount: number;
  pendingOrders: number;
  pcbOpen: number;
  openEnquiries: number;
  series: { date: string; total: number; orders: number }[];
  byBrand: { brand: string; total: number; units: number }[];
  lowStock: { _id: string; productId: string; name: string; model: string; sku: string; quantity: number; lowStockThreshold: number }[];
  recentOrders: { _id: string; orderId: string; customerName: string; customerMobile: string; total: number; status: OrderStatus; createdAt: string }[];
}

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<Stats>('/admin/stats').then(setS).catch((e) => setErr(e.message));
  }, []);
  if (err) return <ErrorNote>{err}</ErrorNote>;
  if (!s) return <Spinner />;

  const tiles = [
    { label: 'Total customers', value: s.totalCustomers, icon: Users, to: '/admin/customers' },
    { label: 'Total orders', value: s.totalOrders, icon: Package, to: '/admin/orders' },
    { label: "Today's sales", value: inr(s.todaySales), sub: `${s.todayOrders} orders`, icon: IndianRupee, to: '/admin/orders' },
    { label: 'Monthly sales', value: inr(s.monthlySales), sub: `${s.monthlyOrders} orders this month`, icon: CalendarRange, to: '/admin/orders' },
    { label: 'Total products', value: s.totalProducts, sub: 'active', icon: BatteryCharging, to: '/admin/products' },
    { label: 'Low stock', value: s.lowStockCount, icon: AlertTriangle, to: '/admin/products?lowStock=1', warn: s.lowStockCount > 0 },
    { label: 'Pending orders', value: s.pendingOrders, icon: Clock, to: '/admin/orders?status=PLACED', warn: s.pendingOrders > 0 },
    { label: 'Open enquiries', value: s.openEnquiries, icon: MessageSquareText, to: '/admin/enquiries?status=New', warn: s.openEnquiries > 0 },
    { label: 'Open PCB orders', value: s.pcbOpen ?? 0, icon: CircuitBoard, to: '/admin/pcb-orders', warn: (s.pcbOpen ?? 0) > 0 },
  ];

  return (
    <div>
      <PageHead title="Dashboard" sub="Sales exclude cancelled orders. Times are IST." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, sub, icon: Icon, to, warn }) => (
          <Link key={label} to={to} className="card flex items-start gap-3 p-4 hover:border-ink">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${warn ? 'bg-volt text-ink' : 'bg-steel text-ink'}`}><Icon className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm text-graphite">{label}</span>
              <span className="block font-display text-3xl font-bold leading-tight">{value}</span>
              {sub && <span className="block text-xs text-ink-300">{sub}</span>}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Sales, last 30 days</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.series} margin={{ left: 8, right: 8 }}>
                <defs>
                  <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#FFC629" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#FFC629" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E6EAF1" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8) + '/' + d.slice(5, 7)} fontSize={12} stroke="#8C98B3" />
                <YAxis fontSize={12} stroke="#8C98B3" tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip formatter={(v: number, n: string) => (n === 'total' ? [inr(v), 'Sales'] : [v, 'Orders'])} />
                <Area type="monotone" dataKey="total" stroke="#14213D" strokeWidth={2} fill="url(#g)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Sales by brand, this month</h2>
          {s.byBrand.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.byBrand} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="brand" fontSize={13} width={70} stroke="#3A4150" />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Bar dataKey="total" fill="#14213D" radius={[0, 4, 4, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-300">No sales yet this month.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-semibold hover:underline">All orders</Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="table-base">
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td><Link to={`/admin/orders/${o.orderId}`} className="font-mono text-xs font-semibold hover:underline">{o.orderId}</Link><br /><span className="text-xs text-ink-300">{dateTime(o.createdAt)}</span></td>
                    <td>{o.customerName}<br /><span className="text-xs text-ink-300">{o.customerMobile}</span></td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="text-right font-semibold">{inr(o.total)}</td>
                  </tr>
                ))}
                {!s.recentOrders.length && <tr><td className="text-ink-300">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold">Low stock</h2>
          <p className="text-xs text-ink-300">Products with an online price, at or below their alert level</p>
          <div className="mt-3 overflow-x-auto">
            <table className="table-base">
              <tbody>
                {s.lowStock.map((p) => (
                  <tr key={p._id}>
                    <td><Link to={`/admin/products/${p.productId}`} className="font-semibold hover:underline">{p.name}</Link><br /><span className="text-xs text-ink-300">{p.model} · {p.sku}</span></td>
                    <td className="text-right"><span className={`font-display text-xl font-bold ${p.quantity === 0 ? 'text-plus' : ''}`}>{p.quantity}</span><span className="text-xs text-ink-300"> / min {p.lowStockThreshold}</span></td>
                  </tr>
                ))}
                {!s.lowStock.length && <tr><td className="text-ink-300">All products above their threshold.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
