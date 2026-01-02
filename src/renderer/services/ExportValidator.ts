import * as THREE from 'three';
import { Asset, BuildingElement, Material } from '../store/types';
import { GeometryValidator } from './GeometryValidator';

/**
 * نتيجة التحقق من التصدير
 */
export interface ExportValidationResult {
    isValid: boolean;
    canExport: boolean;
    errors: ExportError[];
    warnings: ExportWarning[];
    missingAssets: MissingAsset[];
    performanceMetrics: PerformanceMetrics;
    suggestions: string[];
}

/**
 * خطأ التصدير
 */
export interface ExportError {
    id: string;
    type: ExportErrorType;
    message: string;
    elementId?: string;
    materialId?: string;
    assetId?: string;
    severity: 'critical' | 'major' | 'minor';
    fixable: boolean;
    autoFixAvailable: boolean;
}

/**
 * تحذير التصدير
 */
export interface ExportWarning {
    id: string;
    type: ExportWarningType;
    message: string;
    elementId?: string;
    materialId?: string;
    recommendation: string;
    impact: 'performance' | 'quality' | 'compatibility';
}

/**
 * أصل مفقود
 */
export interface MissingAsset {
    id: string;
    type: 'texture' | 'model' | 'material';
    path: string;
    usedBy: string[];
    alternatives?: string[];
}

/**
 * مقاييس الأداء
 */
export interface PerformanceMetrics {
    totalVertices: number;
    totalTriangles: number;
    totalMaterials: number;
    totalTextures: number;
    estimatedFileSize: number;
    drawCalls: number;
    memoryUsage: number;
    performanceRating: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * أنواع أخطاء التصدير
 */
export enum ExportErrorType {
    INVALID_GEOMETRY = 'invalid_geometry',
    MISSING_MATERIAL = 'missing_material',
    MISSING_TEXTURE = 'missing_texture',
    UNSUPPORTED_FORMAT = 'unsupported_format',
    FILE_SIZE_EXCEEDED = 'file_size_exceeded',
    INVALID_UV_MAPPING = 'invalid_uv_mapping',
    CORRUPTED_ASSET = 'corrupted_asset',
    DEPENDENCY_MISSING = 'dependency_missing',
    FORMAT_INCOMPATIBILITY = 'format_incompatibility'
}

/**
 * أنواع تحذيرات التصدير
 */
export enum ExportWarningType {
    HIGH_POLYGON_COUNT = 'high_polygon_count',
    LARGE_TEXTURE_SIZE = 'large_texture_size',
    UNOPTIMIZED_MATERIALS = 'unoptimized_materials',
    MISSING_LOD = 'missing_lod',
    POOR_UV_UTILIZATION = 'poor_uv_utilization',
    COMPATIBILITY_ISSUE = 'compatibility_issue',
    PERFORMANCE_IMPACT = 'performance_impact'
}

/**
 * صيغ التصدير المدعومة
 */
export enum ExportFormat {
    GLB = 'glb',
    GLTF = 'gltf',
    OBJ = 'obj',
    FBX = 'fbx',
    COLLADA = 'dae'
}

/**
 * محركات الألعاب المدعومة
 */
export enum GameEngine {
    UNITY = 'unity',
    UNREAL = 'unreal',
    GODOT = 'godot',
    BLENDER = 'blender',
    GENERIC = 'generic'
}

/**
 * إعدادات التحقق من التصدير
 */
export interface ExportValidationSettings {
    targetFormat: ExportFormat;
    targetEngine: GameEngine;
    maxFileSize: number; // بالميجابايت
    maxTextureSize: number;
    maxPolygonCount: number;
    requireLOD: boolean;
    validateMaterials: boolean;
    validateTextures: boolean;
    validateUVMapping: boolean;
    performanceMode: boolean;
    strictMode: boolean;
}

/**
 * معلومات التوافق للصيغ
 */
interface FormatCompatibility {
    supportedMaterials: string[];
    supportedTextures: string[];
    maxTextureSize: number;
    supportsAnimation: boolean;
    supportsPBR: boolean;
    supportsLOD: boolean;
    limitations: string[];
}

/**
 * محقق التصدير المتقدم
 */
export class ExportValidator {
    private settings: ExportValidationSettings;
    private geometryValidator: GeometryValidator;
    private formatCompatibility: Map<ExportFormat, FormatCompatibility>;

    constructor(settings?: Partial<ExportValidationSettings>) {
        this.settings = {
            targetFormat: ExportFormat.GLB,
            targetEngine: GameEngine.UNITY,
            maxFileSize: 100, // 100MB
            maxTextureSize: 4096,
            maxPolygonCount: 100000,
            requireLOD: false,
            validateMaterials: true,
            validateTextures: true,
            validateUVMapping: true,
            performanceMode: false,
            strictMode: false,
            ...settings
        };

        this.geometryValidator = new GeometryValidator();
        this.initializeFormatCompatibility();
    }

    /**
     * التحقق من صحة التصدير
     */
    async validateForExport(
        elements: BuildingElement[],
        materials: Material[],
        assets: Asset[]
    ): Promise<ExportValidationResult> {
        const result: ExportValidationResult = {
            isValid: true,
            canExport: true,
            errors: [],
            warnings: [],
            missingAssets: [],
            performanceMetrics: this.calculatePerformanceMetrics(elements, materials),
            suggestions: []
        };

        // التحقق من الهندسة الأساسية
        const geometryResult = await this.geometryValidator.validateElements(elements);
        result.errors.push(...this.convertGeometryErrors(geometryResult.errors));
        result.warnings.push(...this.convertGeometryWarnings(geometryResult.warnings));

        // التحقق من المواد
        if (this.settings.validateMaterials) {
            await this.validateMaterials(materials, result);
        }

        // التحقق من النسيج
        if (this.settings.validateTextures) {
            await this.validateTextures(materials, assets, result);
        }

        // التحقق من UV Mapping
        if (this.settings.validateUVMapping) {
            await this.validateUVMapping(elements, result);
        }

        // التحقق من التوافق مع الصيغة
        await this.validateFormatCompatibility(elements, materials, result);

        // التحقق من الأداء
        await this.validatePerformance(result);

        // التحقق من الأصول المفقودة
        await this.validateAssetDependencies(materials, assets, result);

        // تحديد إمكانية التصدير
        result.canExport = result.errors.filter(e => e.severity === 'critical').length === 0;
        result.isValid = result.errors.length === 0;

        // إضافة اقتراحات التحسين
        this.generateOptimizationSuggestions(result);

        return result;
    }

    /**
     * تهيئة معلومات التوافق للصيغ
     */
    private initializeFormatCompatibility(): void {
        this.formatCompatibility = new Map();

        // GLB/GLTF
        this.formatCompatibility.set(ExportFormat.GLB, {
            supportedMaterials: ['PBR', 'Standard', 'Unlit'],
            supportedTextures: ['PNG', 'JPG', 'JPEG'],
            maxTextureSize: 8192,
            supportsAnimation: true,
            supportsPBR: true,
            supportsLOD: false,
            limitations: ['لا يدعم النسيج المضغوط', 'محدود في أنواع المواد']
        });

        // OBJ
        this.formatCompatibility.set(ExportFormat.OBJ, {
            supportedMaterials: ['Standard'],
            supportedTextures: ['PNG', 'JPG', 'JPEG', 'TGA'],
            maxTextureSize: 4096,
            supportsAnimation: false,
            supportsPBR: false,
            supportsLOD: false,
            limitations: ['لا يدعم PBR', 'لا يدعم الحركة', 'محدود في المواد']
        });

        // FBX
        this.formatCompatibility.set(ExportFormat.FBX, {
            supportedMaterials: ['PBR', 'Standard', 'Phong', 'Lambert'],
            supportedTextures: ['PNG', 'JPG', 'JPEG', 'TGA', 'TIF'],
            maxTextureSize: 8192,
            supportsAnimation: true,
            supportsPBR: true,
            supportsLOD: true,
            limitations: ['ملف كبير الحجم', 'قد يحتاج تحويل للمحركات']
        });
    }

    /**
     * التحقق من المواد
     */
    private async validateMaterials(materials: Material[], result: ExportValidationResult): Promise<void> {
        const compatibility = this.formatCompatibility.get(this.settings.targetFormat);
        if (!compatibility) return;

        for (const material of materials) {
            // التحقق من نوع المادة
            if (!compatibility.supportedMaterials.includes(material.type)) {
                result.errors.push({
                    id: `unsupported_material_${material.id}`,
                    type: ExportErrorType.UNSUPPORTED_FORMAT,
                    message: `نوع المادة ${material.type} غير مدعوم في صيغة ${this.settings.targetFormat}`,
                    materialId: material.id,
                    severity: 'major',
                    fixable: true,
                    autoFixAvailable: true
                });
            }

            // التحقق من خصائص PBR
            if (material.type === 'PBR' && !compatibility.supportsPBR) {
                result.warnings.push({
                    id: `pbr_not_supported_${material.id}`,
                    type: ExportWarningType.COMPATIBILITY_ISSUE,
                    message: `مادة PBR قد لا تُعرض بشكل صحيح في صيغة ${this.settings.targetFormat}`,
                    materialId: material.id,
                    recommendation: 'فكر في تحويل المادة إلى نوع مدعوم',
                    impact: 'quality'
                });
            }

            // التحقق من النسيج المفقود
            if (material.albedoMap && !this.isTextureValid(material.albedoMap)) {
                result.errors.push({
                    id: `missing_albedo_${material.id}`,
                    type: ExportErrorType.MISSING_TEXTURE,
                    message: `نسيج Albedo مفقود للمادة ${material.id}`,
                    materialId: material.id,
                    severity: 'major',
                    fixable: true,
                    autoFixAvailable: false
                });
            }

            // التحقق من تحسين المواد
            if (!this.isMaterialOptimized(material)) {
                result.warnings.push({
                    id: `unoptimized_material_${material.id}`,
                    type: ExportWarningType.UNOPTIMIZED_MATERIALS,
                    message: `المادة ${material.id} غير محسنة للألعاب`,
                    materialId: material.id,
                    recommendation: 'قم بتحسين خصائص المادة لتحسين الأداء',
                    impact: 'performance'
                });
            }
        }
    }

    /**
     * التحقق من النسيج
     */
    private async validateTextures(
        materials: Material[],
        assets: Asset[],
        result: ExportValidationResult
    ): Promise<void> {
        const compatibility = this.formatCompatibility.get(this.settings.targetFormat);
        if (!compatibility) return;

        const textureMap = new Map<string, Asset>();
        assets.filter(asset => asset.type === 'texture').forEach(asset => {
            textureMap.set(asset.id, asset);
        });

        for (const material of materials) {
            const textures = this.getMaterialTextures(material);

            for (const textureId of textures) {
                const texture = textureMap.get(textureId);

                if (!texture) {
                    result.missingAssets.push({
                        id: textureId,
                        type: 'texture',
                        path: textureId,
                        usedBy: [material.id]
                    });
                    continue;
                }

                // التحقق من صيغة النسيج
                const format = this.getTextureFormat(texture.path);
                if (!compatibility.supportedTextures.includes(format.toUpperCase())) {
                    result.errors.push({
                        id: `unsupported_texture_format_${texture.id}`,
                        type: ExportErrorType.UNSUPPORTED_FORMAT,
                        message: `صيغة النسيج ${format} غير مدعومة`,
                        assetId: texture.id,
                        severity: 'major',
                        fixable: true,
                        autoFixAvailable: true
                    });
                }

                // التحقق من حجم النسيج
                if (texture.metadata?.width && texture.metadata.width > this.settings.maxTextureSize) {
                    result.warnings.push({
                        id: `large_texture_${texture.id}`,
                        type: ExportWarningType.LARGE_TEXTURE_SIZE,
                        message: `حجم النسيج كبير: ${texture.metadata.width}x${texture.metadata.height}`,
                        assetId: texture.id,
                        recommendation: 'قم بتقليل حجم النسيج لتحسين الأداء',
                        impact: 'performance'
                    });
                }

                // التحقق من قوة 2
                if (texture.metadata?.width && !this.isPowerOfTwo(texture.metadata.width)) {
                    result.warnings.push({
                        id: `non_power_of_two_${texture.id}`,
                        type: ExportWarningType.COMPATIBILITY_ISSUE,
                        message: `حجم النسيج ليس قوة للعدد 2: ${texture.metadata.width}x${texture.metadata.height}`,
                        assetId: texture.id,
                        recommendation: 'استخدم أحجام قوة للعدد 2 للتوافق الأفضل',
                        impact: 'compatibility'
                    });
                }
            }
        }
    }

    /**
     * التحقق من UV Mapping
     */
    private async validateUVMapping(elements: BuildingElement[], result: ExportValidationResult): Promise<void> {
        for (const element of elements) {
            if (!element.geometry) continue;

            element.geometry.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry) {
                    const geometry = child.geometry;
                    const uvAttribute = geometry.attributes.uv;

                    if (!uvAttribute) {
                        result.errors.push({
                            id: `missing_uv_${element.id}_${child.id}`,
                            type: ExportErrorType.INVALID_UV_MAPPING,
                            message: 'إحداثيات UV مفقودة',
                            elementId: element.id,
                            severity: 'major',
                            fixable: true,
                            autoFixAvailable: true
                        });
                        return; // استخدام return بدلاً من continue
                    }

                    // التحقق من صحة إحداثيات UV
                    const uvArray = uvAttribute.array;
                    let invalidUVs = 0;
                    let outsideUVs = 0;

                    for (let i = 0; i < uvArray.length; i += 2) {
                        const u = uvArray[i];
                        const v = uvArray[i + 1];

                        // التحقق من القيم الصالحة
                        if (isNaN(u) || isNaN(v) || !isFinite(u) || !isFinite(v)) {
                            invalidUVs++;
                        }

                        // التحقق من النطاق 0-1
                        if (u < 0 || u > 1 || v < 0 || v > 1) {
                            outsideUVs++;
                        }
                    }

                    if (invalidUVs > 0) {
                        result.errors.push({
                            id: `invalid_uv_coords_${element.id}_${child.id}`,
                            type: ExportErrorType.INVALID_UV_MAPPING,
                            message: `إحداثيات UV غير صالحة: ${invalidUVs} نقطة`,
                            elementId: element.id,
                            severity: 'major',
                            fixable: true,
                            autoFixAvailable: true
                        });
                    }

                    if (outsideUVs > uvArray.length / 4) { // أكثر من 25%
                        result.warnings.push({
                            id: `poor_uv_utilization_${element.id}_${child.id}`,
                            type: ExportWarningType.POOR_UV_UTILIZATION,
                            message: `استخدام ضعيف لمساحة UV: ${outsideUVs} نقطة خارج النطاق`,
                            elementId: element.id,
                            recommendation: 'قم بتحسين UV mapping لاستخدام أفضل للنسيج',
                            impact: 'quality'
                        });
                    }
                }
            });
        }
    }

    /**
     * التحقق من التوافق مع الصيغة
     */
    private async validateFormatCompatibility(
        elements: BuildingElement[],
        materials: Material[],
        result: ExportValidationResult
    ): Promise<void> {
        const compatibility = this.formatCompatibility.get(this.settings.targetFormat);
        if (!compatibility) return;

        // التحقق من الحد الأقصى لحجم الملف
        const estimatedSize = result.performanceMetrics.estimatedFileSize;
        if (estimatedSize > this.settings.maxFileSize * 1024 * 1024) {
            result.errors.push({
                id: 'file_size_exceeded',
                type: ExportErrorType.FILE_SIZE_EXCEEDED,
                message: `حجم الملف المتوقع ${(estimatedSize / 1024 / 1024).toFixed(1)}MB يتجاوز الحد الأقصى ${this.settings.maxFileSize}MB`,
                severity: 'major',
                fixable: true,
                autoFixAvailable: false
            });
        }

        // التحقق من LOD إذا كان مطلوباً
        if (this.settings.requireLOD && !compatibility.supportsLOD) {
            result.warnings.push({
                id: 'lod_not_supported',
                type: ExportWarningType.MISSING_LOD,
                message: `صيغة ${this.settings.targetFormat} لا تدعم LOD`,
                recommendation: 'فكر في استخدام صيغة أخرى أو تحسين الهندسة يدوياً',
                impact: 'performance'
            });
        }
    }

    /**
     * التحقق من الأداء
     */
    private async validatePerformance(result: ExportValidationResult): Promise<void> {
        const metrics = result.performanceMetrics;

        // التحقق من عدد المضلعات
        if (metrics.totalTriangles > this.settings.maxPolygonCount) {
            result.warnings.push({
                id: 'high_polygon_count',
                type: ExportWarningType.HIGH_POLYGON_COUNT,
                message: `عدد مضلعات عالي: ${metrics.totalTriangles}`,
                recommendation: 'قم بتبسيط الهندسة أو استخدم LOD',
                impact: 'performance'
            });
        }

        // التحقق من عدد Draw Calls
        if (metrics.drawCalls > 100) {
            result.warnings.push({
                id: 'high_draw_calls',
                type: ExportWarningType.PERFORMANCE_IMPACT,
                message: `عدد Draw Calls عالي: ${metrics.drawCalls}`,
                recommendation: 'قم بدمج الشبكات أو استخدم Texture Atlasing',
                impact: 'performance'
            });
        }

        // التحقق من استخدام الذاكرة
        if (metrics.memoryUsage > 500 * 1024 * 1024) { // 500MB
            result.warnings.push({
                id: 'high_memory_usage',
                type: ExportWarningType.PERFORMANCE_IMPACT,
                message: `استخدام ذاكرة عالي: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
                recommendation: 'قم بضغط النسيج أو تقليل الدقة',
                impact: 'performance'
            });
        }
    }

    /**
     * التحقق من تبعيات الأصول
     */
    private async validateAssetDependencies(
        materials: Material[],
        assets: Asset[],
        result: ExportValidationResult
    ): Promise<void> {
        const assetMap = new Map<string, Asset>();
        assets.forEach(asset => assetMap.set(asset.id, asset));

        for (const material of materials) {
            const dependencies = this.getMaterialDependencies(material);

            for (const depId of dependencies) {
                if (!assetMap.has(depId)) {
                    const existing = result.missingAssets.find(ma => ma.id === depId);
                    if (existing) {
                        existing.usedBy.push(material.id);
                    } else {
                        result.missingAssets.push({
                            id: depId,
                            type: 'texture',
                            path: depId,
                            usedBy: [material.id],
                            alternatives: this.findAlternativeAssets(depId, assets)
                        });
                    }
                }
            }
        }
    }

    /**
     * حساب مقاييس الأداء
     */
    private calculatePerformanceMetrics(elements: BuildingElement[], materials: Material[]): PerformanceMetrics {
        let totalVertices = 0;
        let totalTriangles = 0;
        let drawCalls = 0;
        let memoryUsage = 0;

        // حساب الهندسة
        for (const element of elements) {
            if (!element.geometry) continue;

            element.geometry.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry) {
                    drawCalls++;
                    const geometry = child.geometry;
                    totalVertices += geometry.attributes.position.count;
                    totalTriangles += geometry.index ?
                        geometry.index.count / 3 :
                        geometry.attributes.position.count / 3;

                    // تقدير استخدام الذاكرة
                    memoryUsage += geometry.attributes.position.count * 12; // 3 floats * 4 bytes
                    if (geometry.attributes.normal) {
                        memoryUsage += geometry.attributes.normal.count * 12;
                    }
                    if (geometry.attributes.uv) {
                        memoryUsage += geometry.attributes.uv.count * 8; // 2 floats * 4 bytes
                    }
                    if (geometry.index) {
                        memoryUsage += geometry.index.count * 4; // 4 bytes per index
                    }
                }
            });
        }

        // تقدير حجم الملف
        const estimatedFileSize = memoryUsage + (materials.length * 1024); // تقدير تقريبي

        // تقييم الأداء
        let performanceRating: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
        if (totalTriangles > 50000 || drawCalls > 100) performanceRating = 'good';
        if (totalTriangles > 100000 || drawCalls > 200) performanceRating = 'fair';
        if (totalTriangles > 200000 || drawCalls > 500) performanceRating = 'poor';

        return {
            totalVertices,
            totalTriangles,
            totalMaterials: materials.length,
            totalTextures: this.countUniqueTextures(materials),
            estimatedFileSize,
            drawCalls,
            memoryUsage,
            performanceRating
        };
    }

    /**
     * إنتاج اقتراحات التحسين
     */
    private generateOptimizationSuggestions(result: ExportValidationResult): void {
        const metrics = result.performanceMetrics;

        if (metrics.performanceRating === 'poor') {
            result.suggestions.push('الأداء ضعيف - فكر في تبسيط الهندسة بشكل كبير');
        }

        if (metrics.drawCalls > 50) {
            result.suggestions.push('قم بدمج الشبكات المتشابهة لتقليل Draw Calls');
        }

        if (metrics.totalTextures > 20) {
            result.suggestions.push('استخدم Texture Atlasing لتقليل عدد النسيج');
        }

        if (result.missingAssets.length > 0) {
            result.suggestions.push('تأكد من وجود جميع الأصول المطلوبة قبل التصدير');
        }

        if (result.errors.filter(e => e.autoFixAvailable).length > 0) {
            result.suggestions.push('يمكن إصلاح بعض الأخطاء تلقائياً - استخدم وظيفة الإصلاح التلقائي');
        }
    }

    // دوال مساعدة
    private convertGeometryErrors(geometryErrors: any[]): ExportError[] {
        return geometryErrors.map(error => ({
            id: error.id,
            type: ExportErrorType.INVALID_GEOMETRY,
            message: error.message,
            elementId: error.elementId,
            severity: error.severity,
            fixable: error.fixable,
            autoFixAvailable: false
        }));
    }

    private convertGeometryWarnings(geometryWarnings: any[]): ExportWarning[] {
        return geometryWarnings.map(warning => ({
            id: warning.id,
            type: ExportWarningType.PERFORMANCE_IMPACT,
            message: warning.message,
            elementId: warning.elementId,
            recommendation: warning.recommendation,
            impact: 'performance' as const
        }));
    }

    private isTextureValid(texturePath: string): boolean {
        // تحقق بسيط - في التطبيق الحقيقي نحتاج للتحقق من وجود الملف
        return texturePath && texturePath.length > 0;
    }

    private isMaterialOptimized(material: Material): boolean {
        // تحقق من تحسين المادة - معايير بسيطة
        return material.roughness !== undefined &&
            material.metallic !== undefined &&
            material.albedo !== undefined;
    }

    private getMaterialTextures(material: Material): string[] {
        const textures: string[] = [];
        if (material.albedoMap) textures.push(material.albedoMap);
        if (material.normalMap) textures.push(material.normalMap);
        if (material.roughnessMap) textures.push(material.roughnessMap);
        if (material.metallicMap) textures.push(material.metallicMap);
        if (material.emissiveMap) textures.push(material.emissiveMap);
        return textures;
    }

    private getMaterialDependencies(material: Material): string[] {
        return this.getMaterialTextures(material);
    }

    private getTextureFormat(path: string): string {
        return path.split('.').pop()?.toLowerCase() || '';
    }

    private isPowerOfTwo(value: number): boolean {
        return (value & (value - 1)) === 0 && value !== 0;
    }

    private countUniqueTextures(materials: Material[]): number {
        const uniqueTextures = new Set<string>();
        for (const material of materials) {
            this.getMaterialTextures(material).forEach(texture => uniqueTextures.add(texture));
        }
        return uniqueTextures.size;
    }

    private findAlternativeAssets(assetId: string, assets: Asset[]): string[] {
        // بحث بسيط عن بدائل - يمكن تحسينه
        const baseName = assetId.replace(/\.[^/.]+$/, '');
        return assets
            .filter(asset => asset.path.includes(baseName) && asset.id !== assetId)
            .map(asset => asset.id)
            .slice(0, 3); // أول 3 بدائل
    }

    /**
     * تحديث إعدادات التحقق
     */
    updateSettings(newSettings: Partial<ExportValidationSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    getSettings(): ExportValidationSettings {
        return { ...this.settings };
    }

    /**
     * الحصول على معلومات التوافق للصيغة
     */
    getFormatCompatibility(format: ExportFormat): FormatCompatibility | undefined {
        return this.formatCompatibility.get(format);
    }
}