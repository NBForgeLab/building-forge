#!/usr/bin/env node

/**
 * Building Forge - Multi-Platform Build Script
 * 
 * سكريبت لبناء التطبيق لجميع المنصات المدعومة
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class MultiPlatformBuilder {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.releaseDir = path.join(this.rootDir, 'release');

        this.platforms = [
            { name: 'Windows', command: 'npm run build:production:win' },
            { name: 'macOS', command: 'npm run build:production:mac' },
            { name: 'Linux', command: 'npm run build:production:linux' }
        ];
    }

    /**
     * بناء جميع المنصات
     */
    async buildAll(options = {}) {
        const {
            skipTests = false,
            skipSigning = true,
            platforms = ['win32', 'darwin', 'linux']
        } = options;

        console.log('🚀 بدء بناء جميع المنصات...');
        console.log(`📦 المنصات المستهدفة: ${platforms.join(', ')}`);

        try {
            // تنظيف المجلد السابق
            this.cleanup();

            // تشغيل الاختبارات
            if (!skipTests) {
                await this.runTests();
            }

            // بناء كل منصة
            for (const platform of platforms) {
                await this.buildPlatform(platform, skipSigning);
            }

            // إنشاء checksums
            await this.generateChecksums();

            // إنشاء تقرير البناء
            this.generateBuildReport();

            console.log('✅ تم إكمال بناء جميع المنصات بنجاح!');

        } catch (error) {
            console.error('❌ فشل في البناء:', error.message);
            process.exit(1);
        }
    }

    /**
     * تنظيف المجلدات
     */
    cleanup() {
        console.log('🧹 تنظيف المجلدات السابقة...');

        if (fs.existsSync(this.releaseDir)) {
            fs.rmSync(this.releaseDir, { recursive: true, force: true });
        }

        fs.mkdirSync(this.releaseDir, { recursive: true });
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
            throw new Error('فشلت الاختبارات');
        }
    }

    /**
     * بناء منصة محددة
     */
    async buildPlatform(platform, skipSigning = true) {
        console.log(`🔨 بناء منصة ${platform}...`);

        try {
            const command = `node scripts/build-production.js --platform ${platform}${skipSigning ? ' --skip-signing' : ''}`;
            execSync(command, { stdio: 'inherit', cwd: this.rootDir });
            console.log(`✅ تم بناء ${platform} بنجاح`);
        } catch (error) {
            throw new Error(`فشل في بناء ${platform}: ${error.message}`);
        }
    }

    /**
     * إنشاء checksums
     */
    async generateChecksums() {
        console.log('🔢 إنشاء checksums...');

        try {
            execSync('node scripts/code-signing.js checksums', {
                stdio: 'inherit',
                cwd: this.rootDir
            });
            console.log('✅ تم إنشاء checksums');
        } catch (error) {
            console.log('⚠️  فشل في إنشاء checksums:', error.message);
        }
    }

    /**
     * إنشاء تقرير البناء
     */
    generateBuildReport() {
        console.log('📋 إنشاء تقرير البناء...');

        const report = {
            timestamp: new Date().toISOString(),
            version: this.getVersion(),
            platform: process.platform,
            node_version: process.version,
            files: []
        };

        if (fs.existsSync(this.releaseDir)) {
            const files = fs.readdirSync(this.releaseDir);

            for (const file of files) {
                const filePath = path.join(this.releaseDir, file);
                const stats = fs.statSync(filePath);

                if (stats.isFile()) {
                    report.files.push({
                        name: file,
                        size: stats.size,
                        sizeFormatted: this.formatBytes(stats.size),
                        platform: this.detectPlatform(file)
                    });
                }
            }
        }

        // كتابة التقرير
        const reportPath = path.join(this.releaseDir, 'build-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // طباعة ملخص
        this.printSummary(report);
    }

    /**
     * طباعة ملخص البناء
     */
    printSummary(report) {
        console.log('\n📊 ملخص البناء:');
        console.log('================');
        console.log(`📅 التاريخ: ${new Date(report.timestamp).toLocaleString('ar-SA')}`);
        console.log(`🏷️  الإصدار: ${report.version}`);
        console.log(`💻 المنصة: ${report.platform}`);
        console.log(`📦 عدد الملفات: ${report.files.length}`);

        // تجميع حسب المنصة
        const byPlatform = {};
        let totalSize = 0;

        for (const file of report.files) {
            const platform = file.platform || 'unknown';
            if (!byPlatform[platform]) {
                byPlatform[platform] = [];
            }
            byPlatform[platform].push(file);
            totalSize += file.size;
        }

        console.log(`📏 الحجم الإجمالي: ${this.formatBytes(totalSize)}`);
        console.log('\n📁 الملفات حسب المنصة:');

        for (const [platform, files] of Object.entries(byPlatform)) {
            console.log(`\n${this.getPlatformIcon(platform)} ${platform}:`);
            for (const file of files) {
                console.log(`   - ${file.name} (${file.sizeFormatted})`);
            }
        }

        console.log('\n================\n');
    }

    /**
     * كشف المنصة من اسم الملف
     */
    detectPlatform(filename) {
        if (filename.includes('win') || filename.endsWith('.exe')) {
            return 'Windows';
        } else if (filename.includes('mac') || filename.endsWith('.dmg')) {
            return 'macOS';
        } else if (filename.includes('linux') || filename.endsWith('.AppImage') ||
            filename.endsWith('.deb') || filename.endsWith('.rpm')) {
            return 'Linux';
        }
        return 'Unknown';
    }

    /**
     * الحصول على أيقونة المنصة
     */
    getPlatformIcon(platform) {
        switch (platform) {
            case 'Windows': return '🪟';
            case 'macOS': return '🍎';
            case 'Linux': return '🐧';
            default: return '❓';
        }
    }

    /**
     * الحصول على رقم الإصدار
     */
    getVersion() {
        try {
            const packageJson = JSON.parse(
                fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8')
            );
            return packageJson.version;
        } catch (error) {
            return '1.0.0';
        }
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
            case '--platforms':
                options.platforms = args[++i].split(',');
                break;
            case '--skip-tests':
                options.skipTests = true;
                break;
            case '--enable-signing':
                options.skipSigning = false;
                break;
            case '--help':
                console.log(`
استخدام: node build-all-platforms.js [options]

الخيارات:
  --platforms <list>      قائمة المنصات مفصولة بفواصل (win32,darwin,linux)
  --skip-tests           تخطي الاختبارات
  --enable-signing       تفعيل توقيع الكود
  --help                 عرض هذه المساعدة

أمثلة:
  node build-all-platforms.js
  node build-all-platforms.js --platforms win32,linux
  node build-all-platforms.js --skip-tests --enable-signing
        `);
                process.exit(0);
        }
    }

    const builder = new MultiPlatformBuilder();
    builder.buildAll(options).catch(console.error);
}

module.exports = MultiPlatformBuilder;