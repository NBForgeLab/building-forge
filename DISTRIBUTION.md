# دليل التوزيع - Building Forge

## نظرة عامة

هذا الدليل يشرح كيفية بناء وتوزيع Building Forge للمنصات المختلفة.

## متطلبات البناء

### متطلبات عامة

- Node.js 18 أو أحدث
- npm 9 أو أحدث
- Git

### متطلبات خاصة بالمنصة

#### Windows

- Windows 10 أو أحدث
- Visual Studio Build Tools أو Visual Studio Community
- Python 3.8+ (للـ native modules)

#### macOS

- macOS 10.15 أو أحدث
- Xcode Command Line Tools
- Developer ID Certificate (للتوقيع)

#### Linux

- Ubuntu 18.04+ أو توزيعة مماثلة
- build-essential package
- libnss3-dev, libatk-bridge2.0-dev, libdrm2, libxcomposite1, libxdamage1, libxrandr2, libgbm1, libxss1, libasound2

## أوامر البناء

### البناء السريع

```bash
# بناء جميع المنصات
npm run build:all

# بناء مع تخطي الاختبارات
npm run build:all:skip-tests

# بناء منصة واحدة
npm run build:production:win    # Windows
npm run build:production:mac    # macOS
npm run build:production:linux  # Linux
```

### البناء المتقدم

```bash
# بناء مخصص
node scripts/build-production.js --platform win32 --skip-tests --skip-optimization

# بناء مع التوقيع
node scripts/build-production.js --platform win32 --enable-signing

# بناء منصات محددة
node scripts/build-all-platforms.js --platforms win32,linux
```

## إعداد التوقيع الرقمي

### Windows (Authenticode)

```bash
# متغيرات البيئة المطلوبة
export WIN_CERTIFICATE_PATH="/path/to/certificate.p12"
export WIN_CERTIFICATE_PASSWORD="certificate_password"
export WIN_TIMESTAMP_URL="http://timestamp.digicert.com"
```

### macOS (Developer ID)

```bash
# متغيرات البيئة المطلوبة
export MAC_DEVELOPER_ID_APPLICATION="Developer ID Application: Your Name (TEAM_ID)"
export MAC_APPLE_ID="your-apple-id@example.com"
export MAC_APPLE_ID_PASSWORD="app-specific-password"
export MAC_TEAM_ID="YOUR_TEAM_ID"
```

### Linux (GPG)

```bash
# متغيرات البيئة المطلوبة
export LINUX_GPG_KEY_ID="your-gpg-key-id"
export LINUX_GPG_PASSPHRASE="gpg-passphrase"
```

## هيكل الإخراج

بعد البناء، ستجد الملفات في مجلد `release/`:

```
release/
├── Building-Forge-Setup-1.0.0.exe          # مثبت Windows
├── Building-Forge-1.0.0-win.zip            # نسخة Windows محمولة
├── Building-Forge-1.0.0.dmg                # مثبت macOS
├── Building-Forge-1.0.0.AppImage           # تطبيق Linux محمول
├── Building-Forge-1.0.0.deb                # حزمة Debian/Ubuntu
├── Building-Forge-1.0.0.rpm                # حزمة Red Hat/Fedora
├── Building-Forge-1.0.0.tar.gz             # أرشيف Linux
├── checksums.sha256                         # ملف التحقق
├── build-report.json                        # تقرير البناء
└── signing-report.json                      # تقرير التوقيع
```

## التحقق من سلامة الملفات

```bash
# التحقق من checksums
sha256sum -c checksums.sha256

# التحقق من التوقيع (Windows)
signtool verify /pa /v Building-Forge-Setup-1.0.0.exe

# التحقق من التوقيع (macOS)
codesign --verify --verbose Building-Forge-1.0.0.dmg

# التحقق من التوقيع (Linux)
gpg --verify Building-Forge-1.0.0.AppImage.sig Building-Forge-1.0.0.AppImage
```

## النشر التلقائي مع GitHub Actions

### إعداد Secrets

في إعدادات المستودع، أضف المتغيرات التالية في Secrets:

```
WIN_CERTIFICATE_PATH          # مسار شهادة Windows (مُرمز base64)
WIN_CERTIFICATE_PASSWORD      # كلمة مرور الشهادة
MAC_DEVELOPER_ID_APPLICATION  # Developer ID لـ macOS
MAC_APPLE_ID                  # Apple ID
MAC_APPLE_ID_PASSWORD         # كلمة مرور Apple ID
LINUX_GPG_KEY_ID             # معرف مفتاح GPG
LINUX_GPG_PASSPHRASE         # كلمة مرور GPG
```

### إنشاء إصدار جديد

```bash
# إنشاء tag جديد
git tag v1.0.0
git push origin v1.0.0

# سيتم تشغيل GitHub Actions تلقائياً
```

## اختبار المثبتات

### Windows

```bash
# تثبيت صامت
Building-Forge-Setup-1.0.0.exe /S

# تثبيت مع خيارات
Building-Forge-Setup-1.0.0.exe /D=C:\CustomPath
```

### macOS

```bash
# تثبيت من DMG
hdiutil attach Building-Forge-1.0.0.dmg
cp -R "/Volumes/Building Forge/Building Forge.app" /Applications/
hdiutil detach "/Volumes/Building Forge"
```

### Linux

```bash
# تشغيل AppImage
chmod +x Building-Forge-1.0.0.AppImage
./Building-Forge-1.0.0.AppImage

# تثبيت DEB
sudo dpkg -i Building-Forge-1.0.0.deb
sudo apt-get install -f  # إصلاح التبعيات

# تثبيت RPM
sudo rpm -i Building-Forge-1.0.0.rpm
```

## استكشاف الأخطاء

### مشاكل شائعة

#### خطأ في البناء

```bash
# تنظيف وإعادة البناء
npm run clean
npm ci
npm run build:all
```

#### مشاكل التوقيع

```bash
# التحقق من إعدادات التوقيع
node scripts/code-signing.js validate

# بناء بدون توقيع
npm run build:production:win -- --skip-signing
```

#### مشاكل الأذونات (Linux/macOS)

```bash
# إعطاء أذونات التنفيذ
chmod +x scripts/*.js
chmod +x resources/*.sh
```

### سجلات التشخيص

```bash
# تشغيل مع سجلات مفصلة
DEBUG=electron-builder npm run build:production

# فحص تقرير البناء
cat release/build-report.json | jq '.'

# فحص تقرير التوقيع
cat release/signing-report.json | jq '.'
```

## الأمان

### أفضل الممارسات

1. **احم الشهادات**: لا تضع الشهادات في المستودع
2. **استخدم متغيرات البيئة**: لكلمات المرور والمفاتيح
3. **تحقق من التوقيعات**: قبل النشر
4. **استخدم HTTPS**: لجميع التحميلات
5. **احتفظ بنسخ احتياطية**: من الشهادات والمفاتيح

### التحقق من الأمان

```bash
# فحص الثغرات الأمنية
npm audit

# فحص التبعيات
npm run lint:check

# تشغيل اختبارات الأمان
npm run test:security
```

## الدعم

### الحصول على المساعدة

- **الوثائق**: راجع ملفات README و docs/
- **المشاكل**: أنشئ issue في GitHub
- **المجتمع**: انضم إلى Discord أو المنتدى

### الإبلاغ عن المشاكل

عند الإبلاغ عن مشكلة، يرجى تضمين:

- نظام التشغيل والإصدار
- إصدار Node.js و npm
- رسائل الخطأ الكاملة
- خطوات إعادة الإنتاج
- ملف build-report.json إذا كان متاحاً

---

**ملاحظة**: هذا الدليل يتم تحديثه باستمرار. تأكد من مراجعة أحدث إصدار قبل البناء.
