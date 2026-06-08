import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from '@/lib/animated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { formatDate, formatPrice, getStatusLabel } from '../../src/lib/utils';
import { useAuth } from '../../src/stores/useAuth';
import { useOrders } from '../../src/stores/useOrders';
import { colors, radius, spacing, typography } from '../../src/theme';

type OrderFromAPI = {
  id: string;
  orderNumber: string;
  status: string;
  type?: string;
  total: number | string;
  createdAt: string;
  rawRequest?: string;
  items?: { id: string }[];
  store?: { nameAr?: string; name?: string };
};

export default function OrdersScreen() {
  const router = useRouter();
  const session = useAuth((state) => state.session);
  const addOrder = useOrders((state) => state.addOrder);
  const [orders, setOrders] = useState<OrderFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!session) {
      setOrders([]);
      setLoading(false);
      return;
    }

    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.get('/orders/my?limit=30') as { items?: OrderFromAPI[] } | OrderFromAPI[];
      const list = Array.isArray(data) ? data : data.items ?? [];
      setOrders(list);

      // Sync to local store
      for (const o of list) {
        addOrder({
          id: o.id,
          orderNumber: o.orderNumber,
          total: Number(o.total ?? 0),
          createdAt: o.createdAt,
          storeName: o.store?.nameAr ?? o.store?.name,
        });
      }
    } catch {
      // Fallback: if API fails, keep whatever we have
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, addOrder]);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = useMemo(
    () => orders.filter((o) => o.status && !['delivered', 'cancelled'].includes(o.status)).length,
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
                    {order.store?.nameAr ? (
                      <Text style={styles.storeName}>{order.store.nameAr}</Text>
                    ) : null}
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    order.status === 'delivered' && styles.statusDelivered,
                    order.status === 'cancelled' && styles.statusCancelled,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      order.status === 'delivered' && styles.statusTextDelivered,
                      order.status === 'cancelled' && styles.statusTextCancelled,
                    ]}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>
                <View style={styles.orderBottom}>
                  <View style={styles.metaPill}>
                    <Ionicons name={order.type === 'free_text' ? 'document-text-outline' : 'cube-outline'} size={16} color={colors.textSecondary} />
                    <Text style={styles.metaText}>
                      {order.type === 'free_text' ? 'قائمة حرة' : `${order.items?.length ?? 0} منتجات`}
                    </Text>
                  </View>
                  <Text style={styles.total}>{formatPrice(Number(order.total ?? 0))}</Text>
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
  storeName: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
  orderDate: { ...typography.caption, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  statusBadge: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusDelivered: { backgroundColor: '#E8F5E9' },
  statusCancelled: { backgroundColor: '#FFEBEE' },
  statusText: { ...typography.caption, color: colors.primary, fontFamily: typography.label.fontFamily },
  statusTextDelivered: { color: '#2E7D32' },
  statusTextCancelled: { color: '#C62828' },
  orderBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.caption, color: colors.textSecondary },
  total: { ...typography.h4, color: colors.primary },
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
