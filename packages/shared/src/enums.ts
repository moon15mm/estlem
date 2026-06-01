export enum OrderStatus {
  NEW = 'new',
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
}

export enum StoreCategory {
  GROCERY = 'grocery',
  PHARMACY = 'pharmacy',
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  PET_STORE = 'pet_store',
  ELECTRONICS = 'electronics',
  STATIONERY = 'stationery',
  OTHER = 'other',
}

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

export enum WsEvent {
  ORDER_CREATED = 'order:created',
  ORDER_STATUS_UPDATED = 'order:status_updated',
  ORDER_CANCELLED = 'order:cancelled',
  INVENTORY_LOW = 'inventory:low_stock',
  STAFF_ASSIGNED = 'staff:assigned',
}
