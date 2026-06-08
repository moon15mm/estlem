import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, SlideInDown } from '@/lib/animated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../src/lib/api';
import { ProductCard } from '../../src/components/ProductCard';
import { useAuth } from '../../src/stores/useAuth';
import { useCart } from '../../src/stores/useCart';
import { useOrders } from '../../src/stores/useOrders';
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
  const [showFreeText, setShowFreeText] = useState(false);
  const [freeTextRequest, setFreeTextRequest] = useState('');
  const [freeTextName, setFreeTextName] = useState('');
  const [freeTextMobile, setFreeTextMobile] = useState('');
  const [submittingFreeText, setSubmittingFreeText] = useState(false);
  const session = useAuth((state) => state.session);
  const addOrder = useOrders((state) => state.addOrder);
  const customer = session?.type === 'customer'
    ? session.user as { fullName?: string | null; mobile?: string }
    : null;

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

  const openFreeText = () => {
    setFreeTextName(customer?.fullName ?? '');
    setFreeTextMobile(customer?.mobile ?? '');
    setFreeTextRequest('');
    setShowFreeText(true);
  };

  const submitFreeText = async () => {
    if (!freeTextRequest.trim()) {
      Alert.alert('القائمة فارغة', 'اكتب ما تريد شراءه.');
      return;
    }
    if (!freeTextName.trim() || freeTextMobile.trim().length < 9) {
      Alert.alert('بيانات ناقصة', 'أدخل الاسم ورقم الجوال.');
      return;
    }

    setSubmittingFreeText(true);
    try {
      const order = await api.post('/orders', {
        storeId: id,
        tenantId,
        parkingSpotId: spotId ?? undefined,
        type: 'free_text',
        paymentMethod: 'cash',
        rawRequest: freeTextRequest.trim(),
        items: [],
        customer: {
          fullName: freeTextName.trim(),
          mobile: freeTextMobile.trim(),
        },
      }) as { id: string; orderNumber?: string; total?: number; createdAt?: string };

      addOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total ?? 0),
        createdAt: order.createdAt ?? new Date().toISOString(),
        storeName: store?.nameAr || store?.name,
      });

      setShowFreeText(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/order/${order.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'خطأ غير معروف';
      const status = err?.response?.status ?? '';
      Alert.alert('فشل إرسال الطلب', `${status ? `(${status}) ` : ''}${typeof msg === 'object' ? JSON.stringify(msg) : msg}`);
    } finally {
      setSubmittingFreeText(false);
    }
  };

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
        <Pressable onPress={openFreeText} style={styles.freeTextBtn}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.freeTextBtnText}>قائمة حرة</Text>
        </Pressable>
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

      {/* Free Text Modal */}
      <Modal visible={showFreeText} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowFreeText(false)} style={styles.modalClose}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.modalTitle}>📝 قائمة حرة</Text>
                <View style={{ width: 36 }} />
              </View>

              <Text style={styles.modalDesc}>
                اكتب ما تريد شراءه وسيقوم المحل بتسعير القائمة وإرسالها لك للموافقة.
              </Text>

              <TextInput
                value={freeTextRequest}
                onChangeText={setFreeTextRequest}
                placeholder={"مثال:\n- 2 كيلو تفاح\n- حليب كبير\n- خبز أبيض 3"}
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.freeTextInput}
                textAlign="right"
                textAlignVertical="top"
              />

              <TextInput
                value={freeTextName}
                onChangeText={setFreeTextName}
                placeholder="الاسم"
                placeholderTextColor={colors.textMuted}
                style={styles.modalInput}
                textAlign="right"
              />

              <TextInput
                value={freeTextMobile}
                onChangeText={setFreeTextMobile}
                placeholder="رقم الجوال"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.modalInput}
                textAlign="right"
              />

              <Pressable
                onPress={submitFreeText}
                disabled={submittingFreeText}
                style={styles.submitFreeTextBtn}
              >
                {submittingFreeText ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.submitFreeTextText}>إرسال الطلب</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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

  // Free text button in header
  freeTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  freeTextBtnText: { ...typography.caption, color: '#fff', fontFamily: typography.label.fontFamily },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing.base,
    paddingBottom: spacing['4xl'],
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'center', flex: 1 },
  modalDesc: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  freeTextInput: {
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    lineHeight: 24,
  },
  modalInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.base,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
  },
  submitFreeTextBtn: {
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  submitFreeTextText: { ...typography.buttonSm, color: '#fff', fontSize: 15 },
});
