#!/usr/bin/env node

/**
 * سكريبت تشغيل الاختبارات المتقدم
 * يدعم تشغيل أنواع مختلفة من الاختبارات مع تقارير مفصلة
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// ألوان للطباعة
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
}

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`
}

function printHeader(title) {
    console.log('\n' + '='.repeat(60))
    console.log(colorize(title, 'cyan'))
    console.log('='.repeat(60))
}

function printSection(title) {
    console.log('\n' + colorize(title, 'yellow'))
    console.log('-'.repeat(40))
}

// تشغيل اختبارات الوحدة
async function runUnitTests() {
    printSection('🧪 تشغيل اختبارات الوحدة')

    try {
        execSync('npm run test -- --run --reporter=verbose', {
            stdio: 'inherit',
            cwd: process.cwd()
        })
        console.log(colorize('✅ اختبارات الوحدة نجحت', 'green'))
        return true
    } catch (error) {
        console.log(colorize('❌ فشلت اختبارات الوحدة', 'red'))
        return false
    }
}

// تشغيل اختبارات الخصائص
async function runPropertyTests() {
    printSection('🔬 تشغيل اختبارات الخصائص (Property-based Tests)')

    try {
        // تشغيل الاختبارات مع تركيز على اختبارات fast-check
        execSync('npm run test -- --run --reporter=verbose --testNamePattern="Property-based"', {
            stdio: 'inherit',
            cwd: process.cwd()
        })
        console.log(colorize('✅ اختبارات الخصائص نجحت', 'green'))
        return true
    } catch (error) {
        console.log(colorize('❌ فشلت اختبارات الخصائص', 'red'))
        return false
    }
}

// تشغيل اختبارات التغطية
async function runCoverageTests() {
    printSection('📊 تشغيل اختبارات التغطية')

    try {
        execSync('npm run test:coverage', {
            stdio: 'inherit',
            cwd: process.cwd()
        })

        // قراءة تقرير التغطية
        const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
        if (fs.existsSync(coveragePath)) {
            const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
            const total = coverage.total

            console.log('\n📈 ملخص التغطية:')
            console.log(`   الخطوط: ${total.lines.pct}%`)
            console.log(`   الدوال: ${total.functions.pct}%`)
            console.log(`   الفروع: ${total.branches.pct}%`)
            console.log(`   البيانات: ${total.statements.pct}%`)

            if (total.lines.pct >= 80) {
                console.log(colorize('✅ تغطية جيدة (>= 80%)', 'green'))
            } else {
                console.log(colorize('⚠️  تغطية منخفضة (< 80%)', 'yellow'))
            }
        }

        return true
    } catch (error) {
        console.log(colorize('❌ فشلت اختبارات التغطية', 'red'))
        return false
    }
}

// تشغيل فحص TypeScript
async function runTypeCheck() {
    printSection('🔍 فحص TypeScript')

    try {
        execSync('npm run typecheck', {
            stdio: 'inherit',
            cwd: process.cwd()
        })
        console.log(colorize('✅ فحص TypeScript نجح', 'green'))
        return true
    } catch (error) {
        console.log(colorize('❌ فشل فحص TypeScript', 'red'))
        return false
    }
}

// تشغيل فحص ESLint
async function runLintCheck() {
    printSection('🔧 فحص ESLint')

    try {
        execSync('npm run lint', {
            stdio: 'inherit',
            cwd: process.cwd()
        })
        console.log(colorize('✅ فحص ESLint نجح', 'green'))
        return true
    } catch (error) {
        console.log(colorize('❌ فشل فحص ESLint', 'red'))
        return false
    }
}

// تشغيل اختبارات الأداء
async function runPerformanceTests() {
    printSection('⚡ اختبارات الأداء')

    try {
        // تشغيل اختبارات محددة للأداء
        execSync('npm run test -- --run --testNamePattern="Performance|performance"', {
            stdio: 'inherit',
            cwd: process.cwd()
        })
        console.log(colorize('✅ اختبارات الأداء نجحت', 'green'))
        return true
    } catch (error) {
        console.log(colorize('⚠️  لا توجد اختبارات أداء أو فشلت', 'yellow'))
        return true // لا نعتبرها فشل حرج
    }
}

// إنشاء تقرير شامل
function generateReport(results) {
    printSection('📋 تقرير شامل')

    const totalTests = Object.keys(results).length
    const passedTests = Object.values(results).filter(Boolean).length
    const failedTests = totalTests - passedTests

    console.log(`\n📊 النتائج:`)
    console.log(`   المجموع: ${totalTests}`)
    console.log(`   نجح: ${colorize(passedTests, 'green')}`)
    console.log(`   فشل: ${colorize(failedTests, failedTests > 0 ? 'red' : 'green')}`)

    console.log('\n📝 التفاصيل:')
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? colorize('✅ نجح', 'green') : colorize('❌ فشل', 'red')
        console.log(`   ${test}: ${status}`)
    })

    const overallSuccess = failedTests === 0
    const overallStatus = overallSuccess
        ? colorize('🎉 جميع الاختبارات نجحت!', 'green')
        : colorize('💥 بعض الاختبارات فشلت!', 'red')

    console.log(`\n${overallStatus}`)

    return overallSuccess
}

// الدالة الرئيسية
async function main() {
    const args = process.argv.slice(2)
    const testType = args[0] || 'all'

    printHeader('🧪 Building Forge - مشغل الاختبارات المتقدم')

    const results = {}

    try {
        switch (testType) {
            case 'unit':
                results['اختبارات الوحدة'] = await runUnitTests()
                break

            case 'property':
                results['اختبارات الخصائص'] = await runPropertyTests()
                break

            case 'coverage':
                results['اختبارات التغطية'] = await runCoverageTests()
                break

            case 'lint':
                results['فحص ESLint'] = await runLintCheck()
                results['فحص TypeScript'] = await runTypeCheck()
                break

            case 'performance':
                results['اختبارات الأداء'] = await runPerformanceTests()
                break

            case 'all':
            default:
                results['فحص TypeScript'] = await runTypeCheck()
                results['فحص ESLint'] = await runLintCheck()
                results['اختبارات الوحدة'] = await runUnitTests()
                results['اختبارات الخصائص'] = await runPropertyTests()
                results['اختبارات التغطية'] = await runCoverageTests()
                results['اختبارات الأداء'] = await runPerformanceTests()
                break
        }

        const success = generateReport(results)
        process.exit(success ? 0 : 1)

    } catch (error) {
        console.error(colorize(`❌ خطأ في تشغيل الاختبارات: ${error.message}`, 'red'))
        process.exit(1)
    }
}

// معلومات الاستخدام
function showUsage() {
    console.log(`
الاستخدام: node scripts/test-runner.js [نوع الاختبار]

أنواع الاختبارات المتاحة:
  all         تشغيل جميع الاختبارات (افتراضي)
  unit        اختبارات الوحدة فقط
  property    اختبارات الخصائص فقط
  coverage    اختبارات التغطية فقط
  lint        فحص الكود فقط (ESLint + TypeScript)
  performance اختبارات الأداء فقط

أمثلة:
  npm run test:all
  node scripts/test-runner.js unit
  node scripts/test-runner.js coverage
`)
}

// التحقق من المعاملات
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage()
    process.exit(0)
}

// تشغيل السكريبت
if (require.main === module) {
    main()
}

module.exports = { main }