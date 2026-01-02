#!/usr/bin/env node

/**
 * Building Forge - Production Build Script
 * 
 * هذا السكريبت يدير عملية بناء الإنتاج المتقدمة مع:
 * - تحسين الحزم والضغط
 * - إنشاء الأيقونات للمنصات المختلفة
 * - التحقق من سلامة البناء
 * - إعداد البيانات الوصفية
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionBuilder {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.distDir = path.join(this.rootDir, 'dist');
        this.releaseDir = path.join(this.rootDir, 'release');
        this.resourcesDir = path.join(this.rootDir, 'resources');
        this.iconsDir = path.join(this.resourcesDir, 'icons');

        this.platforms = {
            win32: { name: 'Windows', target: 'nsis', ext: '.exe' },
            darwin: { name: 'macOS', target: 'dmg', ext: '.dmg' },
            linux: { name: 'Linux', target: ['AppImage', 'deb', 'rpm'], ext: '.AppImage' }
        };
    }

    /**
     * تشغيل عملية البناء الكاملة
     */
    async build(options = {}) {
        const {
            platform = process.platform,
            skipTests = false,
            skipOptimization = false,
            skipSigning = false
        } = options;

        console.log('🚀 بدء عملية بناء الإنتاج المتقدمة...');
        console.log(`📦 المنصة المستهدفة: ${this.platforms[platform]?.name || platform}`);

        try {
            // 1. التحضير والتنظيف
            await this.prepare();

            // 2. إنشاء الأيقونات
            await this.generateIcons();

            // 3. تشغيل الاختبارات (اختياري)
            if (!skipTests) {
                await this.runTests();
            }

            // 4. بناء التطبيق
            await this.buildApplication();

            // 5. تحسين الحزم (اختياري)
            if (!skipOptimization) {
                await this.optimizeBundle();
            }

            // 6. إنشاء المثبتات
            await this.createInstallers(platform, !skipSigning);

            // 7. التحقق من سلامة البناء
            await this.verifyBuild();

            console.log('✅ تم إكمال عملية البناء بنجاح!');
            this.printBuildSummary();

        } catch (error) {
            console.error('❌ فشل في عملية البناء:', error.message);
            process.exit(1);
        }
    }

    /**
     * تحضير بيئة البناء
     */
    async prepare() {
        console.log('🧹 تنظيف المجلدات السابقة...');

        // حذف المجلدات القديمة
        if (fs.existsSync(this.distDir)) {
            fs.rmSync(this.distDir, { recursive: true, force: true });
        }
        if (fs.existsSync(this.releaseDir)) {
            fs.rmSync(this.releaseDir, { recursive: true, force: true });
        }

        // إنشاء المجلدات المطلوبة
        fs.mkdirSync(this.distDir, { recursive: true });
        fs.mkdirSync(this.releaseDir, { recursive: true });
        fs.mkdirSync(this.iconsDir, { recursive: true });

        console.log('✅ تم تحضير بيئة البناء');
    }

    /**
     * إنشاء الأيقونات للمنصات المختلفة
     */
    async generateIcons() {
        console.log('🎨 إنشاء الأيقونات للمنصات المختلفة...');

        const baseIcon = path.join(this.resourcesDir, 'icon.png');

        if (!fs.existsSync(baseIcon)) {
            console.log('⚠️  لم يتم العثور على الأيقونة الأساسية، سيتم إنشاء أيقونة افتراضية');
            await this.createDefaultIcon();
        }

        // إنشاء أيقونات Windows (.ico)
        await this.createWindowsIcon();

        // إنشاء أيقونات macOS (.icns)
        await this.createMacIcon();

        // إنشاء أيقونات Linux (مقاسات مختلفة)
        await this.createLinuxIcons();

        console.log('✅ تم إنشاء جميع الأيقونات');
    }

    /**
     * إنشاء أيقونة افتراضية
     */
    async createDefaultIcon() {
        // إنشاء أيقونة SVG بسيطة
        const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#grad1)"/>
  <g fill="white" transform="translate(128,128)">
    <!-- Building icon -->
    <rect x="0" y="100" width="60" height="156" rx="4"/>
    <rect x="80" y="80" width="60" height="176" rx="4"/>
    <rect x="160" y="60" width="60" height="196" rx="4"/>
    <rect x="240" y="40" width="60" height="216" rx="4"/>
    
    <!-- Windows -->
    <rect x="10" y="120" width="12" height="12" fill="#4F46E5"/>
    <rect x="30" y="120" width="12" height="12" fill="#4F46E5"/>
    <rect x="10" y="140" width="12" height="12" fill="#4F46E5"/>
    <rect x="30" y="140" width="12" height="12" fill="#4F46E5"/>
    
    <rect x="90" y="100" width="12" height="12" fill="#4F46E5"/>
    <rect x="110" y="100" width="12" height="12" fill="#4F46E5"/>
    <rect x="90" y="120" width="12" height="12" fill="#4F46E5"/>
    <rect x="110" y="120" width="12" height="12" fill="#4F46E5"/>
    
    <rect x="170" y="80" width="12" height="12" fill="#4F46E5"/>
    <rect x="190" y="80" width="12" height="12" fill="#4F46E5"/>
    <rect x="170" y="100" width="12" height="12" fill="#4F46E5"/>
    <rect x="190" y="100" width="12" height="12" fill="#4F46E5"/>
    
    <rect x="250" y="60" width="12" height="12" fill="#4F46E5"/>
    <rect x="270" y="60" width="12" height="12" fill="#4F46E5"/>
    <rect x="250" y="80" width="12" height="12" fill="#4F46E5"/>
    <rect x="270" y="80" width="12" height="12" fill="#4F46E5"/>
  </g>
  
  <!-- Logo text -->
  <text x="256" y="400" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">BF</text>
</svg>`;

        fs.writeFileSync(path.join(this.resourcesDir, 'icon.svg'), svgIcon);

        // محاولة تحويل SVG إلى PNG باستخدام أدوات النظام
        try {
            // استخدام ImageMagick إذا كان متاحاً
            execSync(`magick convert "${path.join(this.resourcesDir, 'icon.svg')}" -resize 512x512 "${path.join(this.resourcesDir, 'icon.png')}"`, { stdio: 'ignore' });
        } catch (error) {
            console.log('⚠️  ImageMagick غير متاح، سيتم استخدام الأيقونة الافتراضية');
            // إنشاء ملف PNG بسيط (placeholder)
            const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(path.join(this.resourcesDir, 'icon.png'), pngData);
        }
    }

    /**
     * إنشاء أيقونة Windows (.ico)
     */
    async createWindowsIcon() {
        const iconPath = path.join(this.resourcesDir, 'icon.ico');

        try {
            // محاولة استخدام ImageMagick لإنشاء .ico
            execSync(`magick convert "${path.join(this.resourcesDir, 'icon.png')}" -resize 256x256 "${iconPath}"`, { stdio: 'ignore' });
        } catch (error) {
            console.log('⚠️  لم يتم إنشاء أيقونة Windows، سيتم استخدام PNG');
        }
    }

    /**
     * إنشاء أيقونة macOS (.icns)
     */
    async createMacIcon() {
        const iconPath = path.join(this.resourcesDir, 'icon.icns');

        try {
            // محاولة استخدام iconutil على macOS
            if (process.platform === 'darwin') {
                const iconsetDir = path.join(this.iconsDir, 'icon.iconset');
                fs.mkdirSync(iconsetDir, { recursive: true });

                // إنشاء مقاسات مختلفة
                const sizes = [16, 32, 64, 128, 256, 512, 1024];
                for (const size of sizes) {
                    execSync(`sips -z ${size} ${size} "${path.join(this.resourcesDir, 'icon.png')}" --out "${path.join(iconsetDir, `icon_${size}x${size}.png`)}"`, { stdio: 'ignore' });
                }

                execSync(`iconutil -c icns "${iconsetDir}" -o "${iconPath}"`, { stdio: 'ignore' });
                fs.rmSync(iconsetDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.log('⚠️  لم يتم إنشاء أيقونة macOS، سيتم استخدام PNG');
        }
    }

    /**
     * إنشاء أيقونات Linux
     */
    async createLinuxIcons() {
        const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512];

        for (const size of sizes) {
            try {
                const iconPath = path.join(this.iconsDir, `icon_${size}x${size}.png`);
                execSync(`magick convert "${path.join(this.resourcesDir, 'icon.png')}" -resize ${size}x${size} "${iconPath}"`, { stdio: 'ignore' });
            } catch (error) {
                // تجاهل الأخطاء للأيقونات الفردية
            }
        }
    }

    /**
     * تشغيل الاختبارات
     */
    async runTests() {
        console.log('🧪 تشغيل الاختبارات...');

        try {
            execSync('npm run test:all', { stdio: 'inherit', cwd: this.rootDir });
            console.log('✅ نجحت جميع الاختبارات');
        } catch (error) {
            throw new Error('فشلت الاختبارات، لا يمكن المتابعة');
        }
    }

    /**
     * بناء التطبيق
     */
    async buildApplication() {
        console.log('🔨 بناء التطبيق...');

        try {
            execSync('npm run build', { stdio: 'inherit', cwd: this.rootDir });
            console.log('✅ تم بناء التطبيق بنجاح');
        } catch (error) {
            throw new Error('فشل في بناء التطبيق');
        }
    }

    /**
     * تحسين الحزم
     */
    async optimizeBundle() {
        console.log('⚡ تحسين الحزم...');

        // تحسين ملفات JavaScript
        await this.optimizeJavaScript();

        // تحسين الأصول
        await this.optimizeAssets();

        console.log('✅ تم تحسين الحزم');
    }

    /**
     * تحسين ملفات JavaScript
     */
    async optimizeJavaScript() {
        // البحث عن ملفات JS في dist
        const jsFiles = this.findFiles(this.distDir, '.js');

        for (const file of jsFiles) {
            try {
                // قراءة الملف
                let content = fs.readFileSync(file, 'utf8');

                // إزالة console.log في الإنتاج
                content = content.replace(/console\.log\([^)]*\);?/g, '');

                // إزالة التعليقات الزائدة
                content = content.replace(/\/\*[\s\S]*?\*\//g, '');
                content = content.replace(/\/\/.*$/gm, '');

                // كتابة الملف المحسن
                fs.writeFileSync(file, content);
            } catch (error) {
                console.log(`⚠️  لم يتم تحسين ${file}`);
            }
        }
    }

    /**
     * تحسين الأصول
     */
    async optimizeAssets() {
        // البحث عن ملفات الصور
        const imageFiles = [
            ...this.findFiles(this.distDir, '.png'),
            ...this.findFiles(this.distDir, '.jpg'),
            ...this.findFiles(this.distDir, '.jpeg')
        ];

        for (const file of imageFiles) {
            try {
                // محاولة ضغط الصور باستخدام ImageMagick
                execSync(`magick mogrify -strip -quality 85 "${file}"`, { stdio: 'ignore' });
            } catch (error) {
                // تجاهل أخطاء الضغط
            }
        }
    }

    /**
     * إنشاء المثبتات
     */
    async createInstallers(platform, enableSigning = false) {
        console.log('📦 إنشاء المثبتات...');

        const buildCommand = this.getBuildCommand(platform, enableSigning);

        try {
            execSync(buildCommand, { stdio: 'inherit', cwd: this.rootDir });
            console.log('✅ تم إنشاء المثبتات بنجاح');
        } catch (error) {
            throw new Error('فشل في إنشاء المثبتات');
        }
    }

    /**
     * الحصول على أمر البناء للمنصة
     */
    getBuildCommand(platform, enableSigning) {
        let command = 'electron-builder';

        switch (platform) {
            case 'win32':
                command += ' --win';
                if (enableSigning) {
                    command += ' --publish=never'; // تعطيل النشر التلقائي مع التوقيع
                }
                break;
            case 'darwin':
                command += ' --mac';
                if (enableSigning) {
                    command += ' --publish=never';
                }
                break;
            case 'linux':
                command += ' --linux';
                break;
            default:
                // بناء لجميع المنصات
                break;
        }

        return command;
    }

    /**
     * التحقق من سلامة البناء
     */
    async verifyBuild() {
        console.log('🔍 التحقق من سلامة البناء...');

        // التحقق من وجود الملفات المطلوبة
        const requiredFiles = [
            path.join(this.distDir, 'main', 'main.js'),
            path.join(this.distDir, 'renderer', 'index.html')
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`ملف مطلوب مفقود: ${file}`);
            }
        }

        // التحقق من وجود المثبتات
        if (fs.existsSync(this.releaseDir)) {
            const releaseFiles = fs.readdirSync(this.releaseDir);
            if (releaseFiles.length === 0) {
                throw new Error('لم يتم إنشاء أي مثبتات');
            }
        }

        console.log('✅ تم التحقق من سلامة البناء');
    }

    /**
     * طباعة ملخص البناء
     */
    printBuildSummary() {
        console.log('\n📊 ملخص البناء:');
        console.log('================');

        // حجم التطبيق
        const distSize = this.getDirectorySize(this.distDir);
        console.log(`📁 حجم التطبيق: ${this.formatBytes(distSize)}`);

        // المثبتات المنشأة
        if (fs.existsSync(this.releaseDir)) {
            const releaseFiles = fs.readdirSync(this.releaseDir);
            console.log(`📦 المثبتات المنشأة: ${releaseFiles.length}`);

            for (const file of releaseFiles) {
                const filePath = path.join(this.releaseDir, file);
                const fileSize = fs.statSync(filePath).size;
                console.log(`   - ${file} (${this.formatBytes(fileSize)})`);
            }
        }

        console.log(`⏰ وقت البناء: ${new Date().toLocaleString('ar-SA')}`);
        console.log('================\n');
    }

    /**
     * البحث عن ملفات بامتداد معين
     */
    findFiles(dir, extension) {
        const files = [];

        if (!fs.existsSync(dir)) return files;

        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                files.push(...this.findFiles(fullPath, extension));
            } else if (item.name.endsWith(extension)) {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * حساب حجم المجلد
     */
    getDirectorySize(dir) {
        let size = 0;

        if (!fs.existsSync(dir)) return size;

        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                size += this.getDirectorySize(fullPath);
            } else {
                size += fs.statSync(fullPath).size;
            }
        }

        return size;
    }

    /**
     * تنسيق حجم الملف
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// تشغيل السكريبت
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    // تحليل المعاملات
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--platform':
                options.platform = args[++i];
                break;
            case '--skip-tests':
                options.skipTests = true;
                break;
            case '--skip-optimization':
                options.skipOptimization = true;
                break;
            case '--skip-signing':
                options.skipSigning = true;
                break;
            case '--help':
                console.log(`
استخدام: node build-production.js [options]

الخيارات:
  --platform <platform>    المنصة المستهدفة (win32, darwin, linux)
  --skip-tests            تخطي الاختبارات
  --skip-optimization     تخطي تحسين الحزم
  --skip-signing          تخطي توقيع الكود
  --help                  عرض هذه المساعدة
        `);
                process.exit(0);
        }
    }

    const builder = new ProductionBuilder();
    builder.build(options).catch(console.error);
}

module.exports = ProductionBuilder;