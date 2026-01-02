#!/usr/bin/env node

/**
 * Building Forge - Code Signing Service
 * 
 * خدمة توقيع الكود للمنصات المختلفة مع:
 * - توقيع Windows (Authenticode)
 * - توقيع macOS (Developer ID)
 * - توقيع Linux (GPG)
 * - إدارة الشهادات والمفاتيح
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class CodeSigningService {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.releaseDir = path.join(this.rootDir, 'release');
        this.certsDir = path.join(this.rootDir, '.certs');

        // إعدادات التوقيع من متغيرات البيئة
        this.signingConfig = {
            windows: {
                certificatePath: process.env.WIN_CERTIFICATE_PATH,
                certificatePassword: process.env.WIN_CERTIFICATE_PASSWORD,
                timestampUrl: process.env.WIN_TIMESTAMP_URL || 'http://timestamp.digicert.com',
                signtool: process.env.WIN_SIGNTOOL_PATH || 'signtool'
            },
            macos: {
                developerIdApplication: process.env.MAC_DEVELOPER_ID_APPLICATION,
                developerIdInstaller: process.env.MAC_DEVELOPER_ID_INSTALLER,
                appleId: process.env.MAC_APPLE_ID,
                appleIdPassword: process.env.MAC_APPLE_ID_PASSWORD,
                teamId: process.env.MAC_TEAM_ID
            },
            linux: {
                gpgKeyId: process.env.LINUX_GPG_KEY_ID,
                gpgPassphrase: process.env.LINUX_GPG_PASSPHRASE
            }
        };
    }

    /**
     * توقيع جميع المثبتات
     */
    async signAll() {
        console.log('🔐 بدء عملية توقيع الكود...');

        try {
            // التحقق من وجود مجلد الإصدارات
            if (!fs.existsSync(this.releaseDir)) {
                throw new Error('مجلد الإصدارات غير موجود');
            }

            const releaseFiles = fs.readdirSync(this.releaseDir);

            for (const file of releaseFiles) {
                const filePath = path.join(this.releaseDir, file);
                const platform = this.detectPlatform(file);

                if (platform) {
                    await this.signFile(filePath, platform);
                }
            }

            console.log('✅ تم توقيع جميع الملفات بنجاح');

        } catch (error) {
            console.error('❌ فشل في توقيع الكود:', error.message);
            throw error;
        }
    }

    /**
     * كشف المنصة من اسم الملف
     */
    detectPlatform(filename) {
        if (filename.endsWith('.exe') || filename.includes('win')) {
            return 'windows';
        } else if (filename.endsWith('.dmg') || filename.includes('mac')) {
            return 'macos';
        } else if (filename.endsWith('.AppImage') || filename.endsWith('.deb') || filename.endsWith('.rpm')) {
            return 'linux';
        }
        return null;
    }

    /**
     * توقيع ملف حسب المنصة
     */
    async signFile(filePath, platform) {
        console.log(`🔏 توقيع ${path.basename(filePath)} للمنصة ${platform}...`);

        switch (platform) {
            case 'windows':
                await this.signWindows(filePath);
                break;
            case 'macos':
                await this.signMacOS(filePath);
                break;
            case 'linux':
                await this.signLinux(filePath);
                break;
            default:
                console.log(`⚠️  منصة غير مدعومة: ${platform}`);
        }
    }

    /**
     * توقيع Windows باستخدام Authenticode
     */
    async signWindows(filePath) {
        const config = this.signingConfig.windows;

        if (!config.certificatePath || !config.certificatePassword) {
            console.log('⚠️  شهادة Windows غير متاحة، سيتم تخطي التوقيع');
            return;
        }

        try {
            // التحقق من وجود signtool
            execSync(`${config.signtool} /?`, { stdio: 'ignore' });
        } catch (error) {
            console.log('⚠️  signtool غير متاح، سيتم تخطي توقيع Windows');
            return;
        }

        try {
            const command = [
                config.signtool,
                'sign',
                '/f', `"${config.certificatePath}"`,
                '/p', config.certificatePassword,
                '/t', config.timestampUrl,
                '/fd', 'SHA256',
                '/v',
                `"${filePath}"`
            ].join(' ');

            execSync(command, { stdio: 'inherit' });

            // التحقق من التوقيع
            const verifyCommand = [
                config.signtool,
                'verify',
                '/pa',
                '/v',
                `"${filePath}"`
            ].join(' ');

            execSync(verifyCommand, { stdio: 'inherit' });

            console.log('✅ تم توقيع Windows بنجاح');

        } catch (error) {
            throw new Error(`فشل في توقيع Windows: ${error.message}`);
        }
    }

    /**
     * توقيع macOS باستخدام Developer ID
     */
    async signMacOS(filePath) {
        const config = this.signingConfig.macos;

        if (!config.developerIdApplication) {
            console.log('⚠️  Developer ID غير متاح، سيتم تخطي توقيع macOS');
            return;
        }

        try {
            // التوقيع
            const signCommand = [
                'codesign',
                '--sign', `"${config.developerIdApplication}"`,
                '--force',
                '--verbose',
                '--options', 'runtime',
                '--timestamp',
                `"${filePath}"`
            ].join(' ');

            execSync(signCommand, { stdio: 'inherit' });

            // التحقق من التوقيع
            const verifyCommand = [
                'codesign',
                '--verify',
                '--verbose',
                `"${filePath}"`
            ].join(' ');

            execSync(verifyCommand, { stdio: 'inherit' });

            // Notarization (إذا كانت المعلومات متاحة)
            if (config.appleId && config.appleIdPassword) {
                await this.notarizeMacOS(filePath, config);
            }

            console.log('✅ تم توقيع macOS بنجاح');

        } catch (error) {
            throw new Error(`فشل في توقيع macOS: ${error.message}`);
        }
    }

    /**
     * Notarization لـ macOS
     */
    async notarizeMacOS(filePath, config) {
        console.log('📋 بدء عملية Notarization...');

        try {
            // رفع للـ notarization
            const submitCommand = [
                'xcrun',
                'altool',
                '--notarize-app',
                '--primary-bundle-id', 'com.buildingforge.app',
                '--username', config.appleId,
                '--password', config.appleIdPassword,
                '--file', `"${filePath}"`
            ].join(' ');

            const result = execSync(submitCommand, { encoding: 'utf8' });

            // استخراج RequestUUID
            const uuidMatch = result.match(/RequestUUID = ([a-f0-9-]+)/);
            if (!uuidMatch) {
                throw new Error('لم يتم العثور على RequestUUID');
            }

            const requestUUID = uuidMatch[1];
            console.log(`📋 RequestUUID: ${requestUUID}`);

            // انتظار اكتمال Notarization
            await this.waitForNotarization(requestUUID, config);

            // Staple التوقيع
            const stapleCommand = [
                'xcrun',
                'stapler',
                'staple',
                `"${filePath}"`
            ].join(' ');

            execSync(stapleCommand, { stdio: 'inherit' });

            console.log('✅ تم إكمال Notarization بنجاح');

        } catch (error) {
            console.log(`⚠️  فشل في Notarization: ${error.message}`);
            // لا نرمي خطأ هنا لأن التوقيع نجح
        }
    }

    /**
     * انتظار اكتمال Notarization
     */
    async waitForNotarization(requestUUID, config, maxAttempts = 30) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`📋 فحص حالة Notarization (${attempt}/${maxAttempts})...`);

            try {
                const checkCommand = [
                    'xcrun',
                    'altool',
                    '--notarization-info', requestUUID,
                    '--username', config.appleId,
                    '--password', config.appleIdPassword
                ].join(' ');

                const result = execSync(checkCommand, { encoding: 'utf8' });

                if (result.includes('Status: success')) {
                    console.log('✅ Notarization مكتمل بنجاح');
                    return;
                } else if (result.includes('Status: invalid')) {
                    throw new Error('Notarization فشل');
                }

                // انتظار دقيقة قبل المحاولة التالية
                await new Promise(resolve => setTimeout(resolve, 60000));

            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
            }
        }

        throw new Error('انتهت مهلة انتظار Notarization');
    }

    /**
     * توقيع Linux باستخدام GPG
     */
    async signLinux(filePath) {
        const config = this.signingConfig.linux;

        if (!config.gpgKeyId) {
            console.log('⚠️  مفتاح GPG غير متاح، سيتم تخطي توقيع Linux');
            return;
        }

        try {
            // التحقق من وجود GPG
            execSync('gpg --version', { stdio: 'ignore' });
        } catch (error) {
            console.log('⚠️  GPG غير متاح، سيتم تخطي توقيع Linux');
            return;
        }

        try {
            const signatureFile = `${filePath}.sig`;

            // إنشاء التوقيع
            const signCommand = [
                'gpg',
                '--batch',
                '--yes',
                '--armor',
                '--detach-sign',
                '--default-key', config.gpgKeyId,
                '--output', `"${signatureFile}"`,
                `"${filePath}"`
            ].join(' ');

            // إعداد كلمة المرور إذا كانت متاحة
            const env = { ...process.env };
            if (config.gpgPassphrase) {
                env.GNUPGHOME = this.certsDir;
                // إنشاء ملف كلمة المرور المؤقت
                const passphraseFile = path.join(this.certsDir, 'passphrase');
                fs.mkdirSync(this.certsDir, { recursive: true });
                fs.writeFileSync(passphraseFile, config.gpgPassphrase);
                env.GPG_PASSPHRASE_FILE = passphraseFile;
            }

            execSync(signCommand, { stdio: 'inherit', env });

            // التحقق من التوقيع
            const verifyCommand = [
                'gpg',
                '--verify',
                `"${signatureFile}"`,
                `"${filePath}"`
            ].join(' ');

            execSync(verifyCommand, { stdio: 'inherit', env });

            console.log('✅ تم توقيع Linux بنجاح');

            // تنظيف ملف كلمة المرور
            if (config.gpgPassphrase) {
                const passphraseFile = path.join(this.certsDir, 'passphrase');
                if (fs.existsSync(passphraseFile)) {
                    fs.unlinkSync(passphraseFile);
                }
            }

        } catch (error) {
            throw new Error(`فشل في توقيع Linux: ${error.message}`);
        }
    }

    /**
     * إنشاء checksums للملفات
     */
    async generateChecksums() {
        console.log('🔢 إنشاء checksums...');

        const releaseFiles = fs.readdirSync(this.releaseDir);
        const checksums = {};

        for (const file of releaseFiles) {
            if (file.endsWith('.sig') || file.endsWith('.sha256')) {
                continue; // تخطي ملفات التوقيع والـ checksums
            }

            const filePath = path.join(this.releaseDir, file);
            const hash = crypto.createHash('sha256');
            const data = fs.readFileSync(filePath);
            hash.update(data);

            checksums[file] = hash.digest('hex');
        }

        // كتابة ملف checksums
        const checksumFile = path.join(this.releaseDir, 'checksums.sha256');
        const checksumContent = Object.entries(checksums)
            .map(([file, hash]) => `${hash}  ${file}`)
            .join('\n');

        fs.writeFileSync(checksumFile, checksumContent);

        console.log('✅ تم إنشاء checksums');

        return checksums;
    }

    /**
     * التحقق من إعدادات التوقيع
     */
    validateSigningConfig() {
        console.log('🔍 التحقق من إعدادات التوقيع...');

        const issues = [];

        // Windows
        if (!this.signingConfig.windows.certificatePath) {
            issues.push('شهادة Windows غير محددة (WIN_CERTIFICATE_PATH)');
        }

        // macOS
        if (!this.signingConfig.macos.developerIdApplication) {
            issues.push('Developer ID لـ macOS غير محدد (MAC_DEVELOPER_ID_APPLICATION)');
        }

        // Linux
        if (!this.signingConfig.linux.gpgKeyId) {
            issues.push('مفتاح GPG لـ Linux غير محدد (LINUX_GPG_KEY_ID)');
        }

        if (issues.length > 0) {
            console.log('⚠️  مشاكل في إعدادات التوقيع:');
            issues.forEach(issue => console.log(`   - ${issue}`));
            console.log('💡 سيتم تخطي التوقيع للمنصات المفقودة');
        } else {
            console.log('✅ جميع إعدادات التوقيع صحيحة');
        }

        return issues.length === 0;
    }

    /**
     * إنشاء تقرير التوقيع
     */
    generateSigningReport() {
        console.log('📋 إنشاء تقرير التوقيع...');

        const report = {
            timestamp: new Date().toISOString(),
            files: [],
            checksums: {}
        };

        const releaseFiles = fs.readdirSync(this.releaseDir);

        for (const file of releaseFiles) {
            if (file.endsWith('.sig') || file.endsWith('.sha256')) {
                continue;
            }

            const filePath = path.join(this.releaseDir, file);
            const stats = fs.statSync(filePath);
            const platform = this.detectPlatform(file);

            const fileInfo = {
                name: file,
                size: stats.size,
                platform: platform,
                signed: false,
                signatureFile: null
            };

            // التحقق من وجود التوقيع
            const signatureFile = `${file}.sig`;
            if (fs.existsSync(path.join(this.releaseDir, signatureFile))) {
                fileInfo.signed = true;
                fileInfo.signatureFile = signatureFile;
            }

            report.files.push(fileInfo);
        }

        // إضافة checksums
        const checksumFile = path.join(this.releaseDir, 'checksums.sha256');
        if (fs.existsSync(checksumFile)) {
            const checksumContent = fs.readFileSync(checksumFile, 'utf8');
            const lines = checksumContent.split('\n').filter(line => line.trim());

            for (const line of lines) {
                const [hash, filename] = line.split('  ');
                report.checksums[filename] = hash;
            }
        }

        // كتابة التقرير
        const reportFile = path.join(this.releaseDir, 'signing-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

        console.log('✅ تم إنشاء تقرير التوقيع');

        return report;
    }
}

// تشغيل السكريبت
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help')) {
        console.log(`
استخدام: node code-signing.js [command]

الأوامر:
  sign              توقيع جميع الملفات
  checksums         إنشاء checksums فقط
  validate          التحقق من إعدادات التوقيع
  report            إنشاء تقرير التوقيع
  
متغيرات البيئة المطلوبة:
  Windows:
    WIN_CERTIFICATE_PATH      مسار شهادة Windows
    WIN_CERTIFICATE_PASSWORD  كلمة مرور الشهادة
    WIN_TIMESTAMP_URL         خادم الطوابع الزمنية (اختياري)
    
  macOS:
    MAC_DEVELOPER_ID_APPLICATION  Developer ID Application
    MAC_APPLE_ID                  Apple ID للـ notarization (اختياري)
    MAC_APPLE_ID_PASSWORD         كلمة مرور Apple ID (اختياري)
    
  Linux:
    LINUX_GPG_KEY_ID          معرف مفتاح GPG
    LINUX_GPG_PASSPHRASE     كلمة مرور GPG (اختياري)
    `);
        process.exit(0);
    }

    const service = new CodeSigningService();
    const command = args[0] || 'sign';

    (async () => {
        try {
            switch (command) {
                case 'sign':
                    await service.signAll();
                    await service.generateChecksums();
                    service.generateSigningReport();
                    break;
                case 'checksums':
                    await service.generateChecksums();
                    break;
                case 'validate':
                    service.validateSigningConfig();
                    break;
                case 'report':
                    service.generateSigningReport();
                    break;
                default:
                    console.error(`أمر غير معروف: ${command}`);
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ خطأ:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = CodeSigningService;