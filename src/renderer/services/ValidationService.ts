import { Asset, BuildingElement, Material } from '../store/types';
import { ErrorCategory, ErrorReportingSystem, ErrorSeverity } from './ErrorReportingSystem';
import { ExportFormat, ExportValidationResult, ExportValidationSettings, ExportValidator, GameEngine } from './ExportValidator';
import { GeometryValidationResult, GeometryValidationSettings, GeometryValidator } from './GeometryValidator';

/**
 * نتيجة التحقق الشاملة
 */
export interface ComprehensiveValidationResult {
    isValid: boolean;
    canProceed: boolean;
    geometryValidation: GeometryValidationResult;
    exportValidation?: ExportValidationResult;
    summary: ValidationSummary;
    reportIds: string[];
}

/**
 * ملخص التحقق
 */
export interface ValidationSummary {
    totalIssues: number;
    criticalErrors: number;
    majorErrors: number;
    minorErrors: number;
    warnings: number;
    fixableIssues: number;
    autoFixableIssues: number;
    estimatedFixTime: number; // بالدقائق
}

/**
 * إعدادات خدمة التحقق
 */
export interface ValidationServiceSettings {
    geometry: GeometryValidationSettings;
    export: ExportValidationSettings;
    enableReporting: boolean;
    autoReport: boolean;
    enableAutoFix: boolean;
    validationMode: 'strict' | 'normal' | 'lenient';
}

/**
 * نوع التحقق
 */
export enum ValidationType {
    GEOMETRY_ONLY = 'geometry_only',
    EXPORT_ONLY = 'export_only',
    COMPREHENSIVE = 'comprehensive',
    QUICK_CHECK = 'quick_check'
}

/**
 * خدمة التحقق من صحة البيانات الموحدة
 */
export class ValidationService {
    private geometryValidator: GeometryValidator;
    private exportValidator: ExportValidator;
    private errorReporting: ErrorReportingSystem;
    private settings: ValidationServiceSettings;

    constructor(settings?: Partial<ValidationServiceSettings>) {
        // الإعدادات الافتراضية
        this.settings = {
            geometry: {
                tolerance: 1e-6,
                minDimension: 0.01,
                maxDimension: 1000,
                maxPolygonCount: 100000,
                checkIntersections: true,
                checkManifold: true,
                checkDegenerateFaces: true,
                performanceMode: false
            },
            export: {
                targetFormat: ExportFormat.GLB,
                targetEngine: GameEngine.UNITY,
                maxFileSize: 100,
                maxTextureSize: 4096,
                maxPolygonCount: 100000,
                requireLOD: false,
                validateMaterials: true,
                validateTextures: true,
                validateUVMapping: true,
                performanceMode: false,
                strictMode: false
            },
            enableReporting: true,
            autoReport: true,
            enableAutoFix: true,
            validationMode: 'normal',
            ...settings
        };

        // تهيئة المحققات
        this.geometryValidator = new GeometryValidator(this.settings.geometry);
        this.exportValidator = new ExportValidator(this.settings.export);
        this.errorReporting = new ErrorReportingSystem({
            enableAutoFix: this.settings.enableAutoFix
        });

        // تعديل الإعدادات حسب وضع التحقق
        this.adjustSettingsForMode();
    }

    /**
     * التحقق الشامل من المشروع
     */
    async validateProject(
        elements: BuildingElement[],
        materials: Material[],
        assets: Asset[],
        validationType: ValidationType = ValidationType.COMPREHENSIVE
    ): Promise<ComprehensiveValidationResult> {
        const result: ComprehensiveValidationResult = {
            isValid: true,
            canProceed: true,
            geometryValidation: {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: []
            },
            summary: {
                totalIssues: 0,
                criticalErrors: 0,
                majorErrors: 0,
                minorErrors: 0,
                warnings: 0,
                fixableIssues: 0,
                autoFixableIssues: 0,
                estimatedFixTime: 0
            },
            reportIds: []
        };

        try {
            // التحقق من الهندسة
            if (validationType === ValidationType.GEOMETRY_ONLY ||
                validationType === ValidationType.COMPREHENSIVE) {
                result.geometryValidation = await this.geometryValidator.validateElements(elements);

                // تسجيل الأخطاء والتحذيرات
                if (this.settings.enableReporting && this.settings.autoReport) {
                    result.reportIds.push(...await this.reportGeometryIssues(result.geometryValidation));
                }
            }

            // التحقق من التصدير
            if (validationType === ValidationType.EXPORT_ONLY ||
                validationType === ValidationType.COMPREHENSIVE) {
                result.exportValidation = await this.exportValidator.validateForExport(elements, materials, assets);

                // تسجيل أخطاء التصدير
                if (this.settings.enableReporting && this.settings.autoReport) {
                    result.reportIds.push(...await this.reportExportIssues(result.exportValidation));
                }
            }

            // الفحص السريع
            if (validationType === ValidationType.QUICK_CHECK) {
                result.geometryValidation = await this.performQuickGeometryCheck(elements);
            }

            // حساب الملخص
            result.summary = this.calculateSummary(result);
            result.isValid = result.summary.criticalErrors === 0 && result.summary.majorErrors === 0;
            result.canProceed = result.summary.criticalErrors === 0;

        } catch (error) {
            // تسجيل خطأ النظام
            if (this.settings.enableReporting) {
                const reportId = this.errorReporting.reportCustomError(
                    ErrorCategory.SYSTEM,
                    ErrorSeverity.CRITICAL,
                    'خطأ في نظام التحقق',
                    `فشل في التحقق من المشروع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                    { operation: 'validateProject' }
                );
                result.reportIds.push(reportId);
            }

            result.isValid = false;
            result.canProceed = false;
        }

        return result;
    }

    /**
     * التحقق من عنصر واحد
     */
    async validateElement(
        element: BuildingElement,
        allElements: BuildingElement[] = []
    ): Promise<GeometryValidationResult> {
        try {
            const result = await this.geometryValidator.validateElement(element, allElements);

            // تسجيل الأخطاء إذا كان مفعلاً
            if (this.settings.enableReporting && this.settings.autoReport) {
                await this.reportGeometryIssues(result);
            }

            return result;
        } catch (error) {
            // إنشاء نتيجة خطأ
            const errorResult: GeometryValidationResult = {
                isValid: false,
                errors: [{
                    id: `validation_error_${element.id}`,
                    type: 'invalid_geometry' as any,
                    message: `فشل في التحقق من العنصر: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                    elementId: element.id,
                    severity: 'critical' as any,
                    fixable: false
                }],
                warnings: [],
                suggestions: []
            };

            return errorResult;
        }
    }

    /**
     * التحقق من المواد
     */
    async validateMaterials(materials: Material[], assets: Asset[]): Promise<ExportValidationResult> {
        try {
            return await this.exportValidator.validateForExport([], materials, assets);
        } catch (error) {
            // إنشاء نتيجة خطأ
            return {
                isValid: false,
                canExport: false,
                errors: [{
                    id: 'material_validation_error',
                    type: 'invalid_material' as any,
                    message: `فشل في التحقق من المواد: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                    severity: 'critical' as any,
                    fixable: false,
                    autoFixAvailable: false
                }],
                warnings: [],
                missingAssets: [],
                performanceMetrics: {
                    totalVertices: 0,
                    totalTriangles: 0,
                    totalMaterials: materials.length,
                    totalTextures: 0,
                    estimatedFileSize: 0,
                    drawCalls: 0,
                    memoryUsage: 0,
                    performanceRating: 'poor' as any
                },
                suggestions: []
            };
        }
    }

    /**
     * تطبيق الإصلاحات التلقائية
     */
    async applyAutoFixes(reportIds: string[]): Promise<{ success: number; failed: number; results: Array<{ reportId: string; success: boolean }> }> {
        const results: Array<{ reportId: string; success: boolean }> = [];
        let success = 0;
        let failed = 0;

        for (const reportId of reportIds) {
            const report = this.errorReporting.getReport(reportId);
            if (!report) {
                results.push({ reportId, success: false });
                failed++;
                continue;
            }

            // البحث عن اقتراحات قابلة للإصلاح التلقائي
            const autoFixableSuggestions = report.suggestions.filter(s => s.confidence > 0.7 && s.riskLevel !== 'high');

            if (autoFixableSuggestions.length === 0) {
                results.push({ reportId, success: false });
                failed++;
                continue;
            }

            // تطبيق أفضل اقتراح
            const bestSuggestion = autoFixableSuggestions.sort((a, b) => b.confidence - a.confidence)[0];
            const fixResult = await this.errorReporting.applyAutoFix(reportId, bestSuggestion.id);

            results.push({ reportId, success: fixResult });
            if (fixResult) {
                success++;
            } else {
                failed++;
            }
        }

        return { success, failed, results };
    }

    /**
     * الحصول على تقرير مفصل
     */
    getDetailedReport(reportId: string) {
        return this.errorReporting.getReport(reportId);
    }

    /**
     * الحصول على إحصائيات التحقق
     */
    getValidationStatistics() {
        return this.errorReporting.getErrorStatistics();
    }

    /**
     * تصدير تقارير التحقق
     */
    exportValidationReports(format: 'json' | 'csv' = 'json'): string {
        return this.errorReporting.exportReports(format);
    }

    /**
     * تنظيف التقارير القديمة
     */
    cleanupOldReports(): void {
        this.errorReporting.cleanupOldReports();
    }

    // دوال مساعدة خاصة

    /**
     * تعديل الإعدادات حسب وضع التحقق
     */
    private adjustSettingsForMode(): void {
        switch (this.settings.validationMode) {
            case 'strict':
                this.settings.geometry.tolerance = 1e-8;
                this.settings.geometry.checkIntersections = true;
                this.settings.geometry.checkManifold = true;
                this.settings.geometry.checkDegenerateFaces = true;
                this.settings.export.strictMode = true;
                break;

            case 'lenient':
                this.settings.geometry.tolerance = 1e-4;
                this.settings.geometry.checkIntersections = false;
                this.settings.geometry.performanceMode = true;
                this.settings.export.strictMode = false;
                break;

            case 'normal':
            default:
                // الإعدادات الافتراضية
                break;
        }

        // تحديث المحققات
        this.geometryValidator.updateSettings(this.settings.geometry);
        this.exportValidator.updateSettings(this.settings.export);
    }

    /**
     * فحص سريع للهندسة
     */
    private async performQuickGeometryCheck(elements: BuildingElement[]): Promise<GeometryValidationResult> {
        const result: GeometryValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        // فحص سريع - فقط الأخطاء الحرجة
        for (const element of elements) {
            if (!element.geometry) {
                result.errors.push({
                    id: `missing_geometry_${element.id}`,
                    type: 'invalid_geometry' as any,
                    message: 'العنصر لا يحتوي على هندسة',
                    elementId: element.id,
                    severity: 'critical' as any,
                    fixable: false
                });
            }
        }

        result.isValid = result.errors.length === 0;
        return result;
    }

    /**
     * تسجيل مشاكل الهندسة
     */
    private async reportGeometryIssues(validation: GeometryValidationResult): Promise<string[]> {
        const reportIds: string[] = [];

        // تسجيل الأخطاء
        for (const error of validation.errors) {
            const reportId = this.errorReporting.reportGeometryError(error);
            reportIds.push(reportId);
        }

        // تسجيل التحذيرات
        for (const warning of validation.warnings) {
            const reportId = this.errorReporting.reportGeometryWarning(warning);
            reportIds.push(reportId);
        }

        return reportIds;
    }

    /**
     * تسجيل مشاكل التصدير
     */
    private async reportExportIssues(validation: ExportValidationResult): Promise<string[]> {
        const reportIds: string[] = [];

        // تسجيل الأخطاء
        for (const error of validation.errors) {
            const reportId = this.errorReporting.reportExportError(error);
            reportIds.push(reportId);
        }

        // تسجيل التحذيرات
        for (const warning of validation.warnings) {
            const reportId = this.errorReporting.reportExportWarning(warning);
            reportIds.push(reportId);
        }

        return reportIds;
    }

    /**
     * حساب ملخص التحقق
     */
    private calculateSummary(result: ComprehensiveValidationResult): ValidationSummary {
        const summary: ValidationSummary = {
            totalIssues: 0,
            criticalErrors: 0,
            majorErrors: 0,
            minorErrors: 0,
            warnings: 0,
            fixableIssues: 0,
            autoFixableIssues: 0,
            estimatedFixTime: 0
        };

        // حساب مشاكل الهندسة
        for (const error of result.geometryValidation.errors) {
            summary.totalIssues++;
            switch (error.severity) {
                case 'critical': summary.criticalErrors++; break;
                case 'major': summary.majorErrors++; break;
                case 'minor': summary.minorErrors++; break;
            }
            if (error.fixable) {
                summary.fixableIssues++;
                summary.estimatedFixTime += 2; // دقيقتان لكل إصلاح
            }
        }

        summary.warnings += result.geometryValidation.warnings.length;
        summary.totalIssues += result.geometryValidation.warnings.length;

        // حساب مشاكل التصدير
        if (result.exportValidation) {
            for (const error of result.exportValidation.errors) {
                summary.totalIssues++;
                switch (error.severity) {
                    case 'critical': summary.criticalErrors++; break;
                    case 'major': summary.majorErrors++; break;
                    case 'minor': summary.minorErrors++; break;
                }
                if (error.fixable) {
                    summary.fixableIssues++;
                    summary.estimatedFixTime += error.autoFixAvailable ? 1 : 5;
                }
                if (error.autoFixAvailable) {
                    summary.autoFixableIssues++;
                }
            }

            summary.warnings += result.exportValidation.warnings.length;
            summary.totalIssues += result.exportValidation.warnings.length;
        }

        return summary;
    }

    /**
     * تحديث إعدادات الخدمة
     */
    updateSettings(newSettings: Partial<ValidationServiceSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.adjustSettingsForMode();
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    getSettings(): ValidationServiceSettings {
        return { ...this.settings };
    }

    /**
     * تعيين وضع التحقق
     */
    setValidationMode(mode: 'strict' | 'normal' | 'lenient'): void {
        this.settings.validationMode = mode;
        this.adjustSettingsForMode();
    }

    /**
     * تعيين صيغة التصدير المستهدفة
     */
    setTargetExportFormat(format: ExportFormat, engine?: GameEngine): void {
        this.settings.export.targetFormat = format;
        if (engine) {
            this.settings.export.targetEngine = engine;
        }
        this.exportValidator.updateSettings(this.settings.export);
    }
}