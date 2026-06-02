import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from '@/lib/animated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { formatDate, formatPrice, getStatusLabel } from '../../src/lib/utils';
import { SavedOrder, useOrders } from '../../src/stores/useOrders';
import { colors, radius, spacing, typography } from '../../src/theme';

type OrderSummary = SavedOrder & {
  status?: string;
  itemsCount?: number;
};

export default function OrdersScreen() {
  const router = useRouter();
  const savedOrders = useOrders((state) => state.orders);
  const removeOrder = useOrders((state) => state.removeOrder);
  const [orders, setOrders] = useState<OrderSummary[]>(savedOrders);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (savedOrders.length === 0) {
      setOrders([]);
      return;
    }

    if (quiet) setRefreshing(true);
    else setLoading(true);

    const next = await Promise.all(savedOrders.map(async (saved) => {
      try {
        const fresh = await api.get(`/orders/${saved.id}`) as {
          id: string;
          orderNumber?: string;
          status?: string;
          total?: number | string;
          createdAt?: string;
          items?: unknown[];
        };
        const updated = {
          ...saved,
          orderNumber: fresh.orderNumber ?? saved.orderNumber,
          status: fresh.status,
          total: Number(fresh.total ?? saved.total ?? 0),
          createdAt: fresh.createdAt ?? saved.createdAt,
          itemsCount: fresh.items?.length ?? 0,
        };
        return updated;
      } catch {
        return saved;
      }
    }));

    setOrders(next);
    setLoading(false);
    setRefreshing(false);
  }, [savedOrders]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = useMemo(
    () => orders.filter((order) => order.status && !['delivered', 'cancelled'].includes(order.status)).length,
    [orders],
  );

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.eyebrow}>متابعة الاستلام</Text>
        <Text style={styles.title}>طلباتي</Text>
        <Text style={styles.subtitle}>{activeCount > 0 ? `${activeCount} طلب قيد التنفيذ` : 'كل طلباتك الحديثة في مكان واحد'}</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          showsVerticalScrollIndicator={false}
        >
          {orders.length > 0 ? orders.map((order, index) => (
            <Animated.View key={order.id} entering={FadeInUp.delay(index * 70)}>
              <Pressable style={styles.orderCard} onPress={() => router.push(`/order/${order.id}`)}>
                <View style={styles.orderTop}>
                  <View style={styles.orderText}>
                    <Text style={styles.orderNumber}>{order.orderNumber ?? 'طلب جديد'}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{order.status ? getStatusLabel(order.status) : 'محفوظ'}</Text>
                  </View>
                </View>
                <View style={styles.orderBottom}>
                  <View style={styles.metaPill}>
                    <Ionicons name="cube-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{order.itemsCount ?? 0} منتجات</Text>
                  </View>
                  <Text style={styles.total}>{formatPrice(Number(order.total ?? 0))}</Text>
                </View>
                <View style={styles.actions}>
                  <Text style={styles.trackText}>عرض التتبع</Text>
                  <Pressable onPress={() => removeOrder(order.id)} style={styles.removeButton}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          )) : (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>لا توجد طلبات بعد</Text>
              <Text style={styles.emptyDesc}>ابحث عن متجر قريب وأرسل أول طلب استلام من السيارة.</Text>
              <Pressable onPress={() => router.push('/(tabs)/search')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>البحث عن متجر</Text>
                <Ionicons name="search" size={18} color="#fff" />
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  eyebrow: { ...typography.caption, color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  title: { ...typography.h2, color: '#fff', textAlign: 'center', marginTop: spacing.xs },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.76)', textAlign: 'center', marginTop: spacing.xs },
  content: { padding: spacing.base, paddingBottom: spacing['4xl'], gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing['5xl'], gap: spacing.md },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  orderText: { flex: 1 },
  orderNumber: { ...typography.h4, color: colors.textPrimary, textAlign: 'right' },
  orderDate: { ...typography.caption, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  statusBadge: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: { ...typography.caption, color: colors.primary, fontFamily: typography.label.fontFamily },
  orderBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.caption, color: colors.textSecondary },
  total: { ...typography.h4, color: colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackText: { ...typography.buttonSm, color: colors.accent },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.md,
  },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  emptyDesc: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: { ...typography.buttonSm, color: '#fff' },
});
