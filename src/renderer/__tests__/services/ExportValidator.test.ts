import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExportFormat, ExportValidator, ExportWarningType, GameEngine } from '../../services/ExportValidator';
import { Asset, BuildingElement, Material } from '../../store/types';

describe('ExportValidator', () => {
    let validator: ExportValidator;

    beforeEach(() => {
        validator = new ExportValidator();
    });

    describe('validateForExport', () => {
        it('يجب أن يتحقق من التصدير الأساسي بنجاح', async () => {
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

            const result = await validator.validateForExport([element], [material], []);

            expect(result.isValid).toBeDefined();
            expect(result.canExport).toBeDefined();
            expect(result.errors).toBeInstanceOf(Array);
            expect(result.warnings).toBeInstanceOf(Array);
            expect(result.missingAssets).toBeInstanceOf(Array);
            expect(result.performanceMetrics).toBeDefined();
            expect(result.suggestions).toBeInstanceOf(Array);
        });

        it('يجب أن يكتشف المواد المفقودة', async () => {
            const material: Material = {
                id: 'material-with-missing-texture',
                name: 'Material with Missing Texture',
                type: 'PBR',
                albedo: { r: 1, g: 1, b: 1 },
                roughness: 0.5,
                metallic: 0.0,
                albedoMap: 'missing-texture-id'
            };

            const result = await validator.validateForExport([], [material], []);

            expect(result.missingAssets.length).toBeGreaterThan(0);
            const missingTexture = result.missingAssets.find(asset =>
                asset.id === 'missing-texture-id'
            );
            expect(missingTexture).toBeDefined();
            expect(missingTexture?.type).toBe('texture');
            expect(missingTexture?.usedBy).toContain('material-with-missing-texture');
        });

        it('يجب أن يحسب مقاييس الأداء بشكل صحيح', async () => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'perf-test-element',
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

            const materials: Material[] = [
                {
                    id: 'material1',
                    name: 'Material 1',
                    type: 'PBR',
                    albedo: { r: 1, g: 0, b: 0 },
                    roughness: 0.5,
                    metallic: 0.0
                },
                {
                    id: 'material2',
                    name: 'Material 2',
                    type: 'Standard',
                    albedo: { r: 0, g: 1, b: 0 },
                    roughness: 0.3,
                    metallic: 0.2
                }
            ];

            const result = await validator.validateForExport([element], materials, []);

            expect(result.performanceMetrics.totalMaterials).toBe(2);
            expect(result.performanceMetrics.totalVertices).toBeGreaterThan(0);
            expect(result.performanceMetrics.totalTriangles).toBeGreaterThan(0);
            expect(result.performanceMetrics.drawCalls).toBeGreaterThan(0);
            expect(result.performanceMetrics.performanceRating).toMatch(/^(excellent|good|fair|poor)$/);
        });

        it('يجب أن يحذر من النسيج الكبير', async () => {
            const asset: Asset = {
                id: 'large-texture',
                name: 'Large Texture',
                type: 'texture',
                path: 'large-texture.png',
                metadata: {
                    width: 8192,
                    height: 8192,
                    format: 'PNG',
                    size: 67108864 // 64MB
                }
            };

            const material: Material = {
                id: 'material-with-large-texture',
                name: 'Material with Large Texture',
                type: 'PBR',
                albedo: { r: 1, g: 1, b: 1 },
                roughness: 0.5,
                metallic: 0.0,
                albedoMap: 'large-texture'
            };

            const result = await validator.validateForExport([], [material], [asset]);

            const sizeWarnings = result.warnings.filter(w =>
                w.type === ExportWarningType.LARGE_TEXTURE_SIZE
            );
            expect(sizeWarnings.length).toBeGreaterThan(0);
        });

        it('يجب أن يكتشف النسيج غير المدعوم', async () => {
            // تعيين صيغة OBJ التي لا تدعم بعض أنواع النسيج
            validator.updateSettings({ targetFormat: ExportFormat.OBJ });

            const material: Material = {
                id: 'pbr-material',
                name: 'PBR Material',
                type: 'PBR', // PBR غير مدعوم في OBJ
                albedo: { r: 1, g: 1, b: 1 },
                roughness: 0.5,
                metallic: 0.8
            };

            const result = await validator.validateForExport([], [material], []);

            const compatibilityWarnings = result.warnings.filter(w =>
                w.type === ExportWarningType.COMPATIBILITY_ISSUE
            );
            expect(compatibilityWarnings.length).toBeGreaterThan(0);
        });

        it('يجب أن يحذر من عدد المضلعات العالي', async () => {
            const geometry = new THREE.SphereGeometry(1, 128, 128); // عدد مضلعات عالي جداً
            const mesh = new THREE.Mesh(geometry);
            const group = new THREE.Group();
            group.add(mesh);

            const element: BuildingElement = {
                id: 'high-poly-element',
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

            const result = await validator.validateForExport([element], [], []);

            const polyWarnings = result.warnings.filter(w =>
                w.type === ExportWarningType.HIGH_POLYGON_COUNT
            );
            expect(polyWarnings.length).toBeGreaterThan(0);
        });
    });

    describe('updateSettings', () => {
        it('يجب أن يحدث إعدادات التصدير', () => {
            const newSettings = {
                targetFormat: ExportFormat.FBX,
                targetEngine: GameEngine.UNREAL,
                maxFileSize: 200,
                maxTextureSize: 2048
            };

            validator.updateSettings(newSettings);
            const currentSettings = validator.getSettings();

            expect(currentSettings.targetFormat).toBe(ExportFormat.FBX);
            expect(currentSettings.targetEngine).toBe(GameEngine.UNREAL);
            expect(currentSettings.maxFileSize).toBe(200);
            expect(currentSettings.maxTextureSize).toBe(2048);
        });
    });

    describe('getSettings', () => {
        it('يجب أن يعيد الإعدادات الحالية', () => {
            const settings = validator.getSettings();

            expect(settings).toHaveProperty('targetFormat');
            expect(settings).toHaveProperty('targetEngine');
            expect(settings).toHaveProperty('maxFileSize');
            expect(settings).toHaveProperty('maxTextureSize');
            expect(settings).toHaveProperty('maxPolygonCount');
            expect(settings).toHaveProperty('requireLOD');
            expect(settings).toHaveProperty('validateMaterials');
            expect(settings).toHaveProperty('validateTextures');
            expect(settings).toHaveProperty('validateUVMapping');
            expect(settings).toHaveProperty('performanceMode');
            expect(settings).toHaveProperty('strictMode');
        });
    });

    describe('getFormatCompatibility', () => {
        it('يجب أن يعيد معلومات التوافق للصيغ المختلفة', () => {
            const glbCompatibility = validator.getFormatCompatibility(ExportFormat.GLB);
            expect(glbCompatibility).toBeDefined();
            expect(glbCompatibility?.supportedMaterials).toBeInstanceOf(Array);
            expect(glbCompatibility?.supportedTextures).toBeInstanceOf(Array);
            expect(glbCompatibility?.supportsPBR).toBe(true);

            const objCompatibility = validator.getFormatCompatibility(ExportFormat.OBJ);
            expect(objCompatibility).toBeDefined();
            expect(objCompatibility?.supportsPBR).toBe(false);
            expect(objCompatibility?.supportsAnimation).toBe(false);
        });
    });

    describe('إعدادات مخصصة', () => {
        it('يجب أن يقبل إعدادات مخصصة في المنشئ', () => {
            const customSettings = {
                targetFormat: ExportFormat.FBX,
                targetEngine: GameEngine.GODOT,
                maxFileSize: 50,
                strictMode: true
            };

            const customValidator = new ExportValidator(customSettings);
            const settings = customValidator.getSettings();

            expect(settings.targetFormat).toBe(ExportFormat.FBX);
            expect(settings.targetEngine).toBe(GameEngine.GODOT);
            expect(settings.maxFileSize).toBe(50);
            expect(settings.strictMode).toBe(true);
        });
    });

    describe('حالات الحد', () => {
        it('يجب أن يتعامل مع قوائم فارغة', async () => {
            const result = await validator.validateForExport([], [], []);

            expect(result.isValid).toBeDefined();
            expect(result.canExport).toBeDefined();
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
            expect(result.missingAssets).toHaveLength(0);
            expect(result.performanceMetrics.totalMaterials).toBe(0);
            expect(result.performanceMetrics.totalVertices).toBe(0);
        });

        it('يجب أن يتعامل مع العناصر بدون هندسة', async () => {
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

            const result = await validator.validateForExport([element], [], []);

            // يجب أن يتعامل مع العناصر بدون هندسة دون أخطاء
            expect(result).toBeDefined();
            expect(result.performanceMetrics.totalVertices).toBe(0);
        });
    });
});