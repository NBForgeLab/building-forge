/**
 * Mock implementations لمصدرين التصدير
 * 
 * هذا الملف يحتوي على تنفيذات وهمية للمصدرين المختلفة
 * لاستخدامها في الاختبارات
 */

import {
    Building,
    BuildingElement,
    CollisionMesh,
    CollisionMeshGenerator,
    CollisionSettings,
    ExportedMaterial,
    ExportOptimizer,
    ExportResult,
    ExportSettings,
    GameOptimizedGLBExporter,
    MaterialSettings,
    OBJExporter,
    OptimizationSettings,
    PBRMaterial,
    PBRMaterialExporter
} from '../types/export-types';

/**
 * Mock GLB Exporter
 */
export class MockGameOptimizedGLBExporter implements GameOptimizedGLBExporter {
    private disposed = false;

    async export(building: Building, settings: ExportSettings): Promise<ExportResult> {
        if (this.disposed) {
            throw new Error('Exporter has been disposed');
        }

        // محاكاة وقت المعالجة
        await this.simulateProcessingTime(settings.quality);

        // إنشاء GLB header وهمي
        const glbData = this.createMockGLBData(building, settings);

        // حساب الإحصائيات
        const stats = this.calculateStats(building, settings);

        return {
            success: true,
            data: glbData,
            filename: `${building.name}.glb`,
            stats,
            errors: [],
            warnings: this.generateWarnings(building, settings)
        };
    }

    dispose(): void {
        this.disposed = true;
    }

    private async simulateProcessingTime(quality: string): Promise<void> {
        const delay = quality === 'high' ? 100 : quality === 'medium' ? 50 : 25;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    private createMockGLBData(building: Building, settings: ExportSettings): ArrayBuffer {
        // إنشاء GLB header صالح
        const headerSize = 12;
        const jsonChunkSize = 1000;
        const binaryChunkSize = building.elements.length * 1000; // تقدير حجم البيانات
        const totalSize = headerSize + 8 + jsonChunkSize + 8 + binaryChunkSize;

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);

        // GLB Header
        view.setUint32(0, 0x46546C67, true); // 'glTF' magic
        view.setUint32(4, 2, true); // version 2
        view.setUint32(8, totalSize, true); // total length

        // JSON Chunk Header
        view.setUint32(12, jsonChunkSize, true); // chunk length
        view.setUint32(16, 0x4E4F534A, true); // 'JSON' type

        // Binary Chunk Header (if needed)
        if (binaryChunkSize > 0) {
            view.setUint32(20 + jsonChunkSize, binaryChunkSize, true); // chunk length
            view.setUint32(24 + jsonChunkSize, 0x004E4942, true); // 'BIN\0' type
        }

        return buffer;
    }

    private calculateStats(building: Building, settings: ExportSettings) {
        const basePolyCount = building.elements.reduce((sum, el) => sum + (el.metadata.polyCount || 1000), 0);

        // تطبيق تحسين المضلعات
        let polyCount = basePolyCount;
        if (settings.optimization?.enabled) {
            polyCount = Math.floor(basePolyCount * (1 - settings.optimization.targetReduction));
        }

        // تطبيق تحسين الجودة
        switch (settings.quality) {
            case 'low':
                polyCount = Math.floor(polyCount * 0.5);
                break;
            case 'medium':
                polyCount = Math.floor(polyCount * 0.75);
                break;
            case 'high':
                // لا تغيير
                break;
        }

        return {
            polyCount,
            materialCount: building.materials.length,
            textureStats: settings.textureCompression?.enabled ?
                building.materials.map(mat => ({
                    width: settings.textureCompression!.targetResolution,
                    height: settings.textureCompression!.targetResolution,
                    format: settings.textureCompression!.format,
                    compressed: true,
                    originalSize: 4 * 1024 * 1024, // 4MB original
                    compressedSize: 1 * 1024 * 1024 // 1MB compressed
                })) : undefined,
            collisionMeshes: settings.includeColliders ?
                building.elements.map(el => ({
                    vertexCount: Math.floor((el.metadata.polyCount || 1000) * 0.1),
                    faceCount: Math.floor((el.metadata.polyCount || 1000) * 0.05),
                    originalVertexCount: el.metadata.polyCount || 1000,
                    type: settings.collisionSettings?.type || 'convex',
                    bounds: {
                        min: { x: -5, y: -5, z: -5 },
                        max: { x: 5, y: 5, z: 5 }
                    }
                })) : undefined,
            materials: settings.includeMaterials ?
                building.materials
                    .filter(mat => building.elements.some(el => el.material.id === mat.id))
                    .map(mat => ({
                        id: mat.id,
                        name: mat.name,
                        albedo: typeof mat.albedo === 'object' && 'r' in mat.albedo ? mat.albedo : { r: 0.8, g: 0.8, b: 0.8, a: 1 },
                        metallic: mat.metallic,
                        roughness: mat.roughness,
                        embeddedTextures: this.getEmbeddedTextures(mat),
                        unityCompatible: settings.materialSettings?.targetEngine === 'unity',
                        unrealCompatible: settings.materialSettings?.targetEngine === 'unreal',
                        genericCompatible: settings.materialSettings?.targetEngine === 'generic',
                        shaderType: this.getShaderType(settings.materialSettings?.targetEngine || 'generic')
                    })) : undefined,
            compressionRatio: this.calculateCompressionRatio(settings),
            qualityScore: this.calculateQualityScore(settings),
            performanceMetrics: {
                collisionComplexity: polyCount * 0.1,
                renderComplexity: polyCount,
                physicsOptimized: settings.includeColliders || false
            }
        };
    }

    private getEmbeddedTextures(material: PBRMaterial): string[] {
        const textures: string[] = [];
        if (material.albedoTexture) textures.push('albedo');
        if (material.normalTexture) textures.push('normal');
        if (material.roughnessTexture) textures.push('roughness');
        if (material.metallicTexture) textures.push('metallic');
        return textures;
    }

    private getShaderType(targetEngine: string): string {
        switch (targetEngine) {
            case 'unity': return 'Standard';
            case 'unreal': return 'DefaultLit';
            default: return 'PBR';
        }
    }

    private calculateCompressionRatio(settings: ExportSettings): number {
        if (!settings.textureCompression?.enabled) return 0;

        switch (settings.textureCompression.compressionLevel) {
            case 'high': return 0.8;
            case 'medium': return 0.6;
            case 'low': return 0.4;
            default: return 0;
        }
    }

    private calculateQualityScore(settings: ExportSettings): number {
        let score = 1.0;

        if (settings.optimization?.enabled) {
            score -= settings.optimization.targetReduction * 0.5;
        }

        switch (settings.quality) {
            case 'low': score *= 0.7; break;
            case 'medium': score *= 0.85; break;
            case 'high': score *= 1.0; break;
        }

        return Math.max(0.1, score);
    }

    private generateWarnings(building: Building, settings: ExportSettings): string[] {
        const warnings: string[] = [];

        if (building.elements.length > 100) {
            warnings.push('Large number of elements may affect performance');
        }

        if (settings.quality === 'low' && building.materials.length > 10) {
            warnings.push('Low quality setting with many materials may reduce visual fidelity');
        }

        return warnings;
    }
}

/**
 * Mock OBJ Exporter
 */
export class MockOBJExporter implements OBJExporter {
    private disposed = false;

    async export(building: Building, settings: ExportSettings): Promise<ExportResult> {
        if (this.disposed) {
            throw new Error('Exporter has been disposed');
        }

        // محاكاة وقت المعالجة
        await new Promise(resolve => setTimeout(resolve, 50));

        // إنشاء محتوى OBJ وهمي
        const objContent = this.createMockOBJContent(building);
        const objBlob = new Blob([objContent], { type: 'text/plain' });

        return {
            success: true,
            data: objBlob,
            filename: `${building.name}.obj`,
            stats: {
                polyCount: building.elements.reduce((sum, el) => sum + (el.metadata.polyCount || 1000), 0),
                materialCount: building.materials.length
            },
            errors: []
        };
    }

    dispose(): void {
        this.disposed = true;
    }

    private createMockOBJContent(building: Building): string {
        let content = '# Building Forge OBJ Export\n';
        content += `# Building: ${building.name}\n`;
        content += `# Elements: ${building.elements.length}\n\n`;

        // إضافة vertices وهمية
        for (let i = 0; i < building.elements.length * 4; i++) {
            content += `v ${Math.random() * 10} ${Math.random() * 10} ${Math.random() * 10}\n`;
        }

        content += '\n';

        // إضافة faces وهمية
        for (let i = 0; i < building.elements.length * 2; i++) {
            const base = i * 4 + 1;
            content += `f ${base} ${base + 1} ${base + 2}\n`;
            content += `f ${base} ${base + 2} ${base + 3}\n`;
        }

        return content;
    }
}

/**
 * Mock Export Optimizer
 */
export class MockExportOptimizer implements ExportOptimizer {
    async optimize(building: Building, settings: OptimizationSettings): Promise<Building> {
        // محاكاة التحسين
        await new Promise(resolve => setTimeout(resolve, 30));

        // إنشاء نسخة محسنة من المبنى
        const optimizedBuilding: Building = {
            ...building,
            elements: building.elements.map(element => ({
                ...element,
                metadata: {
                    ...element.metadata,
                    polyCount: Math.floor((element.metadata.polyCount || 1000) * (1 - settings.targetReduction))
                }
            }))
        };

        return optimizedBuilding;
    }
}

/**
 * Mock PBR Material Exporter
 */
export class MockPBRMaterialExporter implements PBRMaterialExporter {
    async exportMaterial(material: PBRMaterial, settings: MaterialSettings): Promise<ExportedMaterial> {
        // محاكاة تصدير المادة
        await new Promise(resolve => setTimeout(resolve, 10));

        return {
            id: material.id,
            name: material.name,
            albedo: typeof material.albedo === 'object' && 'r' in material.albedo ?
                material.albedo : { r: 0.8, g: 0.8, b: 0.8, a: 1 },
            metallic: material.metallic,
            roughness: material.roughness,
            embeddedTextures: this.getEmbeddedTextures(material),
            unityCompatible: settings.targetEngine === 'unity',
            unrealCompatible: settings.targetEngine === 'unreal',
            genericCompatible: settings.targetEngine === 'generic',
            shaderType: this.getShaderType(settings.targetEngine)
        };
    }

    private getEmbeddedTextures(material: PBRMaterial): string[] {
        const textures: string[] = [];
        if (material.albedoTexture) textures.push('albedo');
        if (material.normalTexture) textures.push('normal');
        if (material.roughnessTexture) textures.push('roughness');
        if (material.metallicTexture) textures.push('metallic');
        return textures;
    }

    private getShaderType(targetEngine: string): string {
        switch (targetEngine) {
            case 'unity': return 'Standard';
            case 'unreal': return 'DefaultLit';
            default: return 'PBR';
        }
    }
}

/**
 * Mock Collision Mesh Generator
 */
export class MockCollisionMeshGenerator implements CollisionMeshGenerator {
    async generateCollisionMesh(element: BuildingElement, settings: CollisionSettings): Promise<CollisionMesh> {
        // محاكاة إنتاج شبكة التصادم
        await new Promise(resolve => setTimeout(resolve, 20));

        const originalVertexCount = element.metadata.polyCount || 1000;
        const simplifiedVertexCount = Math.floor(originalVertexCount * (1 - settings.simplification));

        return {
            vertexCount: simplifiedVertexCount,
            faceCount: Math.floor(simplifiedVertexCount * 0.5),
            originalVertexCount,
            type: settings.type,
            bounds: {
                min: { x: -5, y: -5, z: -5 },
                max: { x: 5, y: 5, z: 5 }
            }
        };
    }
}

/**
 * Factory function لإنشاء جميع المصدرين الوهميين
 */
export const createMockExporters = () => ({
    glbExporter: new MockGameOptimizedGLBExporter(),
    objExporter: new MockOBJExporter(),
    exportOptimizer: new MockExportOptimizer(),
    materialExporter: new MockPBRMaterialExporter(),
    collisionGenerator: new MockCollisionMeshGenerator()
});