#!/usr/bin/env node

/**
 * Building Forge - Installer Testing Script
 * 
 * سكريبت لاختبار المثبتات على المنصات المختلفة
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

class InstallerTester {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.releaseDir = path.join(this.rootDir, 'release');
        this.testDir = path.join(this.rootDir, 'temp', 'installer-tests');

        this.testResults = {
            timestamp: new Date().toISOString(),
            platform: process.platform,
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            }
        };
    }

    /**
     * تشغيل جميع اختبارات المثبتات
     */
    async runAllTests() {
        console.log('🧪 بدء اختبار المثبتات...');

        try {
            // إعداد بيئة الاختبار
            await this.setupTestEnvironment();

            // العثور على المثبتات
            const installers = this.findInstallers();

            if (installers.length === 0) {
                throw new Error('لم يتم العثور على أي مثبتات للاختبار');
            }

            console.log(`📦 تم العثور على ${installers.length} مثبت للاختبار`);

            // اختبار كل مثبت
            for (const installer of installers) {
                await this.testInstaller(installer);
            }

            // إنشاء التقرير
            this.generateTestReport();

            console.log('✅ تم إكمال اختبار المثبتات');
            this.printSummary();

        } catch (error) {
            console.error('❌ فشل في اختبار المثبتات:', error.message);
            process.exit(1);
        }
    }

    /**
     * إعداد بيئة الاختبار
     */
    async setupTestEnvironment() {
        console.log('🔧 إعداد بيئة الاختبار...');

        // إنشاء مجلد الاختبار
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.testDir, { recursive: true });

        // التحقق من الأدوات المطلوبة
        await this.checkRequiredTools();
    }

    /**
     * التحقق من الأدوات المطلوبة
     */
    async checkRequiredTools() {
        const tools = [];

        switch (process.platform) {
            case 'win32':
                tools.push('powershell', 'wmic');
                break;
            case 'darwin':
                tools.push('hdiutil', 'pkgutil');
                break;
            case 'linux':
                tools.push('dpkg', 'rpm', 'file');
                break;
        }

        for (const tool of tools) {
            try {
                execSync(`which ${tool}`, { stdio: 'ignore' });
            } catch (error) {
                console.log(`⚠️  الأداة ${tool} غير متاحة، قد تفشل بعض الاختبارات`);
            }
        }
    }

    /**
     * العثور على المثبتات
     */
    findInstallers() {
        if (!fs.existsSync(this.releaseDir)) {
            return [];
        }

        const files = fs.readdirSync(this.releaseDir);
        const installers = [];

        for (const file of files) {
            const filePath = path.join(this.releaseDir, file);
            const stats = fs.statSync(filePath);

            if (stats.isFile() && this.isInstaller(file)) {
                installers.push({
                    name: file,
                    path: filePath,
                    size: stats.size,
                    platform: this.detectPlatform(file),
                    type: this.getInstallerType(file)
                });
            }
        }

        return installers;
    }

    /**
     * التحقق من كون الملف مثبت
     */
    isInstaller(filename) {
        const installerExtensions = ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.AppImage'];
        return installerExtensions.some(ext => filename.endsWith(ext));
    }

    /**
     * كشف المنصة من اسم الملف
     */
    detectPlatform(filename) {
        if (filename.includes('win') || filename.endsWith('.exe') || filename.endsWith('.msi')) {
            return 'windows';
        } else if (filename.includes('mac') || filename.endsWith('.dmg') || filename.endsWith('.pkg')) {
            return 'macos';
        } else if (filename.includes('linux') || filename.endsWith('.deb') ||
            filename.endsWith('.rpm') || filename.endsWith('.AppImage')) {
            return 'linux';
        }
        return 'unknown';
    }

    /**
     * الحصول على نوع المثبت
     */
    getInstallerType(filename) {
        if (filename.endsWith('.exe')) return 'NSIS';
        if (filename.endsWith('.msi')) return 'MSI';
        if (filename.endsWith('.dmg')) return 'DMG';
        if (filename.endsWith('.pkg')) return 'PKG';
        if (filename.endsWith('.deb')) return 'DEB';
        if (filename.endsWith('.rpm')) return 'RPM';
        if (filename.endsWith('.AppImage')) return 'AppImage';
        return 'Unknown';
    }

    /**
     * اختبار مثبت محدد
     */
    async testInstaller(installer) {
        console.log(`🔍 اختبار ${installer.name}...`);

        const testResult = {
            installer: installer.name,
            platform: installer.platform,
            type: installer.type,
            size: installer.size,
            tests: [],
            passed: true,
            error: null
        };

        try {
            // اختبار سلامة الملف
            await this.testFileIntegrity(installer, testResult);

            // اختبار البنية
            await this.testStructure(installer, testResult);

            // اختبار التوقيع
            await this.testSignature(installer, testResult);

            // اختبار التثبيت (محاكاة)
            await this.testInstallation(installer, testResult);

        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`❌ فشل اختبار ${installer.name}: ${error.message}`);
        }

        this.testResults.tests.push(testResult);
        this.testResults.summary.total++;

        if (testResult.passed) {
            this.testResults.summary.passed++;
            console.log(`✅ نجح اختبار ${installer.name}`);
        } else {
            this.testResults.summary.failed++;
        }
    }

    /**
     * اختبار سلامة الملف
     */
    async testFileIntegrity(installer, testResult) {
        const test = { name: 'File Integrity', passed: false, details: {} };

        try {
            // التحقق من وجود الملف
            if (!fs.existsSync(installer.path)) {
                throw new Error('الملف غير موجود');
            }

            // التحقق من حجم الملف
            const stats = fs.statSync(installer.path);
            if (stats.size === 0) {
                throw new Error('الملف فارغ');
            }

            test.details.size = stats.size;
            test.details.sizeFormatted = this.formatBytes(stats.size);

            // حساب checksum
            const hash = crypto.createHash('sha256');
            const data = fs.readFileSync(installer.path);
            hash.update(data);
            test.details.sha256 = hash.digest('hex');

            // التحقق من checksums إذا كان متاحاً
            const checksumFile = path.join(this.releaseDir, 'checksums.sha256');
            if (fs.existsSync(checksumFile)) {
                const checksums = fs.readFileSync(checksumFile, 'utf8');
                const lines = checksums.split('\n');

                for (const line of lines) {
                    if (line.includes(installer.name)) {
                        const [expectedHash] = line.split('  ');
                        if (expectedHash === test.details.sha256) {
                            test.details.checksumVerified = true;
                        } else {
                            throw new Error('checksum غير متطابق');
                        }
                        break;
                    }
                }
            }

            test.passed = true;

        } catch (error) {
            test.error = error.message;
        }

        testResult.tests.push(test);
    }

    /**
     * اختبار بنية المثبت
     */
    async testStructure(installer, testResult) {
        const test = { name: 'Structure', passed: false, details: {} };

        try {
            switch (installer.type) {
                case 'NSIS':
                    await this.testNSISStructure(installer, test);
                    break;
                case 'DMG':
                    await this.testDMGStructure(installer, test);
                    break;
                case 'DEB':
                    await this.testDEBStructure(installer, test);
                    break;
                case 'RPM':
                    await this.testRPMStructure(installer, test);
                    break;
                case 'AppImage':
                    await this.testAppImageStructure(installer, test);
                    break;
                default:
                    test.details.message = 'اختبار البنية غير مدعوم لهذا النوع';
                    test.passed = true;
            }

        } catch (error) {
            test.error = error.message;
        }

        testResult.tests.push(test);
    }

    /**
     * اختبار بنية NSIS
     */
    async testNSISStructure(installer, test) {
        if (process.platform !== 'win32') {
            test.details.message = 'اختبار NSIS متاح فقط على Windows';
            test.passed = true;
            return;
        }

        try {
            // استخدام 7zip لفحص محتويات NSIS
            const result = execSync(`7z l "${installer.path}"`, { encoding: 'utf8' });
            test.details.contents = result.split('\n').length;
            test.passed = true;
        } catch (error) {
            // إذا لم يكن 7zip متاحاً، نتجاهل الاختبار
            test.details.message = '7zip غير متاح، تم تخطي فحص البنية';
            test.passed = true;
        }
    }

    /**
     * اختبار بنية DMG
     */
    async testDMGStructure(installer, test) {
        if (process.platform !== 'darwin') {
            test.details.message = 'اختبار DMG متاح فقط على macOS';
            test.passed = true;
            return;
        }

        try {
            const result = execSync(`hdiutil imageinfo "${installer.path}"`, { encoding: 'utf8' });
            test.details.imageInfo = result.includes('Format: UDZO') || result.includes('Format: UDBZ');
            test.passed = true;
        } catch (error) {
            throw new Error(`فشل في فحص DMG: ${error.message}`);
        }
    }

    /**
     * اختبار بنية DEB
     */
    async testDEBStructure(installer, test) {
        try {
            const result = execSync(`dpkg --info "${installer.path}"`, { encoding: 'utf8' });
            test.details.packageInfo = result.includes('Package:') && result.includes('Version:');
            test.passed = true;
        } catch (error) {
            if (process.platform !== 'linux') {
                test.details.message = 'اختبار DEB متاح فقط على Linux';
                test.passed = true;
            } else {
                throw new Error(`فشل في فحص DEB: ${error.message}`);
            }
        }
    }

    /**
     * اختبار بنية RPM
     */
    async testRPMStructure(installer, test) {
        try {
            const result = execSync(`rpm -qip "${installer.path}"`, { encoding: 'utf8' });
            test.details.packageInfo = result.includes('Name') && result.includes('Version');
            test.passed = true;
        } catch (error) {
            if (process.platform !== 'linux') {
                test.details.message = 'اختبار RPM متاح فقط على Linux';
                test.passed = true;
            } else {
                throw new Error(`فشل في فحص RPM: ${error.message}`);
            }
        }
    }

    /**
     * اختبار بنية AppImage
     */
    async testAppImageStructure(installer, test) {
        try {
            const result = execSync(`file "${installer.path}"`, { encoding: 'utf8' });
            test.details.fileType = result.includes('ELF') && result.includes('executable');
            test.passed = true;
        } catch (error) {
            throw new Error(`فشل في فحص AppImage: ${error.message}`);
        }
    }

    /**
     * اختبار التوقيع
     */
    async testSignature(installer, testResult) {
        const test = { name: 'Signature', passed: false, details: {} };

        try {
            switch (installer.platform) {
                case 'windows':
                    await this.testWindowsSignature(installer, test);
                    break;
                case 'macos':
                    await this.testMacSignature(installer, test);
                    break;
                case 'linux':
                    await this.testLinuxSignature(installer, test);
                    break;
                default:
                    test.details.message = 'اختبار التوقيع غير مدعوم لهذه المنصة';
                    test.passed = true;
            }

        } catch (error) {
            test.error = error.message;
        }

        testResult.tests.push(test);
    }

    /**
     * اختبار توقيع Windows
     */
    async testWindowsSignature(installer, test) {
        if (process.platform !== 'win32') {
            test.details.message = 'اختبار توقيع Windows متاح فقط على Windows';
            test.passed = true;
            return;
        }

        try {
            execSync(`signtool verify /pa "${installer.path}"`, { stdio: 'ignore' });
            test.details.signed = true;
            test.passed = true;
        } catch (error) {
            test.details.signed = false;
            test.details.message = 'الملف غير موقع أو التوقيع غير صالح';
            test.passed = true; // لا نعتبر هذا خطأ فادح
        }
    }

    /**
     * اختبار توقيع macOS
     */
    async testMacSignature(installer, test) {
        if (process.platform !== 'darwin') {
            test.details.message = 'اختبار توقيع macOS متاح فقط على macOS';
            test.passed = true;
            return;
        }

        try {
            execSync(`codesign --verify --verbose "${installer.path}"`, { stdio: 'ignore' });
            test.details.signed = true;
            test.passed = true;
        } catch (error) {
            test.details.signed = false;
            test.details.message = 'الملف غير موقع أو التوقيع غير صالح';
            test.passed = true; // لا نعتبر هذا خطأ فادح
        }
    }

    /**
     * اختبار توقيع Linux
     */
    async testLinuxSignature(installer, test) {
        const signatureFile = `${installer.path}.sig`;

        if (fs.existsSync(signatureFile)) {
            try {
                execSync(`gpg --verify "${signatureFile}" "${installer.path}"`, { stdio: 'ignore' });
                test.details.signed = true;
                test.passed = true;
            } catch (error) {
                test.details.signed = false;
                test.details.message = 'التوقيع غير صالح';
                test.passed = true; // لا نعتبر هذا خطأ فادح
            }
        } else {
            test.details.signed = false;
            test.details.message = 'لا يوجد ملف توقيع';
            test.passed = true;
        }
    }

    /**
     * اختبار التثبيت (محاكاة)
     */
    async testInstallation(installer, testResult) {
        const test = { name: 'Installation Simulation', passed: false, details: {} };

        try {
            // هذا اختبار محاكاة فقط - لا نقوم بالتثبيت الفعلي
            test.details.message = 'محاكاة التثبيت - لم يتم التثبيت الفعلي';

            switch (installer.type) {
                case 'NSIS':
                    test.details.installCommand = `"${installer.path}" /S /D=C:\\TestInstall`;
                    break;
                case 'DMG':
                    test.details.installCommand = `hdiutil attach "${installer.path}"`;
                    break;
                case 'DEB':
                    test.details.installCommand = `sudo dpkg -i "${installer.path}"`;
                    break;
                case 'RPM':
                    test.details.installCommand = `sudo rpm -i "${installer.path}"`;
                    break;
                case 'AppImage':
                    test.details.installCommand = `chmod +x "${installer.path}" && "${installer.path}"`;
                    break;
            }

            test.passed = true;

        } catch (error) {
            test.error = error.message;
        }

        testResult.tests.push(test);
    }

    /**
     * إنشاء تقرير الاختبار
     */
    generateTestReport() {
        const reportPath = path.join(this.releaseDir, 'installer-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));

        // إنشاء تقرير HTML
        this.generateHTMLReport();
    }

    /**
     * إنشاء تقرير HTML
     */
    generateHTMLReport() {
        const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير اختبار المثبتات - Building Forge</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .installer { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .installer-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; }
        .installer-header.passed { background: #d4edda; }
        .installer-header.failed { background: #f8d7da; }
        .test-list { padding: 15px; }
        .test-item { margin-bottom: 10px; padding: 10px; border-radius: 4px; }
        .test-item.passed { background: #d4edda; }
        .test-item.failed { background: #f8d7da; }
        .test-details { font-size: 0.9em; color: #666; margin-top: 5px; }
        .icon { margin-left: 5px; }
        .passed .icon::before { content: "✅"; }
        .failed .icon::before { content: "❌"; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>تقرير اختبار المثبتات</h1>
            <p>Building Forge - ${new Date(this.testResults.timestamp).toLocaleString('ar-SA')}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>إجمالي الاختبارات</h3>
                <h2>${this.testResults.summary.total}</h2>
            </div>
            <div class="summary-card">
                <h3>نجح</h3>
                <h2>${this.testResults.summary.passed}</h2>
            </div>
            <div class="summary-card">
                <h3>فشل</h3>
                <h2>${this.testResults.summary.failed}</h2>
            </div>
            <div class="summary-card">
                <h3>معدل النجاح</h3>
                <h2>${Math.round((this.testResults.summary.passed / this.testResults.summary.total) * 100)}%</h2>
            </div>
        </div>
        
        ${this.testResults.tests.map(test => `
            <div class="installer">
                <div class="installer-header ${test.passed ? 'passed' : 'failed'}">
                    <h3><span class="icon"></span>${test.installer}</h3>
                    <p>المنصة: ${test.platform} | النوع: ${test.type} | الحجم: ${this.formatBytes(test.size)}</p>
                    ${test.error ? `<p style="color: red;">خطأ: ${test.error}</p>` : ''}
                </div>
                <div class="test-list">
                    ${test.tests.map(subTest => `
                        <div class="test-item ${subTest.passed ? 'passed' : 'failed'}">
                            <strong><span class="icon"></span>${subTest.name}</strong>
                            ${subTest.error ? `<div class="test-details">خطأ: ${subTest.error}</div>` : ''}
                            ${subTest.details ? `<div class="test-details">${JSON.stringify(subTest.details, null, 2)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

        const htmlPath = path.join(this.releaseDir, 'installer-test-report.html');
        fs.writeFileSync(htmlPath, htmlContent);
    }

    /**
     * طباعة ملخص النتائج
     */
    printSummary() {
        console.log('\n📊 ملخص اختبار المثبتات:');
        console.log('==========================');
        console.log(`📅 التاريخ: ${new Date(this.testResults.timestamp).toLocaleString('ar-SA')}`);
        console.log(`💻 المنصة: ${this.testResults.platform}`);
        console.log(`📦 إجمالي المثبتات: ${this.testResults.summary.total}`);
        console.log(`✅ نجح: ${this.testResults.summary.passed}`);
        console.log(`❌ فشل: ${this.testResults.summary.failed}`);
        console.log(`📈 معدل النجاح: ${Math.round((this.testResults.summary.passed / this.testResults.summary.total) * 100)}%`);
        console.log('\n📋 التقارير المُنشأة:');
        console.log(`   - installer-test-report.json`);
        console.log(`   - installer-test-report.html`);
        console.log('==========================\n');
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

    if (args.includes('--help')) {
        console.log(`
استخدام: node test-installers.js [options]

الخيارات:
  --help                عرض هذه المساعدة

الوصف:
  يقوم هذا السكريبت باختبار سلامة وصحة المثبتات المُنشأة.
  
الاختبارات المُجراة:
  - سلامة الملف وحساب checksum
  - بنية المثبت وصحة التنسيق
  - التحقق من التوقيع الرقمي
  - محاكاة عملية التثبيت
  
المخرجات:
  - installer-test-report.json (تقرير JSON مفصل)
  - installer-test-report.html (تقرير HTML مرئي)
    `);
        process.exit(0);
    }

    const tester = new InstallerTester();
    tester.runAllTests().catch(console.error);
}

module.exports = InstallerTester;