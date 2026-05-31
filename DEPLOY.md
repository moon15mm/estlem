# Estlem — دليل النشر

## البنية التحتية

| الخدمة | المنصة | النطاق |
|--------|--------|--------|
| Web (PWA) | Vercel | `estlem.store` |
| Dashboard | Vercel | `dashboard.estlem.store` |
| API | Railway | `api.estlem.store` |
| Database | Neon | PostgreSQL Serverless |
| Cache | Upstash | Redis Serverless |

---

## 1. إعداد Railway (API)

1. اذهب إلى [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. اختر الريبو ثم عيّن Root Directory: `/`
3. أضف المتغيرات من `.env.production`:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<from Neon>
   REDIS_URL=<from Upstash>
   JWT_SECRET=<your secret>
   JWT_REFRESH_SECRET=<your secret>
   FRONTEND_URL=https://estlem.store
   DASHBOARD_URL=https://dashboard.estlem.store
   ```
4. في Settings → Networking → Custom Domain: أضف `api.estlem.store`
5. Railway سيعطيك CNAME record — أضفه في DNS

---

## 2. إعداد Vercel (Web + Dashboard)

### Web (واجهة العميل):
1. [vercel.com/new](https://vercel.com/new) → Import repo
2. Root Directory: `apps/web`
3. Framework Preset: Next.js
4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.estlem.store
   NEXT_PUBLIC_WS_URL=wss://api.estlem.store
   ```
5. Deploy → بعد النشر: Settings → Domains → `estlem.store`

### Dashboard (لوحة التحكم):
1. نفس الخطوات لكن Root Directory: `apps/dashboard`
2. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.estlem.store
   NEXT_PUBLIC_WS_URL=wss://api.estlem.store
   ```
3. Domain: `dashboard.estlem.store`

---

## 3. إعداد DNS (في مسجّل estlem.store)

| Type | Name | Value |
|------|------|-------|
| CNAME | `@` | `cname.vercel-dns.com` |
| CNAME | `dashboard` | `cname.vercel-dns.com` |
| CNAME | `api` | `<railway CNAME value>` |

> إذا كان المسجّل لا يدعم CNAME على root (@)، استخدم A records الخاصة بـ Vercel:
> `76.76.21.21`

---

## 4. إعداد Upstash (Redis)

1. [console.upstash.com](https://console.upstash.com) → Create Database
2. Region: اختر الأقرب (aws-me-south-1 إذا متاح، أو eu-west-1)
3. انسخ `UPSTASH_REDIS_REST_URL` بصيغة `redis://...`
4. أضفه كـ `REDIS_URL` في Railway

---

## أوامر محلية

```bash
# تثبيت
pnpm install

# تشغيل محلي
pnpm dev

# بناء
pnpm build
```
