import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { GeometryErrorType, GeometryValidator, GeometryWarningType } from '../../services/GeometryValidator';
import { BuildingElement } from '../../store/types';

describe('GeometryValidator', () => {
    let validator: GeometryValidator;

    beforeEach(() => {
        validator = new GeometryValidator();
    });

    describe('validateElements', () => {
        it('يجب أن يتحقق من العناصر الصالحة بنجاح', async () => {
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

            const result = await validator.validateElements([element]);

            // قد تكون هناك تحذيرات ولكن لا يجب أن تكون هناك أخطاء حرجة
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
            expect(result.warnings).toBeInstanceOf(Array);
            expect(result.suggestions).toBeInstanceOf(Array);
        });

        it('يجب أن يكتشف العناصر بدون هندسة', async () => {
            const element: BuildingElement = {
                id: 'no-geometry',
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

            const result = await validator.validateElements([element]);

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe(GeometryErrorType.INVALID_GEOMETRY);
            expect(result.errors[0].elementId).toBe('no-geometry');
            expect(result.errors[0].severity).toBe('critical');
        });

        it('يجب أن يكتشف الأبعاد الصغيرة جداً', async () => {
            const geometry = new THREE.BoxGeometry(0.0000001, 0.0000001, 0.0000001); // أصغر من tolerance (1e-6)
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'tiny-element',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 0.0000001,
                    height: 0.0000001,
                    thickness: 0.0000001
                }
            };

            const result = await validator.validateElements([element]);

            expect(result.isValid).toBe(false);
            const dimensionErrors = result.errors.filter(e =>
                e.type === GeometryErrorType.INVALID_DIMENSIONS
            );
            expect(dimensionErrors.length).toBeGreaterThan(0);
        });

        it('يجب أن يحذر من الأبعاد الكبيرة', async () => {
            const geometry = new THREE.BoxGeometry(2000, 2000, 2000); // أكبر من الحد الأقصى
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'huge-element',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 2000,
                    height: 2000,
                    thickness: 2000
                }
            };

            const result = await validator.validateElements([element]);

            const sizeWarnings = result.warnings.filter(w =>
                w.type === GeometryWarningType.LARGE_DIMENSIONS
            );
            expect(sizeWarnings.length).toBeGreaterThan(0);
        });

        it('يجب أن يكتشف نسبة العرض إلى الارتفاع السيئة', async () => {
            const geometry = new THREE.BoxGeometry(1000, 1, 1); // نسبة عرض إلى ارتفاع عالية
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'bad-aspect-ratio',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1000,
                    height: 1,
                    thickness: 1
                }
            };

            const result = await validator.validateElements([element]);

            const aspectWarnings = result.warnings.filter(w =>
                w.type === GeometryWarningType.POOR_ASPECT_RATIO
            );
            expect(aspectWarnings.length).toBeGreaterThan(0);
        });

        it('يجب أن يحذر من عدد المضلعات العالي', async () => {
            // إنشاء validator مع حد أقصى منخفض للمضلعات
            const customValidator = new GeometryValidator({
                maxPolygonCount: 1000 // حد منخفض للاختبار
            });

            const geometry = new THREE.SphereGeometry(1, 128, 128); // عدد مضلعات عالي جداً
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'high-poly',
                type: 'wall',
                geometry: group,
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Vector3(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                properties: {
                    width: 1,
                    height: 1,
                    thickness: 1
                }
            };

            const result = await customValidator.validateElements([element]);

            const polyWarnings = result.warnings.filter(w =>
                w.type === GeometryWarningType.HIGH_POLYGON_COUNT
            );
            expect(polyWarnings.length).toBeGreaterThan(0);
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

            const result = await validator.validateElement(element, []);

            // قد تكون هناك تحذيرات ولكن لا يجب أن تكون هناك أخطاء حرجة
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
        });
    });

    describe('updateSettings', () => {
        it('يجب أن يحدث الإعدادات بشكل صحيح', () => {
            const newSettings = {
                tolerance: 1e-8,
                minDimension: 0.001,
                maxDimension: 500
            };

            validator.updateSettings(newSettings);
            const currentSettings = validator.getSettings();

            expect(currentSettings.tolerance).toBe(1e-8);
            expect(currentSettings.minDimension).toBe(0.001);
            expect(currentSettings.maxDimension).toBe(500);
        });
    });

    describe('getSettings', () => {
        it('يجب أن يعيد الإعدادات الحالية', () => {
            const settings = validator.getSettings();

            expect(settings).toHaveProperty('tolerance');
            expect(settings).toHaveProperty('minDimension');
            expect(settings).toHaveProperty('maxDimension');
            expect(settings).toHaveProperty('maxPolygonCount');
            expect(settings).toHaveProperty('checkIntersections');
            expect(settings).toHaveProperty('checkManifold');
            expect(settings).toHaveProperty('checkDegenerateFaces');
            expect(settings).toHaveProperty('performanceMode');
        });
    });

    describe('إعدادات مخصصة', () => {
        it('يجب أن يقبل إعدادات مخصصة في المنشئ', () => {
            const customSettings = {
                tolerance: 1e-4,
                minDimension: 0.1,
                maxDimension: 100,
                performanceMode: true
            };

            const customValidator = new GeometryValidator(customSettings);
            const settings = customValidator.getSettings();

            expect(settings.tolerance).toBe(1e-4);
            expect(settings.minDimension).toBe(0.1);
            expect(settings.maxDimension).toBe(100);
            expect(settings.performanceMode).toBe(true);
        });
    });
});