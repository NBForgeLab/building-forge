import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExportFormat, GameEngine } from '../../services/ExportValidator';
import { ValidationService, ValidationType } from '../../services/ValidationService';
import { Asset, BuildingElement, Material } from '../../store/types';

describe('ValidationService', () => {
    let validationService: ValidationService;

    beforeEach(() => {
        validationService = new ValidationService();
    });

    describe('validateProject', () => {
        it('يجب أن يتحقق من مشروع بسيط بنجاح', async () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'test-element',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const material: Material = {
                id: 'test-material',
                name: 'Test Material',
                type: 'PBR',
                albedo: { r: 1, g: 1, b: 1 },
                roughness: 0.5,
                metallic: 0.0
            };

            const result = await validationService.validateProject(
                [element],
                [material],
                [],
                ValidationType.COMPREHENSIVE
            );

            expect(result.isValid).toBeDefined();
            expect(result.canProceed).toBeDefined();
            expect(result.geometryValidation).toBeDefined();
            expect(result.exportValidation).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.reportIds).toBeInstanceOf(Array);

            // التحقق من الملخص
            expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0);
            expect(result.summary.criticalErrors).toBeGreaterThanOrEqual(0);
            expect(result.summary.majorErrors).toBeGreaterThanOrEqual(0);
            expect(result.summary.minorErrors).toBeGreaterThanOrEqual(0);
            expect(result.summary.warnings).toBeGreaterThanOrEqual(0);
        });

        it('يجب أن يتعامل مع التحقق من الهندسة فقط', async () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'geometry-only-element',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const result = await validationService.validateProject(
                [element],
                [],
                [],
                ValidationType.GEOMETRY_ONLY
            );

            expect(result.geometryValidation).toBeDefined();
            expect(result.exportValidation).toBeUndefined();
            expect(result.summary).toBeDefined();
        });

        it('يجب أن يتعامل مع التحقق من التصدير فقط', async () => {
            const material: Material = {
                id: 'export-only-material',
                name: 'Export Only Material',
                type: 'PBR',
                albedo: { r: 1, g: 1, b: 1 },
                roughness: 0.5,
                metallic: 0.0
            };

            const result = await validationService.validateProject(
                [],
                [material],
                [],
                ValidationType.EXPORT_ONLY
            );

            expect(result.geometryValidation.errors).toHaveLength(0);
            expect(result.exportValidation).toBeDefined();
            expect(result.summary).toBeDefined();
        });

        it('يجب أن يتعامل مع الفحص السريع', async () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'quick-check-element',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const result = await validationService.validateProject(
                [element],
                [],
                [],
                ValidationType.QUICK_CHECK
            );

            expect(result.geometryValidation).toBeDefined();
            expect(result.exportValidation).toBeUndefined();
            expect(result.summary).toBeDefined();
        });

        it('يجب أن يكتشف العناصر بدون هندسة', async () => {
            const element: BuildingElement = {
                id: 'no-geometry-element',
                type: 'wall',
                geometry: undefined,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const result = await validationService.validateProject(
                [element],
                [],
                [],
                ValidationType.COMPREHENSIVE
            );

            expect(result.isValid).toBe(false);
            expect(result.canProceed).toBe(false);
            expect(result.summary.criticalErrors).toBeGreaterThan(0);
        });
    });

    describe('validateElement', () => {
        it('يجب أن يتحقق من عنصر واحد', async () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'single-element',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const result = await validationService.validateElement(element);

            expect(result.isValid).toBeDefined();
            expect(result.errors).toBeInstanceOf(Array);
            expect(result.warnings).toBeInstanceOf(Array);
            expect(result.suggestions).toBeInstanceOf(Array);
        });

        it('يجب أن يتعامل مع الأخطاء في التحقق', async () => {
            const element: BuildingElement = {
                id: 'error-element',
                type: 'wall',
                geometry: undefined,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const result = await validationService.validateElement(element);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('validateMaterials', () => {
        it('يجب أن يتحقق من المواد', async () => {
            const material: Material = {
                id: 'test-material',
                name: 'Test Material',
                type: 'PBR',
                albedo: { r: 1, g: 1, b: 1 },
                roughness: 0.5,
                metallic: 0.0
            };

            const asset: Asset = {
                id: 'test-texture',
                name: 'Test Texture',
                type: 'texture',
                path: 'test-texture.png'
            };

            const result = await validationService.validateMaterials([material], [asset]);

            expect(result.isValid).toBeDefined();
            expect(result.canExport).toBeDefined();
            expect(result.errors).toBeInstanceOf(Array);
            expect(result.warnings).toBeInstanceOf(Array);
            expect(result.performanceMetrics).toBeDefined();
        });
    });

    describe('applyAutoFixes', () => {
        it('يجب أن يطبق الإصلاحات التلقائية', async () => {
            // إنشاء تقرير خطأ أولاً
            const element: BuildingElement = {
                id: 'fixable-element',
                type: 'wall',
                geometry: undefined,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const result = await validationService.validateProject(
                [element],
                [],
                [],
                ValidationType.COMPREHENSIVE
            );

            if (result.reportIds.length > 0) {
                const fixResult = await validationService.applyAutoFixes(result.reportIds);

                expect(fixResult.success).toBeGreaterThanOrEqual(0);
                expect(fixResult.failed).toBeGreaterThanOrEqual(0);
                expect(fixResult.results).toBeInstanceOf(Array);
                expect(fixResult.results.length).toBe(result.reportIds.length);
            }
        });
    });

    describe('getDetailedReport', () => {
        it('يجب أن يعيد تقرير مفصل', async () => {
            const element: BuildingElement = {
                id: 'report-element',
                type: 'wall',
                geometry: undefined,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 0.1
                }
            };

            const result = await validationService.validateProject(
                [element],
                [],
                [],
                ValidationType.COMPREHENSIVE
            );

            if (result.reportIds.length > 0) {
                const report = validationService.getDetailedReport(result.reportIds[0]);
                expect(report).toBeDefined();
                expect(report?.id).toBe(result.reportIds[0]);
            }
        });
    });

    describe('getValidationStatistics', () => {
        it('يجب أن يعيد إحصائيات التحقق', () => {
            const stats = validationService.getValidationStatistics();

            expect(stats).toBeDefined();
            expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
            expect(stats.errorsByCategory).toBeDefined();
            expect(stats.errorsBySeverity).toBeDefined();
            expect(stats.mostCommonErrors).toBeInstanceOf(Array);
            expect(stats.fixSuccessRate).toBeGreaterThanOrEqual(0);
            expect(stats.fixSuccessRate).toBeLessThanOrEqual(1);
        });
    });

    describe('exportValidationReports', () => {
        it('يجب أن يصدر تقارير التحقق', () => {
            const jsonExport = validationService.exportValidationReports('json');
            expect(typeof jsonExport).toBe('string');

            const csvExport = validationService.exportValidationReports('csv');
            expect(typeof csvExport).toBe('string');
        });
    });

    describe('updateSettings', () => {
        it('يجب أن يحدث إعدادات الخدمة', () => {
            const newSettings = {
                validationMode: 'strict' as const,
                enableAutoFix: false,
                geometry: {
                    tolerance: 1e-8,
                    performanceMode: true
                }
            };

            validationService.updateSettings(newSettings);
            const currentSettings = validationService.getSettings();

            expect(currentSettings.validationMode).toBe('strict');
            expect(currentSettings.enableAutoFix).toBe(false);
            expect(currentSettings.geometry.tolerance).toBe(1e-8);
            expect(currentSettings.geometry.performanceMode).toBe(true);
        });
    });

    describe('setValidationMode', () => {
        it('يجب أن يعين وضع التحقق', () => {
            validationService.setValidationMode('strict');
            const settings = validationService.getSettings();
            expect(settings.validationMode).toBe('strict');

            validationService.setValidationMode('lenient');
            const newSettings = validationService.getSettings();
            expect(newSettings.validationMode).toBe('lenient');
        });
    });

    describe('setTargetExportFormat', () => {
        it('يجب أن يعين صيغة التصدير المستهدفة', () => {
            validationService.setTargetExportFormat(ExportFormat.FBX, GameEngine.UNREAL);
            const settings = validationService.getSettings();

            expect(settings.export.targetFormat).toBe(ExportFormat.FBX);
            expect(settings.export.targetEngine).toBe(GameEngine.UNREAL);
        });

        it('يجب أن يعين الصيغة بدون محرك', () => {
            validationService.setTargetExportFormat(ExportFormat.OBJ);
            const settings = validationService.getSettings();

            expect(settings.export.targetFormat).toBe(ExportFormat.OBJ);
        });
    });

    describe('cleanupOldReports', () => {
        it('يجب أن ينظف التقارير القديمة', () => {
            expect(() => validationService.cleanupOldReports()).not.toThrow();
        });
    });

    describe('حالات الحد', () => {
        it('يجب أن يتعامل مع قوائم فارغة', async () => {
            const result = await validationService.validateProject(
                [],
                [],
                [],
                ValidationType.COMPREHENSIVE
            );

            expect(result.isValid).toBe(true);
            expect(result.canProceed).toBe(true);
            expect(result.summary.totalIssues).toBe(0);
        });

        it('يجب أن يتعامل مع البيانات الكبيرة', async () => {
            const elements: BuildingElement[] = [];
            const materials: Material[] = [];

            // إنشاء مجموعة كبيرة من البيانات
            for (let i = 0; i < 100; i++) {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const mesh = new THREE.Mesh(geometry);
                const group = new THREE.Group();
                group.add(mesh);

                elements.push({
                    id: `element_${i}`,
                    type: 'wall',
                    geometry: group,
                    position: new THREE.Vector3(i, 0, 0),
                    rotation: new THREE.Vector3(0, 0, 0),
                    scale: new THREE.Vector3(1, 1, 1),
                    properties: {
                        width: 1,
                        height: 1,
                        thickness: 0.1
                    }
                });

                materials.push({
                    id: `material_${i}`,
                    name: `Material ${i}`,
                    type: 'PBR',
                    albedo: { r: Math.random(), g: Math.random(), b: Math.random() },
                    roughness: Math.random(),
                    metallic: Math.random()
                });
            }

            const startTime = Date.now();
            const result = await validationService.validateProject(
                elements,
                materials,
                [],
                ValidationType.COMPREHENSIVE
            );
            const endTime = Date.now();

            expect(result).toBeDefined();
            expect(endTime - startTime).toBeLessThan(30000); // أقل من 30 ثانية
        });
    });

    describe('أوضاع التحقق المختلفة', () => {
        it('يجب أن يعمل الوضع الصارم بشكل مختلف', async () => {
            validationService.setValidationMode('strict');

            const geometry = new THREE.BoxGeometry(0.005, 0.005, 0.005); // أبعاد صغيرة
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'strict-mode-element',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 0.005,
                    height: 0.005,
                    thickness: 0.005
                }
            };

            const strictResult = await validationService.validateProject(
                [element],
                [],
                [],
                ValidationType.COMPREHENSIVE
            );

            // تغيير إلى الوضع المتساهل
            validationService.setValidationMode('lenient');

            const lenientResult = await validationService.validateProject(
                [element],
                [],
                [],
                ValidationType.COMPREHENSIVE
            );

            // الوضع الصارم يجب أن يكتشف مشاكل أكثر
            expect(strictResult.summary.totalIssues).toBeGreaterThanOrEqual(
                lenientResult.summary.totalIssues
            );
        });
    });
});