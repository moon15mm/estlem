import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { StoreCard } from '../../src/components/StoreCard';
import { colors, spacing, radius, typography } from '../../src/theme';

interface StoreItem {
  id: string; name: string; nameAr: string; category: string;
  address?: string; tenantId: string; distance?: number;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/stores/search?q=${encodeURIComponent(query)}`) as StoreItem[];
        setResults(data ?? []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>بحث عن متجر</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="اكتب اسم المتجر..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />
          {query.length > 0 && (
            <Ionicons name="close-circle" size={20} color={colors.textMuted} onPress={() => setQuery('')} />
          )}
        </View>
      </Animated.View>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <StoreCard
              id={item.id}
              nameAr={item.nameAr}
              category={item.category}
              address={item.address}
              distance={item.distance}
              index={index}
              onPress={() => router.push(`/store/${item.id}?tenantId=${item.tenantId}`)}
            />
          )}
          ListEmptyComponent={
            query.length >= 2 ? (
              <View style={styles.center}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>لا توجد نتائج لـ "{query}"</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>ابحث عن متجر بالاسم</Text>
              </View>
            )
          }
        />
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
  title: { ...typography.h2, color: '#fff', textAlign: 'center', marginBottom: spacing.base },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  list: { padding: spacing.base, paddingBottom: spacing['4xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
});
