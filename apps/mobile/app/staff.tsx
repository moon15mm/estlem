import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/lib/api';
import { formatDate, formatPrice, getCategoryLabel, getStatusLabel } from '../src/lib/utils';
import { useAuth } from '../src/stores/useAuth';
import { colors, radius, spacing, typography } from '../src/theme';

type StaffUser = {
  name: string;
  role: string;
  tenantId: string;
  storeId: string;
};

type Store = {
  id: string;
  name?: string;
  nameAr?: string;
  category?: string;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  geofenceRadius?: number | string | null;
};

type Category = {
  id: string;
  name: string;
  nameAr: string;
  sortOrder?: number;
};

type OrderItem = {
  id: string;
  nameArSnapshot?: string;
  nameSnapshot?: string;
  quantity: number;
  priceSnapshot?: number | string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  type?: string;
  total: number | string;
  createdAt: string;
  rawRequest?: string;
  customer?: { mobile?: string; fullName?: string };
  parkingSpot?: { spotNumber?: string };
  items?: OrderItem[];
};

type Catalog = {
  items?: unknown[];
  total?: number;
};

type TabKey = 'orders' | 'location' | 'categories';

const nextStatus: Record<string, { status: string; label: string; icon: keyof typeof Ionicons.glyphMap } | null> = {
  pending_payment: null,
  pending_quote: null, // handled separately with quote modal
  pending_approval: null, // waiting for customer
  new: { status: 'accepted', label: 'قبول', icon: 'checkmark-outline' },
  accepted: { status: 'preparing', label: 'تحضير', icon: 'restaurant-outline' },
  preparing: { status: 'ready', label: 'جاهز', icon: 'bag-check-outline' },
  ready: { status: 'delivered', label: 'تسليم', icon: 'car-outline' },
  delivered: null,
  cancelled: null,
};

function isStaffUser(user: unknown): user is StaffUser {
  return Boolean(user && typeof user === 'object' && 'storeId' in user && 'tenantId' in user);
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function StaffScreen() {
  const router = useRouter();
  const session = useAuth((state) => state.session);
  const logout = useAuth((state) => state.logout);
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [address, setAddress] = useState('');
  const [radiusValue, setRadiusValue] = useState('200');
  const [categoryNameAr, setCategoryNameAr] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [quoteOrder, setQuoteOrder] = useState<Order | null>(null);
  const [quotePrices, setQuotePrices] = useState<Record<string, string>>({});
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const user = isStaffUser(session?.user) ? session.user : null;
  const lat = toNumber(store?.lat);
  const lng = toNumber(store?.lng);

  const load = useCallback(async (quiet = false) => {
    if (!user) return;
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const [storeData, orderData, catalogData, categoryData] = await Promise.all([
        api.get(`/stores/${user.storeId}`),
        api.get(`/orders/store/${user.storeId}?limit=30`),
        api.get(`/products/store/${user.storeId}?tenantId=${user.tenantId}&limit=1`),
        api.get(`/products/store/${user.storeId}/categories?tenantId=${user.tenantId}`),
      ]);

      const nextStore = storeData as unknown as Store;
      setStore(nextStore);
      setAddress(nextStore.address ?? '');
      setRadiusValue(String(nextStore.geofenceRadius ?? 200));

      const normalized = orderData as { items?: Order[]; orders?: Order[] } | Order[];
      setOrders(Array.isArray(normalized) ? normalized : normalized.items ?? normalized.orders ?? []);

      const catalog = catalogData as Catalog;
      setProductsCount(catalog.total ?? catalog.items?.length ?? 0);
      setCategories(Array.isArray(categoryData) ? (categoryData as Category[]) : []);
    } catch {
      Alert.alert('تعذر تحميل بيانات المحل', 'تأكد من الاتصال ثم حاول مرة أخرى.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!session) router.replace('/login');
    else if (session.type !== 'staff') router.replace('/(tabs)');
    else load();
  }, [load, router, session]);

  const summary = useMemo(() => {
    const active = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
    const ready = orders.filter((order) => order.status === 'ready');
    const revenue = orders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + Number(order.total ?? 0), 0);

    return { total: orders.length, active: active.length, ready: ready.length, revenue };
  }, [orders]);

  const statusCounts = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [orders]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const updateStatus = async (order: Order, status: string) => {
    setUpdatingId(order.id);
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      await load(true);
    } catch {
      Alert.alert('تعذر تحديث الطلب', 'حاول مرة أخرى بعد لحظات.');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveCurrentLocation = async () => {
    if (!user) return;
    setSavingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('إذن الموقع مطلوب', 'اسمح للتطبيق بالوصول إلى الموقع ثم حاول مرة أخرى.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const radius = Number(radiusValue);
      const payload = {
        address: address.trim() || undefined,
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        geofenceRadius: Number.isFinite(radius) && radius > 0 ? radius : 200,
      };

      const updated = await api.put(`/stores/${user.storeId}`, payload);
      setStore(updated as unknown as Store);
      Alert.alert('تم حفظ الموقع', 'تم تحديث موقع المحل الجغرافي بنجاح.');
    } catch {
      Alert.alert('تعذر حفظ الموقع', 'تأكد من الاتصال وخدمة الموقع ثم حاول مرة أخرى.');
    } finally {
      setSavingLocation(false);
    }
  };

  const openQuoteModal = (order: Order) => {
    const prices: Record<string, string> = {};
    order.items?.forEach((item) => {
      prices[item.id] = item.priceSnapshot ? String(item.priceSnapshot) : '';
    });
    setQuotePrices(prices);
    setQuoteOrder(order);
  };

  const submitQuote = async () => {
    if (!quoteOrder) return;
    const items = Object.entries(quotePrices).map(([itemId, price]) => ({
      itemId,
      price: Number(price) || 0,
    }));

    if (items.some((i) => i.price <= 0)) {
      Alert.alert('أسعار ناقصة', 'يجب إدخال سعر لكل عنصر في القائمة.');
      return;
    }

    setSubmittingQuote(true);
    try {
      await api.patch(`/orders/${quoteOrder.id}/quote`, { items });
      setQuoteOrder(null);
      Alert.alert('تم الإرسال', 'تم إرسال التسعير للعميل وبانتظار موافقته.');
      await load(true);
    } catch {
      Alert.alert('خطأ', 'تعذر إرسال التسعير، حاول مرة أخرى.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const addCategory = async () => {
    if (!user) return;
    const nameAr = categoryNameAr.trim();
    const name = categoryName.trim();
    if (!nameAr) {
      Alert.alert('اسم الصنف مطلوب', 'اكتب اسم الصنف بالعربية أولاً.');
      return;
    }

    setSavingCategory(true);
    try {
      await api.post(`/products/store/${user.storeId}/categories`, {
        nameAr,
        name: name || nameAr,
        sortOrder: categories.length + 1,
      });
      setCategoryNameAr('');
      setCategoryName('');
      await load(true);
      Alert.alert('تمت الإضافة', 'تمت إضافة الصنف إلى المحل.');
    } catch {
      Alert.alert('تعذر إضافة الصنف', 'حاول مرة أخرى بعد لحظات.');
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>واجهة المحل</Text>
          <Text style={styles.title}>{store?.nameAr || store?.name || user?.name || 'المحل'}</Text>
          <Text style={styles.subtitle}>
            {store?.category ? getCategoryLabel(store.category) : user?.role ?? ''} · {user?.name ?? ''}
          </Text>
        </View>
        <Pressable onPress={handleLogout} style={styles.iconButton}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tabs}>
            <TabButton icon="receipt-outline" label="الطلبات" active={activeTab === 'orders'} onPress={() => setActiveTab('orders')} />
            <TabButton icon="location-outline" label="الموقع" active={activeTab === 'location'} onPress={() => setActiveTab('location')} />
            <TabButton icon="albums-outline" label="الأصناف" active={activeTab === 'categories'} onPress={() => setActiveTab('categories')} />
          </View>

          {activeTab === 'orders' ? (
            <OrdersTab
              orders={orders}
              productsCount={productsCount}
              statusCounts={statusCounts}
              summary={summary}
              updatingId={updatingId}
              onUpdateStatus={updateStatus}
              onOpenQuote={openQuoteModal}
            />
          ) : null}

          {activeTab === 'location' ? (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>الموقع الجغرافي</Text>
                <Ionicons name="navigate-outline" size={22} color={colors.primary} />
              </View>

              <View style={styles.locationCard}>
                <View style={styles.locationIcon}>
                  <Ionicons name="location-sharp" size={26} color="#fff" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>{lat && lng ? 'الموقع محفوظ' : 'لم يتم ضبط الموقع'}</Text>
                  <Text style={styles.locationMeta}>
                    {lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : 'اضغط الزر لحفظ موقعك الحالي كموقع المحل'}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>العنوان الظاهر للعميل</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="مثال: شارع الملك فهد، الرياض"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>نطاق التنبيه بالمتر</Text>
                <TextInput
                  value={radiusValue}
                  onChangeText={setRadiusValue}
                  placeholder="200"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                  textAlign="right"
                />
              </View>

              <Pressable disabled={savingLocation} onPress={saveCurrentLocation} style={styles.fullButton}>
                {savingLocation ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={20} color="#fff" />
                    <Text style={styles.fullButtonText}>تحديد موقعي الآن وحفظه</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}

          {activeTab === 'categories' ? (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>أصناف المنتجات</Text>
                <Text style={styles.panelHint}>{categories.length} صنف</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>اسم الصنف بالعربية</Text>
                <TextInput
                  value={categoryNameAr}
                  onChangeText={setCategoryNameAr}
                  placeholder="مثال: مشروبات"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>اسم الصنف بالإنجليزية</Text>
                <TextInput
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="Beverages"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  textAlign="right"
                  autoCapitalize="words"
                />
              </View>

              <Pressable disabled={savingCategory} onPress={addCategory} style={styles.fullButton}>
                {savingCategory ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-outline" size={22} color="#fff" />
                    <Text style={styles.fullButtonText}>إضافة صنف</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.categoryList}>
                {categories.length > 0 ? categories.map((category, index) => (
                  <View key={category.id} style={styles.categoryRow}>
                    <View style={styles.categoryOrder}>
                      <Text style={styles.categoryOrderText}>{index + 1}</Text>
                    </View>
                    <View style={styles.categoryTextWrap}>
                      <Text style={styles.categoryTitle}>{category.nameAr}</Text>
                      <Text style={styles.categoryMeta}>{category.name}</Text>
                    </View>
                  </View>
                )) : (
                  <View style={styles.empty}>
                    <Ionicons name="albums-outline" size={44} color={colors.textMuted} />
                    <Text style={styles.emptyText}>لا توجد أصناف بعد</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Quote Pricing Modal */}
      <Modal visible={!!quoteOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setQuoteOrder(null)} style={styles.modalClose}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.modalTitle}>تسعير الطلب #{quoteOrder?.orderNumber}</Text>
                <View style={{ width: 36 }} />
              </View>

              {quoteOrder?.rawRequest ? (
                <View style={styles.rawRequestBox}>
                  <Text style={styles.rawRequestLabel}>طلب العميل:</Text>
                  <Text style={styles.rawRequestContent}>{quoteOrder.rawRequest}</Text>
                </View>
              ) : null}

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {quoteOrder?.items?.map((item) => (
                  <View key={item.id} style={styles.quoteItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quoteItemName}>
                        {item.nameArSnapshot || item.nameSnapshot}
                      </Text>
                      <Text style={styles.quoteItemQty}>الكمية: {item.quantity}</Text>
                    </View>
                    <TextInput
                      value={quotePrices[item.id] ?? ''}
                      onChangeText={(text) =>
                        setQuotePrices((prev) => ({ ...prev, [item.id]: text }))
                      }
                      placeholder="السعر"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      style={styles.priceInput}
                      textAlign="center"
                    />
                  </View>
                ))}

                {(!quoteOrder?.items || quoteOrder.items.length === 0) && quoteOrder?.rawRequest ? (
                  <View style={styles.noItemsHint}>
                    <Ionicons name="information-circle-outline" size={22} color={colors.warning} />
                    <Text style={styles.noItemsText}>
                      هذا طلب نص حر. أضف العناصر والأسعار من لوحة التحكم ثم أرسل التسعير.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              {quoteOrder?.items && quoteOrder.items.length > 0 ? (
                <>
                  <View style={styles.quoteTotalRow}>
                    <Text style={styles.quoteTotalLabel}>الإجمالي</Text>
                    <Text style={styles.quoteTotalValue}>
                      {formatPrice(
                        quoteOrder.items.reduce(
                          (sum, item) => sum + (Number(quotePrices[item.id] || 0) * item.quantity),
                          0,
                        ),
                      )}
                    </Text>
                  </View>

                  <Pressable
                    onPress={submitQuote}
                    disabled={submittingQuote}
                    style={styles.submitQuoteButton}
                  >
                    {submittingQuote ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.submitQuoteText}>إرسال التسعير للعميل</Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function OrdersTab({
  orders,
  productsCount,
  statusCounts,
  summary,
  updatingId,
  onUpdateStatus,
  onOpenQuote,
}: {
  orders: Order[];
  productsCount: number;
  statusCounts: Record<string, number>;
  summary: { total: number; active: number; ready: number; revenue: number };
  updatingId: string | null;
  onUpdateStatus: (order: Order, status: string) => void;
  onOpenQuote: (order: Order) => void;
}) {
  return (
    <>
      <View style={styles.grid}>
        <Metric icon="receipt-outline" label="آخر الطلبات" value={summary.total} />
        <Metric icon="flash-outline" label="طلبات جارية" value={summary.active} />
        <Metric icon="bag-check-outline" label="جاهزة" value={summary.ready} />
        <Metric icon="cube-outline" label="منتجات" value={productsCount} />
      </View>

      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>إيراد الطلبات المسلمة</Text>
        <Text style={styles.revenueValue}>{formatPrice(summary.revenue)}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>حالة العمل</Text>
        <View style={styles.statusGrid}>
          {Object.entries(statusCounts).length > 0 ? Object.entries(statusCounts).map(([status, count]) => (
            <View key={status} style={styles.statusPill}>
              <Text style={styles.statusLabel}>{getStatusLabel(status)}</Text>
              <Text style={styles.statusValue}>{count}</Text>
            </View>
          )) : (
            <Text style={styles.mutedText}>لا توجد طلبات بعد</Text>
          )}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>الطلبات الحديثة</Text>
          <Text style={styles.panelHint}>{orders.length} طلب</Text>
        </View>

        {orders.length > 0 ? orders.map((order) => {
          const action = nextStatus[order.status];
          const customerLabel = order.customer?.fullName || order.customer?.mobile || 'عميل';
          return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                  <Text style={styles.orderMeta}>{customerLabel} · {formatDate(order.createdAt)}</Text>
                </View>
                <View style={styles.orderStatusBadge}>
                  <Text style={styles.orderStatusText}>{getStatusLabel(order.status)}</Text>
                </View>
              </View>

              <View style={styles.orderMiddle}>
                <View style={styles.spotBox}>
                  <Ionicons name="car-outline" size={18} color={colors.primary} />
                  <Text style={styles.spotText}>{order.parkingSpot?.spotNumber ?? 'بدون موقف'}</Text>
                </View>
                <Text style={styles.orderTotal}>{formatPrice(Number(order.total ?? 0))}</Text>
              </View>

              {/* Raw request for free-text orders */}
              {order.rawRequest ? (
                <Text style={styles.rawText} numberOfLines={2}>📝 {order.rawRequest}</Text>
              ) : null}

              {order.items?.length ? (
                <Text style={styles.itemsText} numberOfLines={2}>
                  {order.items.map((item) => `${item.quantity}x ${item.nameArSnapshot || item.nameSnapshot}`).join('، ')}
                </Text>
              ) : null}

              {/* PENDING_QUOTE — show "تسعير" button */}
              {order.status === 'pending_quote' ? (
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => onOpenQuote(order)}
                    style={styles.quoteAction}
                  >
                    <Ionicons name="pricetag-outline" size={18} color="#fff" />
                    <Text style={styles.primaryActionText}>تسعير</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onUpdateStatus(order, 'cancelled')}
                    disabled={updatingId === order.id}
                    style={styles.cancelAction}
                  >
                    <Text style={styles.cancelActionText}>إلغاء</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* PENDING_APPROVAL — waiting for customer */}
              {order.status === 'pending_approval' ? (
                <View style={styles.waitingBadge}>
                  <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
                  <Text style={styles.waitingBadgeText}>بانتظار موافقة العميل</Text>
                </View>
              ) : null}

              {/* PENDING_PAYMENT — waiting for payment */}
              {order.status === 'pending_payment' ? (
                <View style={styles.waitingBadge}>
                  <Ionicons name="card-outline" size={16} color={colors.warning} />
                  <Text style={styles.waitingBadgeText}>بانتظار دفع العميل</Text>
                </View>
              ) : null}

              {/* Normal status actions */}
              {action ? (
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => onUpdateStatus(order, action.status)}
                    disabled={updatingId === order.id}
                    style={styles.primaryAction}
                  >
                    {updatingId === order.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name={action.icon} size={18} color="#fff" />
                        <Text style={styles.primaryActionText}>{action.label}</Text>
                      </>
                    )}
                  </Pressable>
                  {order.status === 'new' || order.status === 'accepted' ? (
                    <Pressable
                      onPress={() => onUpdateStatus(order, 'cancelled')}
                      disabled={updatingId === order.id}
                      style={styles.cancelAction}
                    >
                      <Text style={styles.cancelActionText}>إلغاء</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }) : (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد طلبات حالية</Text>
          </View>
        )}
      </View>
    </>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Ionicons name={icon} size={18} color={active ? '#fff' : colors.primary} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1 },
  eyebrow: { ...typography.caption, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  title: { ...typography.h2, color: '#fff', textAlign: 'right', marginTop: spacing.xs },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: spacing['4xl'] },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.xl,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tabButtonActive: { backgroundColor: colors.primary },
  tabText: { ...typography.buttonSm, color: colors.primary },
  tabTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: {
    width: '48.7%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.xs,
  },
  metricValue: { ...typography.h3, color: colors.textPrimary, textAlign: 'right' },
  metricLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  revenueCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  revenueLabel: { ...typography.bodySm, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  revenueValue: { ...typography.h2, color: '#fff', textAlign: 'right', marginTop: spacing.xs },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    gap: spacing.md,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'right' },
  panelHint: { ...typography.caption, color: colors.textSecondary },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusPill: {
    minWidth: '47%',
    flexGrow: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statusLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  statusValue: { ...typography.h4, color: colors.primary, textAlign: 'right' },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  locationIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: { flex: 1 },
  locationTitle: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  locationMeta: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 3 },
  formGroup: { gap: spacing.xs },
  label: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  input: {
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
  fullButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fullButtonText: { ...typography.buttonSm, color: '#fff' },
  categoryList: { gap: spacing.sm },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  categoryOrder: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOrderText: { ...typography.label, color: colors.primaryDark },
  categoryTextWrap: { flex: 1 },
  categoryTitle: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  categoryMeta: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
  orderCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  orderNumber: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  orderMeta: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
  orderStatusBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  orderStatusText: { ...typography.caption, color: colors.warning, fontFamily: typography.label.fontFamily },
  orderMiddle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spotBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  spotText: { ...typography.caption, color: colors.textSecondary },
  orderTotal: { ...typography.h4, color: colors.primary },
  itemsText: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryActionText: { ...typography.buttonSm, color: '#fff' },
  cancelAction: {
    minHeight: 42,
    borderRadius: radius.lg,
    backgroundColor: colors.destructiveLight,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: { ...typography.buttonSm, color: colors.destructive },
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.sm },
  emptyText: { ...typography.bodySm, color: colors.textMuted },
  mutedText: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },

  // Raw text for free-text orders
  rawText: { ...typography.caption, color: '#795548', textAlign: 'right', backgroundColor: '#FFF8E1', borderRadius: radius.md, padding: spacing.sm },

  // Quote action button
  quoteAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.lg,
    backgroundColor: '#F57C00',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Waiting badge
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF8E1',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  waitingBadgeText: { ...typography.caption, color: '#F57F17', fontFamily: typography.label.fontFamily },

  // Quote Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing.base,
    paddingBottom: spacing['4xl'],
    paddingHorizontal: spacing.base,
    maxHeight: '85%',
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
  modalScroll: { maxHeight: 300 },

  rawRequestBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  rawRequestLabel: { ...typography.caption, color: '#F57F17', textAlign: 'right', marginBottom: spacing.xs },
  rawRequestContent: { ...typography.bodySm, color: '#795548', textAlign: 'right', lineHeight: 22 },

  quoteItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  quoteItemName: { ...typography.label, color: colors.textPrimary, textAlign: 'right' },
  quoteItemQty: { ...typography.caption, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
  priceInput: {
    width: 90,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontFamily: typography.label.fontFamily,
    fontSize: 16,
  },

  noItemsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  noItemsText: { ...typography.caption, color: '#795548', flex: 1, textAlign: 'right', lineHeight: 20 },

  quoteTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  quoteTotalLabel: { ...typography.label, color: colors.textPrimary },
  quoteTotalValue: { ...typography.h3, color: colors.primary },

  submitQuoteButton: {
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: '#F57C00',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  submitQuoteText: { ...typography.buttonSm, color: '#fff', fontSize: 15 },
});
