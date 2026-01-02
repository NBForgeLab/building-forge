import { ExportError, ExportWarning } from './ExportValidator';
import { GeometryError, GeometryWarning } from './GeometryValidator';

/**
 * تقرير خطأ شامل
 */
export interface ErrorReport {
    id: string;
    timestamp: Date;
    category: ErrorCategory;
    severity: ErrorSeverity;
    title: string;
    description: string;
    context: ErrorContext;
    suggestions: AutoFixSuggestion[];
    relatedErrors: string[];
    userActions: UserAction[];
    systemInfo: SystemInfo;
}

/**
 * فئة الخطأ
 */
export enum ErrorCategory {
    GEOMETRY = 'geometry',
    MATERIAL = 'material',
    EXPORT = 'export',
    PERFORMANCE = 'performance',
    VALIDATION = 'validation',
    SYSTEM = 'system',
    USER_INPUT = 'user_input'
}

/**
 * مستوى الخطورة
 */
export enum ErrorSeverity {
    CRITICAL = 'critical',
    MAJOR = 'major',
    MINOR = 'minor',
    INFO = 'info'
}

/**
 * سياق الخطأ
 */
export interface ErrorContext {
    elementId?: string;
    materialId?: string;
    assetId?: string;
    toolName?: string;
    operation?: string;
    position?: { x: number; y: number; z: number };
    stackTrace?: string;
    userAgent?: string;
    projectState?: any;
}

/**
 * اقتراح إصلاح تلقائي
 */
export interface AutoFixSuggestion {
    id: string;
    title: string;
    description: string;
    action: FixAction;
    confidence: number; // 0-1
    riskLevel: 'low' | 'medium' | 'high';
    estimatedTime: number; // بالثواني
    prerequisites: string[];
}

/**
 * إجراء الإصلاح
 */
export interface FixAction {
    type: FixActionType;
    parameters: Record<string, any>;
    validation?: (context: any) => boolean;
    rollback?: (context: any) => void;
}

/**
 * نوع إجراء الإصلاح
 */
export enum FixActionType {
    DELETE_ELEMENT = 'delete_element',
    REPAIR_GEOMETRY = 'repair_geometry',
    REPLACE_MATERIAL = 'replace_material',
    OPTIMIZE_MESH = 'optimize_mesh',
    FIX_UV_MAPPING = 'fix_uv_mapping',
    COMPRESS_TEXTURE = 'compress_texture',
    MERGE_VERTICES = 'merge_vertices',
    REMOVE_DUPLICATES = 'remove_duplicates',
    VALIDATE_NORMALS = 'validate_normals',
    REGENERATE_ASSET = 'regenerate_asset'
}

/**
 * إجراء المستخدم
 */
export interface UserAction {
    timestamp: Date;
    action: string;
    parameters?: Record<string, any>;
    result?: 'success' | 'failure' | 'cancelled';
}

/**
 * معلومات النظام
 */
export interface SystemInfo {
    platform: string;
    renderer: string;
    memory: number;
    cores: number;
    gpu?: string;
    version: string;
}

/**
 * إعدادات نظام التقارير
 */
export interface ErrorReportingSettings {
    enableAutoFix: boolean;
    maxReports: number;
    retentionDays: number;
    enableTelemetry: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableStackTrace: boolean;
    enableContextCapture: boolean;
}

/**
 * إحصائيات الأخطاء
 */
export interface ErrorStatistics {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    mostCommonErrors: Array<{ type: string; count: number }>;
    fixSuccessRate: number;
    averageResolutionTime: number;
}

/**
 * نظام تقارير الأخطاء المتقدم
 */
export class ErrorReportingSystem {
    private reports: Map<string, ErrorReport>;
    private settings: ErrorReportingSettings;
    private fixStrategies: Map<string, AutoFixSuggestion[]>;
    private errorHistory: UserAction[];
    private systemInfo: SystemInfo;

    constructor(settings?: Partial<ErrorReportingSettings>) {
        this.settings = {
            enableAutoFix: true,
            maxReports: 1000,
            retentionDays: 30,
            enableTelemetry: false,
            logLevel: 'info',
            enableStackTrace: true,
            enableContextCapture: true,
            ...settings
        };

        this.reports = new Map();
        this.fixStrategies = new Map();
        this.errorHistory = [];
        this.systemInfo = this.collectSystemInfo();

        this.initializeFixStrategies();
    }

    /**
     * تسجيل خطأ هندسي
     */
    reportGeometryError(error: GeometryError, context?: Partial<ErrorContext>): string {
        const report: ErrorReport = {
            id: this.generateReportId(),
            timestamp: new Date(),
            category: ErrorCategory.GEOMETRY,
            severity: this.mapSeverity(error.severity),
            title: `خطأ هندسي: ${error.type}`,
            description: error.message,
            context: {
                elementId: error.elementId,
                position: error.position ? {
                    x: error.position.x,
                    y: error.position.y,
                    z: error.position.z
                } : undefined,
                ...context
            },
            suggestions: this.generateAutoFixSuggestions(error.type, error),
            relatedErrors: [],
            userActions: [],
            systemInfo: this.systemInfo
        };

        this.addReport(report);
        return report.id;
    }

    /**
     * تسجيل تحذير هندسي
     */
    reportGeometryWarning(warning: GeometryWarning, context?: Partial<ErrorContext>): string {
        const report: ErrorReport = {
            id: this.generateReportId(),
            timestamp: new Date(),
            category: ErrorCategory.GEOMETRY,
            severity: ErrorSeverity.MINOR,
            title: `تحذير هندسي: ${warning.type}`,
            description: warning.message,
            context: {
                elementId: warning.elementId,
                position: warning.position ? {
                    x: warning.position.x,
                    y: warning.position.y,
                    z: warning.position.z
                } : undefined,
                ...context
            },
            suggestions: this.generateWarningFixSuggestions(warning.type, warning),
            relatedErrors: [],
            userActions: [],
            systemInfo: this.systemInfo
        };

        this.addReport(report);
        return report.id;
    }

    /**
     * تسجيل خطأ تصدير
     */
    reportExportError(error: ExportError, context?: Partial<ErrorContext>): string {
        const report: ErrorReport = {
            id: this.generateReportId(),
            timestamp: new Date(),
            category: ErrorCategory.EXPORT,
            severity: this.mapSeverity(error.severity),
            title: `خطأ تصدير: ${error.type}`,
            description: error.message,
            context: {
                elementId: error.elementId,
                materialId: error.materialId,
                assetId: error.assetId,
                ...context
            },
            suggestions: this.generateExportFixSuggestions(error.type, error),
            relatedErrors: [],
            userActions: [],
            systemInfo: this.systemInfo
        };

        this.addReport(report);
        return report.id;
    }

    /**
     * تسجيل تحذير تصدير
     */
    reportExportWarning(warning: ExportWarning, context?: Partial<ErrorContext>): string {
        const report: ErrorReport = {
            id: this.generateReportId(),
            timestamp: new Date(),
            category: ErrorCategory.EXPORT,
            severity: ErrorSeverity.MINOR,
            title: `تحذير تصدير: ${warning.type}`,
            description: warning.message,
            context: {
                elementId: warning.elementId,
                materialId: warning.materialId,
                ...context
            },
            suggestions: this.generateExportWarningFixSuggestions(warning.type, warning),
            relatedErrors: [],
            userActions: [],
            systemInfo: this.systemInfo
        };

        this.addReport(report);
        return report.id;
    }

    /**
     * تسجيل خطأ مخصص
     */
    reportCustomError(
        category: ErrorCategory,
        severity: ErrorSeverity,
        title: string,
        description: string,
        context?: ErrorContext
    ): string {
        const report: ErrorReport = {
            id: this.generateReportId(),
            timestamp: new Date(),
            category,
            severity,
            title,
            description,
            context: context || {},
            suggestions: [],
            relatedErrors: [],
            userActions: [],
            systemInfo: this.systemInfo
        };

        this.addReport(report);
        return report.id;
    }

    /**
     * تطبيق إصلاح تلقائي
     */
    async applyAutoFix(reportId: string, suggestionId: string): Promise<boolean> {
        const report = this.reports.get(reportId);
        if (!report) return false;

        const suggestion = report.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return false;

        try {
            // تسجيل محاولة الإصلاح
            const action: UserAction = {
                timestamp: new Date(),
                action: 'apply_auto_fix',
                parameters: { reportId, suggestionId },
                result: 'success'
            };

            // تطبيق الإصلاح
            const success = await this.executeFixAction(suggestion.action, report.context);

            action.result = success ? 'success' : 'failure';
            report.userActions.push(action);
            this.errorHistory.push(action);

            if (success) {
                // تحديث حالة التقرير
                report.title += ' (تم الإصلاح)';
                this.updateReport(report);
            }

            return success;
        } catch (error) {
            console.error('فشل في تطبيق الإصلاح التلقائي:', error);
            return false;
        }
    }

    /**
     * الحصول على تقرير
     */
    getReport(reportId: string): ErrorReport | undefined {
        return this.reports.get(reportId);
    }

    /**
     * الحصول على جميع التقارير
     */
    getAllReports(): ErrorReport[] {
        return Array.from(this.reports.values()).sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
    }

    /**
     * تصفية التقارير
     */
    getReportsByFilter(filter: {
        category?: ErrorCategory;
        severity?: ErrorSeverity;
        elementId?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }): ErrorReport[] {
        return this.getAllReports().filter(report => {
            if (filter.category && report.category !== filter.category) return false;
            if (filter.severity && report.severity !== filter.severity) return false;
            if (filter.elementId && report.context.elementId !== filter.elementId) return false;
            if (filter.dateFrom && report.timestamp < filter.dateFrom) return false;
            if (filter.dateTo && report.timestamp > filter.dateTo) return false;
            return true;
        });
    }

    /**
     * الحصول على إحصائيات الأخطاء
     */
    getErrorStatistics(): ErrorStatistics {
        const reports = this.getAllReports();

        const errorsByCategory = {} as Record<ErrorCategory, number>;
        const errorsBySeverity = {} as Record<ErrorSeverity, number>;
        const errorTypes = new Map<string, number>();

        // تهيئة العدادات
        Object.values(ErrorCategory).forEach(cat => errorsByCategory[cat] = 0);
        Object.values(ErrorSeverity).forEach(sev => errorsBySeverity[sev] = 0);

        let totalFixed = 0;
        let totalResolutionTime = 0;

        for (const report of reports) {
            errorsByCategory[report.category]++;
            errorsBySeverity[report.severity]++;

            const errorType = report.title.split(':')[0];
            errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);

            // حساب معدل الإصلاح
            const fixActions = report.userActions.filter(a => a.action === 'apply_auto_fix');
            if (fixActions.length > 0) {
                const successfulFixes = fixActions.filter(a => a.result === 'success');
                if (successfulFixes.length > 0) {
                    totalFixed++;
                    const resolutionTime = successfulFixes[0].timestamp.getTime() - report.timestamp.getTime();
                    totalResolutionTime += resolutionTime;
                }
            }
        }

        const mostCommonErrors = Array.from(errorTypes.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([type, count]) => ({ type, count }));

        return {
            totalErrors: reports.length,
            errorsByCategory,
            errorsBySeverity,
            mostCommonErrors,
            fixSuccessRate: reports.length > 0 ? totalFixed / reports.length : 0,
            averageResolutionTime: totalFixed > 0 ? totalResolutionTime / totalFixed : 0
        };
    }

    /**
     * تنظيف التقارير القديمة
     */
    cleanupOldReports(): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);

        for (const [id, report] of this.reports) {
            if (report.timestamp < cutoffDate) {
                this.reports.delete(id);
            }
        }

        // تنظيف تاريخ الإجراءات
        this.errorHistory = this.errorHistory.filter(action => action.timestamp >= cutoffDate);
    }

    /**
     * تصدير التقارير
     */
    exportReports(format: 'json' | 'csv' = 'json'): string {
        const reports = this.getAllReports();

        if (format === 'json') {
            return JSON.stringify(reports, null, 2);
        } else {
            // تصدير CSV
            const headers = ['ID', 'Timestamp', 'Category', 'Severity', 'Title', 'Description'];
            const rows = reports.map(report => [
                report.id,
                report.timestamp.toISOString(),
                report.category,
                report.severity,
                report.title,
                report.description.replace(/"/g, '""')
            ]);

            return [headers, ...rows].map(row =>
                row.map(cell => `"${cell}"`).join(',')
            ).join('\n');
        }
    }

    // دوال مساعدة خاصة

    private addReport(report: ErrorReport): void {
        this.reports.set(report.id, report);

        // تنظيف إذا تجاوز الحد الأقصى
        if (this.reports.size > this.settings.maxReports) {
            const oldestId = Array.from(this.reports.entries())
                .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())[0][0];
            this.reports.delete(oldestId);
        }

        // ربط الأخطاء المتعلقة
        this.linkRelatedErrors(report);
    }

    private updateReport(report: ErrorReport): void {
        this.reports.set(report.id, report);
    }

    private generateReportId(): string {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private mapSeverity(severity: string): ErrorSeverity {
        switch (severity) {
            case 'critical': return ErrorSeverity.CRITICAL;
            case 'major': return ErrorSeverity.MAJOR;
            case 'minor': return ErrorSeverity.MINOR;
            default: return ErrorSeverity.INFO;
        }
    }

    private collectSystemInfo(): SystemInfo {
        return {
            platform: navigator.platform,
            renderer: this.getRendererInfo(),
            memory: (performance as any).memory?.usedJSHeapSize || 0,
            cores: navigator.hardwareConcurrency || 1,
            gpu: this.getGPUInfo(),
            version: '1.0.0' // يجب الحصول عليها من package.json
        };
    }

    private getRendererInfo(): string {
        try {
            // التحقق من وجود بيئة المتصفح
            if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
                return 'Test Environment';
            }

            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                }
            }
        } catch (error) {
            // في بيئة الاختبار، قد لا يكون Canvas متاحاً
        }
        return 'Unknown';
    }

    private getGPUInfo(): string {
        try {
            // التحقق من وجود بيئة المتصفح
            if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
                return 'Test Environment GPU';
            }

            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                return gl.getParameter(gl.RENDERER);
            }
        } catch (error) {
            // في بيئة الاختبار، قد لا يكون Canvas متاحاً
        }
        return 'Unknown';
    }

    private initializeFixStrategies(): void {
        // استراتيجيات الإصلاح للأخطاء الهندسية
        this.fixStrategies.set('invalid_dimensions', [
            {
                id: 'scale_to_minimum',
                title: 'تكبير إلى الحد الأدنى',
                description: 'تكبير العنصر ليصل إلى الحد الأدنى المطلوب',
                action: {
                    type: FixActionType.REPAIR_GEOMETRY,
                    parameters: { operation: 'scale_to_minimum' }
                },
                confidence: 0.9,
                riskLevel: 'low',
                estimatedTime: 5,
                prerequisites: []
            }
        ]);

        this.fixStrategies.set('degenerate_faces', [
            {
                id: 'remove_degenerate',
                title: 'إزالة الوجوه المنحلة',
                description: 'إزالة الوجوه ذات المساحة الصفرية أو السالبة',
                action: {
                    type: FixActionType.REPAIR_GEOMETRY,
                    parameters: { operation: 'remove_degenerate_faces' }
                },
                confidence: 0.8,
                riskLevel: 'medium',
                estimatedTime: 10,
                prerequisites: []
            }
        ]);

        // المزيد من الاستراتيجيات...
    }

    private generateAutoFixSuggestions(errorType: string, error: any): AutoFixSuggestion[] {
        return this.fixStrategies.get(errorType) || [];
    }

    private generateWarningFixSuggestions(warningType: string, warning: any): AutoFixSuggestion[] {
        // اقتراحات للتحذيرات
        return [];
    }

    private generateExportFixSuggestions(errorType: string, error: any): AutoFixSuggestion[] {
        // اقتراحات لأخطاء التصدير
        return [];
    }

    private generateExportWarningFixSuggestions(warningType: string, warning: any): AutoFixSuggestion[] {
        // اقتراحات لتحذيرات التصدير
        return [];
    }

    private async executeFixAction(action: FixAction, context: ErrorContext): Promise<boolean> {
        try {
            switch (action.type) {
                case FixActionType.REPAIR_GEOMETRY:
                    return await this.repairGeometry(action.parameters, context);
                case FixActionType.REPLACE_MATERIAL:
                    return await this.replaceMaterial(action.parameters, context);
                case FixActionType.OPTIMIZE_MESH:
                    return await this.optimizeMesh(action.parameters, context);
                // المزيد من الإجراءات...
                default:
                    return false;
            }
        } catch (error) {
            console.error('خطأ في تنفيذ إجراء الإصلاح:', error);
            return false;
        }
    }

    private async repairGeometry(parameters: any, context: ErrorContext): Promise<boolean> {
        // تنفيذ إصلاح الهندسة
        console.log('إصلاح الهندسة:', parameters, context);
        return true; // مؤقت
    }

    private async replaceMaterial(parameters: any, context: ErrorContext): Promise<boolean> {
        // تنفيذ استبدال المادة
        console.log('استبدال المادة:', parameters, context);
        return true; // مؤقت
    }

    private async optimizeMesh(parameters: any, context: ErrorContext): Promise<boolean> {
        // تنفيذ تحسين الشبكة
        console.log('تحسين الشبكة:', parameters, context);
        return true; // مؤقت
    }

    private linkRelatedErrors(report: ErrorReport): void {
        // ربط الأخطاء المتعلقة بنفس العنصر أو المادة
        const relatedReports = this.getAllReports().filter(r =>
            r.id !== report.id && (
                (r.context.elementId && r.context.elementId === report.context.elementId) ||
                (r.context.materialId && r.context.materialId === report.context.materialId)
            )
        );

        report.relatedErrors = relatedReports.map(r => r.id);
    }

    /**
     * تحديث إعدادات النظام
     */
    updateSettings(newSettings: Partial<ErrorReportingSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    getSettings(): ErrorReportingSettings {
        return { ...this.settings };
    }
}