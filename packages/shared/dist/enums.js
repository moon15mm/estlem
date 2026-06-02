"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsEvent = exports.PosProvider = exports.NotificationChannel = exports.StoreCategory = exports.Language = exports.SystemRole = exports.StaffRole = exports.TenantStatus = exports.TenantPlan = exports.OrderType = exports.PaymentStatus = exports.PaymentMethod = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["NEW"] = "new";
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
    StoreCategory["PET_STORE"] = "pet_store";
    StoreCategory["ELECTRONICS"] = "electronics";
    StoreCategory["STATIONERY"] = "stationery";
    StoreCategory["OTHER"] = "other";
})(StoreCategory || (exports.StoreCategory = StoreCategory = {}));
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
var WsEvent;
(function (WsEvent) {
    WsEvent["ORDER_CREATED"] = "order:created";
    WsEvent["ORDER_STATUS_UPDATED"] = "order:status_updated";
    WsEvent["ORDER_CANCELLED"] = "order:cancelled";
    WsEvent["INVENTORY_LOW"] = "inventory:low_stock";
    WsEvent["STAFF_ASSIGNED"] = "staff:assigned";
})(WsEvent || (exports.WsEvent = WsEvent = {}));
