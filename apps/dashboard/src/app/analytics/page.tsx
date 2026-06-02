'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { formatPrice } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Clock, Package, Users, ArrowUpRight, BarChart3, Loader2,
} from 'lucide-react';

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  avgPrepMins: string;
  topProducts: Array<{ name: string; qty: string; revenue: string }>;
  hourlyBreakdown: Array<{ hour: string; orders: string }>;
}

interface DailySale {
  date: string;
  orders: string;
  revenue: string;
}

const COLORS = ['#1B4F72', '#2E86C1', '#1ABC9C', '#F39C12', '#E74C3C', '#9B59B6', '#3498DB', '#27AE60'];

export default function AnalyticsPage() {
  const { storeId } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [daily, setDaily] = useState<DailySale[]>([]);
  const [prevDaily, setPrevDaily] = useState<DailySale[]>([]);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      api.get(`/analytics/store/${storeId}/dashboard?from=${today}T00:00:00&to=${today}T23:59:59`),
      api.get(`/analytics/store/${storeId}/daily-sales?days=${range}`),
      api.get(`/analytics/store/${storeId}/daily-sales?days=${range * 2}`),
    ]).then(([d, s, prev]) => {
      setDashboard(d as unknown as DashboardData);
      setDaily(s as unknown as DailySale[]);
      const allPrev = prev as unknown as DailySale[];
      setPrevDaily(allPrev.slice(0, allPrev.length - (s as unknown as DailySale[]).length));
    }).finally(() => setLoading(false));
  }, [storeId, range]);

  const periodStats = useMemo(() => {
    const totalRevenue = daily.reduce((s, d) => s + parseFloat(d.revenue ?? '0'), 0);
    const totalOrders = daily.reduce((s, d) => s + parseInt(d.orders ?? '0', 10), 0);
    const prevRevenue = prevDaily.reduce((s, d) => s + parseFloat(d.revenue ?? '0'), 0);
    const prevOrders = prevDaily.reduce((s, d) => s + parseInt(d.orders ?? '0', 10), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersChange = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;
    return { totalRevenue, totalOrders, avgOrderValue, revenueChange, ordersChange };
  }, [daily, prevDaily]);

  const hourlyData = useMemo(() => {
    if (!dashboard?.hourlyBreakdown) return [];
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      orders: 0,
    }));
    dashboard.hourlyBreakdown.forEach((h) => {
      const idx = parseInt(h.hour, 10);
      if (idx >= 0 && idx < 24) hours[idx].orders = parseInt(h.orders, 10);
    });
    return hours.filter((h) => h.orders > 0 || (parseInt(h.hour) >= 6 && parseInt(h.hour) <= 23));
  }, [dashboard]);

  const peakHour = useMemo(() => {
    if (!hourlyData.length) return null;
    return hourlyData.reduce((max, h) => h.orders > max.orders ? h : max, hourlyData[0]);
  }, [hourlyData]);

  const topProductsPie = useMemo(() => {
    if (!dashboard?.topProducts) return [];
    return dashboard.topProducts.slice(0, 6).map((p) => ({
      name: p.name,
      value: parseInt(p.qty, 10),
      revenue: parseFloat(p.revenue),
    }));
  }, [dashboard]);

  if (loading) {
    return (
      <div className="flex min-h-screen" dir="rtl">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">التحليلات والأداء</h1>
            <p className="text-muted-foreground text-sm">نظرة شاملة على أداء متجرك</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  range === d
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-secondary text-muted-foreground hover:bg-muted'
                }`}
              >
                {d} يوم
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-0 bg-gradient-to-br from-blue-50 to-blue-100/30 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 rounded-l-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 mb-1">طلبات اليوم</p>
                <p className="text-3xl font-black text-blue-900">{dashboard?.totalOrders ?? 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/30 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500 rounded-l-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 mb-1">إيرادات اليوم</p>
                <p className="text-3xl font-black text-emerald-900">{formatPrice(dashboard?.totalRevenue ?? 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-0 bg-gradient-to-br from-amber-50 to-amber-100/30 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-1 h-full bg-amber-500 rounded-l-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 mb-1">متوسط وقت التحضير</p>
                <p className="text-3xl font-black text-amber-900">{dashboard?.avgPrepMins ?? 0}<span className="text-base font-medium mr-1">د</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-0 bg-gradient-to-br from-purple-50 to-purple-100/30 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-1 h-full bg-purple-500 rounded-l-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 mb-1">متوسط قيمة الطلب</p>
                <p className="text-3xl font-black text-purple-900">{formatPrice(periodStats.avgOrderValue)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Period comparison */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">إجمالي الإيرادات ({range} يوم)</p>
              {periodStats.revenueChange !== 0 && (
                <Badge variant={periodStats.revenueChange > 0 ? 'success' : 'destructive'} className="gap-1">
                  {periodStats.revenueChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(periodStats.revenueChange).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-2xl font-black text-foreground">{formatPrice(periodStats.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">مقارنة بالفترة السابقة: {formatPrice(prevDaily.reduce((s, d) => s + parseFloat(d.revenue ?? '0'), 0))}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">إجمالي الطلبات ({range} يوم)</p>
              {periodStats.ordersChange !== 0 && (
                <Badge variant={periodStats.ordersChange > 0 ? 'success' : 'destructive'} className="gap-1">
                  {periodStats.ordersChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(periodStats.ordersChange).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-2xl font-black text-foreground">{periodStats.totalOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">مقارنة بالفترة السابقة: {prevDaily.reduce((s, d) => s + parseInt(d.orders ?? '0', 10), 0)}</p>
          </Card>
        </div>

        {/* Revenue chart */}
        <Card className="p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">الإيرادات والطلبات اليومية</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B4F72" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B4F72" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1ABC9C" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1ABC9C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="rev" orientation="right" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="ord" orientation="left" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'revenue' ? formatPrice(v) : `${v} طلب`
                }
                labelFormatter={(l) => `التاريخ: ${l}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
              />
              <Legend formatter={(v) => v === 'revenue' ? 'الإيرادات' : 'الطلبات'} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#1B4F72" strokeWidth={2.5} fill="url(#revGradient)" />
              <Area yAxisId="ord" type="monotone" dataKey="orders" stroke="#1ABC9C" strokeWidth={2} fill="url(#ordGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {/* Top products */}
          <Card className="p-5">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> أكثر المنتجات مبيعاً
              </CardTitle>
            </CardHeader>
            {topProductsPie.length > 0 ? (
              <div className="flex gap-4">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie
                      data={topProductsPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {topProductsPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v} وحدة`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 py-2">
                  {topProductsPie.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs flex-1 truncate">{p.name}</span>
                      <span className="text-xs font-bold text-muted-foreground">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-16">لا بيانات</p>
            )}
          </Card>

          {/* Hourly distribution */}
          <Card className="p-5">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> توزيع الطلبات بالساعة
                </CardTitle>
                {peakHour && (
                  <Badge variant="accent" className="text-[10px] gap-1">
                    <ArrowUpRight className="h-3 w-3" /> ذروة: {peakHour.hour}
                  </Badge>
                )}
              </div>
            </CardHeader>
            {hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: number) => `${v} طلب`}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                    {hourlyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={peakHour && entry.hour === peakHour.hour ? '#1B4F72' : '#2E86C1'}
                        opacity={peakHour && entry.hour === peakHour.hour ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-16">لا بيانات</p>
            )}
          </Card>
        </div>

        {/* Top products table */}
        {dashboard?.topProducts && dashboard.topProducts.length > 0 && (
          <Card className="overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">تفاصيل المنتجات الأكثر مبيعاً</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">المنتج</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">الكمية المباعة</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">الإيرادات</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">النسبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboard.topProducts.map((p, i) => {
                  const totalQty = dashboard.topProducts.reduce((s, x) => s + parseInt(x.qty, 10), 0);
                  const pct = totalQty > 0 ? (parseInt(p.qty, 10) / totalQty) * 100 : 0;
                  return (
                    <tr key={p.name} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-gray-100 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium">{p.name}</td>
                      <td className="px-5 py-3 font-bold">{p.qty}</td>
                      <td className="px-5 py-3 font-bold text-primary">{formatPrice(parseFloat(p.revenue))}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </div>
  );
}
