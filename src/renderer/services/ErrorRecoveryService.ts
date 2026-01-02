/**
 * خدمة الاستعادة من الأخطاء
 * تدير معالجة الأخطاء الشاملة مع آليات الاستعادة التلقائية
 */

import { SystemIntegrationService } from './SystemIntegrationService';

export interface ErrorContext {
    component: string;
    action: string;
    timestamp: Date;
    userId?: string;
    sessionId: string;
    projectId?: string;
    metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
    id: string;
    name: string;
    description: string;
    canRecover: (error: Error, context: ErrorContext) => boolean;
    recover: (error: Error, context: ErrorContext) => Promise<RecoveryResult>;
    priority: number; // أعلى رقم = أولوية أعلى
}

export interface RecoveryResult {
    success: boolean;
    message: string;
    actions?: string[];
    requiresUserAction?: boolean;
    data?: any;
}

export interface ErrorReport {
    id: string;
    error: Error;
    context: ErrorContext;
    recoveryAttempts: RecoveryAttempt[];
    resolved: boolean;
    createdAt: Date;
    resolvedAt?: Date;
}

export interface RecoveryAttempt {
    strategyId: string;
    timestamp: Date;
    result: RecoveryResult;
}

export class ErrorRecoveryService {
    private systemIntegration: SystemIntegrationService;
    private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
    private errorReports: Map<string, ErrorReport> = new Map();
    private sessionId: string;
    private isRecovering = false;

    constructor() {
        this.systemIntegration = SystemIntegrationService.getInstance();
        this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.initializeDefaultStrategies();
    }

    /**
     * تهيئة استراتيجيات الاستعادة الافتراضية
     */
    private initializeDefaultStrategies(): void {
        // استراتيجية إعادة تحميل المشروع
        this.registerStrategy({
            id: 'reload-project',
            name: 'إعادة تحميل المشروع',
            description: 'إعادة تحميل المشروع الحالي من آخر نسخة محفوظة',
            priority: 8,
            canRecover: (error, context) => {
                return context.component === 'ProjectManager' &&
                    context.projectId !== undefined;
            },
            recover: async (error, context) => {
                try {
                    const projectManager = this.systemIntegration.getService('projectManager');
                    if (!projectManager || !context.projectId) {
                        return {
                            success: false,
                            message: 'لا يمكن الوصول لمدير المشاريع أو معرف المشروع'
                        };
                    }

                    await projectManager.reloadProject(context.projectId);
                    return {
                        success: true,
                        message: 'تم إعادة تحميل المشروع بنجاح',
                        actions: ['تم استعادة المشروع من آخر نسخة محفوظة']
                    };
                } catch (recoveryError) {
                    return {
                        success: false,
                        message: `فشل في إعادة تحميل المشروع: ${recoveryError instanceof Error ? recoveryError.message : 'خطأ غير معروف'}`
                    };
                }
            }
        });

        // استراتيجية إعادة تشغيل النظام
        this.registerStrategy({
            id: 'restart-system',
            name: 'إعادة تشغيل النظام',
            description: 'إعادة تشغيل جميع الخدمات الأساسية',
            priority: 6,
            canRecover: (error, context) => {
                return context.component === 'SystemIntegrationService' ||
                    error.message.includes('service not available');
            },
            recover: async (error, context) => {
                try {
                    await this.systemIntegration.restart();
                    return {
                        success: true,
                        message: 'تم إعادة تشغيل النظام بنجاح',
                        actions: ['تم إعادة تهيئة جميع الخدمات']
                    };
                } catch (recoveryError) {
                    return {
                        success: false,
                        message: `فشل في إعادة تشغيل النظام: ${recoveryError instanceof Error ? recoveryError.message : 'خطأ غير معروف'}`
                    };
                }
            }
        });

        // استراتيجية تنظيف الذاكرة
        this.registerStrategy({
            id: 'memory-cleanup',
            name: 'تنظيف الذاكرة',
            description: 'تنظيف الذاكرة وتحرير الموارد غير المستخدمة',
            priority: 4,
            canRecover: (error, context) => {
                return error.message.includes('memory') ||
                    error.message.includes('out of memory') ||
                    context.metadata?.memoryUsage > 80;
            },
            recover: async (error, context) => {
                try {
                    const performanceManager = this.systemIntegration.getService('performanceManager');
                    if (performanceManager) {
                        await performanceManager.cleanupMemory?.();
                    }

                    // تشغيل garbage collection إذا كان متاحاً
                    if (global.gc) {
                        global.gc();
                    }

                    return {
                        success: true,
                        message: 'تم تنظيف الذاكرة بنجاح',
                        actions: ['تم تحرير الموارد غير المستخدمة']
                    };
                } catch (recoveryError) {
                    return {
                        success: false,
                        message: `فشل في تنظيف الذاكرة: ${recoveryError instanceof Error ? recoveryError.message : 'خطأ غير معروف'}`
                    };
                }
            }
        });

        // استراتيجية إعادة تعيين الواجهة
        this.registerStrategy({
            id: 'reset-ui',
            name: 'إعادة تعيين الواجهة',
            description: 'إعادة تعيين واجهة المستخدم للحالة الافتراضية',
            priority: 3,
            canRecover: (error, context) => {
                return context.component.includes('Panel') ||
                    context.component.includes('Dialog') ||
                    context.component === 'DockviewLayoutManager';
            },
            recover: async (error, context) => {
                try {
                    const layoutManager = this.systemIntegration.getService('dockviewLayoutManager');
                    if (layoutManager) {
                        await layoutManager.resetToDefault();
                    }

                    return {
                        success: true,
                        message: 'تم إعادة تعيين الواجهة بنجاح',
                        actions: ['تم استعادة التخطيط الافتراضي للواجهة']
                    };
                } catch (recoveryError) {
                    return {
                        success: false,
                        message: `فشل في إعادة تعيين الواجهة: ${recoveryError instanceof Error ? recoveryError.message : 'خطأ غير معروف'}`
                    };
                }
            }
        });

        // استراتيجية إعادة المحاولة البسيطة
        this.registerStrategy({
            id: 'simple-retry',
            name: 'إعادة المحاولة',
            description: 'إعادة محاولة العملية الفاشلة',
            priority: 2,
            canRecover: (error, context) => {
                return !error.message.includes('fatal') &&
                    !error.message.includes('critical') &&
                    context.metadata?.retryCount < 3;
            },
            recover: async (error, context) => {
                return {
                    success: true,
                    message: 'يمكن إعادة المحاولة',
                    requiresUserAction: true,
                    actions: ['انقر على "إعادة المحاولة" لتكرار العملية']
                };
            }
        });

        // استراتيجية الحفظ الطارئ
        this.registerStrategy({
            id: 'emergency-save',
            name: 'الحفظ الطارئ',
            description: 'حفظ المشروع الحالي كنسخة طارئة',
            priority: 9,
            canRecover: (error, context) => {
                return context.projectId !== undefined &&
                    (error.message.includes('crash') ||
                        error.message.includes('fatal') ||
                        context.component === 'ProjectManager');
            },
            recover: async (error, context) => {
                try {
                    const projectManager = this.systemIntegration.getService('projectManager');
                    if (!projectManager) {
                        return {
                            success: false,
                            message: 'مدير المشاريع غير متاح للحفظ الطارئ'
                        };
                    }

                    const currentProject = projectManager.getCurrentProject();
                    if (!currentProject) {
                        return {
                            success: false,
                            message: 'لا يوجد مشروع مفتوح للحفظ'
                        };
                    }

                    const emergencyPath = `emergency-save-${Date.now()}.bforge`;
                    await projectManager.saveProject(currentProject, emergencyPath);

                    return {
                        success: true,
                        message: 'تم الحفظ الطارئ بنجاح',
                        actions: [`تم حفظ المشروع في: ${emergencyPath}`],
                        data: { emergencyPath }
                    };
                } catch (recoveryError) {
                    return {
                        success: false,
                        message: `فشل في الحفظ الطارئ: ${recoveryError instanceof Error ? recoveryError.message : 'خطأ غير معروف'}`
                    };
                }
            }
        });
    }

    /**
     * تسجيل استراتيجية استعادة جديدة
     */
    public registerStrategy(strategy: RecoveryStrategy): void {
        this.recoveryStrategies.set(strategy.id, strategy);
    }

    /**
     * إلغاء تسجيل استراتيجية استعادة
     */
    public unregisterStrategy(strategyId: string): boolean {
        return this.recoveryStrategies.delete(strategyId);
    }

    /**
     * معالجة خطأ مع محاولة الاستعادة التلقائية
     */
    public async handleError(
        error: Error,
        context: Partial<ErrorContext>
    ): Promise<{
        recovered: boolean;
        report: ErrorReport;
        userActionRequired?: boolean;
    }> {
        // منع الاستعادة المتداخلة
        if (this.isRecovering) {
            console.warn('Recovery already in progress, skipping nested recovery');
            return {
                recovered: false,
                report: this.createErrorReport(error, context),
                userActionRequired: true
            };
        }

        this.isRecovering = true;

        try {
            const fullContext: ErrorContext = {
                component: context.component || 'Unknown',
                action: context.action || 'Unknown',
                timestamp: new Date(),
                sessionId: this.sessionId,
                projectId: context.projectId,
                metadata: context.metadata || {}
            };

            const report = this.createErrorReport(error, fullContext);

            // تسجيل الخطأ في نظام التقارير
            const errorReporting = this.systemIntegration.getService('errorReportingSystem');
            if (errorReporting) {
                errorReporting.reportError(fullContext.component, error.message, fullContext);
            }

            // البحث عن استراتيجيات الاستعادة المناسبة
            const applicableStrategies = this.findApplicableStrategies(error, fullContext);

            if (applicableStrategies.length === 0) {
                console.warn('No recovery strategies found for error:', error.message);
                return {
                    recovered: false,
                    report,
                    userActionRequired: true
                };
            }

            // ترتيب الاستراتيجيات حسب الأولوية
            applicableStrategies.sort((a, b) => b.priority - a.priority);

            // محاولة تطبيق الاستراتيجيات
            for (const strategy of applicableStrategies) {
                try {
                    const result = await strategy.recover(error, fullContext);

                    const attempt: RecoveryAttempt = {
                        strategyId: strategy.id,
                        timestamp: new Date(),
                        result
                    };

                    report.recoveryAttempts.push(attempt);

                    if (result.success) {
                        report.resolved = true;
                        report.resolvedAt = new Date();

                        console.log(`Recovery successful using strategy: ${strategy.name}`);
                        return {
                            recovered: true,
                            report,
                            userActionRequired: result.requiresUserAction
                        };
                    }
                } catch (recoveryError) {
                    console.warn(`Recovery strategy ${strategy.id} failed:`, recoveryError);

                    const attempt: RecoveryAttempt = {
                        strategyId: strategy.id,
                        timestamp: new Date(),
                        result: {
                            success: false,
                            message: recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error'
                        }
                    };

                    report.recoveryAttempts.push(attempt);
                }
            }

            console.warn('All recovery strategies failed for error:', error.message);
            return {
                recovered: false,
                report,
                userActionRequired: true
            };

        } finally {
            this.isRecovering = false;
        }
    }

    /**
     * إنشاء تقرير خطأ
     */
    private createErrorReport(error: Error, context: Partial<ErrorContext>): ErrorReport {
        const reportId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const fullContext: ErrorContext = {
            component: context.component || 'Unknown',
            action: context.action || 'Unknown',
            timestamp: new Date(),
            sessionId: this.sessionId,
            projectId: context.projectId,
            metadata: context.metadata || {}
        };

        const report: ErrorReport = {
            id: reportId,
            error,
            context: fullContext,
            recoveryAttempts: [],
            resolved: false,
            createdAt: new Date()
        };

        this.errorReports.set(reportId, report);
        return report;
    }

    /**
     * البحث عن استراتيجيات الاستعادة المناسبة
     */
    private findApplicableStrategies(error: Error, context: ErrorContext): RecoveryStrategy[] {
        const strategies: RecoveryStrategy[] = [];

        for (const strategy of this.recoveryStrategies.values()) {
            try {
                if (strategy.canRecover(error, context)) {
                    strategies.push(strategy);
                }
            } catch (checkError) {
                console.warn(`Error checking recovery strategy ${strategy.id}:`, checkError);
            }
        }

        return strategies;
    }

    /**
     * الحصول على تقارير الأخطاء
     */
    public getErrorReports(): ErrorReport[] {
        return Array.from(this.errorReports.values());
    }

    /**
     * الحصول على تقرير خطأ محدد
     */
    public getErrorReport(reportId: string): ErrorReport | undefined {
        return this.errorReports.get(reportId);
    }

    /**
     * حل خطأ يدوياً
     */
    public resolveError(reportId: string, resolution: string): boolean {
        const report = this.errorReports.get(reportId);
        if (report && !report.resolved) {
            report.resolved = true;
            report.resolvedAt = new Date();
            report.recoveryAttempts.push({
                strategyId: 'manual-resolution',
                timestamp: new Date(),
                result: {
                    success: true,
                    message: resolution
                }
            });
            return true;
        }
        return false;
    }

    /**
     * تنظيف تقارير الأخطاء القديمة
     */
    public cleanupOldReports(maxAge: number = 24 * 60 * 60 * 1000): number {
        const cutoffTime = Date.now() - maxAge;
        let cleanedCount = 0;

        for (const [reportId, report] of this.errorReports.entries()) {
            if (report.createdAt.getTime() < cutoffTime && report.resolved) {
                this.errorReports.delete(reportId);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * الحصول على إحصائيات الأخطاء
     */
    public getErrorStatistics(): {
        total: number;
        resolved: number;
        unresolved: number;
        byComponent: Record<string, number>;
        recoverySuccessRate: number;
    } {
        const reports = Array.from(this.errorReports.values());
        const total = reports.length;
        const resolved = reports.filter(r => r.resolved).length;
        const unresolved = total - resolved;

        const byComponent: Record<string, number> = {};
        for (const report of reports) {
            const component = report.context.component;
            byComponent[component] = (byComponent[component] || 0) + 1;
        }

        const totalRecoveryAttempts = reports.reduce((sum, r) => sum + r.recoveryAttempts.length, 0);
        const successfulRecoveries = reports.reduce((sum, r) =>
            sum + r.recoveryAttempts.filter(a => a.result.success).length, 0
        );
        const recoverySuccessRate = totalRecoveryAttempts > 0 ?
            (successfulRecoveries / totalRecoveryAttempts) * 100 : 0;

        return {
            total,
            resolved,
            unresolved,
            byComponent,
            recoverySuccessRate
        };
    }

    /**
     * تصدير تقارير الأخطاء للتحليل
     */
    public exportErrorReports(): string {
        const reports = this.getErrorReports();
        const statistics = this.getErrorStatistics();

        return JSON.stringify({
            sessionId: this.sessionId,
            exportedAt: new Date().toISOString(),
            statistics,
            reports: reports.map(report => ({
                ...report,
                error: {
                    name: report.error.name,
                    message: report.error.message,
                    stack: report.error.stack
                }
            }))
        }, null, 2);
    }
}

export default ErrorRecoveryService;