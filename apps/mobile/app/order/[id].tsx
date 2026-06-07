import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  type?: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  createdAt: string;
  estimatedMins?: number;
  rawRequest?: string;
  customerId?: string;
  items: OrderItem[];
  parkingSpot?: { spotNumber?: string };
  vehicle?: { make?: string; model?: string; color?: string; plateNumber?: string };
};

const PAYMENT_METHODS = [
  { label: 'الدفع عند الاستلام', value: 'cash', icon: 'cash-outline' as const },
];

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
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

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
        storeName: '',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addOrder, id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 10s for active orders
  useEffect(() => {
    if (!order) return;
    const active = ['pending_payment', 'pending_quote', 'pending_approval', 'new', 'accepted', 'preparing', 'ready'];
    if (!active.includes(order.status)) return;
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, [order?.status, load]);

  const handleApproveQuote = async () => {
    if (!order) return;
    setApproving(true);
    try {
      await api.post(`/orders/${order.id}/approve-quote`, {
        paymentMethod: selectedPayment,
      });
      Alert.alert('تم التأكيد', 'تم تأكيد الطلب بنجاح وسيبدأ المحل بالتحضير');
      load(true);
    } catch {
      Alert.alert('خطأ', 'فشل تأكيد الطلب، حاول مجدداً');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectQuote = () => {
    if (!order) return;
    Alert.alert(
      'رفض التسعير',
      'هل أنت متأكد من رفض التسعير وإلغاء الطلب؟',
      [
        { text: 'لا، رجوع', style: 'cancel' },
        {
          text: 'نعم، إلغاء الطلب',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true);
            try {
              await api.post(`/orders/${order.id}/reject-quote`, {});
              Alert.alert('تم الإلغاء', 'تم إلغاء الطلب');
              load(true);
            } catch {
              Alert.alert('خطأ', 'فشل إلغاء الطلب');
            } finally {
              setRejecting(false);
            }
          },
        },
      ],
    );
  };

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
        {/* Status card */}
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

        {/* PENDING_QUOTE — waiting for store to price */}
        {order.status === 'pending_quote' && (
          <View style={styles.waitingCard}>
            <View style={styles.waitingIcon}>
              <Ionicons name="time-outline" size={28} color={colors.warning} />
            </View>
            <Text style={styles.waitingTitle}>بانتظار تسعير المحل</Text>
            <Text style={styles.waitingDesc}>
              قائمتك تحتوي على عناصر تحتاج تسعير. سيقوم المحل بإدخال الأسعار وإرسالها لك للموافقة.
            </Text>
          </View>
        )}

        {/* PENDING_PAYMENT — waiting for payment */}
        {order.status === 'pending_payment' && (
          <View style={styles.waitingCard}>
            <View style={styles.waitingIcon}>
              <Ionicons name="card-outline" size={28} color={colors.warning} />
            </View>
            <Text style={styles.waitingTitle}>بانتظار الدفع</Text>
            <Text style={styles.waitingDesc}>
              يرجى إكمال عملية الدفع لإرسال الطلب للمحل.
            </Text>
          </View>
        )}

        {/* PENDING_APPROVAL — customer must approve the quote */}
        {order.status === 'pending_approval' && (
          <View style={styles.approvalCard}>
            <View style={styles.approvalHeader}>
              <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
              <Text style={styles.approvalTitle}>السعر النهائي جاهز!</Text>
            </View>
            <Text style={styles.approvalDesc}>
              قام المحل بتسعير عناصر القائمة. راجع الأسعار ووافق لبدء التحضير.
            </Text>

            {/* Quoted items */}
            <View style={styles.quotedItems}>
              {order.items.map((item) => (
                <View key={item.id} style={styles.quotedItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quotedItemName}>
                      {item.nameArSnapshot || item.nameSnapshot}
                    </Text>
                    <Text style={styles.quotedItemQty}>
                      {item.quantity} × {formatPrice(Number(item.priceSnapshot))}
                    </Text>
                  </View>
                  <Text style={styles.quotedItemTotal}>
                    {formatPrice(Number(item.priceSnapshot) * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>الإجمالي</Text>
              <Text style={styles.totalValue}>{formatPrice(Number(order.total))}</Text>
            </View>

            {/* Payment method selection */}
            <Text style={styles.paymentLabel}>اختر طريقة الدفع:</Text>
            <View style={styles.paymentGrid}>
              {PAYMENT_METHODS.map((m) => (
                <Pressable
                  key={m.value}
                  onPress={() => setSelectedPayment(m.value)}
                  style={[
                    styles.paymentOption,
                    selectedPayment === m.value && styles.paymentOptionActive,
                  ]}
                >
                  <Ionicons
                    name={m.icon}
                    size={18}
                    color={selectedPayment === m.value ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      selectedPayment === m.value && styles.paymentOptionTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Approve / Reject buttons */}
            <Pressable
              onPress={handleApproveQuote}
              disabled={approving}
              style={styles.approveButton}
            >
              {approving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.approveText}>
                    أوافق — {formatPrice(Number(order.total))}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleRejectQuote}
              disabled={rejecting}
              style={styles.rejectButton}
            >
              <Text style={styles.rejectText}>
                {rejecting ? '...' : 'لا أوافق — إلغاء الطلب'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Raw request for free-text orders */}
        {order.rawRequest ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>قائمة الطلب</Text>
            <Text style={styles.rawRequestText}>{order.rawRequest}</Text>
          </View>
        ) : null}

        {/* Stepper — only show for orders past the quote phase */}
        {!['pending_quote', 'pending_payment', 'pending_approval'].includes(order.status) && (
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
        )}

        {/* Parking & Vehicle */}
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

        {/* Order items — show when not in approval state (approval shows its own items) */}
        {order.status !== 'pending_approval' && order.items.length > 0 && (
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
            <Summary label="الإجمالي" value={formatPrice(Number(order.total ?? 0))} strong />
          </View>
        )}
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
    width: 42, height: 42, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerText: { flex: 1 },
  eyebrow: { ...typography.caption, color: 'rgba(255,255,255,0.72)', textAlign: 'right' },
  title: { ...typography.h2, color: '#fff', textAlign: 'right' },
  subtitle: { ...typography.caption, color: 'rgba(255,255,255,0.72)', textAlign: 'right' },
  content: { padding: spacing.base, paddingBottom: spacing['4xl'], gap: spacing.base },

  // Status card
  statusCard: {
    backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: spacing.base,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  statusIcon: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
  },
  statusText: { flex: 1 },
  statusLabel: { ...typography.caption, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  statusValue: { ...typography.h4, color: '#fff', textAlign: 'right' },
  etaBadge: { borderRadius: radius.full, backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  etaText: { ...typography.caption, color: '#fff', fontFamily: typography.label.fontFamily },

  // Waiting card (pending_quote / pending_payment)
  waitingCard: {
    backgroundColor: '#FFF8E1', borderRadius: radius.xl, padding: spacing.xl,
    borderWidth: 2, borderColor: '#FFD54F', alignItems: 'center', gap: spacing.md,
  },
  waitingIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFF3C4', alignItems: 'center', justifyContent: 'center',
  },
  waitingTitle: { ...typography.h4, color: '#F57F17', textAlign: 'center' },
  waitingDesc: { ...typography.bodySm, color: '#795548', textAlign: 'center', lineHeight: 22 },

  // Approval card (pending_approval)
  approvalCard: {
    backgroundColor: '#E8F5E9', borderRadius: radius.xl, padding: spacing.xl,
    borderWidth: 2, borderColor: '#81C784', gap: spacing.md,
  },
  approvalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center' },
  approvalTitle: { ...typography.h4, color: '#2E7D32', textAlign: 'center' },
  approvalDesc: { ...typography.bodySm, color: '#4E342E', textAlign: 'center', lineHeight: 22 },

  // Quoted items
  quotedItems: { gap: spacing.sm },
  quotedItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: '#C8E6C9',
  },
  quotedItemName: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  quotedItemQty: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
  quotedItemTotal: { ...typography.label, color: '#2E7D32' },

  // Total
  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#C8E6C9', borderRadius: radius.lg, padding: spacing.md,
  },
  totalLabel: { ...typography.label, color: '#1B5E20' },
  totalValue: { ...typography.h3, color: '#1B5E20' },

  // Payment
  paymentLabel: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paymentOption: {
    width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 2, borderColor: '#E0E0E0', paddingVertical: spacing.md,
  },
  paymentOptionActive: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  paymentOptionText: { ...typography.bodySm, color: colors.textSecondary },
  paymentOptionTextActive: { color: colors.primary, fontFamily: typography.label.fontFamily },

  // Buttons
  approveButton: {
    backgroundColor: '#2E7D32', borderRadius: radius.lg, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  approveText: { ...typography.buttonSm, color: '#fff', fontSize: 15 },
  rejectButton: {
    backgroundColor: 'transparent', borderRadius: radius.lg, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectText: { ...typography.bodySm, color: '#D32F2F' },

  // Raw request
  rawRequestText: { ...typography.bodySm, color: colors.textPrimary, textAlign: 'right', lineHeight: 24 },

  // Panel
  panel: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight, padding: spacing.base, gap: spacing.md,
  },
  panelTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'right' },
  timeline: { gap: spacing.base },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: {
    width: 38, height: 38, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary,
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
