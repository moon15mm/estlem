# البنية التحتية — Estlem

نظام يفصل **عناوين السيرفرات** عن الكود، فيسمح بتبديل السيرفر مستقبلاً بدون لمس أي ملف يدوياً.

---

## 📌 نقاط الاسترجاع (Checkpoints)

نقطة استرجاع = "snapshot" للحالة الحالية. تقدر ترجع لها في أي وقت لو شيء انكسر.

### إنشاء نقطة استرجاع

```bash
pnpm checkpoint:create pre-vps "قبل تجربة النقل لـ VPS"
```

يحدث:
1. ينشئ git tag بالاسم
2. يدفع الـ tag إلى GitHub
3. يضيف سجل في `config/environments.json`

### عرض كل النقاط

```bash
pnpm checkpoint:list
```

### الرجوع لنقطة سابقة

```bash
pnpm checkpoint:restore checkpoint-pre-vps-2026-06-04
```

يحدث:
1. يحفظ تعديلاتك الحالية (stash)
2. يرجع الكود لتلك النقطة بالضبط
3. يطبع الخطوات التالية (install, build, restart)

للرجوع للأحدث:
```bash
git checkout main && git stash pop
```

---

## 🔄 تبديل البيئة (Environment Switcher)

```bash
pnpm env:switch
```

معالج تفاعلي يسأل:
1. أي بيئة تبي تستخدم؟
2. لو "جديدة"، يطلب الـ URLs
3. يكتب `.env` files لكل التطبيقات تلقائياً
4. يحدّث `config/environments.json`

### البيئات الموجودة

| key | الوصف |
|-----|-------|
| `production` | الوضع الحالي — Render + Vercel |
| `vps` | VPS الخاص بك (Contabo 167.86.77.174) — تعبئة بعد النقل |
| `local` | تطوير محلي |

### إضافة بيئة جديدة

شغّل المعالج، اختر "Create new" واملأ القيم:
- API URL
- Web URL
- Dashboard URL
- DATABASE_URL

---

## 🗂 ملف الإعداد المركزي

`config/environments.json` فيه:
- `active` — اسم البيئة المُستخدمة حالياً
- `environments[*]` — كل بيئة معرّفة مع URLs و DB
- `checkpoints[*]` — كل نقطة استرجاع مع git tag

**لا تعدّل هذا الملف يدوياً** — استخدم الـ scripts.

---

## 🚀 سيناريو النقل لـ VPS

### قبل النقل
```bash
pnpm checkpoint:create pre-vps "حالة مستقرة قبل النقل"
```

### بعد إعداد الـ VPS
```bash
pnpm env:switch
# اختار "vps" → تأكيد
```
الـ wizard يحدّث كل ملفات `.env` لاستخدام `api.estlem.store` بدل Render.

### لو شيء ما يشتغل، ارجع فوراً
```bash
pnpm env:switch
# اختار "production" → تأكيد
```

أو لو الكود نفسه فيه مشكلة:
```bash
pnpm checkpoint:restore checkpoint-pre-vps-2026-06-04
```

---

## 📋 الـ DB Migration (نقل البيانات)

عند النقل من Render لـ VPS:

```bash
# 1. على Render: dump
pg_dump $RENDER_DATABASE_URL > backup.sql

# 2. على VPS: restore
psql $VPS_DATABASE_URL < backup.sql
```

التفاصيل في `docs/VPS-MIGRATION.md` (لما تجهّز الـ VPS).

---

## ✅ المزايا

- **بدون تعديل يدوي:** لا تلمس `.env` ولا الكود
- **استرجاع لحظي:** رجوع لأي نقطة بأمر واحد
- **بيئات متعددة:** بدّل بين Production / VPS / Local بسهولة
- **أي سيرفر مستقبلاً:** أضف بيئة جديدة، فعّلها — انتهى
- **آمن:** الـ env files محلية فقط، لا تُرفع لـ git
