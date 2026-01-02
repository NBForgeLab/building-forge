/**
 * اختبارات خاصية للتصدير - المهمة 12.5
 * 
 * هذا الملف يحتوي على اختبارات الخصائص للتحقق من صحة نظام التصدير
 * باستخدام fast-check مع 100 تكرار كحد أدنى لكل اختبار
 */

import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    generateRandomBuilding,
    generateRandomExportSettings,
    generateRandomPBRMaterial
} from '../generators/export-generators';
import {
    createMockExporters
} from '../mocks/export-mocks';
import { setupExportTestEnvironment } from '../setup/export-test-setup';
import {
    Building,
    ExportSettings,
    PBRMaterial,
    QualityLevel,
    TextureCompression
} from '../types/export-types';

// إعداد البيئة
setupExportTestEnvironment();

describe('Export System Properties - المهمة 12.5', () => {
    let exporters: ReturnType<typeof createMockExporters>;

    beforeEach(() => {
        exporters = createMockExporters();
    });

    // لا نحتاج afterEach لأن كل اختبار يحصل على exporters جديدة

    /**
     * الخاصية 23: تصدير GLB و OBJ صالح
     * تتحقق من: المتطلبات 8.1, 8.2
     * 
     * لأي مشروع، يجب أن ينتج التصدير ملفات GLB و OBJ صالحة ومتوافقة مع محركات الألعاب
     */
    it('Property 23: Valid GLB and OBJ Export', () => {
        fc.assert(fc.property(
            generateRandomBuilding(),
            generateRandomExportSettings(),
            async (building: Building, settings: ExportSettings) => {
                // تصدير GLB
                const glbResult = await exporters.glbExporter.export(building, {
                    ...settings,
                    format: 'glb'
                });

                // تصدير OBJ
                const objResult = await exporters.objExporter.export(building, {
                    ...settings,
                    format: 'obj'
                });

                // التحقق من صحة النتائج
                expect(glbResult.success).toBe(true);
                expect(objResult.success).toBe(true);

                // التحقق من وجود البيانات
                expect(glbResult.data).toBeDefined();
                expect(objResult.data).toBeDefined();

                // التحقق من صحة تنسيق GLB
                if (glbResult.data instanceof ArrayBuffer) {
                    const glbHeader = new Uint32Array(glbResult.data.slice(0, 12));
                    expect(glbHeader[0]).toBe(0x46546C67); // 'glTF' magic number
                    expect(glbHeader[1]).toBe(2); // version 2
                }

                // التحقق من صحة تنسيق OBJ
                if (objResult.data instanceof Blob) {
                    const objText = await objResult.data.text();
                    expect(objText).toMatch(/^# Building Forge OBJ Export/);
                    expect(objText).toContain('v '); // vertices
                    expect(objText).toContain('f '); // faces
                }

                // التحقق من عدم وجود أخطاء
                expect(glbResult.errors).toHaveLength(0);
                expect(objResult.errors).toHaveLength(0);
            }
        ), { numRuns: 100 });
    });

    /**
     * الخاصية 24: خيارات جودة التصدير
     * تتحقق من: المتطلبات 8.3
     * 
     * لأي مستوى جودة (عالي، متوسط، منخفض)، يجب أن ينتج التصدير نتائج مختلفة تتناسب مع المستوى المحدد
     */
    it('Property 24: Export Quality Options', () => {
        fc.assert(fc.property(
            generateRandomBuilding(),
            fc.constantFrom('high', 'medium', 'low') as fc.Arbitrary<QualityLevel>,
            async (building: Building, qualityLevel: QualityLevel) => {
                const baseSettings = {
                    format: 'glb' as const,
                    includeColliders: true,
                    includeMaterials: true
                };

                // تصدير بمستويات جودة مختلفة
                const highQualityResult = await exporters.glbExporter.export(building, {
                    ...baseSettings,
                    quality: 'high'
                });

                const mediumQualityResult = await exporters.glbExporter.export(building, {
                    ...baseSettings,
                    quality: 'medium'
                });

                const lowQualityResult = await exporters.glbExporter.export(building, {
                    ...baseSettings,
                    quality: 'low'
                });

                // التحقق من نجاح جميع التصديرات
                expect(highQualityResult.success).toBe(true);
                expect(mediumQualityResult.success).toBe(true);
                expect(lowQualityResult.success).toBe(true);

                // التحقق من اختلاف أحجام الملفات حسب الجودة
                const highSize = highQualityResult.data?.byteLength || 0;
                const mediumSize = mediumQualityResult.data?.byteLength || 0;
                const lowSize = lowQualityResult.data?.byteLength || 0;

                // الجودة العالية يجب أن تنتج ملفات أكبر
                expect(highSize).toBeGreaterThanOrEqual(mediumSize);
                expect(mediumSize).toBeGreaterThanOrEqual(lowSize);

                // التحقق من إحصائيات التحسين
                if (highQualityResult.stats && lowQualityResult.stats) {
                    // الجودة المنخفضة يجب أن تقلل عدد المضلعات
                    expect(lowQualityResult.stats.polyCount).toBeLessThanOrEqual(
                        highQualityResult.stats.polyCount
                    );

                    // الجودة المنخفضة يجب أن تقلل عدد المواد
                    expect(lowQualityResult.stats.materialCount).toBeLessThanOrEqual(
                        highQualityResult.stats.materialCount
                    );
                }
            }
        ), { numRuns: 100 });
    });

    /**
     * الخاصية 25: ضغط النسيج
     * تتحقق من: المتطلبات 8.4
     * 
     * لأي دقة محددة للنسيج، يجب أن يتم ضغط النسيج إلى الدقة المحددة مع الحفاظ على الجودة
     */
    it('Property 25: Texture Compression', () => {
        fc.assert(fc.property(
            generateRandomBuilding(),
            fc.constantFrom(256, 512, 1024, 2048),
            fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<TextureCompression>,
            async (building: Building, targetResolution: number, compressionLevel: TextureCompression) => {
                const settings = {
                    format: 'glb' as const,
                    textureCompression: {
                        enabled: true,
                        targetResolution,
                        compressionLevel,
                        format: 'webp' as const
                    }
                };

                const result = await exporters.glbExporter.export(building, settings);

                expect(result.success).toBe(true);
                expect(result.data).toBeDefined();

                // التحقق من ضغط النسيج
                if (result.stats?.textureStats) {
                    const textureStats = result.stats.textureStats;

                    // جميع النسيج يجب أن تكون بالدقة المحددة أو أقل
                    textureStats.forEach(texture => {
                        expect(texture.width).toBeLessThanOrEqual(targetResolution);
                        expect(texture.height).toBeLessThanOrEqual(targetResolution);

                        // التحقق من تطبيق الضغط
                        if (texture.compressed) {
                            expect(texture.compressedSize).toBeLessThan(texture.originalSize);
                        }
                    });
                }

                // التحقق من جودة الضغط
                if (result.stats?.compressionRatio) {
                    switch (compressionLevel) {
                        case 'high':
                            // ضغط عالي = نسبة ضغط أكبر
                            expect(result.stats.compressionRatio).toBeGreaterThan(0.7);
                            break;
                        case 'medium':
                            expect(result.stats.compressionRatio).toBeGreaterThan(0.5);
                            expect(result.stats.compressionRatio).toBeLessThanOrEqual(0.7);
                            break;
                        case 'low':
                            expect(result.stats.compressionRatio).toBeLessThanOrEqual(0.5);
                            break;
                    }
                }
            }
        ), { numRuns: 100 });
    });

    /**
     * الخاصية 26: تحسين المضلعات
     * تتحقق من: المتطلبات 8.5
     * 
     * لأي نموذج، يجب أن يقلل التحسين عدد المضلعات مع الحفاظ على الجودة البصرية
     */
    it('Property 26: Polygon Optimization', () => {
        fc.assert(fc.property(
            generateRandomBuilding(),
            fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }), // نسبة التحسين
            async (building: Building, optimizationRatio: number) => {
                // تصدير بدون تحسين
                const unoptimizedResult = await exporters.glbExporter.export(building, {
                    format: 'glb',
                    optimization: {
                        enabled: false
                    }
                });

                // تصدير مع تحسين
                const optimizedResult = await exporters.glbExporter.export(building, {
                    format: 'glb',
                    optimization: {
                        enabled: true,
                        targetReduction: optimizationRatio,
                        preserveUVs: true,
                        preserveNormals: true
                    }
                });

                expect(unoptimizedResult.success).toBe(true);
                expect(optimizedResult.success).toBe(true);

                // التحقق من تقليل عدد المضلعات
                if (unoptimizedResult.stats && optimizedResult.stats) {
                    const originalPolyCount = unoptimizedResult.stats.polyCount;
                    const optimizedPolyCount = optimizedResult.stats.polyCount;

                    // يجب أن يقل عدد المضلعات
                    expect(optimizedPolyCount).toBeLessThan(originalPolyCount);

                    // التحقق من نسبة التحسين
                    const actualReduction = (originalPolyCount - optimizedPolyCount) / originalPolyCount;
                    expect(actualReduction).toBeGreaterThan(0);
                    expect(actualReduction).toBeLessThanOrEqual(optimizationRatio + 0.1); // هامش خطأ 10%

                    // التحقق من الحفاظ على الجودة البصرية
                    expect(optimizedResult.stats.qualityScore).toBeGreaterThan(0.7); // جودة لا تقل عن 70%
                }

                // التحقق من تقليل حجم الملف
                const originalSize = unoptimizedResult.data?.byteLength || 0;
                const optimizedSize = optimizedResult.data?.byteLength || 0;
                expect(optimizedSize).toBeLessThanOrEqual(originalSize);
            }
        ), { numRuns: 100 });
    });

    /**
     * الخاصية 27: إنتاج شبكات التصادم
     * تتحقق من: المتطلبات 8.6
     * 
     * لأي عنصر، يجب أن يتم إنتاج شبكات تصادم صحيحة ومحسنة للفيزياء
     */
    it('Property 27: Collision Mesh Generation', () => {
        fc.assert(fc.property(
            generateRandomBuilding(),
            fc.constantFrom('convex', 'concave', 'box', 'sphere'),
            async (building: Building, collisionType: string) => {
                const settings = {
                    format: 'glb' as const,
                    includeColliders: true,
                    collisionSettings: {
                        type: collisionType,
                        simplification: 0.1, // تبسيط 10%
                        generatePerElement: true
                    }
                };

                const result = await exporters.glbExporter.export(building, settings);

                expect(result.success).toBe(true);
                expect(result.data).toBeDefined();

                // التحقق من إنتاج شبكات التصادم
                if (result.stats?.collisionMeshes) {
                    const collisionMeshes = result.stats.collisionMeshes;

                    // يجب أن يكون هناك شبكة تصادم لكل عنصر
                    expect(collisionMeshes.length).toBeGreaterThan(0);

                    collisionMeshes.forEach(mesh => {
                        // التحقق من صحة شبكة التصادم
                        expect(mesh.vertexCount).toBeGreaterThan(0);
                        expect(mesh.faceCount).toBeGreaterThan(0);

                        // شبكات التصادم يجب أن تكون أبسط من الشبكات الأصلية
                        expect(mesh.vertexCount).toBeLessThanOrEqual(mesh.originalVertexCount);

                        // التحقق من نوع التصادم
                        expect(mesh.type).toBe(collisionType);

                        // التحقق من صحة الحدود
                        expect(mesh.bounds).toBeDefined();
                        expect(mesh.bounds.min).toBeDefined();
                        expect(mesh.bounds.max).toBeDefined();

                        // التحقق من أن الحدود منطقية
                        expect(mesh.bounds.max.x).toBeGreaterThanOrEqual(mesh.bounds.min.x);
                        expect(mesh.bounds.max.y).toBeGreaterThanOrEqual(mesh.bounds.min.y);
                        expect(mesh.bounds.max.z).toBeGreaterThanOrEqual(mesh.bounds.min.z);
                    });
                }

                // التحقق من تحسين الأداء
                if (result.stats?.performanceMetrics) {
                    const metrics = result.stats.performanceMetrics;

                    // شبكات التصادم يجب أن تكون محسنة للفيزياء
                    expect(metrics.collisionComplexity).toBeLessThan(metrics.renderComplexity);
                    expect(metrics.physicsOptimized).toBe(true);
                }
            }
        ), { numRuns: 100 });
    });

    /**
     * الخاصية 28: تضمين مواد PBR
     * تتحقق من: المتطلبات 8.7
     * 
     * لأي مادة PBR، يجب أن يتم تضمينها بشكل صحيح في الملفات المصدرة مع التوافق مع محركات الألعاب
     */
    it('Property 28: PBR Material Embedding', () => {
        fc.assert(fc.property(
            generateRandomBuilding(),
            generateRandomPBRMaterial(),
            fc.constantFrom('unity', 'unreal', 'generic'),
            async (building: Building, pbrMaterial: PBRMaterial, targetEngine: string) => {
                // تطبيق المادة على عناصر المبنى
                const buildingWithMaterial = {
                    ...building,
                    elements: building.elements.map(element => ({
                        ...element,
                        material: { id: pbrMaterial.id, name: pbrMaterial.name }
                    }))
                };

                const settings = {
                    format: 'glb' as const,
                    includeMaterials: true,
                    materialSettings: {
                        targetEngine,
                        embedTextures: true,
                        optimizeForEngine: true
                    }
                };

                const result = await exporters.glbExporter.export(buildingWithMaterial, settings);

                expect(result.success).toBe(true);
                expect(result.data).toBeDefined();

                // التحقق من تضمين المواد
                if (result.stats?.materials) {
                    const exportedMaterials = result.stats.materials;

                    // البحث عن المادة في المواد المصدرة
                    const exportedMaterial = exportedMaterials.find(m => m.id === pbrMaterial.id);

                    // إذا لم توجد المادة، فهذا يعني أن المبنى لا يستخدمها
                    if (!exportedMaterial) {
                        // التحقق من أن المبنى يستخدم هذه المادة فعلاً
                        const buildingUsesMaterial = buildingWithMaterial.elements.some(el =>
                            el.material.id === pbrMaterial.id
                        );

                        if (buildingUsesMaterial) {
                            throw new Error(`Material ${pbrMaterial.id} should be exported but was not found`);
                        }

                        // إذا لم يستخدم المبنى المادة، فهذا طبيعي
                        return true;
                    }

                    if (exportedMaterial) {
                        // التحقق من خصائص PBR
                        expect(exportedMaterial.albedo).toBeDefined();
                        expect(exportedMaterial.metallic).toBeGreaterThanOrEqual(0);
                        expect(exportedMaterial.metallic).toBeLessThanOrEqual(1);
                        expect(exportedMaterial.roughness).toBeGreaterThanOrEqual(0);
                        expect(exportedMaterial.roughness).toBeLessThanOrEqual(1);

                        // التحقق من التوافق مع محرك الألعاب
                        switch (targetEngine) {
                            case 'unity':
                                expect(exportedMaterial.unityCompatible).toBe(true);
                                expect(exportedMaterial.shaderType).toBe('Standard');
                                break;
                            case 'unreal':
                                expect(exportedMaterial.unrealCompatible).toBe(true);
                                expect(exportedMaterial.shaderType).toBe('DefaultLit');
                                break;
                            case 'generic':
                                expect(exportedMaterial.genericCompatible).toBe(true);
                                break;
                        }

                        // التحقق من تضمين النسيج
                        if (pbrMaterial.albedoTexture) {
                            expect(exportedMaterial.embeddedTextures).toContain('albedo');
                        }
                        if (pbrMaterial.normalTexture) {
                            expect(exportedMaterial.embeddedTextures).toContain('normal');
                        }
                        if (pbrMaterial.roughnessTexture) {
                            expect(exportedMaterial.embeddedTextures).toContain('roughness');
                        }
                        if (pbrMaterial.metallicTexture) {
                            expect(exportedMaterial.embeddedTextures).toContain('metallic');
                        }
                    }
                }

                // التحقق من صحة تنسيق GLB مع المواد
                if (result.data instanceof ArrayBuffer) {
                    // فحص أساسي لبنية GLB
                    const dataView = new DataView(result.data);
                    const magic = dataView.getUint32(0, true);
                    expect(magic).toBe(0x46546C67); // 'glTF'

                    // التحقق من وجود قسم JSON
                    const jsonChunkLength = dataView.getUint32(12, true);
                    expect(jsonChunkLength).toBeGreaterThan(0);

                    // التحقق من وجود قسم البيانات الثنائية (للنسيج)
                    if (result.data.byteLength > 20 + jsonChunkLength) {
                        const binaryChunkLength = dataView.getUint32(20 + jsonChunkLength, true);
                        expect(binaryChunkLength).toBeGreaterThan(0);
                    }
                }
            }
        ), { numRuns: 100 });
    });

    /**
     * اختبار تكامل شامل لجميع خصائص التصدير
     */
    it('Integration Test: Complete Export Pipeline', () => {
        fc.assert(fc.property(
            generateRandomBuilding(),
            async (building: Building) => {
                // إعدادات تصدير شاملة
                const comprehensiveSettings = {
                    format: 'glb' as const,
                    quality: 'medium' as QualityLevel,
                    includeColliders: true,
                    includeMaterials: true,
                    textureCompression: {
                        enabled: true,
                        targetResolution: 1024,
                        compressionLevel: 'medium' as TextureCompression
                    },
                    optimization: {
                        enabled: true,
                        targetReduction: 0.3,
                        preserveUVs: true,
                        preserveNormals: true
                    },
                    materialSettings: {
                        targetEngine: 'unity',
                        embedTextures: true,
                        optimizeForEngine: true
                    }
                };

                const result = await exporters.glbExporter.export(building, comprehensiveSettings);

                // التحقق من نجاح العملية الشاملة
                expect(result.success).toBe(true);
                expect(result.data).toBeDefined();
                expect(result.errors).toHaveLength(0);

                // التحقق من جميع الجوانب
                if (result.stats) {
                    // تحسين المضلعات
                    expect(result.stats.polyCount).toBeGreaterThan(0);

                    // ضغط النسيج
                    if (result.stats.textureStats) {
                        result.stats.textureStats.forEach(texture => {
                            expect(texture.width).toBeLessThanOrEqual(1024);
                            expect(texture.height).toBeLessThanOrEqual(1024);
                        });
                    }

                    // شبكات التصادم
                    if (result.stats.collisionMeshes) {
                        expect(result.stats.collisionMeshes.length).toBeGreaterThan(0);
                    }

                    // المواد
                    if (result.stats.materials) {
                        expect(result.stats.materials.length).toBeGreaterThan(0);
                    }
                }

                // التحقق من صحة الملف النهائي
                expect(result.data.byteLength).toBeGreaterThan(0);
                expect(result.filename).toMatch(/\.glb$/);
            }
        ), { numRuns: 50 }); // عدد أقل للاختبار الشامل
    });
});