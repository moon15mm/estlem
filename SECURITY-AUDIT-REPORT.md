# تقرير الفحص الأمني الشامل - منصة استلم (Estlem)

**التاريخ:** 2026-06-05
**المراجع:** Claude Security Audit
**النطاق:** الكود المصدري + الخدمات المنشورة (estlem.store, api.estlem.store, dashboard.estlem.store)
**المنهجية:** OWASP Top 10 2021 + SAST + فحص الخدمات الحية

---

## ملخص تنفيذي

| الخطورة | العدد |
|---------|-------|
| **Critical** | 5 |
| **High** | 7 |
| **Medium** | 6 |
| **Low** | 5 |
| **Info** | 4 |
| **المجموع** | **27** |

**الحالة العامة: خطيرة - يجب معالجة الثغرات الحرجة فوراً قبل أي عميل جديد.**

---

## الثغرات الحرجة (Critical)

---

### C-01: بيانات اعتماد قاعدة البيانات الإنتاجية مكشوفة في Git

**CVSS:** 9.8 (Critical)
**الملف:** `apps/api/.env.production` (مُتتبع في Git!)
**التصنيف:** A02:2021 - Cryptographic Failures / Secrets Exposure

**الوصف:**
ملف `.env.production` مُتتبع في Git (`git ls-files --cached`) ويحتوي:
```
DATABASE_URL=postgresql://neondb_owner:npg_vVaBW9DK1hxp@ep-calm-frog-apaag45n.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=estlem-jwt-moon15mm-neon-2026-secure
JWT_REFRESH_SECRET=estlem-refresh-moon15mm-neon-2026-secure
```

**PoC:** أي شخص يملك وصولاً للـ Repository يمكنه:
1. نسخ `DATABASE_URL` والاتصال بقاعدة البيانات مباشرة
2. استخدام `JWT_SECRET` لتزوير JWT tokens لأي مستخدم
3. الوصول الكامل لبيانات العملاء والطلبات والدفعات

**تاريخ Git:** الملف موجود منذ commit `ef849d7` و `fd38dee` — أي أن بيانات Neon DB ربما مكشوفة في تاريخ Git حتى لو حذفت الآن.

**الإصلاح:**
1. **فوراً:** `git rm --cached apps/api/.env.production` وأضف `.env.production` للـ `.gitignore`
2. **فوراً:** غيّر كلمة مرور قاعدة بيانات Neon من لوحة تحكم Neon
3. **فوراً:** ولّد JWT_SECRET جديدة (عشوائية 64+ حرف)
4. استخدم `git filter-branch` أو `BFG Repo-Cleaner` لحذف الأسرار من تاريخ Git
5. إذا كان الـ repo عام → اعتبر كل الأسرار مخترقة

---

### C-02: رمز OTP ثابت (123456) في بيئة الإنتاج

**CVSS:** 9.1 (Critical)
**الملف:** `apps/api/src/modules/auth/auth.service.ts` سطر 35-37
**التصنيف:** A07:2021 - Identification and Authentication Failures

**الوصف:**
```typescript
const testMode = !this.config.get('TWILIO_ACCOUNT_SID');
const otp = testMode ? '123456' : this.otpService.generate();
```

إذا لم يتم تكوين Twilio (وهو الحال حالياً حسب `.env.production`)، يمكن لأي شخص تسجيل الدخول بأي رقم جوال باستخدام OTP `123456`.

**PoC:**
```bash
# الخطوة 1: إرسال OTP لأي رقم
curl -X POST https://api.estlem.store/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+966500000000"}'

# الخطوة 2: تأكيد بـ 123456
curl -X POST https://api.estlem.store/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+966500000000", "otp": "123456"}'
# → يعيد accessToken + refreshToken
```

**الإصلاح:**
1. **فوراً:** اجعل OTP الثابت يعمل فقط في `NODE_ENV=development`
2. فعّل Twilio في الإنتاج أو استخدم بديل مثل Unifonic
3. أضف شرط: `if (testMode && process.env.NODE_ENV === 'production') throw new Error('SMS provider required')`

---

### C-03: نقطة نهاية تأكيد الدفع بدون مصادقة

**CVSS:** 9.0 (Critical)
**الملف:** `apps/api/src/modules/payments/payments.controller.ts` سطر 33-35
**التصنيف:** A01:2021 - Broken Access Control

**الوصف:**
```typescript
@Post('test-confirm/:sessionId')
testConfirm(@Param('sessionId') sessionId: string) {
  return this.service.confirmTestPayment(sessionId);
}
```

نقطة النهاية `/api/v1/payments/test-confirm/:sessionId` مفتوحة بدون `@UseGuards(AuthGuard('jwt'))`.
عند عدم تكوين بوابة الدفع (Moyasar)، النظام يعود لـ "test mode" ويمكن تأكيد الدفع مجاناً.

**سلسلة الهجوم:**
1. أنشئ طلب → يعطيك `sessionId` بصيغة `test_TIMESTAMP`
2. اتصل بـ `POST /payments/test-confirm/test_TIMESTAMP` → الطلب مدفوع!

**الإصلاح:**
1. **فوراً:** أضف `@UseGuards(AuthGuard('jwt'))` على هذه النقطة
2. **فوراً:** اجعل test-confirm تعمل فقط في `NODE_ENV !== 'production'`
3. احذف آلية test mode بالكامل من الإنتاج

---

### C-04: كلمة مرور Super Admin الافتراضية مكشوفة في الكود

**CVSS:** 8.6 (Critical)
**الملف:** `apps/api/src/database/seeds/seed-admin.ts` سطر 6-7
**التصنيف:** A07:2021 - Identification and Authentication Failures

**الوصف:**
```typescript
const email = process.env.SUPER_ADMIN_EMAIL || 'moon15mm@gmail.com';
const password = process.env.SUPER_ADMIN_PASSWORD || 'Estlem@2026!';
```

كلمة مرور Super Admin الافتراضية `Estlem@2026!` والبريد `moon15mm@gmail.com` مكشوفان في الكود المصدري.

**PoC:**
```bash
curl -X POST https://api.estlem.store/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "moon15mm@gmail.com", "password": "Estlem@2026!"}'
```

**الإصلاح:**
1. **فوراً:** غيّر كلمة مرور Super Admin من قاعدة البيانات
2. احذف القيم الافتراضية من الكود وأجبر على استخدام متغيرات البيئة فقط
3. أضف تحقق من قوة كلمة المرور

---

### C-05: أسرار JWT ضعيفة وقابلة للتخمين

**CVSS:** 8.5 (Critical)
**الملف:** `apps/api/.env.production` سطر 15-16
**التصنيف:** A02:2021 - Cryptographic Failures

**الوصف:**
```
JWT_SECRET=estlem-jwt-moon15mm-neon-2026-secure
JWT_REFRESH_SECRET=estlem-refresh-moon15mm-neon-2026-secure
```

هذه ليست أسرار عشوائية — يمكن تخمينها بسهولة. مع معرفة نمط التسمية، يمكن تزوير JWT tokens.

**الإصلاح:**
```bash
# ولّد أسرار عشوائية حقيقية
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## الثغرات العالية (High)

---

### H-01: WebSocket يسمح بالاتصال بدون مصادقة + IDOR في غرف العملاء

**CVSS:** 8.1 (High)
**الملف:** `apps/api/src/modules/realtime/orders.gateway.ts` سطر 40-41, 61-65
**التصنيف:** A01:2021 - Broken Access Control

**الوصف:**
```typescript
// Allow connection even without token — room join checks auth
```
```typescript
@SubscribeMessage('join:customer')
joinCustomer(@ConnectedSocket() client: Socket, @MessageBody() data: { customerId: string }) {
  // Customers can join their own room (with or without token)
  client.join(`customer:${data.customerId}`);
}
```

أي شخص يمكنه الانضمام لغرفة أي عميل بمعرفة الـ `customerId` فقط (UUID) والتنصت على تحديثات طلباته الحية.

**الإصلاح:**
1. تحقق من الـ JWT token قبل السماح بالانضمام للغرفة
2. تأكد أن `client.user.sub === data.customerId`

---

### H-02: WebSocket CORS مفتوح بالكامل

**CVSS:** 7.5 (High)
**الملف:** `apps/api/src/modules/realtime/orders.gateway.ts` سطر 12-15
**التصنيف:** A05:2021 - Security Misconfiguration

**الوصف:**
```typescript
@WebSocketGateway({
  cors: {
    origin: true,    // يقبل أي origin!
    credentials: true,
  },
})
```

**الإصلاح:** استخدم قائمة مسموحة مثل REST API:
```typescript
cors: {
  origin: [process.env.FRONTEND_URL, process.env.DASHBOARD_URL],
  credentials: true,
}
```

---

### H-03: نقاط نهاية بدون مصادقة تكشف بيانات حساسة

**CVSS:** 7.2 (High)
**الملفات:** عدة Controllers
**التصنيف:** A01:2021 - Broken Access Control

**الوصف:**
النقاط التالية مفتوحة بالكامل بدون أي مصادقة:

| النقطة | البيانات المكشوفة |
|--------|------------------|
| `GET /orders/:id` | تفاصيل الطلب كاملة (العميل، المنتجات، السعر) |
| `POST /orders` | إنشاء طلب بدون مصادقة |
| `POST /orders/ai-parse` | استخدام OpenAI API بدون حماية (تكلفة مالية) |
| `POST /orders/:id/approve-quote` | الموافقة على عرض سعر بدون تحقق هوية |
| `POST /orders/:id/reject-quote` | رفض عرض سعر بدون تحقق هوية |
| `GET /payments/checkout-info/:orderId` | معلومات الدفع بدون مصادقة |
| `GET /stores/:id` | يكشف tenantId والإعدادات |

**الإصلاح:**
1. أضف `@UseGuards(AuthGuard('jwt'))` لجميع النقاط التي تتعامل مع بيانات مستخدم
2. تحقق من ملكية المورد (هل هذا الطلب يخص هذا المستخدم؟)

---

### H-04: Webhook بدون تحقق HMAC حقيقي

**CVSS:** 7.0 (High)
**الملف:** `apps/api/src/modules/payments/payments.controller.ts` سطر 62-69
**التصنيف:** A08:2021 - Software and Data Integrity Failures

**الوصف:**
```typescript
if (secret && signature !== secret && signature !== `Bearer ${secret}`) {
  throw new ForbiddenException('Invalid webhook signature');
}
```

المشاكل:
1. المقارنة بنص عادي وليس HMAC — عرضة لـ timing attack
2. إذا `secret` غير معرّف → يقبل أي webhook بدون تحقق!
3. يستخدم `authorization` header بدلاً من HMAC signature المعيارية

**الإصلاح:**
```typescript
import { createHmac, timingSafeEqual } from 'crypto';
const expectedSig = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
  throw new ForbiddenException('Invalid signature');
}
```

---

### H-05: Moyasar Callback يثق بالـ query parameter بدون تحقق سيرفري

**CVSS:** 7.0 (High)
**الملف:** `apps/api/src/modules/payments/payments.service.ts` سطر 263-288
**التصنيف:** A08:2021 - Software and Data Integrity Failures

**الوصف:**
```typescript
async handleMoyasarCallback(orderId: string, paymentId: string, status: string) {
  if (SUCCESS_STATUSES.includes(status)) {
    // يُعلّم الطلب كمدفوع بناءً على query param فقط!
```

المهاجم يستطيع استدعاء:
```
GET /api/v1/payments/moyasar/callback?id=fake&status=paid&token=REAL_ORDER_ID
```
→ يُعلّم الطلب كمدفوع بدون دفع فعلي!

**الإصلاح:**
تحقق من حالة الدفع من API Moyasar مباشرة:
```typescript
const response = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
  headers: { Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}` },
});
const realPayment = await response.json();
if (realPayment.status !== 'paid') throw new Error('Payment not verified');
```

---

### H-06: تخزين JWT في localStorage (XSS → سرقة الجلسة)

**CVSS:** 6.8 (High)
**الملفات:**
- `apps/web/src/lib/api.ts`
- `apps/web/src/hooks/useCustomerAuth.ts`
- `apps/dashboard/src/hooks/useAuth.ts`
- `apps/dashboard/src/hooks/useAdminAuth.ts`
**التصنيف:** A07:2021 - Identification and Authentication Failures

**الوصف:**
```typescript
localStorage.setItem('estlem_access_token', token);
localStorage.setItem('estlem_refresh_token', refreshToken);
```

localStorage متاح لأي JavaScript على الصفحة. أي ثغرة XSS ستسمح بسرقة الـ tokens.

**الإصلاح:**
1. استخدم HttpOnly cookies بدلاً من localStorage
2. أضف `SameSite=Strict` و `Secure` flags
3. أو على الأقل استخدم `sessionStorage` بدلاً من `localStorage`

---

### H-07: Throttler غير مفعّل كـ Global Guard

**CVSS:** 6.5 (High)
**الملف:** `apps/api/src/app.module.ts`
**التصنيف:** A04:2021 - Insecure Design

**الوصف:**
رغم أن `ThrottlerModule` مستورد، لا يوجد `APP_GUARD` للـ ThrottlerGuard:
```typescript
// مفقود:
{ provide: APP_GUARD, useClass: ThrottlerGuard }
```

هذا يعني أن Rate Limiting يعمل فقط على الـ endpoints التي تحتوي `@Throttle()` صراحة. كل endpoint بدون الديكوريتر ليس لديه حماية من هجمات brute force أو DDoS.

**الإصلاح:**
```typescript
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
```

---

## الثغرات المتوسطة (Medium)

---

### M-01: تسريب OTP في Console Logs

**CVSS:** 5.5 (Medium)
**الملف:** `apps/api/src/modules/auth/auth.service.ts` سطر 44
**التصنيف:** A09:2021 - Security Logging and Monitoring Failures

**الوصف:**
```typescript
console.log(`[OTP] ${dto.mobile}: ${otp}${testMode ? ' (test mode — use 123456)' : ''}`);
```

في الإنتاج، OTP يُطبع في logs الخادم. أي شخص يصل للـ logs يمكنه سرقة OTP.

**الإصلاح:** احذف هذا السطر في الإنتاج أو استخدم `Logger` مع مستوى `debug` فقط.

---

### M-02: rejectUnauthorized: false في اتصالات SSL

**CVSS:** 5.3 (Medium)
**الملفات:**
- `apps/api/src/database/database.config.ts` سطر 18-20
- `apps/api/src/modules/auth/otp.service.ts` سطر 18
**التصنيف:** A02:2021 - Cryptographic Failures

**الوصف:**
```typescript
ssl: { rejectUnauthorized: false }
```

هذا يعطّل التحقق من شهادة SSL لاتصالات قاعدة البيانات وRedis، مما يجعل الاتصال عرضة لهجمات Man-in-the-Middle.

**الإصلاح:** استخدم شهادة CA الصحيحة بدلاً من تعطيل التحقق.

---

### M-03: عدم وجود Security Headers في Next.js

**CVSS:** 5.0 (Medium)
**الملفات:** `apps/web/next.config.js`, `apps/dashboard/next.config.js`
**التصنيف:** A05:2021 - Security Misconfiguration

**الوصف:**
لا توجد security headers معرّفة في تكوين Next.js:
- **مفقود:** Content-Security-Policy (CSP)
- **مفقود:** X-Frame-Options (حماية من Clickjacking)
- **مفقود:** Strict-Transport-Security (HSTS)
- **مفقود:** Referrer-Policy
- **مفقود:** Permissions-Policy

**الإصلاح:**
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" },
      ],
    }];
  },
};
```

---

### M-04: Docker Compose بكلمات مرور افتراضية ضعيفة

**CVSS:** 4.8 (Medium)
**الملف:** `docker-compose.yml`
**التصنيف:** A05:2021 - Security Misconfiguration

**الوصف:**
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secret}
REDIS_PASSWORD: ${REDIS_PASSWORD:-redissecret}
JWT_SECRET: ${JWT_SECRET:-changeme-jwt-secret}
```

كلمات مرور افتراضية ضعيفة (`secret`, `redissecret`, `changeme-jwt-secret`).

**الإصلاح:**
1. احذف القيم الافتراضية واجعل المتغيرات مطلوبة
2. استخدم Docker secrets بدلاً من متغيرات البيئة

---

### M-05: Vercel OIDC Token مخزّن محلياً

**CVSS:** 4.5 (Medium)
**الملف:** `.env.local`
**التصنيف:** A02:2021 - Cryptographic Failures

**الوصف:**
ملف `.env.local` يحتوي على `VERCEL_OIDC_TOKEN` كامل (JWT token). رغم أنه في `.gitignore`، يمكن تسريبه إذا شاركت مجلد المشروع.

**الإصلاح:** هذا Token يُولّد تلقائياً بواسطة Vercel CLI ويمكن تجاهله. تأكد أنه ليس في Git.

---

### M-06: إنشاء طلبات بدون مصادقة العميل

**CVSS:** 5.8 (Medium)
**الملف:** `apps/api/src/modules/orders/orders.controller.ts` سطر 46-51
**التصنيف:** A01:2021 - Broken Access Control

**الوصف:**
```typescript
@Post()
@Throttle({ default: { limit: 10, ttl: 60000 } })
async create(@Body() dto: CreateOrderDto) {
  // لا يوجد @UseGuards(AuthGuard('jwt'))!
```

يمكن إنشاء طلبات وهمية بدون تسجيل دخول، مما يؤدي لإرباك أصحاب المتاجر.

**الإصلاح:** أضف `@UseGuards(AuthGuard('jwt'))` وربط الطلب بـ `req.user.sub`.

---

## الثغرات المنخفضة (Low)

---

### L-01: كشف معلومات الخادم في Health Endpoint

**CVSS:** 3.0 (Low)
**النقطة:** `GET /api/v1/health`

**الوصف:**
يكشف حالة قاعدة البيانات ووقت التشغيل:
```json
{"status":"ok","db":"connected","uptime":3469}
```

**الإصلاح:** قلل المعلومات المكشوفة في الإنتاج إلى `{"status":"ok"}` فقط.

---

### L-02: كشف Tenant IDs في Public Endpoints

**CVSS:** 2.5 (Low)
**النقطة:** `GET /api/v1/stores/active`

**الوصف:** يكشف `tenantId` لكل متجر، مما قد يُستخدم في هجمات IDOR.

**الإصلاح:** احذف `tenantId` من الاستجابة العامة.

---

### L-03: عدم وجود Refresh Token Blacklist

**CVSS:** 3.5 (Low)
**الملف:** `apps/api/src/modules/auth/auth.service.ts`

**الوصف:** لا توجد آلية لإبطال Refresh Tokens. إذا سُرق token، يبقى صالحاً لـ 30 يوماً.

**الإصلاح:** خزّن Refresh Tokens في Redis مع إمكانية الإبطال.

---

### L-04: عدم وجود حد لمحاولات تسجيل الدخول الفاشلة (Account Lockout)

**CVSS:** 3.5 (Low)
**الملف:** `apps/api/src/modules/auth/auth.service.ts`

**الوصف:** رغم وجود Rate Limiting على الـ endpoint، لا يوجد قفل للحساب بعد عدد محاولات فاشلة.

**الإصلاح:** أضف عداد محاولات فاشلة وقفل الحساب لمدة بعد 5 محاولات.

---

### L-05: ignoreBuildErrors في TypeScript و ESLint

**CVSS:** 2.0 (Low)
**الملفات:** `apps/web/next.config.js`, `apps/dashboard/next.config.js`

**الوصف:**
```javascript
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```

تجاهل أخطاء TypeScript قد يخفي ثغرات أمنية.

**الإصلاح:** فعّل التحقق من الأخطاء في الإنتاج.

---

## ملاحظات إعلامية (Info)

---

### I-01: Vercel OIDC Token مكشوف محلياً
Token في `.vercel/.env.production.local` — طبيعي لـ Vercel CLI، تأكد من `.gitignore`.

### I-02: منافذ Docker مفتوحة على 0.0.0.0
PostgreSQL (5432) و Redis (6379) مربوطة بـ `0.0.0.0` في docker-compose — آمن محلياً فقط.

### I-03: IP الخادم مكشوف في environments.json
`167.86.77.174` مكشوف في config. طبيعي لكن يسهّل الاستهداف.

### I-04: استخدام dangerouslySetInnerHTML في MoyasarCheckout
`apps/web/src/components/MoyasarCheckout.tsx` — يستخدم لأنماط CSS فقط، خطر منخفض.

---

## ملخص الأولويات

### يجب إصلاحها فوراً (اليوم):
1. **C-01:** احذف `.env.production` من Git وغيّر كل الأسرار
2. **C-02:** عطّل OTP الثابت في الإنتاج
3. **C-03:** أضف مصادقة لـ test-confirm endpoint
4. **C-04:** غيّر كلمة مرور Super Admin
5. **C-05:** ولّد JWT secrets عشوائية قوية

### يجب إصلاحها هذا الأسبوع:
6. **H-01, H-02:** أصلح WebSocket auth و CORS
7. **H-03:** أضف مصادقة للـ endpoints المكشوفة
8. **H-04, H-05:** أصلح Webhook و Callback verification
9. **H-06:** انقل Tokens من localStorage إلى HttpOnly cookies
10. **H-07:** فعّل ThrottlerGuard كـ Global Guard

### يجب إصلاحها هذا الشهر:
11. **M-01 إلى M-06:** Security headers, SSL, Docker passwords
12. **L-01 إلى L-05:** معلومات مكشوفة، Token blacklist

---

## الأوامر التنفيذية السريعة

```bash
# 1. احذف .env.production من Git
cd apps/api
git rm --cached .env.production
echo ".env.production" >> ../../.gitignore
git commit -m "security: remove production secrets from git tracking"

# 2. ولّد JWT secrets جديدة
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# 3. غيّر كلمة مرور Neon DB
# من لوحة تحكم Neon: https://console.neon.tech

# 4. نظّف تاريخ Git (بعد تغيير كل الأسرار)
# استخدم BFG Repo-Cleaner:
# java -jar bfg.jar --delete-files .env.production
# git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

---

*هذا التقرير لأغراض أمنية فقط. جميع الاختبارات تمت على خدمات يملكها صاحب المشروع.*
