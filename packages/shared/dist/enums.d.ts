export declare enum OrderStatus {
    NEW = "new",
    ACCEPTED = "accepted",
    PREPARING = "preparing",
    READY = "ready",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}
export declare enum PaymentMethod {
    CARD = "card",
    APPLE_PAY = "apple_pay",
    MADA = "mada",
    CASH = "cash"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum OrderType {
    CATALOG = "catalog",
    FREE_TEXT = "free_text"
}
export declare enum TenantPlan {
    STARTER = "starter",
    GROWTH = "growth",
    BUSINESS = "business",
    ENTERPRISE = "enterprise"
}
export declare enum TenantStatus {
    TRIAL = "trial",
    ACTIVE = "active",
    SUSPENDED = "suspended",
    CANCELLED = "cancelled"
}
export declare enum StaffRole {
    OWNER = "owner",
    MANAGER = "manager",
    STAFF = "staff",
    CASHIER = "cashier"
}
export declare enum SystemRole {
    SUPER_ADMIN = "superadmin"
}
export declare enum Language {
    AR = "ar",
    EN = "en"
}
export declare enum StoreCategory {
    GROCERY = "grocery",
    PHARMACY = "pharmacy",
    RESTAURANT = "restaurant",
    CAFE = "cafe",
    PET_STORE = "pet_store",
    ELECTRONICS = "electronics",
    STATIONERY = "stationery",
    OTHER = "other"
}
export declare enum NotificationChannel {
    SMS = "sms",
    WHATSAPP = "whatsapp",
    PUSH = "push",
    EMAIL = "email"
}
export declare enum PosProvider {
    FOODICS = "foodics",
    SQUARE = "square",
    CSV = "csv",
    MANUAL = "manual"
}
export declare enum ServiceMode {
    DRIVE_THROUGH = "drive_through",
    DINE_IN = "dine_in",
    BOTH = "both"
}
export declare enum SpotType {
    PARKING = "parking",
    TABLE = "table"
}
export declare enum CommissionType {
    NONE = "none",
    PERCENTAGE = "percentage",
    FIXED = "fixed"
}
export declare enum CommissionStatus {
    PENDING = "pending",
    COLLECTED = "collected",
    PAID = "paid",
    CANCELLED = "cancelled"
}
export declare enum InvoiceStatus {
    DRAFT = "draft",
    SENT = "sent",
    PAID = "paid",
    OVERDUE = "overdue",
    CANCELLED = "cancelled"
}
export declare enum MembershipTier {
    BRONZE = "bronze",
    SILVER = "silver",
    GOLD = "gold",
    PLATINUM = "platinum"
}
export declare enum LoyaltyTransactionType {
    EARN = "earn",
    REDEEM = "redeem",
    EXPIRE = "expire",
    ADJUST = "adjust",
    BONUS = "bonus"
}
export declare enum SubscriptionStatus {
    TRIAL = "trial",
    ACTIVE = "active",
    PAST_DUE = "past_due",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export declare enum BillingCycle {
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly"
}
export declare enum WsEvent {
    ORDER_CREATED = "order:created",
    ORDER_STATUS_UPDATED = "order:status_updated",
    ORDER_CANCELLED = "order:cancelled",
    INVENTORY_LOW = "inventory:low_stock",
    STAFF_ASSIGNED = "staff:assigned"
}
