#!/usr/bin/env node

/**
 * سكريبت إعداد بيئة التطوير
 * يتحقق من المتطلبات ويقوم بالإعداد الأولي
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 إعداد بيئة التطوير لـ Building Forge...\n')

// التحقق من إصدار Node.js
function checkNodeVersion() {
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])

    console.log(`📦 إصدار Node.js: ${nodeVersion}`)

    if (majorVersion < 18) {
        console.error('❌ خطأ: يتطلب Node.js الإصدار 18 أو أحدث')
        process.exit(1)
    }

    console.log('✅ إصدار Node.js مناسب\n')
}

// التحقق من npm
function checkNpmVersion() {
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
        console.log(`📦 إصدار npm: ${npmVersion}`)
        console.log('✅ npm متوفر\n')
    } catch (error) {
        console.error('❌ خطأ: npm غير متوفر')
        process.exit(1)
    }
}

// إنشاء المجلدات المطلوبة
function createDirectories() {
    const directories = [
        'dist',
        'release',
        'coverage',
        'logs',
        'temp',
        'resources/icons',
        'resources/assets',
        'resources/templates'
    ]

    console.log('📁 إنشاء المجلدات المطلوبة...')

    directories.forEach(dir => {
        const fullPath = path.join(process.cwd(), dir)
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true })
            console.log(`   ✅ تم إنشاء: ${dir}`)
        } else {
            console.log(`   ⏭️  موجود: ${dir}`)
        }
    })

    console.log('')
}

// إنشاء ملفات البيئة
function createEnvironmentFiles() {
    console.log('🔧 إنشاء ملفات البيئة...')

    const envFiles = [
        {
            name: '.env.development',
            content: `# بيئة التطوير
NODE_ENV=development
ELECTRON_IS_DEV=true
VITE_DEV_SERVER_PORT=3000
LOG_LEVEL=debug
`
        },
        {
            name: '.env.production',
            content: `# بيئة الإنتاج
NODE_ENV=production
ELECTRON_IS_DEV=false
LOG_LEVEL=info
`
        },
        {
            name: '.env.test',
            content: `# بيئة الاختبار
NODE_ENV=test
VITEST_POOL_WORKERS=1
LOG_LEVEL=silent
`
        }
    ]

    envFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file.name)
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.content)
            console.log(`   ✅ تم إنشاء: ${file.name}`)
        } else {
            console.log(`   ⏭️  موجود: ${file.name}`)
        }
    })

    console.log('')
}

// التحقق من التبعيات
function checkDependencies() {
    console.log('📋 التحقق من التبعيات...')

    const packageJsonPath = path.join(process.cwd(), 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
        console.error('❌ خطأ: ملف package.json غير موجود')
        process.exit(1)
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }

    const requiredDeps = [
        'electron',
        'react',
        'typescript',
        'vite',
        'vitest',
        '@react-three/fiber',
        'dockview'
    ]

    const missingDeps = requiredDeps.filter(dep => !dependencies[dep])

    if (missingDeps.length > 0) {
        console.error(`❌ خطأ: التبعيات المفقودة: ${missingDeps.join(', ')}`)
        console.log('💡 قم بتشغيل: npm install')
        process.exit(1)
    }

    console.log('✅ جميع التبعيات المطلوبة متوفرة\n')
}

// إنشاء ملف إعداد Git hooks
function setupGitHooks() {
    console.log('🔗 إعداد Git hooks...')

    const hooksDir = path.join(process.cwd(), '.git', 'hooks')
    if (!fs.existsSync(hooksDir)) {
        console.log('   ⏭️  مستودع Git غير موجود، تخطي Git hooks')
        return
    }

    const preCommitHook = `#!/bin/sh
# Pre-commit hook للتحقق من جودة الكود

echo "🔍 تشغيل فحص الكود قبل الـ commit..."

# تشغيل TypeScript type checking
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ خطأ في TypeScript type checking"
  exit 1
fi

# تشغيل ESLint
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ خطأ في ESLint"
  exit 1
fi

# تشغيل الاختبارات
npm test -- --run
if [ $? -ne 0 ]; then
  echo "❌ فشل في الاختبارات"
  exit 1
fi

echo "✅ جميع الفحوصات نجحت!"
`

    const preCommitPath = path.join(hooksDir, 'pre-commit')
    fs.writeFileSync(preCommitPath, preCommitHook)

    // جعل الملف قابل للتنفيذ (Unix/Linux/Mac)
    if (process.platform !== 'win32') {
        fs.chmodSync(preCommitPath, '755')
    }

    console.log('   ✅ تم إعداد pre-commit hook')
    console.log('')
}

// الدالة الرئيسية
function main() {
    try {
        checkNodeVersion()
        checkNpmVersion()
        createDirectories()
        createEnvironmentFiles()
        checkDependencies()
        setupGitHooks()

        console.log('🎉 تم إعداد بيئة التطوير بنجاح!')
        console.log('\n📝 الخطوات التالية:')
        console.log('   1. npm install          # تثبيت التبعيات')
        console.log('   2. npm run dev          # تشغيل بيئة التطوير')
        console.log('   3. npm test             # تشغيل الاختبارات')
        console.log('   4. npm run build        # بناء المشروع')
        console.log('\n💡 للمساعدة: npm run --help')

    } catch (error) {
        console.error('❌ خطأ في إعداد بيئة التطوير:', error.message)
        process.exit(1)
    }
}

// تشغيل السكريبت
if (require.main === module) {
    main()
}

module.exports = { main }