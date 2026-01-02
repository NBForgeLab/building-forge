/**
 * خدمة اختبار الضغط والاستقرار
 * تختبر أداء النظام تحت الأحمال الثقيلة والاستخدام المكثف
 */

import { BuildingElement, Project } from '../types';
import { DiagnosticsService } from './DiagnosticsService';
import { PerformanceManager } from './PerformanceManager';
import { SystemIntegrationService } from './SystemIntegrationService';

export interface StressTestConfig {
    duration: number; // مدة الاختبار بالميلي ثانية
    intensity: 'low' | 'medium' | 'high' | 'extreme';
    testTypes: StressTestType[];
    maxMemoryUsage: number; // الحد الأقصى لاستخدام الذاكرة (%)
    maxCpuUsage: number; // الحد الأقصى لاستخدام المعالج (%)
    targetFps: number; // معدل الإطارات المستهدف
}

export type StressTestType =
    | 'memory-pressure'
    | 'cpu-intensive'
    | 'rapid-operations'
    | 'large-projects'
    | 'concurrent-exports'
    | 'ui-stress'
    | 'file-operations'
    | 'network-simulation';

export interface StressTestResult {
    testType: StressTestType;
    success: boolean;
    duration: number;
    peakMemoryUsage: number;
    peakCpuUsage: number;
    averageFps: number;
    minFps: number;
    operationsCompleted: number;
    operationsFailed: number;
    errors: string[];
    warnings: string[];
    metrics: {
        memoryLeaks: boolean;
        performanceDegradation: number; // نسبة تدهور الأداء
        stabilityScore: number; // 0-100
        responseTimeIncrease: number; // زيادة وقت الاستجابة
    };
}

export interface StressTestReport {
    id: string;
    timestamp: Date;
    config: StressTestConfig;
    results: StressTestResult[];
    overallScore: number;
    systemStability: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    recommendations: string[];
    criticalIssues: string[];
    summary: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        totalDuration: number;
        peakMemoryUsage: number;
        peakCpuUsage: number;
    };
}

export class StressTestService {
    private systemIntegration: SystemIntegrationService;
    private performanceManager: PerformanceManager | undefined;
    private diagnostics: DiagnosticsService;
    private isRunning = false;
    private currentTest: AbortController | null = null;

    constructor() {
        this.systemIntegration = SystemIntegrationService.getInstance();
        this.performanceManager = this.systemIntegration.getService('performanceManager');
        this.diagnostics = new DiagnosticsService();
    }

    /**
     * تشغيل اختبار الضغط الشامل
     */
    public async runStressTest(
        config: StressTestConfig,
        onProgress?: (progress: { current: number; total: number; testName: string; metrics: any }) => void
    ): Promise<StressTestReport> {
        if (this.isRunning) {
            throw new Error('Stress test already running');
        }

        this.isRunning = true;
        this.currentTest = new AbortController();

        const reportId = `stress-test-${Date.now()}`;
        const startTime = Date.now();

        const report: StressTestReport = {
            id: reportId,
            timestamp: new Date(),
            config,
            results: [],
            overallScore: 0,
            systemStability: 'excellent',
            recommendations: [],
            criticalIssues: [],
            summary: {
                totalTests: config.testTypes.length,
                passedTests: 0,
                failedTests: 0,
                totalDuration: 0,
                peakMemoryUsage: 0,
                peakCpuUsage: 0
            }
        };

        try {
            // تشغيل كل نوع من أنواع الاختبارات
            for (let i = 0; i < config.testTypes.length; i++) {
                if (this.currentTest.signal.aborted) {
                    break;
                }

                const testType = config.testTypes[i];

                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: config.testTypes.length,
                        testName: this.getTestTypeName(testType),
                        metrics: this.getCurrentMetrics()
                    });
                }

                try {
                    const result = await this.runSingleStressTest(testType, config);
                    report.results.push(result);

                    if (result.success) {
                        report.summary.passedTests++;
                    } else {
                        report.summary.failedTests++;
                    }

                    // تحديث الذروات
                    report.summary.peakMemoryUsage = Math.max(report.summary.peakMemoryUsage, result.peakMemoryUsage);
                    report.summary.peakCpuUsage = Math.max(report.summary.peakCpuUsage, result.peakCpuUsage);

                    // جمع القضايا الحرجة
                    if (result.errors.length > 0) {
                        report.criticalIssues.push(...result.errors);
                    }

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    report.results.push({
                        testType,
                        success: false,
                        duration: 0,
                        peakMemoryUsage: 0,
                        peakCpuUsage: 0,
                        averageFps: 0,
                        minFps: 0,
                        operationsCompleted: 0,
                        operationsFailed: 1,
                        errors: [errorMessage],
                        warnings: [],
                        metrics: {
                            memoryLeaks: false,
                            performanceDegradation: 0,
                            stabilityScore: 0,
                            responseTimeIncrease: 0
                        }
                    });
                    report.summary.failedTests++;
                    report.criticalIssues.push(errorMessage);
                }

                // فترة راحة بين الاختبارات
                await this.sleep(1000);
            }

            // حساب النتائج النهائية
            report.summary.totalDuration = Date.now() - startTime;
            report.overallScore = this.calculateOverallScore(report.results);
            report.systemStability = this.determineSystemStability(report.overallScore, report.criticalIssues.length);
            report.recommendations = this.generateRecommendations(report.results);

        } finally {
            this.isRunning = false;
            this.currentTest = null;
        }

        return report;
    }

    /**
     * تشغيل اختبار ضغط واحد
     */
    private async runSingleStressTest(testType: StressTestType, config: StressTestConfig): Promise<StressTestResult> {
        const startTime = Date.now();
        const initialMetrics = this.getCurrentMetrics();

        const result: StressTestResult = {
            testType,
            success: false,
            duration: 0,
            peakMemoryUsage: initialMetrics.memoryUsage,
            peakCpuUsage: initialMetrics.cpuUsage,
            averageFps: 0,
            minFps: Infinity,
            operationsCompleted: 0,
            operationsFailed: 0,
            errors: [],
            warnings: [],
            metrics: {
                memoryLeaks: false,
                performanceDegradation: 0,
                stabilityScore: 100,
                responseTimeIncrease: 0
            }
        };

        const metricsHistory: any[] = [];
        const fpsHistory: number[] = [];

        // مراقبة الأداء أثناء الاختبار
        const monitoringInterval = setInterval(() => {
            const currentMetrics = this.getCurrentMetrics();
            metricsHistory.push(currentMetrics);

            result.peakMemoryUsage = Math.max(result.peakMemoryUsage, currentMetrics.memoryUsage);
            result.peakCpuUsage = Math.max(result.peakCpuUsage, currentMetrics.cpuUsage);

            if (currentMetrics.fps > 0) {
                fpsHistory.push(currentMetrics.fps);
                result.minFps = Math.min(result.minFps, currentMetrics.fps);
            }
        }, 100);

        try {
            // تشغيل الاختبار المحدد
            switch (testType) {
                case 'memory-pressure':
                    await this.runMemoryPressureTest(result, config);
                    break;
                case 'cpu-intensive':
                    await this.runCpuIntensiveTest(result, config);
                    break;
                case 'rapid-operations':
                    await this.runRapidOperationsTest(result, config);
                    break;
                case 'large-projects':
                    await this.runLargeProjectsTest(result, config);
                    break;
                case 'concurrent-exports':
                    await this.runConcurrentExportsTest(result, config);
                    break;
                case 'ui-stress':
                    await this.runUiStressTest(result, config);
                    break;
                case 'file-operations':
                    await this.runFileOperationsTest(result, config);
                    break;
                case 'network-simulation':
                    await this.runNetworkSimulationTest(result, config);
                    break;
            }

            result.success = true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(errorMessage);
            result.operationsFailed++;
        } finally {
            clearInterval(monitoringInterval);
        }

        // حساب المقاييس النهائية
        result.duration = Date.now() - startTime;

        if (fpsHistory.length > 0) {
            result.averageFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
            if (result.minFps === Infinity) result.minFps = 0;
        }

        // كشف تسريبات الذاكرة
        if (metricsHistory.length > 10) {
            const memoryTrend = this.calculateMemoryTrend(metricsHistory);
            result.metrics.memoryLeaks = memoryTrend > 10; // زيادة أكثر من 10%
        }

        // حساب تدهور الأداء
        const finalMetrics = this.getCurrentMetrics();
        result.metrics.performanceDegradation = Math.max(0,
            ((initialMetrics.responseTime - finalMetrics.responseTime) / initialMetrics.responseTime) * 100
        );

        // حساب نقاط الاستقرار
        result.metrics.stabilityScore = this.calculateStabilityScore(result);

        // التحقق من الحدود
        if (result.peakMemoryUsage > config.maxMemoryUsage) {
            result.warnings.push(`تجاوز الحد الأقصى لاستخدام الذاكرة: ${result.peakMemoryUsage}%`);
        }

        if (result.peakCpuUsage > config.maxCpuUsage) {
            result.warnings.push(`تجاوز الحد الأقصى لاستخدام المعالج: ${result.peakCpuUsage}%`);
        }

        if (result.averageFps < config.targetFps) {
            result.warnings.push(`معدل الإطارات أقل من المستهدف: ${result.averageFps} < ${config.targetFps}`);
        }

        return result;
    }

    /**
     * اختبار ضغط الذاكرة
     */
    private async runMemoryPressureTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);
        const allocations: any[] = [];

        try {
            // تخصيص ذاكرة تدريجياً
            for (let i = 0; i < 100 * intensity; i++) {
                if (this.currentTest?.signal.aborted) break;

                // إنشاء كائنات كبيرة
                const largeArray = new Array(10000 * intensity).fill(0).map((_, index) => ({
                    id: index,
                    data: new Array(100).fill(`memory-test-${i}-${index}`),
                    timestamp: Date.now()
                }));

                allocations.push(largeArray);
                result.operationsCompleted++;

                // فحص دوري للذاكرة
                if (i % 10 === 0) {
                    const currentMemory = this.getCurrentMetrics().memoryUsage;
                    if (currentMemory > 90) {
                        result.warnings.push('استخدام ذاكرة مرتفع جداً، توقف الاختبار');
                        break;
                    }
                }

                await this.sleep(10);
            }

            // تنظيف تدريجي
            while (allocations.length > 0) {
                allocations.pop();
                if (allocations.length % 10 === 0) {
                    await this.sleep(10);
                }
            }

            // إجبار garbage collection إذا كان متاحاً
            if (global.gc) {
                global.gc();
            }

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * اختبار الحمل المكثف على المعالج
     */
    private async runCpuIntensiveTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);
        const endTime = Date.now() + (config.duration / config.testTypes.length);

        try {
            while (Date.now() < endTime && !this.currentTest?.signal.aborted) {
                // عمليات حسابية مكثفة
                for (let i = 0; i < 1000 * intensity; i++) {
                    Math.sqrt(Math.random() * 1000000);
                    Math.sin(Math.random() * Math.PI * 2);
                    Math.cos(Math.random() * Math.PI * 2);

                    if (i % 100 === 0) {
                        result.operationsCompleted += 100;

                        // فحص دوري للمعالج
                        const currentCpu = this.getCurrentMetrics().cpuUsage;
                        if (currentCpu > 95) {
                            result.warnings.push('استخدام معالج مرتفع جداً');
                        }
                    }
                }

                // فترة راحة قصيرة
                await this.sleep(1);
            }

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * اختبار العمليات السريعة المتتالية
     */
    private async runRapidOperationsTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);
        const operations = 1000 * intensity;

        try {
            for (let i = 0; i < operations; i++) {
                if (this.currentTest?.signal.aborted) break;

                // محاكاة عمليات سريعة
                const startTime = Date.now();

                // عملية محاكاة (فحص حالة النظام)
                this.systemIntegration.getStatus();

                // عملية محاكاة (إنشاء كائن)
                const testObject = {
                    id: i,
                    timestamp: Date.now(),
                    data: new Array(10).fill(`rapid-${i}`)
                };

                // عملية محاكاة (معالجة البيانات)
                JSON.stringify(testObject);
                JSON.parse(JSON.stringify(testObject));

                const operationTime = Date.now() - startTime;

                if (operationTime > 10) {
                    result.warnings.push(`عملية بطيئة: ${operationTime}ms`);
                }

                result.operationsCompleted++;

                // لا توجد فترة انتظار للحصول على أقصى سرعة
            }

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * اختبار المشاريع الكبيرة
     */
    private async runLargeProjectsTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);

        try {
            // إنشاء مشروع كبير محاكي
            const largeProject: Project = {
                id: `stress-test-project-${Date.now()}`,
                name: 'Stress Test Project',
                elements: [],
                materials: [],
                assets: [],
                settings: {
                    units: 'meters'
                },
                createdAt: new Date(),
                lastModified: new Date()
            };

            // إضافة عناصر كثيرة
            for (let i = 0; i < 1000 * intensity; i++) {
                if (this.currentTest?.signal.aborted) break;

                const element: BuildingElement = {
                    id: `element-${i}`,
                    type: 'wall',
                    geometry: {
                        vertices: new Array(100).fill(0).map(() => ({
                            x: Math.random() * 100,
                            y: Math.random() * 100,
                            z: Math.random() * 100
                        })),
                        faces: [],
                        polygonCount: 50
                    },
                    material: {
                        id: `material-${i % 10}`,
                        name: `Material ${i % 10}`,
                        type: 'PBR',
                        properties: {
                            albedo: { r: Math.random(), g: Math.random(), b: Math.random() },
                            metallic: Math.random(),
                            roughness: Math.random()
                        }
                    },
                    transform: {
                        position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
                        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    createdAt: new Date(),
                    lastModified: new Date()
                };

                largeProject.elements.push(element);
                result.operationsCompleted++;

                if (i % 100 === 0) {
                    // فحص دوري للأداء
                    const currentMetrics = this.getCurrentMetrics();
                    if (currentMetrics.memoryUsage > 80) {
                        result.warnings.push(`ذاكرة مرتفعة عند ${i} عنصر: ${currentMetrics.memoryUsage}%`);
                    }

                    await this.sleep(1);
                }
            }

            // محاكاة عمليات على المشروع الكبير
            const serialized = JSON.stringify(largeProject);
            const parsed = JSON.parse(serialized);

            result.operationsCompleted += 2;

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * اختبار التصدير المتزامن
     */
    private async runConcurrentExportsTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);
        const concurrentExports = Math.min(5 * intensity, 20); // حد أقصى 20

        try {
            const exportPromises: Promise<void>[] = [];

            for (let i = 0; i < concurrentExports; i++) {
                const exportPromise = this.simulateExport(i).then(() => {
                    result.operationsCompleted++;
                }).catch(() => {
                    result.operationsFailed++;
                });

                exportPromises.push(exportPromise);
            }

            await Promise.allSettled(exportPromises);

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * اختبار ضغط واجهة المستخدم
     */
    private async runUiStressTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);

        try {
            // محاكاة أحداث واجهة المستخدم
            for (let i = 0; i < 500 * intensity; i++) {
                if (this.currentTest?.signal.aborted) break;

                // محاكاة أحداث الماوس
                const mouseEvent = new MouseEvent('click', {
                    clientX: Math.random() * 1920,
                    clientY: Math.random() * 1080
                });

                // محاكاة أحداث لوحة المفاتيح
                const keyEvent = new KeyboardEvent('keydown', {
                    key: String.fromCharCode(65 + Math.floor(Math.random() * 26))
                });

                result.operationsCompleted += 2;

                if (i % 50 === 0) {
                    await this.sleep(1);
                }
            }

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * اختبار عمليات الملفات
     */
    private async runFileOperationsTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);

        try {
            // محاكاة عمليات الملفات
            for (let i = 0; i < 100 * intensity; i++) {
                if (this.currentTest?.signal.aborted) break;

                // محاكاة قراءة ملف
                const mockFileData = new Array(1000).fill(0).map(() => Math.random().toString(36));

                // محاكاة معالجة البيانات
                const processed = mockFileData.map(data => data.toUpperCase());

                // محاكاة كتابة ملف
                const serialized = JSON.stringify(processed);

                result.operationsCompleted++;

                if (i % 10 === 0) {
                    await this.sleep(1);
                }
            }

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * اختبار محاكاة الشبكة
     */
    private async runNetworkSimulationTest(result: StressTestResult, config: StressTestConfig): Promise<void> {
        const intensity = this.getIntensityMultiplier(config.intensity);

        try {
            // محاكاة طلبات شبكة
            for (let i = 0; i < 50 * intensity; i++) {
                if (this.currentTest?.signal.aborted) break;

                // محاكاة تأخير الشبكة
                const networkDelay = Math.random() * 100 + 10;
                await this.sleep(networkDelay);

                // محاكاة استجابة
                const mockResponse = {
                    status: 200,
                    data: new Array(100).fill(0).map(() => Math.random())
                };

                JSON.stringify(mockResponse);
                result.operationsCompleted++;
            }

        } catch (error) {
            result.operationsFailed++;
            throw error;
        }
    }

    /**
     * محاكاة عملية تصدير
     */
    private async simulateExport(index: number): Promise<void> {
        // محاكاة وقت التصدير
        const exportTime = Math.random() * 2000 + 500;
        await this.sleep(exportTime);

        // محاكاة معالجة البيانات
        const mockData = new Array(1000).fill(0).map(() => ({
            vertex: { x: Math.random(), y: Math.random(), z: Math.random() },
            normal: { x: Math.random(), y: Math.random(), z: Math.random() }
        }));

        // محاكاة ضغط البيانات
        JSON.stringify(mockData);
    }

    /**
     * الحصول على مضاعف الكثافة
     */
    private getIntensityMultiplier(intensity: StressTestConfig['intensity']): number {
        switch (intensity) {
            case 'low': return 0.5;
            case 'medium': return 1;
            case 'high': return 2;
            case 'extreme': return 4;
            default: return 1;
        }
    }

    /**
     * الحصول على اسم نوع الاختبار
     */
    private getTestTypeName(testType: StressTestType): string {
        const names: Record<StressTestType, string> = {
            'memory-pressure': 'ضغط الذاكرة',
            'cpu-intensive': 'حمل المعالج',
            'rapid-operations': 'العمليات السريعة',
            'large-projects': 'المشاريع الكبيرة',
            'concurrent-exports': 'التصدير المتزامن',
            'ui-stress': 'ضغط الواجهة',
            'file-operations': 'عمليات الملفات',
            'network-simulation': 'محاكاة الشبكة'
        };
        return names[testType];
    }

    /**
     * الحصول على المقاييس الحالية
     */
    private getCurrentMetrics(): any {
        const performanceMetrics = this.performanceManager?.getCurrentMetrics?.() || {};

        return {
            memoryUsage: performanceMetrics.memoryUsage || 0,
            cpuUsage: performanceMetrics.cpuUsage || 0,
            fps: performanceMetrics.fps || 60,
            responseTime: performanceMetrics.responseTime || 10
        };
    }

    /**
     * حساب اتجاه الذاكرة
     */
    private calculateMemoryTrend(metricsHistory: any[]): number {
        if (metricsHistory.length < 2) return 0;

        const first = metricsHistory[0].memoryUsage;
        const last = metricsHistory[metricsHistory.length - 1].memoryUsage;

        return ((last - first) / first) * 100;
    }

    /**
     * حساب نقاط الاستقرار
     */
    private calculateStabilityScore(result: StressTestResult): number {
        let score = 100;

        // خصم نقاط للأخطاء
        score -= result.operationsFailed * 10;

        // خصم نقاط لاستخدام الذاكرة المرتفع
        if (result.peakMemoryUsage > 80) {
            score -= (result.peakMemoryUsage - 80) * 2;
        }

        // خصم نقاط لاستخدام المعالج المرتفع
        if (result.peakCpuUsage > 80) {
            score -= (result.peakCpuUsage - 80) * 2;
        }

        // خصم نقاط لانخفاض معدل الإطارات
        if (result.averageFps < 30) {
            score -= (30 - result.averageFps) * 2;
        }

        return Math.max(0, score);
    }

    /**
     * حساب النتيجة الإجمالية
     */
    private calculateOverallScore(results: StressTestResult[]): number {
        if (results.length === 0) return 0;

        const totalScore = results.reduce((sum, result) => sum + result.metrics.stabilityScore, 0);
        return totalScore / results.length;
    }

    /**
     * تحديد استقرار النظام
     */
    private determineSystemStability(score: number, criticalIssuesCount: number): StressTestReport['systemStability'] {
        if (criticalIssuesCount > 5) return 'critical';
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        if (score >= 40) return 'poor';
        return 'critical';
    }

    /**
     * إنتاج التوصيات
     */
    private generateRecommendations(results: StressTestResult[]): string[] {
        const recommendations: string[] = [];

        const avgMemoryUsage = results.reduce((sum, r) => sum + r.peakMemoryUsage, 0) / results.length;
        const avgCpuUsage = results.reduce((sum, r) => sum + r.peakCpuUsage, 0) / results.length;
        const avgFps = results.reduce((sum, r) => sum + r.averageFps, 0) / results.length;

        if (avgMemoryUsage > 70) {
            recommendations.push('تحسين إدارة الذاكرة وتقليل التسريبات');
        }

        if (avgCpuUsage > 70) {
            recommendations.push('تحسين خوارزميات المعالجة وتقليل الحمل على المعالج');
        }

        if (avgFps < 45) {
            recommendations.push('تحسين أداء العرض وتقليل وقت الإطار');
        }

        const hasMemoryLeaks = results.some(r => r.metrics.memoryLeaks);
        if (hasMemoryLeaks) {
            recommendations.push('إصلاح تسريبات الذاكرة المكتشفة');
        }

        const highFailureRate = results.some(r => r.operationsFailed > r.operationsCompleted * 0.1);
        if (highFailureRate) {
            recommendations.push('تحسين معالجة الأخطاء والاستقرار');
        }

        return recommendations;
    }

    /**
     * إيقاف الاختبار الحالي
     */
    public stopCurrentTest(): void {
        if (this.currentTest) {
            this.currentTest.abort();
        }
    }

    /**
     * التحقق من حالة التشغيل
     */
    public isTestRunning(): boolean {
        return this.isRunning;
    }

    /**
     * دالة مساعدة للانتظار
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default StressTestService;