import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from '@/lib/animated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { formatDistance, getCategoryLabel } from '../lib/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  id: string;
  nameAr: string;
  category: string;
  address?: string;
  distance?: number;
  index?: number;
  onPress: () => void;
}

export function StoreCard({ nameAr, category, address, distance, index = 0, onPress }: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInRight.delay(index * 80).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.card, animStyle]}
      >
        <View style={styles.icon}>
          <Ionicons name="storefront" size={28} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{nameAr}</Text>
          <View style={styles.categoryPill}>
            <Text style={styles.category}>{getCategoryLabel(category)}</Text>
          </View>
          {address ? (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.address} numberOfLines={1}>{address}</Text>
            </View>
          ) : null}
        </View>
        {distance != null && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate" size={14} color={colors.accent} />
            <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
          </View>
        )}
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}18`,
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  category: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: typography.label.fontFamily,
  },
  categoryPill: {
    alignSelf: 'flex-end',
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  address: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  distanceBadge: {
    alignItems: 'center',
    gap: 2,
    marginLeft: spacing.sm,
  },
  distanceText: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    color: colors.accent,
  },
});
