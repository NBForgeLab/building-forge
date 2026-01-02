import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorCategory, ErrorReportingSystem, ErrorSeverity } from '../../services/ErrorReportingSystem';
import { ExportError, ExportWarning } from '../../services/ExportValidator';
import { GeometryError, GeometryWarning } from '../../services/GeometryValidator';

describe('ErrorReportingSystem', () => {
    let errorReporting: ErrorReportingSystem;

    beforeEach(() => {
        errorReporting = new ErrorReportingSystem();
    });

    describe('reportGeometryError', () => {
        it('يجب أن يسجل خطأ هندسي بشكل صحيح', () => {
            const geometryError: GeometryError = {
                id: 'geom_error_1',
                type: 'invalid_dimensions' as any,
                message: 'أبعاد غير صالحة',
                elementId: 'element_1',
                severity: 'major',
                fixable: true
            };

            const reportId = errorReporting.reportGeometryError(geometryError);

            expect(reportId).toBeDefined();
            expect(typeof reportId).toBe('string');

            const report = errorReporting.getReport(reportId);
            expect(report).toBeDefined();
            expect(report?.category).toBe(ErrorCategory.GEOMETRY);
            expect(report?.severity).toBe(ErrorSeverity.MAJOR);
            expect(report?.title).toContain('خطأ هندسي');
            expect(report?.description).toBe('أبعاد غير صالحة');
            expect(report?.context.elementId).toBe('element_1');
        });
    });

    describe('reportGeometryWarning', () => {
        it('يجب أن يسجل تحذير هندسي بشكل صحيح', () => {
            const geometryWarning: GeometryWarning = {
                id: 'geom_warning_1',
                type: 'small_dimensions' as any,
                message: 'أبعاد صغيرة',
                elementId: 'element_1',
                recommendation: 'قم بزيادة الحجم'
            };

            const reportId = errorReporting.reportGeometryWarning(geometryWarning);

            expect(reportId).toBeDefined();
            const report = errorReporting.getReport(reportId);
            expect(report?.category).toBe(ErrorCategory.GEOMETRY);
            expect(report?.severity).toBe(ErrorSeverity.MINOR);
            expect(report?.title).toContain('تحذير هندسي');
        });
    });

    describe('reportExportError', () => {
        it('يجب أن يسجل خطأ تصدير بشكل صحيح', () => {
            const exportError: ExportError = {
                id: 'export_error_1',
                type: 'missing_material' as any,
                message: 'مادة مفقودة',
                materialId: 'material_1',
                severity: 'critical',
                fixable: true,
                autoFixAvailable: false
            };

            const reportId = errorReporting.reportExportError(exportError);

            expect(reportId).toBeDefined();
            const report = errorReporting.getReport(reportId);
            expect(report?.category).toBe(ErrorCategory.EXPORT);
            expect(report?.severity).toBe(ErrorSeverity.CRITICAL);
            expect(report?.context.materialId).toBe('material_1');
        });
    });

    describe('reportExportWarning', () => {
        it('يجب أن يسجل تحذير تصدير بشكل صحيح', () => {
            const exportWarning: ExportWarning = {
                id: 'export_warning_1',
                type: 'large_texture_size' as any,
                message: 'حجم نسيج كبير',
                recommendation: 'قم بتقليل الحجم',
                impact: 'performance'
            };

            const reportId = errorReporting.reportExportWarning(exportWarning);

            expect(reportId).toBeDefined();
            const report = errorReporting.getReport(reportId);
            expect(report?.category).toBe(ErrorCategory.EXPORT);
            expect(report?.severity).toBe(ErrorSeverity.MINOR);
        });
    });

    describe('reportCustomError', () => {
        it('يجب أن يسجل خطأ مخصص بشكل صحيح', () => {
            const reportId = errorReporting.reportCustomError(
                ErrorCategory.SYSTEM,
                ErrorSeverity.CRITICAL,
                'خطأ في النظام',
                'حدث خطأ غير متوقع في النظام'
            );

            expect(reportId).toBeDefined();
            const report = errorReporting.getReport(reportId);
            expect(report?.category).toBe(ErrorCategory.SYSTEM);
            expect(report?.severity).toBe(ErrorSeverity.CRITICAL);
            expect(report?.title).toBe('خطأ في النظام');
            expect(report?.description).toBe('حدث خطأ غير متوقع في النظام');
        });
    });

    describe('getReport', () => {
        it('يجب أن يعيد التقرير الصحيح', () => {
            const reportId = errorReporting.reportCustomError(
                ErrorCategory.VALIDATION,
                ErrorSeverity.MAJOR,
                'خطأ تحقق',
                'فشل في التحقق من البيانات'
            );

            const report = errorReporting.getReport(reportId);
            expect(report).toBeDefined();
            expect(report?.id).toBe(reportId);
        });

        it('يجب أن يعيد undefined للمعرف غير الموجود', () => {
            const report = errorReporting.getReport('non-existent-id');
            expect(report).toBeUndefined();
        });
    });

    describe('getAllReports', () => {
        it('يجب أن يعيد جميع التقارير مرتبة بالتاريخ', () => {
            const reportId1 = errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.MINOR,
                'خطأ 1',
                'وصف 1'
            );

            const reportId2 = errorReporting.reportCustomError(
                ErrorCategory.EXPORT,
                ErrorSeverity.MAJOR,
                'خطأ 2',
                'وصف 2'
            );

            const reports = errorReporting.getAllReports();
            expect(reports).toHaveLength(2);

            // يجب أن تكون مرتبة بالتاريخ (الأحدث أولاً)
            expect(reports[0].timestamp.getTime()).toBeGreaterThanOrEqual(
                reports[1].timestamp.getTime()
            );
        });
    });

    describe('getReportsByFilter', () => {
        beforeEach(() => {
            errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.CRITICAL,
                'خطأ هندسي حرج',
                'وصف'
            );

            errorReporting.reportCustomError(
                ErrorCategory.EXPORT,
                ErrorSeverity.MINOR,
                'تحذير تصدير',
                'وصف'
            );

            errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.MAJOR,
                'خطأ هندسي كبير',
                'وصف'
            );
        });

        it('يجب أن يصفي حسب الفئة', () => {
            const geometryReports = errorReporting.getReportsByFilter({
                category: ErrorCategory.GEOMETRY
            });

            expect(geometryReports).toHaveLength(2);
            geometryReports.forEach(report => {
                expect(report.category).toBe(ErrorCategory.GEOMETRY);
            });
        });

        it('يجب أن يصفي حسب الخطورة', () => {
            const criticalReports = errorReporting.getReportsByFilter({
                severity: ErrorSeverity.CRITICAL
            });

            expect(criticalReports).toHaveLength(1);
            expect(criticalReports[0].severity).toBe(ErrorSeverity.CRITICAL);
        });

        it('يجب أن يصفي حسب معايير متعددة', () => {
            const filteredReports = errorReporting.getReportsByFilter({
                category: ErrorCategory.GEOMETRY,
                severity: ErrorSeverity.MAJOR
            });

            expect(filteredReports).toHaveLength(1);
            expect(filteredReports[0].category).toBe(ErrorCategory.GEOMETRY);
            expect(filteredReports[0].severity).toBe(ErrorSeverity.MAJOR);
        });
    });

    describe('getErrorStatistics', () => {
        beforeEach(() => {
            // إضافة تقارير متنوعة للاختبار
            errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.CRITICAL,
                'خطأ 1',
                'وصف'
            );

            errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.MAJOR,
                'خطأ 2',
                'وصف'
            );

            errorReporting.reportCustomError(
                ErrorCategory.EXPORT,
                ErrorSeverity.MINOR,
                'خطأ 3',
                'وصف'
            );
        });

        it('يجب أن يحسب الإحصائيات بشكل صحيح', () => {
            const stats = errorReporting.getErrorStatistics();

            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByCategory[ErrorCategory.GEOMETRY]).toBe(2);
            expect(stats.errorsByCategory[ErrorCategory.EXPORT]).toBe(1);
            expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1);
            expect(stats.errorsBySeverity[ErrorSeverity.MAJOR]).toBe(1);
            expect(stats.errorsBySeverity[ErrorSeverity.MINOR]).toBe(1);
            expect(stats.mostCommonErrors).toBeInstanceOf(Array);
            expect(stats.fixSuccessRate).toBeGreaterThanOrEqual(0);
            expect(stats.fixSuccessRate).toBeLessThanOrEqual(1);
        });
    });

    describe('exportReports', () => {
        beforeEach(() => {
            errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.MAJOR,
                'خطأ للتصدير',
                'وصف للتصدير'
            );
        });

        it('يجب أن يصدر التقارير بصيغة JSON', () => {
            const jsonExport = errorReporting.exportReports('json');

            expect(() => JSON.parse(jsonExport)).not.toThrow();
            const parsed = JSON.parse(jsonExport);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBeGreaterThan(0);
        });

        it('يجب أن يصدر التقارير بصيغة CSV', () => {
            const csvExport = errorReporting.exportReports('csv');

            expect(typeof csvExport).toBe('string');
            expect(csvExport.includes(',')).toBe(true);
            expect(csvExport.includes('ID')).toBe(true);
            expect(csvExport.includes('خطأ للتصدير')).toBe(true);
        });
    });

    describe('cleanupOldReports', () => {
        it('يجب أن ينظف التقارير القديمة', () => {
            // إنشاء تقرير
            const reportId = errorReporting.reportCustomError(
                ErrorCategory.SYSTEM,
                ErrorSeverity.INFO,
                'تقرير للحذف',
                'وصف'
            );

            // التأكد من وجود التقرير
            expect(errorReporting.getReport(reportId)).toBeDefined();

            // تعديل إعدادات الاحتفاظ لحذف فوري
            errorReporting.updateSettings({ retentionDays: 0 });

            // تنظيف التقارير القديمة
            errorReporting.cleanupOldReports();

            // التحقق من حذف التقرير
            expect(errorReporting.getReport(reportId)).toBeUndefined();
        });
    });

    describe('updateSettings', () => {
        it('يجب أن يحدث الإعدادات بشكل صحيح', () => {
            const newSettings = {
                enableAutoFix: false,
                maxReports: 500,
                retentionDays: 60
            };

            errorReporting.updateSettings(newSettings);
            const currentSettings = errorReporting.getSettings();

            expect(currentSettings.enableAutoFix).toBe(false);
            expect(currentSettings.maxReports).toBe(500);
            expect(currentSettings.retentionDays).toBe(60);
        });
    });

    describe('getSettings', () => {
        it('يجب أن يعيد الإعدادات الحالية', () => {
            const settings = errorReporting.getSettings();

            expect(settings).toHaveProperty('enableAutoFix');
            expect(settings).toHaveProperty('maxReports');
            expect(settings).toHaveProperty('retentionDays');
            expect(settings).toHaveProperty('enableTelemetry');
            expect(settings).toHaveProperty('logLevel');
            expect(settings).toHaveProperty('enableStackTrace');
            expect(settings).toHaveProperty('enableContextCapture');
        });
    });

    describe('حدود النظام', () => {
        it('يجب أن يحترم الحد الأقصى للتقارير', () => {
            // تعيين حد أقصى صغير
            errorReporting.updateSettings({ maxReports: 2 });

            // إضافة تقارير أكثر من الحد
            const reportId1 = errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.MINOR,
                'تقرير 1',
                'وصف'
            );

            const reportId2 = errorReporting.reportCustomError(
                ErrorCategory.EXPORT,
                ErrorSeverity.MINOR,
                'تقرير 2',
                'وصف'
            );

            const reportId3 = errorReporting.reportCustomError(
                ErrorCategory.SYSTEM,
                ErrorSeverity.MINOR,
                'تقرير 3',
                'وصف'
            );

            const allReports = errorReporting.getAllReports();
            expect(allReports.length).toBeLessThanOrEqual(2);

            // التقرير الأقدم يجب أن يكون محذوفاً
            expect(errorReporting.getReport(reportId1)).toBeUndefined();
            expect(errorReporting.getReport(reportId2)).toBeDefined();
            expect(errorReporting.getReport(reportId3)).toBeDefined();
        });
    });
});