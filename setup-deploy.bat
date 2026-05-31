@echo off
echo ========================================
echo   Estlem - Production Deployment
echo ========================================
echo.

:: Check git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git غير مثبت. حمّله من: https://git-scm.com
    pause
    exit /b 1
)

:: Check pnpm
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pnpm غير مثبت.
    npm install -g pnpm
)

echo [1/5] تهيئة Git repository...
git init
git add .
git commit -m "feat: initial Estlem platform setup"
echo.

echo [2/5] تثبيت Vercel CLI...
npm install -g vercel
echo.

echo [3/5] تثبيت Railway CLI...
npm install -g @railway/cli
echo.

echo ========================================
echo   الخطوات اليدوية المطلوبة:
echo ========================================
echo.
echo 1. ارفع الكود على GitHub:
echo    - اذهب لـ https://github.com/new
echo    - أنشئ repo اسمه: estlem
echo    - شغّل الأوامر التالية:
echo.
echo    git remote add origin https://github.com/USERNAME/estlem.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 2. Railway (Backend + DB + Redis):
echo    - اذهب لـ https://railway.app
echo    - New Project → Deploy from GitHub repo
echo    - اختر مجلد apps/api
echo    - أضف PostgreSQL و Redis كـ services
echo    - انسخ DATABASE_URL و REDIS_URL
echo.
echo 3. Vercel (Frontend PWA):
echo    - اذهب لـ https://vercel.com/new
echo    - استورد نفس الـ GitHub repo
echo    - Root Directory: apps/web
echo    - أضف env: NEXT_PUBLIC_API_URL
echo.
echo 4. Vercel (Dashboard):
echo    - نفس الخطوات لكن Root Directory: apps/dashboard
echo.
pause
