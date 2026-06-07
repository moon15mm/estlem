import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { formatPrice } from '../../src/lib/utils';
import { colors, radius, spacing, typography } from '../../src/theme';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  paymentMethod?: string;
};

type PaymentSession = {
  paymentUrl?: string;
  testMode?: boolean;
  sessionId?: string;
};

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/orders/${id}`)
      .then((d) => setOrder(d as Order))
      .catch(() => Alert.alert('خطأ', 'فشل تحميل الطلب'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatCardNum = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExp = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const isValid =
    cardNumber.replace(/\s/g, '').length >= 13 &&
    cardName.trim().length >= 3 &&
    expiry.length === 5 &&
    cvv.length >= 3;

  const submitPayment = async () => {
    if (!isValid || !order) return;
    setProcessing(true);
    try {
      const session = (await api.post('/payments/initiate', {
        orderId: order.id,
        method: order.paymentMethod ?? 'card',
        returnUrl: `https://estlem.store/order/${order.id}`,
      })) as PaymentSession;

      if (session?.testMode && session.sessionId) {
        // Test mode — simulate processing
        await new Promise((r) => setTimeout(r, 1500));
        await api.post(`/payments/test-confirm/${session.sessionId}`, {}).catch(() => {});
        Alert.alert('✅ تم الدفع بنجاح', 'سيبدأ المحل بتحضير طلبك الآن.');
        router.replace(`/order/${order.id}`);
      } else if (session?.paymentUrl) {
        // Real gateway — open in external browser
        await Linking.openURL(session.paymentUrl);
        router.replace(`/order/${order.id}`);
      } else {
        Alert.alert('خطأ', 'فشل بدء معالجة الدفع');
      }
    } catch {
      Alert.alert('خطأ', 'فشل الدفع — حاول مرة أخرى');
    } finally {
      setProcessing(false);
    }
  };

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
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>الطلب غير موجود</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>إتمام الدفع</Text>
          <Text style={styles.subtitle}>طلب #{order.orderNumber}</Text>
        </View>
        <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.6)" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>المبلغ المستحق</Text>
          <Text style={styles.amountValue}>{formatPrice(Number(order.total))}</Text>
        </View>

        {/* Card Form */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>بيانات البطاقة</Text>

          <View style={styles.field}>
            <Text style={styles.label}>رقم البطاقة</Text>
            <TextInput
              value={cardNumber}
              onChangeText={(v) => setCardNumber(formatCardNum(v))}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={19}
              style={styles.input}
              textAlign="left"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>اسم حامل البطاقة</Text>
            <TextInput
              value={cardName}
              onChangeText={(v) => setCardName(v.toUpperCase())}
              placeholder="MAHER ALDOUSARY"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={styles.input}
              textAlign="left"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>انتهاء</Text>
              <TextInput
                value={expiry}
                onChangeText={(v) => setExpiry(formatExp(v))}
                placeholder="MM/YY"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
                style={[styles.input, { textAlign: 'center' }]}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>CVV</Text>
              <TextInput
                value={cvv}
                onChangeText={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                style={[styles.input, { textAlign: 'center' }]}
              />
            </View>
          </View>
        </View>

        {/* Test mode hint */}
        <View style={styles.testHint}>
          <Ionicons name="information-circle-outline" size={18} color="#F57F17" />
          <View style={{ flex: 1 }}>
            <Text style={styles.testHintTitle}>وضع تجريبي</Text>
            <Text style={styles.testHintText}>
              استخدم: 4111 1111 1111 1111 · أي اسم · تاريخ مستقبلي · أي CVV
            </Text>
          </View>
        </View>

        {/* Pay button */}
        <Pressable
          onPress={submitPayment}
          disabled={!isValid || processing}
          style={[styles.payButton, (!isValid || processing) && styles.payButtonDisabled]}
        >
          {processing ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.payButtonText}>جاري المعالجة...</Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#fff" />
              <Text style={styles.payButtonText}>ادفع {formatPrice(Number(order.total))}</Text>
            </>
          )}
        </Pressable>

        {/* Security */}
        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
          <Text style={styles.securityText}>دفع آمن ومشفّر — بياناتك محمية</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  errorText: { ...typography.bodySm, color: colors.textMuted },

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
  title: { ...typography.h2, color: '#fff', textAlign: 'right' },
  subtitle: { ...typography.caption, color: 'rgba(255,255,255,0.72)', textAlign: 'right' },

  content: { padding: spacing.base, paddingBottom: spacing['4xl'], gap: spacing.base },

  amountCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  amountLabel: { ...typography.bodySm, color: 'rgba(255,255,255,0.7)' },
  amountValue: { ...typography.h1, color: '#fff', marginTop: spacing.xs },

  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.md,
  },
  panelTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'right' },

  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  input: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: spacing.md },

  testHint: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  testHintTitle: { ...typography.caption, color: '#F57F17', fontFamily: typography.label.fontFamily },
  testHintText: { ...typography.caption, color: '#795548', lineHeight: 18 },

  payButton: {
    minHeight: 54,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { ...typography.button, color: '#fff' },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  securityText: { ...typography.caption, color: colors.textMuted },
});
