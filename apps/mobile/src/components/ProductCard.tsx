import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSequence, withSpring } from '@/lib/animated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { formatPrice } from '../lib/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  id: string;
  nameAr: string;
  price: number;
  imageUrl?: string;
  stock: number;
  discountPercent?: number;
  index?: number;
  onAdd: () => void;
}

export function ProductCard({ nameAr, price, imageUrl, stock, discountPercent, index = 0, onAdd }: Props) {
  const scale = useSharedValue(1);
  const btnScale = useSharedValue(1);
  const soldOut = stock <= 0;

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handleAdd = () => {
    if (soldOut) return;
    btnScale.value = withSequence(withSpring(1.3), withSpring(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd();
  };

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).springify()} style={[styles.card, cardAnim]}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
          </View>
        )}
        {discountPercent && discountPercent > 0 ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        ) : null}
        {soldOut ? (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>نفدت الكمية</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{nameAr}</Text>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>السعر</Text>
            <Text style={styles.price}>{formatPrice(price)}</Text>
          </View>
          <AnimatedPressable
            onPress={handleAdd}
            disabled={soldOut}
            style={[styles.addBtn, soldOut && styles.addBtnDisabled, btnAnim]}
          >
            <Ionicons name="add" size={20} color={soldOut ? colors.textMuted : colors.textOnPrimary} />
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.destructive,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  discountText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontFamily: typography.label.fontFamily,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    ...typography.label,
    color: colors.textOnPrimary,
  },
  info: {
    padding: spacing.md,
  },
  name: {
    ...typography.bodySm,
    fontFamily: typography.bodyMedium.fontFamily,
    color: colors.textPrimary,
    textAlign: 'right',
    minHeight: 36,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  price: {
    ...typography.label,
    color: colors.primary,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: colors.borderLight,
  },
});
