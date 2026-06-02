import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/lib/api';
import { formatPrice, getStatusLabel } from '../src/lib/utils';
import { useAuth } from '../src/stores/useAuth';
import { colors, radius, spacing, typography } from '../src/theme';

type TopStore = {
  id: string;
  name?: string;
  nameAr?: string;
  isActive: boolean;
  orders: number;
  revenue: number;
};

type AdminStats = {
  tenantsCount: number;
  storesCount: number;
  activeStoresCount: number;
  inactiveStoresCount: number;
  storesWithOrdersCount: number;
  ordersCount: number;
  ordersToday: number;
  deliveredOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  totalRevenue: number;
  revenueToday: number;
  statusDistribution: Record<string, number>;
  planDistribution: Record<string, number>;
  orderStatusDistribution: Record<string, number>;
  topStores: TopStore[];
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  stores?: unknown[];
  staff?: unknown[];
};

const emptyStats: AdminStats = {
  tenantsCount: 0,
  storesCount: 0,
  activeStoresCount: 0,
  inactiveStoresCount: 0,
  storesWithOrdersCount: 0,
  ordersCount: 0,
  ordersToday: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  activeOrders: 0,
  totalRevenue: 0,
  revenueToday: 0,
  statusDistribution: {},
  planDistribution: {},
  orderStatusDistribution: {},
  topStores: [],
};

export default function AdminScreen() {
  const router = useRouter();
  const session = useAuth((state) => state.session);
  const logout = useAuth((state) => state.logout);
  const [stats, setStats] = useState<AdminStats>(emptyStats);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsData, tenantsData] = await Promise.all([
        api.get('/tenants/admin/stats'),
        api.get('/tenants/admin/list'),
      ]);
      setStats({ ...emptyStats, ...(statsData as unknown as AdminStats) });
      setTenants(Array.isArray(tenantsData) ? tenantsData as Tenant[] : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!session) router.replace('/login');
    else if (session.type !== 'superadmin') router.replace('/(tabs)');
    else load();
  }, [load, router, session]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const activeStoreRate = stats.storesCount > 0
    ? Math.round((stats.activeStoresCount / stats.storesCount) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>لوحة الأدمن</Text>
          <Text style={styles.title}>مراقبة النظام</Text>
          <Text style={styles.subtitle}>الطلبات، المحلات، الإيرادات، ونشاط المستأجرين</Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.iconButton}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>إيراد اليوم</Text>
              <Text style={styles.heroValue}>{formatPrice(stats.revenueToday)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View>
              <Text style={styles.heroLabel}>إجمالي الإيرادات</Text>
              <Text style={styles.heroSubValue}>{formatPrice(stats.totalRevenue)}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <Metric icon="business-outline" label="المستأجرين" value={stats.tenantsCount} />
            <Metric icon="storefront-outline" label="المحلات" value={stats.storesCount} />
            <Metric icon="receipt-outline" label="طلبات اليوم" value={stats.ordersToday} />
            <Metric icon="flash-outline" label="طلبات جارية" value={stats.activeOrders} />
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>عمل المحلات</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeStoreRate}% نشط</Text>
              </View>
            </View>
            <ProgressBar value={activeStoreRate} />
            <View style={styles.splitRow}>
              <SmallMetric label="نشطة" value={stats.activeStoresCount} color={colors.success} />
              <SmallMetric label="غير نشطة" value={stats.inactiveStoresCount} color={colors.destructive} />
              <SmallMetric label="لديها طلبات" value={stats.storesWithOrdersCount} color={colors.accent} />
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>حالة الطلبات</Text>
            <View style={styles.statusGrid}>
              {Object.entries(stats.orderStatusDistribution).length > 0 ? (
                Object.entries(stats.orderStatusDistribution).map(([status, count]) => (
                  <View key={status} style={styles.statusPill}>
                    <Text style={styles.statusLabel}>{getStatusLabel(status)}</Text>
                    <Text style={styles.statusValue}>{count}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.mutedText}>لا توجد طلبات بعد</Text>
              )}
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>أفضل المحلات</Text>
            {stats.topStores.length > 0 ? stats.topStores.map((store) => (
              <View key={store.id} style={styles.storeRow}>
                <View style={styles.storeIcon}>
                  <Ionicons name="storefront" size={20} color={colors.primary} />
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.nameAr || store.name || 'محل'}</Text>
                  <Text style={styles.storeMeta}>{store.orders} طلبات</Text>
                </View>
                <Text style={styles.storeRevenue}>{formatPrice(store.revenue)}</Text>
              </View>
            )) : (
              <Text style={styles.mutedText}>لا توجد بيانات محلات بعد</Text>
            )}
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>آخر الحسابات</Text>
            {tenants.slice(0, 6).map((tenant) => (
              <View key={tenant.id} style={styles.tenantRow}>
                <View style={styles.tenantStatus} />
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{tenant.name}</Text>
                  <Text style={styles.storeMeta}>
                    {tenant.plan} · {tenant.status} · {tenant.stores?.length ?? 0} محلات
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SmallMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.smallMetric}>
      <Text style={[styles.smallValue, { color }]}>{value}</Text>
      <Text style={styles.smallLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(5, Math.min(100, value))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1 },
  eyebrow: { ...typography.caption, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  title: { ...typography.h2, color: '#fff', textAlign: 'right', marginTop: spacing.xs },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: spacing['4xl'] },
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  heroLabel: { ...typography.bodySm, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  heroValue: { ...typography.h2, color: '#fff', textAlign: 'right', marginTop: spacing.xs },
  heroSubValue: { ...typography.h4, color: '#fff', textAlign: 'right', marginTop: spacing.xs },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: {
    width: '48.7%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.xs,
  },
  metricValue: { ...typography.h3, color: colors.textPrimary, textAlign: 'right' },
  metricLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.md,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'right' },
  badge: {
    backgroundColor: colors.successLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: { ...typography.caption, color: colors.success, fontFamily: typography.label.fontFamily },
  progressTrack: { height: 10, borderRadius: radius.full, backgroundColor: colors.backgroundSecondary, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.accent },
  splitRow: { flexDirection: 'row', gap: spacing.sm },
  smallMetric: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  smallValue: { ...typography.h4, textAlign: 'right' },
  smallLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusPill: {
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statusLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  statusValue: { ...typography.h4, color: colors.primary, textAlign: 'right' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  storeIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: { flex: 1 },
  storeName: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  storeMeta: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
  storeRevenue: { ...typography.label, color: colors.primary },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tenantStatus: {
    width: 10,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  mutedText: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
