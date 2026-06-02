import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { formatDate, formatPrice, getStatusLabel } from '../../src/lib/utils';
import { useOrders } from '../../src/stores/useOrders';
import { colors, radius, spacing, typography } from '../../src/theme';

type OrderItem = {
  id: string;
  nameArSnapshot?: string;
  nameSnapshot?: string;
  priceSnapshot: number | string;
  quantity: number;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  createdAt: string;
  estimatedMins?: number;
  items: OrderItem[];
  parkingSpot?: { spotNumber?: string };
  vehicle?: { make?: string; model?: string; color?: string; plateNumber?: string };
};

const steps = [
  { status: 'new', label: 'استلمنا الطلب', icon: 'receipt-outline' },
  { status: 'accepted', label: 'تم القبول', icon: 'checkmark-circle-outline' },
  { status: 'preparing', label: 'قيد التحضير', icon: 'restaurant-outline' },
  { status: 'ready', label: 'جاهز للاستلام', icon: 'bag-check-outline' },
  { status: 'delivered', label: 'تم التسليم', icon: 'car-outline' },
] as const;

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addOrder = useOrders((state) => state.addOrder);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!id) return;
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.get(`/orders/${id}`) as Order;
      setOrder(data);
      addOrder({
        id: data.id,
        orderNumber: data.orderNumber,
        total: Number(data.total ?? 0),
        createdAt: data.createdAt,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addOrder, id]);

  useEffect(() => {
    load();
  }, [load]);

  const currentIndex = useMemo(() => {
    if (!order) return -1;
    return steps.findIndex((step) => step.status === order.status);
  }, [order]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={58} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>تعذر تحميل الطلب</Text>
        <Pressable onPress={() => load()} style={styles.retryButton}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>طلب رقم</Text>
          <Text style={styles.title}>{order.orderNumber}</Text>
          <Text style={styles.subtitle}>{formatDate(order.createdAt)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="pulse-outline" size={24} color="#fff" />
          </View>
          <View style={styles.statusText}>
            <Text style={styles.statusLabel}>الحالة الحالية</Text>
            <Text style={styles.statusValue}>{getStatusLabel(order.status)}</Text>
          </View>
          {order.estimatedMins ? (
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>{order.estimatedMins} د</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>تتبع الطلب</Text>
          <View style={styles.timeline}>
            {steps.map((step, index) => {
              const done = index <= currentIndex;
              const active = index === currentIndex;
              return (
                <View key={step.status} style={styles.stepRow}>
                  <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                    <Ionicons name={step.icon} size={17} color={done ? '#fff' : colors.textMuted} />
                  </View>
                  <Text style={[styles.stepText, done && styles.stepTextDone]}>{step.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {(order.parkingSpot || order.vehicle) ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>بيانات الاستلام</Text>
            {order.parkingSpot ? (
              <InfoLine icon="location-outline" label="الموقف" value={order.parkingSpot.spotNumber ?? 'غير محدد'} />
            ) : null}
            {order.vehicle ? (
              <InfoLine
                icon="car-outline"
                label="السيارة"
                value={`${order.vehicle.color ?? ''} ${order.vehicle.make ?? ''} ${order.vehicle.model ?? ''} - ${order.vehicle.plateNumber ?? ''}`}
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>المنتجات</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.nameArSnapshot || item.nameSnapshot}</Text>
                <Text style={styles.itemQty}>الكمية {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(Number(item.priceSnapshot) * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Summary label="المجموع" value={formatPrice(Number(order.subtotal ?? 0))} />
          <Summary label="الضريبة" value={formatPrice(Number(order.tax ?? 0))} />
          <Summary label="الإجمالي" value={formatPrice(Number(order.total ?? 0))} strong />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 58,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerText: { flex: 1 },
  eyebrow: { ...typography.caption, color: 'rgba(255,255,255,0.72)', textAlign: 'right' },
  title: { ...typography.h2, color: '#fff', textAlign: 'right' },
  subtitle: { ...typography.caption, color: 'rgba(255,255,255,0.72)', textAlign: 'right' },
  content: { padding: spacing.base, paddingBottom: spacing['4xl'], gap: spacing.base },
  statusCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { flex: 1 },
  statusLabel: { ...typography.caption, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  statusValue: { ...typography.h4, color: '#fff', textAlign: 'right' },
  etaBadge: { borderRadius: radius.full, backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  etaText: { ...typography.caption, color: '#fff', fontFamily: typography.label.fontFamily },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.md,
  },
  panelTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'right' },
  timeline: { gap: spacing.base },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  stepDotDone: { backgroundColor: colors.primary },
  stepDotActive: { backgroundColor: colors.accent },
  stepText: { ...typography.bodySm, color: colors.textMuted, flex: 1, textAlign: 'right' },
  stepTextDone: { color: colors.textPrimary, fontFamily: typography.label.fontFamily },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoText: { flex: 1 },
  infoLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  infoValue: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  itemInfo: { flex: 1 },
  itemName: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  itemQty: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  itemPrice: { ...typography.label, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.borderLight },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { ...typography.bodySm, color: colors.textSecondary },
  summaryValue: { ...typography.bodySm, color: colors.textPrimary },
  summaryStrong: { ...typography.h4, color: colors.textPrimary },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  retryButton: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  retryText: { ...typography.buttonSm, color: '#fff' },
});
