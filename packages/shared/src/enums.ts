export enum OrderStatus {
  NEW = 'new',
  PENDING_PAYMENT = 'pending_payment',      // waiting for electronic payment
  PENDING_QUOTE = 'pending_quote',          // store needs to set prices for free items
  PENDING_APPROVAL = 'pending_approval',    // customer needs to approve the quote
  ACCEPTED = 'accepted',
  PREPARING = 'preparing',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CARD = 'card',
  APPLE_PAY = 'apple_pay',
  MADA = 'mada',
  CASH = 'cash',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum OrderType {
  CATALOG = 'catalog',
  FREE_TEXT = 'free_text',
}

export enum TenantPlan {
  STARTER = 'starter',
  GROWTH = 'growth',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum StaffRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  STAFF = 'staff',
  CASHIER = 'cashier',
}

export enum SystemRole {
  SUPER_ADMIN = 'superadmin',
}

export enum Language {
  AR = 'ar',
  EN = 'en',
  HI = 'hi',
  BN = 'bn',
  TL = 'tl',
}

export const LANGUAGE_META: Record<Language, { name: string; native: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  [Language.AR]: { name: 'Arabic',   native: 'العربية',  flag: '🇸🇦', dir: 'rtl' },
  [Language.EN]: { name: 'English',  native: 'English',  flag: '🇬🇧', dir: 'ltr' },
  [Language.HI]: { name: 'Hindi',    native: 'हिन्दी',    flag: '🇮🇳', dir: 'ltr' },
  [Language.BN]: { name: 'Bengali',  native: 'বাংলা',    flag: '🇧🇩', dir: 'ltr' },
  [Language.TL]: { name: 'Filipino', native: 'Filipino', flag: '🇵🇭', dir: 'ltr' },
};

export const ALL_LANGUAGES = Object.values(Language);

export enum StoreCategory {
  GROCERY = 'grocery',
  PHARMACY = 'pharmacy',
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  BUFFET = 'buffet',
  PET_STORE = 'pet_store',
  ELECTRONICS = 'electronics',
  STATIONERY = 'stationery',
  OTHER = 'other',
}

/** Store categories that support dine-in (table ordering) */
export const DINE_IN_CATEGORIES: StoreCategory[] = [
  StoreCategory.RESTAURANT,
  StoreCategory.CAFE,
  StoreCategory.BUFFET,
];

export enum NotificationChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
  EMAIL = 'email',
}

export enum PosProvider {
  FOODICS = 'foodics',
  SQUARE = 'square',
  CSV = 'csv',
  MANUAL = 'manual',
}

export enum ServiceMode {
  DRIVE_THROUGH = 'drive_through',
  DINE_IN = 'dine_in',
  BOTH = 'both',
}

export enum SpotType {
  PARKING = 'parking',
  TABLE = 'table',
}

export enum CommissionType {
  NONE = 'none',
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum CommissionStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum MembershipTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum LoyaltyTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  EXPIRE = 'expire',
  ADJUST = 'adjust',
  BONUS = 'bonus',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum WsEvent {
  ORDER_CREATED = 'order:created',
  ORDER_STATUS_UPDATED = 'order:status_updated',
  ORDER_CANCELLED = 'order:cancelled',
  ORDER_QUOTE_READY = 'order:quote_ready',          // store sent prices to customer
  ORDER_QUOTE_APPROVED = 'order:quote_approved',    // customer approved
  ORDER_QUOTE_REJECTED = 'order:quote_rejected',    // customer rejected
  INVENTORY_LOW = 'inventory:low_stock',
  STAFF_ASSIGNED = 'staff:assigned',
}
