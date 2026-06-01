export const formatPrice = (price: number) =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
  }).format(price);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

export const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`;

const CATEGORY_AR: Record<string, string> = {
  grocery: 'تموينات',
  pharmacy: 'صيدلية',
  restaurant: 'مطعم',
  cafe: 'مقهى',
  pet_store: 'حيوانات',
  electronics: 'إلكترونيات',
  stationery: 'قرطاسية',
  other: 'أخرى',
};

export const getCategoryLabel = (cat: string) => CATEGORY_AR[cat] ?? cat;

const STATUS_AR: Record<string, string> = {
  new: 'جديد',
  accepted: 'مقبول',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export const getStatusLabel = (status: string) => STATUS_AR[status] ?? status;
