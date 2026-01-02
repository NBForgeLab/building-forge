#!/usr/bin/env node

/**
 * Building Forge - Complete Release Script
 * 
 * سكريبت شامل لإنشاء إصدار كامل مع جميع المراحل
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ReleaseManager {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.releaseDir = path.join(this.rootDir, 'release');
        this.version = this.getVersion();

        this.config = {
            skipTests: false,
            skipSigning: false,
            skipOptimization: false,
            platforms: ['win32', 'darwin', 'linux'],
            createTag: true,
            uploadToGitHub: false
        };
    }

    /**
     * تشغيل عملية الإصدار الكاملة
     */
    async createRelease(options = {}) {
        this.config = { ...this.config, ...options };

        console.log('🚀 بدء عملية الإصدار الكاملة...');
        console.log(`📦 الإصدار: ${this.version}`);
        console.log(`🎯 المنصات: ${this.config.platforms.join(', ')}`);

        try {
            // 1. التحضير والتحقق
            await this.prepare();

            // 2. تشغيل الاختبارات
            if (!this.config.skipTests) {
                await this.runTests();
            }

            // 3. بناء جميع المنصات
            await this.buildAllPlatforms();

            // 4. توقيع الملفات
            if (!this.config.skipSigning) {
                await this.signFiles();
            }

            // 5. اختبار المثبتات
            await this.testInstallers();

            // 6. إنشاء التقارير
            await this.generateReports();

            // 7. إنشاء tag في Git
            if (this.config.createTag) {
                await this.createGitTag();
            }

            // 8. رفع إلى GitHub (اختياري)
            if (this.config.uploadToGitHub) {
                await this.uploadToGitHub();
            }

            console.log('✅ تم إكمال عملية الإصدار بنجاح!');
            this.printReleaseSummary();

        } catch (error) {
            console.error('❌ فشل في عملية الإصدار:', error.message);
            process.exit(1);
        }
    }

    /**
     * التحضير والتحقق
     */
    async prepare() {
        console.log('🔧 التحضير والتحقق...');

        // التحقق من حالة Git
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            if (status.trim()) {
                console.log('⚠️  يوجد تغييرات غير محفوظة في Git');
                console.log('💡 يُنصح بحفظ جميع التغييرات قبل الإصدار');
            }
        } catch (error) {
            console.log('⚠️  لم يتم العثور على مستودع Git');
        }

        // التحقق من package.json
        const packagePath = path.join(this.rootDir, 'package.json');
        if (!fs.existsSync(packagePath)) {
            throw new Error('ملف package.json غير موجود');
        }

        // التحقق من التبعيات
        if (!fs.existsSync(path.join(this.rootDir, 'node_modules'))) {
            console.log('📦 تثبيت التبعيات...');
            execSync('npm ci', { stdio: 'inherit', cwd: this.rootDir });
        }

        // تنظيف المجلدات السابقة
        if (fs.existsSync(this.releaseDir)) {
            fs.rmSync(this.releaseDir, { recursive: true, force: true });
        }

        console.log('✅ تم التحضير بنجاح');
    }

    /**
     * تشغيل الاختبارات
     */
    async runTests() {
        console.log('🧪 تشغيل جميع الاختبارات...');

        try {
            execSync('npm run test:all', { stdio: 'inherit', cwd: this.rootDir });
            console.log('✅ نجحت جميع الاختبارات');
        } catch (error) {
            throw new Error('فشلت الاختبارات، لا يمكن المتابعة');
        }
    }

    /**
     * بناء جميع المنصات
     */
    async buildAllPlatforms() {
        console.log('🔨 بناء جميع المنصات...');

        const platformsArg = this.config.platforms.join(',');
        const skipFlags = [];

        if (this.config.skipTests) skipFlags.push('--skip-tests');
        if (this.config.skipSigning) skipFlags.push('--skip-signing');
        if (this.config.skipOptimization) skipFlags.push('--skip-optimization');

        const command = [
            'node scripts/build-all-platforms.js',
            `--platforms ${platformsArg}`,
            ...skipFlags
        ].join(' ');

        try {
            execSync(command, { stdio: 'inherit', cwd: this.rootDir });
            console.log('✅ تم بناء جميع المنصات بنجاح');
        } catch (error) {
            throw new Error('فشل في بناء المنصات');
        }
    }

    /**
     * توقيع الملفات
     */
    async signFiles() {
        console.log('🔐 توقيع الملفات...');

        try {
            execSync('node scripts/code-signing.js sign', {
                stdio: 'inherit',
                cwd: this.rootDir
            });
            console.log('✅ تم توقيع الملفات بنجاح');
        } catch (error) {
            console.log('⚠️  فشل في توقيع بعض الملفات:', error.message);
            // لا نوقف العملية، التوقيع اختياري
        }
    }

    /**
     * اختبار المثبتات
     */
    async testInstallers() {
        console.log('🧪 اختبار المثبتات...');

        try {
            execSync('node scripts/test-installers.js', {
                stdio: 'inherit',
                cwd: this.rootDir
            });
            console.log('✅ تم اختبار المثبتات بنجاح');
        } catch (error) {
            console.log('⚠️  فشل في اختبار بعض المثبتات:', error.message);
            // لا نوقف العملية، الاختبار للتحقق فقط
        }
    }

    /**
     * إنشاء التقارير
     */
    async generateReports() {
        console.log('📋 إنشاء التقارير النهائية...');

        const releaseReport = {
            version: this.version,
            timestamp: new Date().toISOString(),
            platform: process.platform,
            nodeVersion: process.version,
            config: this.config,
            files: [],
            summary: {
                totalFiles: 0,
                totalSize: 0,
                platforms: {},
                signed: 0,
                tested: 0
            }
        };

        // جمع معلومات الملفات
        if (fs.existsSync(this.releaseDir)) {
            const files = fs.readdirSync(this.releaseDir);

            for (const file of files) {
                const filePath = path.join(this.releaseDir, file);
                const stats = fs.statSync(filePath);

                if (stats.isFile() && !file.endsWith('.json') && !file.endsWith('.html')) {
                    const platform = this.detectPlatform(file);
                    const fileInfo = {
                        name: file,
                        size: stats.size,
                        sizeFormatted: this.formatBytes(stats.size),
                        platform: platform,
                        signed: this.isFileSigned(file),
                        type: this.getFileType(file)
                    };

                    releaseReport.files.push(fileInfo);
                    releaseReport.summary.totalFiles++;
                    releaseReport.summary.totalSize += stats.size;

                    if (!releaseReport.summary.platforms[platform]) {
                        releaseReport.summary.platforms[platform] = 0;
                    }
                    releaseReport.summary.platforms[platform]++;

                    if (fileInfo.signed) {
                        releaseReport.summary.signed++;
                    }
                }
            }
        }

        // كتابة التقرير النهائي
        const reportPath = path.join(this.releaseDir, 'release-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(releaseReport, null, 2));

        // إنشاء ملف README للإصدار
        this.generateReleaseReadme(releaseReport);

        console.log('✅ تم إنشاء التقارير النهائية');
    }

    /**
     * إنشاء README للإصدار
     */
    generateReleaseReadme(report) {
        const readmeContent = `# Building Forge ${report.version}

## معلومات الإصدار

- **الإصدار**: ${report.version}
- **تاريخ البناء**: ${new Date(report.timestamp).toLocaleString('ar-SA')}
- **إجمالي الملفات**: ${report.summary.totalFiles}
- **الحجم الإجمالي**: ${this.formatBytes(report.summary.totalSize)}

## الملفات المتاحة

### Windows
${report.files.filter(f => f.platform === 'Windows').map(f =>
            `- **${f.name}** (${f.sizeFormatted}) ${f.signed ? '🔐' : ''}`
        ).join('\n')}

### macOS
${report.files.filter(f => f.platform === 'macOS').map(f =>
            `- **${f.name}** (${f.sizeFormatted}) ${f.signed ? '🔐' : ''}`
        ).join('\n')}

### Linux
${report.files.filter(f => f.platform === 'Linux').map(f =>
            `- **${f.name}** (${f.sizeFormatted}) ${f.signed ? '🔐' : ''}`
        ).join('\n')}

## متطلبات النظام

### Windows
- Windows 7 أو أحدث (64-bit مُوصى به)
- 4 GB RAM كحد أدنى، 8 GB مُوصى به
- 2 GB مساحة فارغة على القرص الصلب
- بطاقة رسومات تدعم OpenGL 3.3

### macOS
- macOS 10.14 (Mojave) أو أحدث
- 4 GB RAM كحد أدنى، 8 GB مُوصى به
- 2 GB مساحة فارغة على القرص الصلب
- بطاقة رسومات تدعم Metal أو OpenGL 3.3

### Linux
- توزيعة Linux حديثة (Ubuntu 18.04+, Fedora 30+, إلخ)
- 4 GB RAM كحد أدنى، 8 GB مُوصى به
- 2 GB مساحة فارغة على القرص الصلب
- بطاقة رسومات تدعم OpenGL 3.3
- مكتبات النظام: libgtk-3, libx11, libxss

## التثبيت

### Windows
1. حمل \`Building-Forge-Setup-${report.version}.exe\`
2. شغل المثبت كمدير
3. اتبع تعليمات المثبت

### macOS
1. حمل \`Building-Forge-${report.version}.dmg\`
2. افتح ملف DMG
3. اسحب التطبيق إلى مجلد Applications

### Linux
#### AppImage (مُوصى به)
1. حمل \`Building-Forge-${report.version}.AppImage\`
2. اجعل الملف قابل للتنفيذ: \`chmod +x Building-Forge-${report.version}.AppImage\`
3. شغل الملف: \`./Building-Forge-${report.version}.AppImage\`

#### Debian/Ubuntu
\`\`\`bash
sudo dpkg -i Building-Forge-${report.version}.deb
sudo apt-get install -f  # إصلاح التبعيات إذا لزم الأمر
\`\`\`

#### Red Hat/Fedora
\`\`\`bash
sudo rpm -i Building-Forge-${report.version}.rpm
\`\`\`

## التحقق من سلامة الملفات

استخدم ملف \`checksums.sha256\` للتحقق من سلامة الملفات:

\`\`\`bash
sha256sum -c checksums.sha256
\`\`\`

## الدعم

- **الوثائق**: [docs/](docs/)
- **المشاكل**: [GitHub Issues](https://github.com/building-forge/building-forge/issues)
- **المجتمع**: [Discord](https://discord.gg/building-forge)

## الترخيص

Building Forge مرخص تحت رخصة MIT. راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

**ملاحظة**: 🔐 يشير إلى أن الملف موقع رقمياً
`;

        const readmePath = path.join(this.releaseDir, 'README.md');
        fs.writeFileSync(readmePath, readmeContent);
    }

    /**
     * إنشاء Git tag
     */
    async createGitTag() {
        console.log('🏷️  إنشاء Git tag...');

        try {
            const tagName = `v${this.version}`;

            // التحقق من وجود tag
            try {
                execSync(`git rev-parse ${tagName}`, { stdio: 'ignore' });
                console.log(`⚠️  Tag ${tagName} موجود بالفعل`);
                return;
            } catch (error) {
                // Tag غير موجود، يمكن إنشاؤه
            }

            // إنشاء tag
            execSync(`git tag -a ${tagName} -m "Release ${this.version}"`, {
                stdio: 'inherit',
                cwd: this.rootDir
            });

            console.log(`✅ تم إنشاء tag ${tagName}`);
            console.log(`💡 لرفع tag إلى GitHub: git push origin ${tagName}`);

        } catch (error) {
            console.log('⚠️  فشل في إنشاء Git tag:', error.message);
        }
    }

    /**
     * رفع إلى GitHub
     */
    async uploadToGitHub() {
        console.log('☁️  رفع إلى GitHub...');

        try {
            // هذا يتطلب GitHub CLI أو إعداد خاص
            console.log('💡 لرفع الإصدار إلى GitHub، استخدم:');
            console.log(`   gh release create v${this.version} release/* --title "Building Forge ${this.version}" --notes-file release/README.md`);

        } catch (error) {
            console.log('⚠️  فشل في الرفع إلى GitHub:', error.message);
        }
    }

    /**
     * طباعة ملخص الإصدار
     */
    printReleaseSummary() {
        console.log('\n🎉 ملخص الإصدار:');
        console.log('==================');
        console.log(`📦 الإصدار: ${this.version}`);
        console.log(`📅 التاريخ: ${new Date().toLocaleString('ar-SA')}`);
        console.log(`📁 مجلد الإصدار: ${this.releaseDir}`);

        if (fs.existsSync(this.releaseDir)) {
            const files = fs.readdirSync(this.releaseDir).filter(f =>
                !f.endsWith('.json') && !f.endsWith('.html') && !f.endsWith('.md')
            );
            console.log(`📦 عدد الملفات: ${files.length}`);

            let totalSize = 0;
            files.forEach(file => {
                const filePath = path.join(this.releaseDir, file);
                totalSize += fs.statSync(filePath).size;
            });
            console.log(`📏 الحجم الإجمالي: ${this.formatBytes(totalSize)}`);
        }

        console.log('\n📋 الخطوات التالية:');
        console.log('1. راجع الملفات في مجلد release/');
        console.log('2. اختبر المثبتات على المنصات المختلفة');
        console.log('3. ارفع الإصدار إلى GitHub أو موقع التوزيع');
        console.log(`4. أعلن عن الإصدار الجديد ${this.version}`);
        console.log('==================\n');
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
     * التحقق من توقيع الملف
     */
    isFileSigned(filename) {
        const filePath = path.join(this.releaseDir, filename);

        // Windows: التحقق من التوقيع الرقمي
        if (filename.endsWith('.exe')) {
            try {
                execSync(`signtool verify /pa "${filePath}"`, { stdio: 'ignore' });
                return true;
            } catch (error) {
                return false;
            }
        }

        // Linux: التحقق من وجود ملف .sig
        if (filename.endsWith('.AppImage') || filename.endsWith('.deb') || filename.endsWith('.rpm')) {
            return fs.existsSync(`${filePath}.sig`);
        }

        // macOS: التحقق من code signature
        if (filename.endsWith('.dmg')) {
            try {
                execSync(`codesign --verify "${filePath}"`, { stdio: 'ignore' });
                return true;
            } catch (error) {
                return false;
            }
        }

        return false;
    }

    /**
     * الحصول على نوع الملف
     */
    getFileType(filename) {
        if (filename.endsWith('.exe')) return 'Windows Installer';
        if (filename.endsWith('.msi')) return 'Windows MSI';
        if (filename.endsWith('.dmg')) return 'macOS Disk Image';
        if (filename.endsWith('.pkg')) return 'macOS Package';
        if (filename.endsWith('.deb')) return 'Debian Package';
        if (filename.endsWith('.rpm')) return 'RPM Package';
        if (filename.endsWith('.AppImage')) return 'Linux AppImage';
        if (filename.endsWith('.tar.gz')) return 'Compressed Archive';
        if (filename.endsWith('.zip')) return 'ZIP Archive';
        return 'Unknown';
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
            case '--version':
                options.version = args[++i];
                break;
            case '--platforms':
                options.platforms = args[++i].split(',');
                break;
            case '--skip-tests':
                options.skipTests = true;
                break;
            case '--skip-signing':
                options.skipSigning = true;
                break;
            case '--skip-optimization':
                options.skipOptimization = true;
                break;
            case '--no-tag':
                options.createTag = false;
                break;
            case '--upload':
                options.uploadToGitHub = true;
                break;
            case '--help':
                console.log(`
استخدام: node release.js [options]

الخيارات:
  --version <version>     رقم الإصدار (افتراضي: من package.json)
  --platforms <list>      قائمة المنصات مفصولة بفواصل
  --skip-tests           تخطي الاختبارات
  --skip-signing         تخطي توقيع الكود
  --skip-optimization    تخطي تحسين الحزم
  --no-tag               عدم إنشاء Git tag
  --upload               رفع إلى GitHub
  --help                 عرض هذه المساعدة

أمثلة:
  node release.js
  node release.js --platforms win32,linux --skip-tests
  node release.js --version 1.2.0 --upload
        `);
                process.exit(0);
        }
    }

    const manager = new ReleaseManager();
    manager.createRelease(options).catch(console.error);
}

module.exports = ReleaseManager;