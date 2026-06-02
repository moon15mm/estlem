import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, SlideInDown } from '@/lib/animated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../src/lib/api';
import { ProductCard } from '../../src/components/ProductCard';
import { useCart } from '../../src/stores/useCart';
import { formatPrice, getCategoryLabel } from '../../src/lib/utils';
import { colors, radius, spacing, typography } from '../../src/theme';

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number | string;
  salePrice?: number | string | null;
  imageUrl?: string;
  stock?: number;
  stockQuantity?: number;
  discountPercent?: number;
  categoryId?: string | null;
}

interface Store {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  address?: string;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
}

type ProductsResponse = {
  items?: Product[];
  products?: Product[];
  categories?: Category[];
};

export default function StoreScreen() {
  const { id, tenantId, spotId } = useLocalSearchParams<{ id: string; tenantId: string; spotId?: string }>();
  const router = useRouter();
  const { addItem, itemCount, total, setStore } = useCart();

  const [store, setStoreData] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !tenantId) return;
    setStore(id, tenantId, spotId ?? null);
    setLoading(true);
    setError(null);

    Promise.all([
      api.get(`/stores/${id}`),
      api.get(`/products/store/${id}?tenantId=${tenantId}`),
      api.get(`/products/store/${id}/categories?tenantId=${tenantId}`),
    ]).then(([storeData, productData, categoryData]) => {
      const catalog = productData as ProductsResponse;
      setStoreData(storeData as unknown as Store);
      setProducts(catalog.items ?? catalog.products ?? []);
      setCategories(Array.isArray(categoryData) ? categoryData as Category[] : catalog.categories ?? []);
    }).catch(() => {
      setError('تعذر تحميل منتجات المتجر');
    }).finally(() => setLoading(false));
  }, [id, tenantId, spotId, setStore]);

  const filtered = activeCategory
    ? products.filter((product) => product.categoryId === activeCategory)
    : products;

  const handleAdd = useCallback((product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr || product.name,
      price: Number(product.salePrice ?? product.price),
      imageUrl: product.imageUrl,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [addItem]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const count = itemCount();

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.storeName}>{store?.nameAr || store?.name || 'المتجر'}</Text>
          <Text style={styles.storeCategory}>{getCategoryLabel(store?.category ?? '')}</Text>
        </View>
      </Animated.View>

      {categories.length > 0 ? (
        <Animated.ScrollView
          entering={FadeInUp.delay(200)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          style={styles.categoryBar}
        >
          <Pressable
            onPress={() => setActiveCategory(null)}
            style={[styles.categoryChip, !activeCategory && styles.categoryChipActive]}
          >
            <Text style={[styles.categoryChipText, !activeCategory && styles.categoryChipTextActive]}>الكل</Text>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setActiveCategory(category.id)}
              style={[styles.categoryChip, activeCategory === category.id && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, activeCategory === category.id && styles.categoryChipTextActive]}>
                {category.nameAr || category.name}
              </Text>
            </Pressable>
          ))}
        </Animated.ScrollView>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={styles.gridItem}>
            <ProductCard
              id={item.id}
              nameAr={item.nameAr || item.name}
              price={Number(item.salePrice ?? item.price)}
              imageUrl={item.imageUrl}
              stock={item.stock ?? item.stockQuantity ?? 0}
              discountPercent={item.discountPercent}
              index={index}
              onAdd={() => handleAdd(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{error ?? 'لا توجد منتجات'}</Text>
          </View>
        }
      />

      {count > 0 ? (
        <Animated.View entering={SlideInDown.springify()} style={styles.cartBar}>
          <View style={styles.cartInfo}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{count}</Text>
            </View>
            <Text style={styles.cartTotal}>{formatPrice(total())}</Text>
          </View>
          <Pressable style={styles.cartBtn} onPress={() => router.push('/cart')}>
            <Text style={styles.cartBtnText}>عرض السلة</Text>
            <Ionicons name="cart" size={20} color="#fff" />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  backBtn: { padding: spacing.sm },
  headerInfo: { flex: 1, marginHorizontal: spacing.md },
  storeName: { ...typography.h3, color: '#fff', textAlign: 'right' },
  storeCategory: { ...typography.caption, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'right' },
  categoryBar: { maxHeight: 52 },
  categoryList: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: { ...typography.buttonSm, color: colors.textSecondary },
  categoryChipTextActive: { color: '#fff' },
  grid: { padding: spacing.sm, paddingBottom: 100 },
  gridRow: { gap: spacing.sm },
  gridItem: { flex: 1, maxWidth: '50%' },
  empty: { alignItems: 'center', paddingTop: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodySm, color: colors.textMuted },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cartBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { ...typography.caption, fontFamily: typography.label.fontFamily, color: '#fff' },
  cartTotal: { ...typography.h4, color: '#fff' },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  cartBtnText: { ...typography.buttonSm, color: '#fff' },
});
