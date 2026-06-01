import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../src/theme';
import { formatDate, formatPrice, getStatusLabel } from '../../src/lib/utils';

// Placeholder - will be connected to API later
const STATUS_COLORS: Record<string, string> = {
  new: colors.statusNew,
  accepted: colors.statusAccepted,
  preparing: colors.statusPreparing,
  ready: colors.statusReady,
  delivered: colors.statusDelivered,
  cancelled: colors.statusCancelled,
};

export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>طلباتي</Text>
      </Animated.View>

      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>لا توجد طلبات بعد</Text>
        <Text style={styles.emptyDesc}>ابحث عن متجر قريب واطلب من سيارتك</Text>
      </View>
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
  title: { ...typography.h2, color: '#fff', textAlign: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing['5xl'],
  },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  emptyDesc: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
});
