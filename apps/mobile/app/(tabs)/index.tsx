import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from '@/lib/animated';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { StoreCard } from '../../src/components/StoreCard';
import { useAuth } from '../../src/stores/useAuth';
import { colors, radius, spacing, typography } from '../../src/theme';

interface StoreItem {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  address?: string;
  tenantId: string;
  distance?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const logout = useAuth((state) => state.logout);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNearby = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const data = await api.get(
          `/stores/nearby?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&radius=10`,
        ) as StoreItem[];
        setStores(data ?? []);
      } else {
        const data = await api.get('/stores/search?q=ا&limit=20') as StoreItem[];
        setStores(data ?? []);
      }
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNearby(); }, [loadNearby]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)} style={styles.hero}>
        <View style={styles.heroTop}>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.logoBox}>
            <Ionicons name="car-sport" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>استلم</Text>
          <Text style={styles.heroSub}>اطلب من سيارتك دون أن تنزل</Text>
        </View>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.quickActions}>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/(tabs)/search')}>
            <View style={styles.quickIcon}>
              <Ionicons name="search" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickLabel}>بحث</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/scan')}>
            <View style={styles.quickIcon}>
              <Ionicons name="qr-code" size={22} color={colors.accent} />
            </View>
            <Text style={styles.quickLabel}>مسح QR</Text>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/(tabs)/orders')}>
            <View style={styles.quickIcon}>
              <Ionicons name="receipt" size={22} color={colors.warning} />
            </View>
            <Text style={styles.quickLabel}>طلباتي</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadNearby(true)} colors={[colors.primary]} />
        }
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="navigate" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>متاجر قريبة</Text>
        </View>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeleton} />
          ))
        ) : stores.length > 0 ? (
          stores.map((store, i) => (
            <StoreCard
              key={store.id}
              id={store.id}
              nameAr={store.nameAr || store.name}
              category={store.category}
              address={store.address}
              distance={store.distance}
              index={i}
              onPress={() => router.push(`/store/${store.id}?tenantId=${store.tenantId}`)}
            />
          ))
        ) : (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.empty}>
            <Ionicons name="location-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>لا توجد متاجر قريبة</Text>
            <Text style={styles.emptyDesc}>ابحث عن متجر بالاسم أو امسح رمز QR</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primary,
    paddingTop: 52,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  heroTop: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { alignItems: 'center' },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { ...typography.h1, color: '#fff', textAlign: 'center' },
  heroSub: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.base,
    marginTop: spacing.xl,
  },
  quickBtn: { alignItems: 'center', gap: spacing.sm },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: typography.label.fontFamily,
  },
  content: { flex: 1 },
  contentInner: { padding: spacing.base, paddingBottom: spacing['4xl'] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  sectionTitle: { ...typography.h4, color: colors.textPrimary },
  skeleton: {
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.skeleton,
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  emptyDesc: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
});
