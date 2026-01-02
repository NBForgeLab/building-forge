/**
 * خدمة التشخيص والسجلات الشاملة
 * تدير نظام logging متقدم وأدوات debugging للمطورين
 */

import { ErrorRecoveryService } from './ErrorRecoveryService';
import { SystemIntegrationService } from './SystemIntegrationService';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
    stack?: string;
    sessionId: string;
    userId?: string;
    projectId?: string;
}

export interface DiagnosticInfo {
    system: {
        platform: string;
        userAgent: string;
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
        performance: {
            fps: number;
            renderTime: number;
            drawCalls: number;
        };
    };
    application: {
        version: string;
        buildDate: string;
        environment: string;
        features: string[];
    };
    project: {
        id?: string;
        name?: string;
        elementCount: number;
        assetCount: number;
        lastSaved?: Date;
    };
    services: {
        [serviceName: string]: {
            status: 'active' | 'inactive' | 'error';
            lastActivity?: Date;
            errorCount: number;
        };
    };
}

export interface PerformanceMetrics {
    timestamp: Date;
    fps: number;
    frameTime: number;
    memoryUsage: number;
    cpuUsage: number;
    renderTime: number;
    drawCalls: number;
    triangles: number;
    textures: number;
}

export class DiagnosticsService {
    private systemIntegration: SystemIntegrationService;
    private logs: LogEntry[] = [];
    private performanceHistory: PerformanceMetrics[] = [];
    private sessionId: string;
    private maxLogEntries = 10000;
    private maxPerformanceEntries = 1000;
    private logLevel: LogLevel = 'info';
    private isCollectingPerformance = false;
    private performanceInterval?: NodeJS.Timeout;

    constructor() {
        this.systemIntegration = SystemIntegrationService.getInstance();
        this.sessionId = `diag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.setupGlobalErrorHandling();
    }

    /**
     * إعداد معالجة الأخطاء العامة
     */
    private setupGlobalErrorHandling(): void {
        // معالجة الأخطاء غير المعالجة
        window.addEventListener('error', (event) => {
            this.log('error', 'GlobalError', 'Unhandled error occurred', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // معالجة Promise rejections غير المعالجة
        window.addEventListener('unhandledrejection', (event) => {
            this.log('error', 'GlobalError', 'Unhandled promise rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });

        // معالجة تحذيرات React
        if (isDev()) {
            const originalConsoleWarn = console.warn;
            console.warn = (...args) => {
                if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning:')) {
                    this.log('warn', 'React', args[0], { args: args.slice(1) });
                }
                originalConsoleWarn.apply(console, args);
            };
        }
    }

    /**
     * تسجيل رسالة في السجل
     */
    public log(
        level: LogLevel,
        category: string,
        message: string,
        data?: any,
        projectId?: string
    ): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            level,
            category,
            message,
            data,
            sessionId: this.sessionId,
            projectId
        };

        // إضافة stack trace للأخطاء
        if (level === 'error' || level === 'fatal') {
            entry.stack = new Error().stack;
        }

        this.logs.push(entry);

        // تنظيف السجلات القديمة
        if (this.logs.length > this.maxLogEntries) {
            this.logs = this.logs.slice(-this.maxLogEntries);
        }

        // طباعة في console للتطوير
        if (isDev()) {
            const consoleMethod = level === 'debug' ? 'log' : level;
            console[consoleMethod](`[${category}] ${message}`, data || '');
        }

        // إرسال للخدمات الخارجية إذا لزم الأمر
        this.sendToExternalServices(entry);
    }

    /**
     * التحقق من ضرورة تسجيل المستوى
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    /**
     * إرسال السجلات للخدمات الخارجية
     */
    private sendToExternalServices(entry: LogEntry): void {
        // يمكن إضافة تكامل مع خدمات مثل Sentry أو LogRocket هنا
        if (entry.level === 'error' || entry.level === 'fatal') {
            // إرسال للخدمة الخارجية
        }
    }

    /**
     * بدء جمع مقاييس الأداء
     */
    public startPerformanceCollection(intervalMs: number = 1000): void {
        if (this.isCollectingPerformance) {
            return;
        }

        this.isCollectingPerformance = true;
        this.performanceInterval = setInterval(() => {
            this.collectPerformanceMetrics();
        }, intervalMs);

        this.log('info', 'Diagnostics', 'Started performance collection', { intervalMs });
    }

    /**
     * إيقاف جمع مقاييس الأداء
     */
    public stopPerformanceCollection(): void {
        if (!this.isCollectingPerformance) {
            return;
        }

        this.isCollectingPerformance = false;
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = undefined;
        }

        this.log('info', 'Diagnostics', 'Stopped performance collection');
    }

    /**
     * جمع مقاييس الأداء الحالية
     */
    private collectPerformanceMetrics(): void {
        try {
            const performanceManager = this.systemIntegration.getService('performanceManager');
            const currentMetrics = performanceManager?.getCurrentMetrics?.();

            const metrics: PerformanceMetrics = {
                timestamp: new Date(),
                fps: currentMetrics?.fps || 0,
                frameTime: currentMetrics?.frameTime || 0,
                memoryUsage: this.getMemoryUsage(),
                cpuUsage: currentMetrics?.cpuUsage || 0,
                renderTime: currentMetrics?.renderTime || 0,
                drawCalls: currentMetrics?.drawCalls || 0,
                triangles: currentMetrics?.triangles || 0,
                textures: currentMetrics?.textures || 0
            };

            this.performanceHistory.push(metrics);

            // تنظيف التاريخ القديم
            if (this.performanceHistory.length > this.maxPerformanceEntries) {
                this.performanceHistory = this.performanceHistory.slice(-this.maxPerformanceEntries);
            }

            // تسجيل تحذيرات الأداء
            if (metrics.fps < 30) {
                this.log('warn', 'Performance', 'Low FPS detected', { fps: metrics.fps });
            }

            if (metrics.memoryUsage > 80) {
                this.log('warn', 'Performance', 'High memory usage', { usage: metrics.memoryUsage });
            }

        } catch (error) {
            this.log('error', 'Diagnostics', 'Failed to collect performance metrics', { error });
        }
    }

    /**
     * الحصول على استخدام الذاكرة
     */
    private getMemoryUsage(): number {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        }
        return 0;
    }

    /**
     * جمع معلومات التشخيص الشاملة
     */
    public async collectDiagnosticInfo(): Promise<DiagnosticInfo> {
        const projectManager = this.systemIntegration.getService('projectManager');
        const performanceManager = this.systemIntegration.getService('performanceManager');
        const errorRecovery = new ErrorRecoveryService();

        const currentProject = projectManager?.getCurrentProject?.();
        const currentMetrics = performanceManager?.getCurrentMetrics?.();
        const errorStats = errorRecovery.getErrorStatistics();

        const diagnosticInfo: DiagnosticInfo = {
            system: {
                platform: navigator.platform,
                userAgent: navigator.userAgent,
                memory: {
                    used: 0,
                    total: 0,
                    percentage: this.getMemoryUsage()
                },
                performance: {
                    fps: currentMetrics?.fps || 0,
                    renderTime: currentMetrics?.renderTime || 0,
                    drawCalls: currentMetrics?.drawCalls || 0
                }
            },
            application: {
                version: getAppVersion(),
                buildDate: getBuildDate(),
                environment: getEnvironment(),
                features: this.getEnabledFeatures()
            },
            project: {
                id: currentProject?.id,
                name: currentProject?.name,
                elementCount: currentProject?.elements?.length || 0,
                assetCount: currentProject?.assets?.length || 0,
                lastSaved: currentProject?.lastSaved
            },
            services: await this.getServicesStatus()
        };

        // إضافة معلومات الذاكرة إذا كانت متاحة
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            diagnosticInfo.system.memory = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
            };
        }

        return diagnosticInfo;
    }

    /**
     * الحصول على الميزات المفعلة
     */
    private getEnabledFeatures(): string[] {
        const features: string[] = [];

        // فحص الميزات المختلفة
        if (this.systemIntegration.getService('gameExportService')) {
            features.push('game-export');
        }

        if (this.systemIntegration.getService('assetManagementService')) {
            features.push('asset-management');
        }

        if (this.systemIntegration.getService('validationService')) {
            features.push('validation');
        }

        if (this.systemIntegration.getService('performanceOptimizer')) {
            features.push('performance-optimization');
        }

        if (this.systemIntegration.getService('clipboardService')) {
            features.push('clipboard');
        }

        return features;
    }

    /**
     * الحصول على حالة الخدمات
     */
    private async getServicesStatus(): Promise<DiagnosticInfo['services']> {
        const services: DiagnosticInfo['services'] = {};

        const serviceNames = [
            'projectManager',
            'gameExportService',
            'assetManagementService',
            'validationService',
            'performanceManager',
            'errorReportingSystem',
            'keyboardShortcutManager',
            'clipboardService'
        ] as const;

        for (const serviceName of serviceNames) {
            const service = this.systemIntegration.getService(serviceName);

            services[serviceName] = {
                status: service ? 'active' : 'inactive',
                lastActivity: new Date(), // يمكن تحسينها لتتبع النشاط الفعلي
                errorCount: this.getServiceErrorCount(serviceName)
            };
        }

        return services;
    }

    /**
     * الحصول على عدد أخطاء خدمة معينة
     */
    private getServiceErrorCount(serviceName: string): number {
        return this.logs.filter(log =>
            log.category === serviceName &&
            (log.level === 'error' || log.level === 'fatal')
        ).length;
    }

    /**
     * البحث في السجلات
     */
    public searchLogs(query: {
        level?: LogLevel;
        category?: string;
        message?: string;
        startDate?: Date;
        endDate?: Date;
        projectId?: string;
    }): LogEntry[] {
        return this.logs.filter(log => {
            if (query.level && log.level !== query.level) return false;
            if (query.category && !log.category.includes(query.category)) return false;
            if (query.message && !log.message.toLowerCase().includes(query.message.toLowerCase())) return false;
            if (query.startDate && log.timestamp < query.startDate) return false;
            if (query.endDate && log.timestamp > query.endDate) return false;
            if (query.projectId && log.projectId !== query.projectId) return false;
            return true;
        });
    }

    /**
     * الحصول على إحصائيات السجلات
     */
    public getLogStatistics(): {
        total: number;
        byLevel: Record<LogLevel, number>;
        byCategory: Record<string, number>;
        recentErrors: LogEntry[];
        topCategories: Array<{ category: string; count: number }>;
    } {
        const byLevel: Record<LogLevel, number> = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
            fatal: 0
        };

        const byCategory: Record<string, number> = {};

        for (const log of this.logs) {
            byLevel[log.level]++;
            byCategory[log.category] = (byCategory[log.category] || 0) + 1;
        }

        const recentErrors = this.logs
            .filter(log => log.level === 'error' || log.level === 'fatal')
            .slice(-10);

        const topCategories = Object.entries(byCategory)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            total: this.logs.length,
            byLevel,
            byCategory,
            recentErrors,
            topCategories
        };
    }

    /**
     * تصدير السجلات
     */
    public exportLogs(format: 'json' | 'csv' = 'json'): string {
        if (format === 'json') {
            return JSON.stringify({
                sessionId: this.sessionId,
                exportedAt: new Date().toISOString(),
                logs: this.logs,
                statistics: this.getLogStatistics()
            }, null, 2);
        } else {
            // تصدير CSV
            const headers = ['timestamp', 'level', 'category', 'message', 'data'];
            const rows = this.logs.map(log => [
                log.timestamp.toISOString(),
                log.level,
                log.category,
                log.message,
                log.data ? JSON.stringify(log.data) : ''
            ]);

            return [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
        }
    }

    /**
     * تصدير مقاييس الأداء
     */
    public exportPerformanceMetrics(): string {
        return JSON.stringify({
            sessionId: this.sessionId,
            exportedAt: new Date().toISOString(),
            metrics: this.performanceHistory,
            summary: this.getPerformanceSummary()
        }, null, 2);
    }

    /**
     * الحصول على ملخص الأداء
     */
    private getPerformanceSummary(): {
        averageFps: number;
        minFps: number;
        maxFps: number;
        averageMemoryUsage: number;
        maxMemoryUsage: number;
        averageRenderTime: number;
    } {
        if (this.performanceHistory.length === 0) {
            return {
                averageFps: 0,
                minFps: 0,
                maxFps: 0,
                averageMemoryUsage: 0,
                maxMemoryUsage: 0,
                averageRenderTime: 0
            };
        }

        const fps = this.performanceHistory.map(m => m.fps);
        const memory = this.performanceHistory.map(m => m.memoryUsage);
        const renderTime = this.performanceHistory.map(m => m.renderTime);

        return {
            averageFps: fps.reduce((a, b) => a + b, 0) / fps.length,
            minFps: Math.min(...fps),
            maxFps: Math.max(...fps),
            averageMemoryUsage: memory.reduce((a, b) => a + b, 0) / memory.length,
            maxMemoryUsage: Math.max(...memory),
            averageRenderTime: renderTime.reduce((a, b) => a + b, 0) / renderTime.length
        };
    }

    /**
     * تعيين مستوى السجل
     */
    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
        this.log('info', 'Diagnostics', `Log level changed to ${level}`);
    }

    /**
     * تنظيف السجلات القديمة
     */
    public cleanupOldLogs(maxAge: number = 24 * 60 * 60 * 1000): number {
        const cutoffTime = Date.now() - maxAge;
        const initialCount = this.logs.length;

        this.logs = this.logs.filter(log => log.timestamp.getTime() >= cutoffTime);

        const cleanedCount = initialCount - this.logs.length;
        if (cleanedCount > 0) {
            this.log('info', 'Diagnostics', `Cleaned up ${cleanedCount} old log entries`);
        }

        return cleanedCount;
    }

    /**
     * إنشاء تقرير تشخيصي شامل
     */
    public async generateDiagnosticReport(): Promise<string> {
        const diagnosticInfo = await this.collectDiagnosticInfo();
        const logStats = this.getLogStatistics();
        const performanceSummary = this.getPerformanceSummary();

        const report = {
            generatedAt: new Date().toISOString(),
            sessionId: this.sessionId,
            diagnosticInfo,
            logStatistics: logStats,
            performanceSummary,
            recentLogs: this.logs.slice(-100), // آخر 100 سجل
            recentPerformance: this.performanceHistory.slice(-100) // آخر 100 قياس أداء
        };

        return JSON.stringify(report, null, 2);
    }

    /**
     * تنظيف الموارد
     */
    public cleanup(): void {
        this.stopPerformanceCollection();
        this.logs = [];
        this.performanceHistory = [];
    }
}

export default DiagnosticsService;