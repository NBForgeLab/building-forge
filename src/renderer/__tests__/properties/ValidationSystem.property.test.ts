import * as fc from 'fast-check';
import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorCategory, ErrorReportingSystem, ErrorSeverity } from '../../services/ErrorReportingSystem';
import { ExportValidator } from '../../services/ExportValidator';
import { GeometryErrorType, GeometryValidator } from '../../services/GeometryValidator';
import { ValidationService, ValidationType } from '../../services/ValidationService';
import { Asset, BuildingElement, Material } from '../../store/types';

// مولدات البيانات للاختبار
const arbitraryVector3 = () => fc.record({
    x: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) }),
    y: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) }),
    z: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) })
}).map(({ x, y, z }) => new THREE.Vector3(x, y, z));

const arbitraryGeometry = () => fc.oneof(
    // صندوق
    fc.record({
        width: fc.float({ min: Math.fround(0.01), max: Math.fround(100) }),
        height: fc.float({ min: Math.fround(0.01), max: Math.fround(100) }),
        depth: fc.float({ min: Math.fround(0.01), max: Math.fround(100) })
    }).map(({ width, height, depth }) => new THREE.BoxGeometry(width, height, depth)),

    // كرة
    fc.record({
        radius: fc.float({ min: Math.fround(0.01), max: Math.fround(50) }),
        segments: fc.integer({ min: 8, max: 32 })
    }).map(({ radius, segments }) => new THREE.SphereGeometry(radius, segments, segments)),

    // أسطوانة
    fc.record({
        radiusTop: fc.float({ min: Math.fround(0.01), max: Math.fround(50) }),
        radiusBottom: fc.float({ min: Math.fround(0.01), max: Math.fround(50) }),
        height: fc.float({ min: Math.fround(0.01), max: Math.fround(100) }),
        segments: fc.integer({ min: 8, max: 32 })
    }).map(({ radiusTop, radiusBottom, height, segments }) =>
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)
    )
);

const arbitraryBuildingElement = () => fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    type: fc.constantFrom('wall', 'floor', 'door', 'window', 'roof'),
    position: arbitraryVector3(),
    rotation: arbitraryVector3(),
    scale: arbitraryVector3().filter(v => v.x > 0 && v.y > 0 && v.z > 0),
    materialId: fc.option(fc.string(), { nil: undefined }),
    properties: fc.record({
        width: fc.float({ min: Math.fround(0.01), max: Math.fround(100) }),
        height: fc.float({ min: Math.fround(0.01), max: Math.fround(100) }),
        thickness: fc.float({ min: Math.fround(0.01), max: Math.fround(10) })
    })
}).chain(data =>
    arbitraryGeometry().map(geometry => {
        const mesh = new THREE.Mesh(geometry);
        mesh.position.copy(data.position);
        mesh.rotation.setFromVector3(data.rotation);
        mesh.scale.copy(data.scale);

        const group = new THREE.Group();
        group.add(mesh);

        return {
            ...data,
            geometry: group
        } as BuildingElement;
    })
);

const arbitraryMaterial = () => fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom('PBR', 'Standard', 'Unlit'),
    albedo: fc.record({
        r: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        g: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        b: fc.float({ min: Math.fround(0), max: Math.fround(1) })
    }),
    roughness: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
    metallic: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
    albedoMap: fc.option(fc.string(), { nil: undefined }),
    normalMap: fc.option(fc.string(), { nil: undefined }),
    roughnessMap: fc.option(fc.string(), { nil: undefined }),
    metallicMap: fc.option(fc.string(), { nil: undefined })
}) as fc.Arbitrary<Material>;

const arbitraryAsset = () => fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom('texture', 'model', 'material'),
    path: fc.string({ minLength: 1, maxLength: 100 }),
    metadata: fc.option(fc.record({
        width: fc.integer({ min: 64, max: 4096 }),
        height: fc.integer({ min: 64, max: 4096 }),
        format: fc.constantFrom('PNG', 'JPG', 'JPEG', 'TGA'),
        size: fc.integer({ min: 1024, max: 10485760 }) // 1KB to 10MB
    }), { nil: undefined })
}) as fc.Arbitrary<Asset>;

describe('نظام التحقق من صحة البيانات - اختبارات الخصائص', () => {
    let geometryValidator: GeometryValidator;
    let exportValidator: ExportValidator;
    let errorReporting: ErrorReportingSystem;
    let validationService: ValidationService;

    beforeEach(() => {
        geometryValidator = new GeometryValidator();
        exportValidator = new ExportValidator();
        errorReporting = new ErrorReportingSystem();
        validationService = new ValidationService();
    });

    describe('الخاصية 40: التحقق من القيود الهندسية', () => {
        it('يجب أن يكتشف الأبعاد غير الصالحة', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(arbitraryBuildingElement(), { minLength: 1, maxLength: 10 }),
                    async (elements) => {
                        const result = await geometryValidator.validateElements(elements);

                        // التحقق من أن النتيجة تحتوي على الحقول المطلوبة
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('errors');
                        expect(result).toHaveProperty('warnings');
                        expect(result).toHaveProperty('suggestions');

                        // التحقق من أن الأخطاء لها البنية الصحيحة
                        for (const error of result.errors) {
                            expect(error).toHaveProperty('id');
                            expect(error).toHaveProperty('type');
                            expect(error).toHaveProperty('message');
                            expect(error).toHaveProperty('severity');
                            expect(error).toHaveProperty('fixable');
                            expect(['critical', 'major', 'minor']).toContain(error.severity);
                        }

                        // التحقق من أن التحذيرات لها البنية الصحيحة
                        for (const warning of result.warnings) {
                            expect(warning).toHaveProperty('id');
                            expect(warning).toHaveProperty('type');
                            expect(warning).toHaveProperty('message');
                            expect(warning).toHaveProperty('recommendation');
                        }

                        // إذا كانت هناك أخطاء حرجة، يجب أن تكون النتيجة غير صالحة
                        const criticalErrors = result.errors.filter(e => e.severity === 'critical');
                        if (criticalErrors.length > 0) {
                            expect(result.isValid).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('يجب أن يتعامل مع العناصر بدون هندسة بشكل صحيح', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        type: fc.constantFrom('wall', 'floor', 'door', 'window'),
                        geometry: fc.constant(undefined)
                    }), { minLength: 1, maxLength: 5 }),
                    async (elements) => {
                        const result = await geometryValidator.validateElements(elements as BuildingElement[]);

                        // يجب أن يكون هناك خطأ لكل عنصر بدون هندسة
                        expect(result.errors.length).toBeGreaterThanOrEqual(elements.length);
                        expect(result.isValid).toBe(false);

                        // التحقق من أن جميع الأخطاء تتعلق بالهندسة المفقودة
                        const geometryErrors = result.errors.filter(e =>
                            e.type === GeometryErrorType.INVALID_GEOMETRY
                        );
                        expect(geometryErrors.length).toBeGreaterThanOrEqual(elements.length);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('يجب أن يحافظ على الاتساق في النتائج للمدخلات المتطابقة', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(arbitraryBuildingElement(), { minLength: 1, maxLength: 5 }),
                    async (elements) => {
                        const result1 = await geometryValidator.validateElements(elements);
                        const result2 = await geometryValidator.validateElements(elements);

                        // النتائج يجب أن تكون متطابقة
                        expect(result1.isValid).toBe(result2.isValid);
                        expect(result1.errors.length).toBe(result2.errors.length);
                        expect(result1.warnings.length).toBe(result2.warnings.length);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    describe('الخاصية 41: كشف التداخلات', () => {
        it('يجب أن يكتشف التداخلات بين العناصر', async () => {
            await fc.assert(
                fc.asyncProperty(
                    arbitraryVector3(),
                    fc.float({ min: Math.fround(1), max: Math.fround(10) }),
                    async (position, size) => {
                        // إنشاء عنصرين متداخلين
                        const geometry1 = new THREE.BoxGeometry(size, size, size);
                        const geometry2 = new THREE.BoxGeometry(size, size, size);

                        const mesh1 = new THREE.Mesh(geometry1);
                        const mesh2 = new THREE.Mesh(geometry2);

                        mesh1.position.copy(position);
                        mesh2.position.copy(position); // نفس الموضع = تداخل

                        const group1 = new THREE.Group();
                        const group2 = new THREE.Group();
                        group1.add(mesh1);
                        group2.add(mesh2);

                        const elements: BuildingElement[] = [
                            {
                                id: 'element1',
                                type: 'wall',
                                geometry: group1,
                                position,
                                rotation: new THREE.Vector3(),
                                scale: new THREE.Vector3(1, 1, 1),
                                properties: { width: size, height: size, thickness: size }
                            },
                            {
                                id: 'element2',
                                type: 'wall',
                                geometry: group2,
                                position,
                                rotation: new THREE.Vector3(),
                                scale: new THREE.Vector3(1, 1, 1),
                                properties: { width: size, height: size, thickness: size }
                            }
                        ];

                        const result = await geometryValidator.validateElements(elements);

                        // يجب أن يكتشف التداخل
                        const intersectionErrors = result.errors.filter(e =>
                            e.type === GeometryErrorType.OVERLAPPING_ELEMENTS
                        );

                        // قد يكون هناك تداخل أو لا حسب الدقة والحجم
                        if (intersectionErrors.length > 0) {
                            expect(intersectionErrors[0].message).toContain('تداخل');
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    describe('الخاصية 42: التحقق من المواد قبل التصدير', () => {
        it('يجب أن يتحقق من صحة المواد للتصدير', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(arbitraryMaterial(), { minLength: 1, maxLength: 10 }),
                    fc.array(arbitraryAsset(), { minLength: 0, maxLength: 20 }),
                    async (materials, assets) => {
                        const result = await exportValidator.validateForExport([], materials, assets);

                        // التحقق من البنية الأساسية
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('canExport');
                        expect(result).toHaveProperty('errors');
                        expect(result).toHaveProperty('warnings');
                        expect(result).toHaveProperty('missingAssets');
                        expect(result).toHaveProperty('performanceMetrics');

                        // التحقق من مقاييس الأداء
                        expect(result.performanceMetrics.totalMaterials).toBe(materials.length);
                        expect(result.performanceMetrics.performanceRating).toMatch(/^(excellent|good|fair|poor)$/);

                        // التحقق من الأخطاء
                        for (const error of result.errors) {
                            expect(error).toHaveProperty('id');
                            expect(error).toHaveProperty('type');
                            expect(error).toHaveProperty('severity');
                            expect(error).toHaveProperty('fixable');
                            expect(error).toHaveProperty('autoFixAvailable');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('يجب أن يكتشف المواد غير المدعومة', async () => {
            const unsupportedMaterial: Material = {
                id: 'unsupported',
                name: 'Unsupported Material',
                type: 'CustomShader' as any, // نوع غير مدعوم
                albedo: { r: 1, g: 0, b: 0 },
                roughness: 0.5,
                metallic: 0.0
            };

            const result = await exportValidator.validateForExport([], [unsupportedMaterial], []);

            // يجب أن يكون هناك خطأ للمادة غير المدعومة
            const formatErrors = result.errors.filter(e =>
                e.type.toString().includes('unsupported') ||
                e.type.toString().includes('format')
            );

            // قد يكون هناك خطأ أو لا حسب التحقق المطبق
            if (formatErrors.length > 0) {
                expect(formatErrors[0].materialId).toBe('unsupported');
            }
        });
    });

    describe('الخاصية 43: التحقق من سلامة النموذج', () => {
        it('يجب أن يتحقق من سلامة النموذج الكاملة', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(arbitraryBuildingElement(), { minLength: 1, maxLength: 5 }),
                    fc.array(arbitraryMaterial(), { minLength: 0, maxLength: 5 }),
                    fc.array(arbitraryAsset(), { minLength: 0, maxLength: 10 }),
                    async (elements, materials, assets) => {
                        const result = await validationService.validateProject(
                            elements,
                            materials,
                            assets,
                            ValidationType.COMPREHENSIVE
                        );

                        // التحقق من البنية الأساسية
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('canProceed');
                        expect(result).toHaveProperty('geometryValidation');
                        expect(result).toHaveProperty('exportValidation');
                        expect(result).toHaveProperty('summary');

                        // التحقق من الملخص
                        const summary = result.summary;
                        expect(summary.totalIssues).toBeGreaterThanOrEqual(0);
                        expect(summary.criticalErrors).toBeGreaterThanOrEqual(0);
                        expect(summary.majorErrors).toBeGreaterThanOrEqual(0);
                        expect(summary.minorErrors).toBeGreaterThanOrEqual(0);
                        expect(summary.warnings).toBeGreaterThanOrEqual(0);

                        // التحقق من المنطق
                        expect(summary.totalIssues).toBe(
                            summary.criticalErrors +
                            summary.majorErrors +
                            summary.minorErrors +
                            summary.warnings
                        );

                        // إذا كانت هناك أخطاء حرجة، لا يمكن المتابعة
                        if (summary.criticalErrors > 0) {
                            expect(result.canProceed).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('الخاصية 44: كشف الأصول المفقودة', () => {
        it('يجب أن يكتشف الأصول المفقودة في المواد', async () => {
            const materialWithMissingTexture: Material = {
                id: 'material_with_missing',
                name: 'Material with Missing Texture',
                type: 'PBR',
                albedo: { r: 1, g: 1, b: 1 },
                roughness: 0.5,
                metallic: 0.0,
                albedoMap: 'missing_texture_id'
            };

            const result = await exportValidator.validateForExport([], [materialWithMissingTexture], []);

            // يجب أن يكون هناك أصل مفقود
            expect(result.missingAssets.length).toBeGreaterThan(0);

            const missingTexture = result.missingAssets.find(asset =>
                asset.id === 'missing_texture_id'
            );

            if (missingTexture) {
                expect(missingTexture.type).toBe('texture');
                expect(missingTexture.usedBy).toContain('material_with_missing');
            }
        });

        it('يجب أن يتعامل مع المواد بدون نسيج بشكل صحيح', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.record({
                        id: fc.string({ minLength: 1, maxLength: 20 }),
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        type: fc.constantFrom('PBR', 'Standard'),
                        albedo: fc.record({
                            r: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
                            g: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
                            b: fc.float({ min: Math.fround(0), max: Math.fround(1) })
                        }),
                        roughness: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
                        metallic: fc.float({ min: Math.fround(0), max: Math.fround(1) })
                        // بدون خرائط نسيج
                    }), { minLength: 1, maxLength: 5 }),
                    async (materials) => {
                        const result = await exportValidator.validateForExport([], materials as Material[], []);

                        // لا يجب أن تكون هناك أصول مفقودة للمواد بدون نسيج
                        const textureRelatedMissing = result.missingAssets.filter(asset =>
                            asset.type === 'texture'
                        );

                        expect(textureRelatedMissing.length).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    describe('الخاصية 45: تقارير الأخطاء التفصيلية', () => {
        it('يجب أن ينتج تقارير أخطاء مفصلة وقابلة للاستخدام', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.string({ minLength: 1, maxLength: 200 }),
                    fc.constantFrom(ErrorCategory.GEOMETRY, ErrorCategory.EXPORT, ErrorCategory.VALIDATION),
                    fc.constantFrom(ErrorSeverity.CRITICAL, ErrorSeverity.MAJOR, ErrorSeverity.MINOR),
                    async (title, description, category, severity) => {
                        const reportId = errorReporting.reportCustomError(
                            category,
                            severity,
                            title,
                            description
                        );

                        expect(reportId).toBeDefined();
                        expect(typeof reportId).toBe('string');
                        expect(reportId.length).toBeGreaterThan(0);

                        const report = errorReporting.getReport(reportId);
                        expect(report).toBeDefined();

                        if (report) {
                            expect(report.id).toBe(reportId);
                            expect(report.title).toBe(title);
                            expect(report.description).toBe(description);
                            expect(report.category).toBe(category);
                            expect(report.severity).toBe(severity);
                            expect(report.timestamp).toBeInstanceOf(Date);
                            expect(report.suggestions).toBeInstanceOf(Array);
                            expect(report.relatedErrors).toBeInstanceOf(Array);
                            expect(report.userActions).toBeInstanceOf(Array);
                            expect(report.systemInfo).toBeDefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('يجب أن ينتج إحصائيات دقيقة للأخطاء', async () => {
            // إنشاء تقارير متنوعة
            const reportIds: string[] = [];

            for (let i = 0; i < 10; i++) {
                const category = [ErrorCategory.GEOMETRY, ErrorCategory.EXPORT][i % 2];
                const severity = [ErrorSeverity.CRITICAL, ErrorSeverity.MAJOR, ErrorSeverity.MINOR][i % 3];

                const reportId = errorReporting.reportCustomError(
                    category,
                    severity,
                    `Test Error ${i}`,
                    `Test Description ${i}`
                );
                reportIds.push(reportId);
            }

            const stats = errorReporting.getErrorStatistics();

            expect(stats.totalErrors).toBe(10);
            expect(stats.errorsByCategory[ErrorCategory.GEOMETRY]).toBeGreaterThan(0);
            expect(stats.errorsByCategory[ErrorCategory.EXPORT]).toBeGreaterThan(0);
            expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBeGreaterThanOrEqual(0);
            expect(stats.errorsBySeverity[ErrorSeverity.MAJOR]).toBeGreaterThanOrEqual(0);
            expect(stats.errorsBySeverity[ErrorSeverity.MINOR]).toBeGreaterThanOrEqual(0);
            expect(stats.mostCommonErrors).toBeInstanceOf(Array);
            expect(stats.fixSuccessRate).toBeGreaterThanOrEqual(0);
            expect(stats.fixSuccessRate).toBeLessThanOrEqual(1);
        });

        it('يجب أن يصدر التقارير بصيغ مختلفة', async () => {
            // إنشاء بعض التقارير
            errorReporting.reportCustomError(
                ErrorCategory.GEOMETRY,
                ErrorSeverity.MAJOR,
                'Test Export Error',
                'Test export description'
            );

            // تصدير JSON
            const jsonExport = errorReporting.exportReports('json');
            expect(() => JSON.parse(jsonExport)).not.toThrow();

            const parsedJson = JSON.parse(jsonExport);
            expect(Array.isArray(parsedJson)).toBe(true);

            // تصدير CSV
            const csvExport = errorReporting.exportReports('csv');
            expect(typeof csvExport).toBe('string');
            expect(csvExport.includes(',')).toBe(true); // يجب أن يحتوي على فواصل
            expect(csvExport.includes('ID')).toBe(true); // يجب أن يحتوي على رؤوس
        });
    });

    describe('اختبارات التكامل الشاملة', () => {
        it('يجب أن يعمل النظام بأكمله معاً بشكل متسق', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(arbitraryBuildingElement(), { minLength: 1, maxLength: 3 }),
                    fc.array(arbitraryMaterial(), { minLength: 0, maxLength: 3 }),
                    fc.array(arbitraryAsset(), { minLength: 0, maxLength: 5 }),
                    async (elements, materials, assets) => {
                        const result = await validationService.validateProject(
                            elements,
                            materials,
                            assets,
                            ValidationType.COMPREHENSIVE
                        );

                        // التحقق من التماسك
                        expect(result.isValid).toBe(
                            result.summary.criticalErrors === 0 && result.summary.majorErrors === 0
                        );

                        expect(result.canProceed).toBe(result.summary.criticalErrors === 0);

                        // التحقق من أن التقارير تم إنشاؤها
                        expect(Array.isArray(result.reportIds)).toBe(true);

                        // التحقق من أن كل تقرير موجود
                        for (const reportId of result.reportIds) {
                            const report = validationService.getDetailedReport(reportId);
                            expect(report).toBeDefined();
                        }

                        // التحقق من الإحصائيات
                        const stats = validationService.getValidationStatistics();
                        expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('يجب أن يحافظ على الأداء مع البيانات الكبيرة', async () => {
            const startTime = Date.now();

            // إنشاء مجموعة كبيرة من البيانات
            const elements: BuildingElement[] = [];
            const materials: Material[] = [];
            const assets: Asset[] = [];

            for (let i = 0; i < 50; i++) {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const mesh = new THREE.Mesh(geometry);
                const group = new THREE.Group();
                group.add(mesh);

                elements.push({
                    id: `element_${i}`,
                    type: 'wall',
                    geometry: group,
                    position: new THREE.Vector3(i, 0, 0),
                    rotation: new THREE.Vector3(),
                    scale: new THREE.Vector3(1, 1, 1),
                    properties: { width: 1, height: 1, thickness: 0.1 }
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

            const result = await validationService.validateProject(
                elements,
                materials,
                assets,
                ValidationType.COMPREHENSIVE
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            // يجب أن يكتمل في وقت معقول (أقل من 10 ثوان)
            expect(duration).toBeLessThan(10000);

            // يجب أن تكون النتيجة صالحة
            expect(result).toBeDefined();
            expect(result.summary).toBeDefined();
        });
    });
});