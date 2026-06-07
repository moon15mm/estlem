import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/lib/api';
import { formatPrice } from '../src/lib/utils';
import { useAuth } from '../src/stores/useAuth';
import { useCart } from '../src/stores/useCart';
import { useOrders } from '../src/stores/useOrders';
import { colors, radius, spacing, typography } from '../src/theme';

type PaymentMethod = 'mada' | 'card' | 'apple_pay' | 'cash';

const PAYMENT_OPTIONS: Array<{ label: string; value: PaymentMethod; icon: keyof typeof Ionicons.glyphMap }> = [
  { label: 'مدى', value: 'mada', icon: 'card-outline' },
  { label: 'بطاقة', value: 'card', icon: 'card' },
  { label: 'Apple Pay', value: 'apple_pay', icon: 'logo-apple' },
  { label: 'عند الاستلام', value: 'cash', icon: 'cash-outline' },
];

export default function CartScreen() {
  const router = useRouter();
  const session = useAuth((state) => state.session);
  const { items, storeId, tenantId, parkingSpotId, updateQuantity, removeItem, clearCart, total } = useCart();
  const addOrder = useOrders((state) => state.addOrder);
  const customer = session?.type === 'customer'
    ? session.user as { fullName?: string | null; mobile?: string }
    : null;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: customer?.fullName ?? '',
    mobile: customer?.mobile ?? '',
    make: '',
    model: '',
    color: '',
    plateNumber: '',
    notes: '',
    paymentMethod: 'mada' as PaymentMethod,
  });

  const subtotal = total();
  const grandTotal = subtotal;

  const submit = async () => {
    if (!storeId || !tenantId || items.length === 0) {
      Alert.alert('السلة فارغة', 'اختر منتجات من المتجر قبل تأكيد الطلب.');
      return;
    }
    if (!form.fullName.trim() || form.mobile.trim().length < 9) {
      Alert.alert('بيانات ناقصة', 'أدخل الاسم ورقم الجوال لإتمام الطلب.');
      return;
    }

    setLoading(true);
    try {
      const vehicleReady = form.make.trim() || form.model.trim() || form.color.trim() || form.plateNumber.trim();
      const order = await api.post('/orders', {
        storeId,
        tenantId,
        parkingSpotId: parkingSpotId ?? undefined,
        type: 'catalog',
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          nameSnapshot: item.name,
          nameArSnapshot: item.nameAr,
          priceSnapshot: item.price,
          quantity: item.quantity,
        })),
        customer: {
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          vehicle: vehicleReady
            ? {
                make: form.make.trim() || 'غير محدد',
                model: form.model.trim() || 'غير محدد',
                color: form.color.trim() || 'غير محدد',
                plateNumber: form.plateNumber.trim() || 'غير محدد',
              }
            : undefined,
        },
      }) as { id: string; orderNumber?: string; total?: number; createdAt?: string };

      addOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total ?? grandTotal),
        createdAt: order.createdAt ?? new Date().toISOString(),
      });
      clearCart();
      if (form.paymentMethod !== 'cash') {
        // Electronic payment — go to payment page
        router.replace(`/pay/${order.id}`);
      } else {
        router.replace(`/order/${order.id}`);
      }
    } catch {
      Alert.alert('تعذر إرسال الطلب', 'تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>السلة</Text>
          <Text style={styles.subtitle}>{items.length} منتج جاهز للإرسال</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>السلة فارغة</Text>
            <Text style={styles.emptyDesc}>ارجع للمتجر وأضف المنتجات التي تريد استلامها من السيارة.</Text>
          </View>
        ) : (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>المنتجات</Text>
              {items.map((item) => (
                <View key={item.productId} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.nameAr}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                  </View>
                  <View style={styles.qtyControl}>
                    <Pressable onPress={() => updateQuantity(item.productId, item.quantity - 1)} style={styles.qtyButton}>
                      <Ionicons name="remove" size={18} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable onPress={() => updateQuantity(item.productId, item.quantity + 1)} style={styles.qtyButton}>
                      <Ionicons name="add" size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => removeItem(item.productId)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>بيانات الاستلام</Text>
              <TextInput
                value={form.fullName}
                onChangeText={(fullName) => setForm({ ...form, fullName })}
                placeholder="الاسم الكامل"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                textAlign="right"
              />
              <TextInput
                value={form.mobile}
                onChangeText={(mobile) => setForm({ ...form, mobile })}
                placeholder="رقم الجوال"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.input}
                textAlign="right"
              />
              <View style={styles.vehicleGrid}>
                <TextInput value={form.make} onChangeText={(make) => setForm({ ...form, make })} placeholder="الماركة" placeholderTextColor={colors.textMuted} style={styles.smallInput} textAlign="right" />
                <TextInput value={form.model} onChangeText={(model) => setForm({ ...form, model })} placeholder="الموديل" placeholderTextColor={colors.textMuted} style={styles.smallInput} textAlign="right" />
                <TextInput value={form.color} onChangeText={(color) => setForm({ ...form, color })} placeholder="اللون" placeholderTextColor={colors.textMuted} style={styles.smallInput} textAlign="right" />
                <TextInput value={form.plateNumber} onChangeText={(plateNumber) => setForm({ ...form, plateNumber })} placeholder="اللوحة" placeholderTextColor={colors.textMuted} style={styles.smallInput} textAlign="right" />
              </View>
              {parkingSpotId ? (
                <View style={styles.spotNotice}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                  <Text style={styles.spotText}>سيتم ربط الطلب بالموقف الممسوح عبر QR</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>طريقة الدفع</Text>
              <View style={styles.paymentGrid}>
                {PAYMENT_OPTIONS.map((option) => {
                  const active = form.paymentMethod === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setForm({ ...form, paymentMethod: option.value })}
                      style={[styles.paymentButton, active && styles.paymentButtonActive]}
                    >
                      <Ionicons name={option.icon} size={20} color={active ? '#fff' : colors.primary} />
                      <Text style={[styles.paymentText, active && styles.paymentTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={form.notes}
                onChangeText={(notes) => setForm({ ...form, notes })}
                placeholder="ملاحظات إضافية"
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.input, styles.notes]}
                textAlign="right"
              />
            </View>

            <View style={styles.summary}>
              <SummaryRow label="الإجمالي" value={formatPrice(grandTotal)} strong />
            </View>
          </>
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View style={styles.footer}>
          <Pressable disabled={loading} onPress={submit} style={[styles.submitButton, loading && styles.disabled]}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitText}>تأكيد الطلب</Text>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  title: { ...typography.h2, color: '#fff', textAlign: 'right' },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.76)', textAlign: 'right' },
  content: { padding: spacing.base, paddingBottom: 120, gap: spacing.base },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.md,
  },
  panelTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'right' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemInfo: { flex: 1 },
  itemName: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  itemPrice: { ...typography.caption, color: colors.primary, textAlign: 'right', marginTop: 2 },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSecondary,
    padding: 3,
    gap: spacing.xs,
  },
  qtyButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyText: { ...typography.label, color: colors.textPrimary, minWidth: 18, textAlign: 'center' },
  deleteButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
    color: colors.textPrimary,
    ...typography.body,
  },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  smallInput: {
    width: '48.5%',
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
  },
  spotNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}10`,
    padding: spacing.md,
  },
  spotText: { ...typography.caption, color: colors.primary, flex: 1, textAlign: 'right' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paymentButton: {
    width: '48.5%',
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  paymentButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentText: { ...typography.buttonSm, color: colors.primary },
  paymentTextActive: { color: '#fff' },
  notes: { minHeight: 82, paddingTop: spacing.md, textAlignVertical: 'top' },
  summary: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { ...typography.bodySm, color: 'rgba(255,255,255,0.72)' },
  summaryValue: { ...typography.bodySm, color: '#fff' },
  summaryStrong: { ...typography.h4, color: '#fff' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.base,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  disabled: { opacity: 0.7 },
  submitText: { ...typography.button, color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.sm },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  emptyDesc: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
});
