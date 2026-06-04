"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsEvent = exports.BillingCycle = exports.SubscriptionStatus = exports.LoyaltyTransactionType = exports.MembershipTier = exports.InvoiceStatus = exports.CommissionStatus = exports.CommissionType = exports.SpotType = exports.ServiceMode = exports.PosProvider = exports.NotificationChannel = exports.DINE_IN_CATEGORIES = exports.StoreCategory = exports.Language = exports.SystemRole = exports.StaffRole = exports.TenantStatus = exports.TenantPlan = exports.OrderType = exports.PaymentStatus = exports.PaymentMethod = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["NEW"] = "new";
    OrderStatus["PENDING_PAYMENT"] = "pending_payment";
    OrderStatus["PENDING_QUOTE"] = "pending_quote";
    OrderStatus["PENDING_APPROVAL"] = "pending_approval";
    OrderStatus["ACCEPTED"] = "accepted";
    OrderStatus["PREPARING"] = "preparing";
    OrderStatus["READY"] = "ready";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "card";
    PaymentMethod["APPLE_PAY"] = "apple_pay";
    PaymentMethod["MADA"] = "mada";
    PaymentMethod["CASH"] = "cash";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var OrderType;
(function (OrderType) {
    OrderType["CATALOG"] = "catalog";
    OrderType["FREE_TEXT"] = "free_text";
})(OrderType || (exports.OrderType = OrderType = {}));
var TenantPlan;
(function (TenantPlan) {
    TenantPlan["STARTER"] = "starter";
    TenantPlan["GROWTH"] = "growth";
    TenantPlan["BUSINESS"] = "business";
    TenantPlan["ENTERPRISE"] = "enterprise";
})(TenantPlan || (exports.TenantPlan = TenantPlan = {}));
var TenantStatus;
(function (TenantStatus) {
    TenantStatus["TRIAL"] = "trial";
    TenantStatus["ACTIVE"] = "active";
    TenantStatus["SUSPENDED"] = "suspended";
    TenantStatus["CANCELLED"] = "cancelled";
})(TenantStatus || (exports.TenantStatus = TenantStatus = {}));
var StaffRole;
(function (StaffRole) {
    StaffRole["OWNER"] = "owner";
    StaffRole["MANAGER"] = "manager";
    StaffRole["STAFF"] = "staff";
    StaffRole["CASHIER"] = "cashier";
})(StaffRole || (exports.StaffRole = StaffRole = {}));
var SystemRole;
(function (SystemRole) {
    SystemRole["SUPER_ADMIN"] = "superadmin";
})(SystemRole || (exports.SystemRole = SystemRole = {}));
var Language;
(function (Language) {
    Language["AR"] = "ar";
    Language["EN"] = "en";
})(Language || (exports.Language = Language = {}));
var StoreCategory;
(function (StoreCategory) {
    StoreCategory["GROCERY"] = "grocery";
    StoreCategory["PHARMACY"] = "pharmacy";
    StoreCategory["RESTAURANT"] = "restaurant";
    StoreCategory["CAFE"] = "cafe";
    StoreCategory["BUFFET"] = "buffet";
    StoreCategory["PET_STORE"] = "pet_store";
    StoreCategory["ELECTRONICS"] = "electronics";
    StoreCategory["STATIONERY"] = "stationery";
    StoreCategory["OTHER"] = "other";
})(StoreCategory || (exports.StoreCategory = StoreCategory = {}));
/** Store categories that support dine-in (table ordering) */
exports.DINE_IN_CATEGORIES = [
    StoreCategory.RESTAURANT,
    StoreCategory.CAFE,
    StoreCategory.BUFFET,
];
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["WHATSAPP"] = "whatsapp";
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["EMAIL"] = "email";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var PosProvider;
(function (PosProvider) {
    PosProvider["FOODICS"] = "foodics";
    PosProvider["SQUARE"] = "square";
    PosProvider["CSV"] = "csv";
    PosProvider["MANUAL"] = "manual";
})(PosProvider || (exports.PosProvider = PosProvider = {}));
var ServiceMode;
(function (ServiceMode) {
    ServiceMode["DRIVE_THROUGH"] = "drive_through";
    ServiceMode["DINE_IN"] = "dine_in";
    ServiceMode["BOTH"] = "both";
})(ServiceMode || (exports.ServiceMode = ServiceMode = {}));
var SpotType;
(function (SpotType) {
    SpotType["PARKING"] = "parking";
    SpotType["TABLE"] = "table";
})(SpotType || (exports.SpotType = SpotType = {}));
var CommissionType;
(function (CommissionType) {
    CommissionType["NONE"] = "none";
    CommissionType["PERCENTAGE"] = "percentage";
    CommissionType["FIXED"] = "fixed";
})(CommissionType || (exports.CommissionType = CommissionType = {}));
var CommissionStatus;
(function (CommissionStatus) {
    CommissionStatus["PENDING"] = "pending";
    CommissionStatus["COLLECTED"] = "collected";
    CommissionStatus["PAID"] = "paid";
    CommissionStatus["CANCELLED"] = "cancelled";
})(CommissionStatus || (exports.CommissionStatus = CommissionStatus = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "draft";
    InvoiceStatus["SENT"] = "sent";
    InvoiceStatus["PAID"] = "paid";
    InvoiceStatus["OVERDUE"] = "overdue";
    InvoiceStatus["CANCELLED"] = "cancelled";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var MembershipTier;
(function (MembershipTier) {
    MembershipTier["BRONZE"] = "bronze";
    MembershipTier["SILVER"] = "silver";
    MembershipTier["GOLD"] = "gold";
    MembershipTier["PLATINUM"] = "platinum";
})(MembershipTier || (exports.MembershipTier = MembershipTier = {}));
var LoyaltyTransactionType;
(function (LoyaltyTransactionType) {
    LoyaltyTransactionType["EARN"] = "earn";
    LoyaltyTransactionType["REDEEM"] = "redeem";
    LoyaltyTransactionType["EXPIRE"] = "expire";
    LoyaltyTransactionType["ADJUST"] = "adjust";
    LoyaltyTransactionType["BONUS"] = "bonus";
})(LoyaltyTransactionType || (exports.LoyaltyTransactionType = LoyaltyTransactionType = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["TRIAL"] = "trial";
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["EXPIRED"] = "expired";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var BillingCycle;
(function (BillingCycle) {
    BillingCycle["MONTHLY"] = "monthly";
    BillingCycle["QUARTERLY"] = "quarterly";
    BillingCycle["YEARLY"] = "yearly";
})(BillingCycle || (exports.BillingCycle = BillingCycle = {}));
var WsEvent;
(function (WsEvent) {
    WsEvent["ORDER_CREATED"] = "order:created";
    WsEvent["ORDER_STATUS_UPDATED"] = "order:status_updated";
    WsEvent["ORDER_CANCELLED"] = "order:cancelled";
    WsEvent["ORDER_QUOTE_READY"] = "order:quote_ready";
    WsEvent["ORDER_QUOTE_APPROVED"] = "order:quote_approved";
    WsEvent["ORDER_QUOTE_REJECTED"] = "order:quote_rejected";
    WsEvent["INVENTORY_LOW"] = "inventory:low_stock";
    WsEvent["STAFF_ASSIGNED"] = "staff:assigned";
})(WsEvent || (exports.WsEvent = WsEvent = {}));
