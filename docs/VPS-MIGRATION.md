# نقل Estlem لـ VPS — دليل عملي

نظام كامل لتجهيز ونقل المشروع لأي VPS Ubuntu، يصلح للسيرفر الحالي (Contabo) وأي سيرفر مستقبلاً.

---

## 🎯 الخطوات الكاملة (15-20 دقيقة)

### الخطوة 1: تجهيز DNS

في موقع الـ domain (مزود الـ DNS):

| Record | النوع | القيمة |
|--------|------|--------|
| `@` (estlem.store) | A | `167.86.77.174` |
| `www` | A | `167.86.77.174` |
| `dashboard` | A | `167.86.77.174` |
| `api` | A | `167.86.77.174` |

⏳ انتظر 5-10 دقائق لانتشار DNS.

تأكد من نجاح الـ DNS:
```bash
nslookup api.estlem.store
# يجب يرجع 167.86.77.174
```

---

### الخطوة 2: إضافة VPS لنظام البيئات

على جهازك المحلي:

```bash
cd C:\Users\maher\Desktop\D2doit\estlem
pnpm vps:add
```

سيسألك:
- Environment key: `vps-contabo`
- Label: `Contabo VPS Production`
- IP: `167.86.77.174`
- SSH user: `root`
- Domain: `estlem.store`

✅ يُضاف للـ `config/environments.json` ويطبع الخطوات التالية.

---

### الخطوة 3: تجهيز VPS (مرة واحدة فقط)

ادخل على VPS:
```bash
ssh root@167.86.77.174
```

تشغّل سكربت التجهيز مرة واحدة (يأخذ ~5 دقائق):
```bash
curl -fsSL https://raw.githubusercontent.com/moon15mm/estlem/main/scripts/vps/01-provision.sh | bash
```

يثبّت:
- ✅ Node.js 20 + pnpm 9.15.4
- ✅ PostgreSQL 16
- ✅ Nginx + Certbot
- ✅ PM2 لإدارة العمليات
- ✅ UFW firewall (ports 22, 80, 443)
- ✅ User: `estlem`, Database: `estlem`

النتيجة: ملف `/root/estlem-credentials.txt` فيه DATABASE_URL وكل الـ secrets.

---

### الخطوة 4: نقل قاعدة البيانات (اختياري لكن مهم)

لو تريد نقل البيانات من Render Postgres الحالية:

1. خذ DATABASE_URL من Render dashboard
2. على VPS:
```bash
bash /opt/estlem/scripts/vps/04-migrate-db.sh "postgresql://user:pass@host.render.com:5432/estlem"
```

---

### الخطوة 5: نشر التطبيق

على VPS:
```bash
git clone https://github.com/moon15mm/estlem.git /opt/estlem
bash /opt/estlem/scripts/vps/02-deploy.sh https://github.com/moon15mm/estlem.git estlem.store
```

يفعل:
1. Clone repo
2. ينشئ `.env` files (DATABASE_URL تلقائياً + JWT secrets جديدة)
3. `pnpm install` + `pnpm build`
4. PM2 يشغّل 3 apps (api 3001, web 3000, dashboard 3002)
5. Nginx config لـ 3 domains
6. SSL تلقائي من Let's Encrypt

✅ المواقع تشتغل:
- https://estlem.store
- https://dashboard.estlem.store
- https://api.estlem.store/api/v1/health

---

### الخطوة 6: تبديل البيئة المحلية

على جهازك المحلي:
```bash
pnpm env:switch
# اختار "vps-contabo"
```

الآن `.env` files المحلية تشير لـ VPS.

---

## 🔄 التحديثات اللاحقة

بعد كل `git push` على main:

```bash
ssh root@167.86.77.174 'bash /opt/estlem/scripts/vps/03-update.sh'
```

يستغرق ~30 ثانية:
- pull → install → build → restart

أو ضع cron يشغّل auto-update كل دقيقة لو تريد deploy تلقائي.

---

## 🆘 الرجوع للوضع السابق

لو شيء انكسر:

### رجوع سريع للبيئة (دون لمس الـ VPS):
```bash
pnpm env:switch  # → اختار "production"
```
الـ Frontend يعود يتصل بـ Render مباشرة.

### رجوع الكود لنقطة سابقة:
```bash
pnpm checkpoint:restore checkpoint-pre-vps-stable
```

### إيقاف VPS بدون حذف:
```bash
ssh root@167.86.77.174 'pm2 stop all'
```

---

## 🏗 إضافة VPS ثاني (Failover/Staging)

```bash
pnpm vps:add
# Key: vps-hetzner
# IP: 95.x.x.x
# Domain: staging.estlem.store
```

تكرر نفس خطوات التجهيز على السيرفر الجديد، ثم تبدّل بينهم بأمر:
```bash
pnpm env:switch  # → اختار vps-contabo أو vps-hetzner
```

---

## 📊 المراقبة

```bash
ssh root@167.86.77.174
pm2 status              # حالة كل التطبيقات
pm2 logs                # كل الـ logs
pm2 logs estlem-api     # API logs فقط
pm2 monit               # شاشة مراقبة حية
htop                    # CPU/RAM
df -h                   # مساحة القرص
systemctl status nginx  # حالة Nginx
journalctl -u nginx -n 50  # Nginx logs
```

---

## 🔒 ملاحظات أمنية

- **Credentials في `/root/estlem-credentials.txt`** — احفظ نسخة منها بمكان آمن
- **JWT secrets** تُنشأ جديدة عند كل `02-deploy.sh` — احرص عدم إعادة تشغيله بعد production
- **DATABASE_URL** يحتوي على كلمة المرور — لا تشاركها
- **Backups DB:** خذ pg_dump أسبوعياً على الأقل

```bash
# Backup
pg_dump $DATABASE_URL > backup-$(date +%F).sql

# Restore
psql $DATABASE_URL < backup-2026-06-04.sql
```

---

## 📋 ملخص الأوامر

| الأمر | الوظيفة |
|-------|---------|
| `pnpm vps:add` | إضافة VPS جديد للنظام |
| `pnpm env:switch` | تبديل البيئة (production/vps/local) |
| `pnpm checkpoint:list` | عرض نقاط الاسترجاع |
| `pnpm checkpoint:create` | إنشاء نقطة استرجاع |
| `pnpm checkpoint:restore <tag>` | الرجوع لنقطة |
| **على VPS:** | |
| `bash 01-provision.sh` | تجهيز السيرفر (مرة واحدة) |
| `bash 02-deploy.sh REPO DOMAIN` | نشر التطبيق |
| `bash 03-update.sh` | تحديث سريع |
| `bash 04-migrate-db.sh URL` | نقل DB |
| `pm2 status` | حالة التطبيقات |
| `pm2 restart all` | إعادة تشغيل |
