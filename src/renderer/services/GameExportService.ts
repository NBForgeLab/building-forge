/**
 * خدمة شاملة لتصدير المشاريع للألعاب مع دعم صيغ متعددة
 */

import { Project } from '../../shared/types'
import { ExportOptimizer, OptimizationResult } from './ExportOptimizer'
import { GameOptimizedGLBExporter, GLBExportOptions, ExportResult as GLBExportResult } from './GameOptimizedGLBExporter'
import { GamePBRMaterialExporter, PBRExportOptions, PBRExportResult } from './GamePBRMaterialExporter'
import { OBJExporter, OBJExportOptions, OBJExportResult } from './OBJExporter'

export interface GameExportOptions {
    format: 'glb' | 'obj'
    quality: 'high' | 'medium' | 'low'
    targetEngine: 'unity' | 'unreal' | 'godot' | 'generic'
    optimizeForGames: boolean
    generateCollisionMesh: boolean
    includePBRMaterials: boolean
    generateLOD: boolean
    textureAtlasing: boolean
    meshMerging: boolean
    maxTextureSize: 512 | 1024 | 2048 | 4096
    compressionFormat: 'draco' | 'meshopt' | 'none'
    exportPath?: string
}

export interface GameExportResult {
    success: boolean
    files: ExportedFile[]
    stats: ExportStats
    optimizationReport?: OptimizationResult
    error?: string
}

export interface ExportedFile {
    filename: string
    data: ArrayBuffer | string | Blob
    type: 'model' | 'material' | 'texture' | 'metadata'
    size: number
}

export interface ExportStats {
    totalFiles: number
    totalSize: number
    processingTime: number
    originalVertices: number
    optimizedVertices: number
    originalTriangles: number
    optimizedTriangles: number
    texturesOptimized: number
    materialsProcessed: number
}

export class GameExportService {
    private glbExporter: GameOptimizedGLBExporter
    private objExporter: OBJExporter
    private optimizer: ExportOptimizer
    private pbrExporter: GamePBRMaterialExporter

    constructor() {
        this.glbExporter = new GameOptimizedGLBExporter()
        this.objExporter = new OBJExporter()
        this.optimizer = new ExportOptimizer()
        this.pbrExporter = new GamePBRMaterialExporter()
    }

    /**
     * تصدير مشروع للألعاب
     */
    async exportProject(
        project: Project,
        options: Partial<GameExportOptions> = {}
    ): Promise<GameExportResult> {
        const startTime = Date.now()

        try {
            const exportOptions: GameExportOptions = {
                format: 'glb',
                quality: 'medium',
                targetEngine: 'generic',
                optimizeForGames: true,
                generateCollisionMesh: true,
                includePBRMaterials: true,
                generateLOD: true,
                textureAtlasing: true,
                meshMerging: true,
                maxTextureSize: 1024,
                compressionFormat: 'draco',
                ...options
            }

            const files: ExportedFile[] = []
            let optimizationReport: OptimizationResult | undefined

            // تصدير المواد PBR إذا كان مطلوباً
            let pbrResult: PBRExportResult | undefined
            if (exportOptions.includePBRMaterials && project.materials.length > 0) {
                pbrResult = await this.exportPBRMaterials(project, exportOptions)

                if (pbrResult.success) {
                    // إضافة ملفات النسيج
                    Object.entries(pbrResult.textures).forEach(([filename, blob]) => {
                        files.push({
                            filename,
                            data: blob,
                            type: 'texture',
                            size: blob.size
                        })
                    })

                    // إضافة ملفات المحرك
                    if (pbrResult.engineFiles) {
                        Object.entries(pbrResult.engineFiles).forEach(([filename, content]) => {
                            files.push({
                                filename,
                                data: content,
                                type: 'material',
                                size: new Blob([content]).size
                            })
                        })
                    }

                    // إضافة ملف بيانات المواد
                    const materialsJson = JSON.stringify(pbrResult.materials, null, 2)
                    files.push({
                        filename: 'materials.json',
                        data: materialsJson,
                        type: 'metadata',
                        size: new Blob([materialsJson]).size
                    })
                }
            }

            // تصدير النموذج حسب الصيغة المطلوبة
            if (exportOptions.format === 'glb') {
                const result = await this.exportGLB(project, exportOptions)

                if (result.success && result.data) {
                    files.push({
                        filename: `${project.name}.glb`,
                        data: result.data,
                        type: 'model',
                        size: result.data.byteLength
                    })

                    // إضافة تقرير التحسين إذا كان متاحاً
                    if (result.stats) {
                        optimizationReport = {
                            success: true,
                            originalStats: {
                                vertices: result.stats.originalVertices,
                                triangles: result.stats.originalTriangles,
                                materials: project.materials.length,
                                textures: pbrResult?.stats.texturesGenerated || 0,
                                drawCalls: project.elements.length,
                                memoryUsage: 0
                            },
                            optimizedStats: {
                                vertices: result.stats.optimizedVertices,
                                triangles: result.stats.optimizedTriangles,
                                materials: project.materials.length,
                                textures: pbrResult?.stats.texturesGenerated || 0,
                                drawCalls: project.elements.length,
                                memoryUsage: result.stats.fileSize
                            },
                            optimizations: []
                        }
                    }
                }
            } else if (exportOptions.format === 'obj') {
                const result = await this.exportOBJ(project, exportOptions)

                if (result.success) {
                    // إضافة ملف OBJ
                    if (result.objData) {
                        files.push({
                            filename: `${project.name}.obj`,
                            data: result.objData,
                            type: 'model',
                            size: new Blob([result.objData]).size
                        })
                    }

                    // إضافة ملف MTL
                    if (result.mtlData) {
                        files.push({
                            filename: `${project.name}.mtl`,
                            data: result.mtlData,
                            type: 'material',
                            size: new Blob([result.mtlData]).size
                        })
                    }

                    // إضافة ملفات النسيج
                    if (result.textures) {
                        Object.entries(result.textures).forEach(([filename, blob]) => {
                            files.push({
                                filename,
                                data: blob,
                                type: 'texture',
                                size: blob.size
                            })
                        })
                    }
                }
            }

            // إنشاء ملف معلومات التصدير
            const exportInfo = this.generateExportInfo(project, exportOptions, files)
            files.push({
                filename: 'export_info.json',
                data: JSON.stringify(exportInfo, null, 2),
                type: 'metadata',
                size: new Blob([JSON.stringify(exportInfo)]).size
            })

            // حساب الإحصائيات النهائية
            const stats = this.calculateExportStats(files, startTime, pbrResult)

            return {
                success: true,
                files,
                stats,
                optimizationReport
            }

        } catch (error) {
            return {
                success: false,
                files: [],
                stats: this.createEmptyStats(),
                error: `خطأ في التصدير: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            }
        }
    }

    /**
     * تصدير مواد PBR
     */
    private async exportPBRMaterials(
        project: Project,
        options: GameExportOptions
    ): Promise<PBRExportResult> {
        const pbrOptions: Partial<PBRExportOptions> = {
            targetEngine: options.targetEngine,
            textureFormat: 'png',
            maxTextureSize: options.maxTextureSize,
            optimizeForMobile: options.quality === 'low',
            includeEmission: true,
            includeNormalMaps: true,
            includeOcclusionMaps: options.quality === 'high'
        }

        return this.pbrExporter.exportMaterials(project.materials, pbrOptions)
    }

    /**
     * تصدير GLB
     */
    private async exportGLB(
        project: Project,
        options: GameExportOptions
    ): Promise<GLBExportResult> {
        const glbOptions: Partial<GLBExportOptions> = {
            quality: options.quality,
            generateLOD: options.generateLOD,
            optimizeGeometry: options.optimizeForGames,
            compressTextures: true,
            generateCollisionMesh: options.generateCollisionMesh,
            materialOptimization: true,
            targetEngine: options.targetEngine,
            maxTextureSize: options.maxTextureSize,
            compressionFormat: options.compressionFormat
        }

        return this.glbExporter.exportProject(project, glbOptions)
    }

    /**
     * تصدير OBJ
     */
    private async exportOBJ(
        project: Project,
        options: GameExportOptions
    ): Promise<OBJExportResult> {
        const objOptions: Partial<OBJExportOptions> = {
            includeMTL: true,
            exportTextures: true,
            textureFormat: 'png',
            meshOptimization: options.optimizeForGames,
            groupByMaterial: true,
            includeNormals: true,
            includeUVs: true,
            precision: options.quality === 'high' ? 6 : 3
        }

        return this.objExporter.exportProject(project, objOptions)
    }

    /**
     * إنتاج معلومات التصدير
     */
    private generateExportInfo(
        project: Project,
        options: GameExportOptions,
        files: ExportedFile[]
    ): any {
        return {
            projectName: project.name,
            projectVersion: project.version,
            exportDate: new Date().toISOString(),
            exportOptions: options,
            targetEngine: options.targetEngine,
            format: options.format,
            files: files.map(file => ({
                filename: file.filename,
                type: file.type,
                size: file.size
            })),
            statistics: {
                totalElements: project.elements.length,
                totalMaterials: project.materials.length,
                totalFiles: files.length,
                totalSize: files.reduce((sum, file) => sum + file.size, 0)
            },
            compatibility: {
                unity: options.targetEngine === 'unity' || options.targetEngine === 'generic',
                unreal: options.targetEngine === 'unreal' || options.targetEngine === 'generic',
                godot: options.targetEngine === 'godot' || options.targetEngine === 'generic',
                blender: options.format === 'obj' || options.format === 'glb',
                maya: options.format === 'obj',
                max: options.format === 'obj'
            },
            recommendations: this.generateRecommendations(project, options)
        }
    }

    /**
     * إنتاج توصيات للتحسين
     */
    private generateRecommendations(
        project: Project,
        options: GameExportOptions
    ): string[] {
        const recommendations: string[] = []

        // توصيات بناءً على عدد العناصر
        if (project.elements.length > 100) {
            recommendations.push('يُنصح بتفعيل دمج الشبكات لتحسين الأداء')
        }

        // توصيات بناءً على عدد المواد
        if (project.materials.length > 10) {
            recommendations.push('يُنصح بتفعيل texture atlasing لتقليل draw calls')
        }

        // توصيات بناءً على الجودة
        if (options.quality === 'low') {
            recommendations.push('تم تحسين النموذج للأجهزة منخفضة الأداء')
        }

        // توصيات بناءً على المحرك المستهدف
        switch (options.targetEngine) {
            case 'unity':
                recommendations.push('تم تحسين المواد لـ Unity Standard Shader')
                break
            case 'unreal':
                recommendations.push('تم تحسين المواد لـ Unreal Engine PBR')
                break
            case 'godot':
                recommendations.push('تم تحسين المواد لـ Godot StandardMaterial3D')
                break
        }

        return recommendations
    }

    /**
     * حساب إحصائيات التصدير
     */
    private calculateExportStats(
        files: ExportedFile[],
        startTime: number,
        pbrResult?: PBRExportResult
    ): ExportStats {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0)
        const processingTime = Date.now() - startTime

        return {
            totalFiles: files.length,
            totalSize,
            processingTime,
            originalVertices: 0, // سيتم تحديثه من نتائج التصدير
            optimizedVertices: 0,
            originalTriangles: 0,
            optimizedTriangles: 0,
            texturesOptimized: pbrResult?.stats.texturesGenerated || 0,
            materialsProcessed: pbrResult?.stats.materialsProcessed || 0
        }
    }

    /**
     * إنشاء إحصائيات فارغة
     */
    private createEmptyStats(): ExportStats {
        return {
            totalFiles: 0,
            totalSize: 0,
            processingTime: 0,
            originalVertices: 0,
            optimizedVertices: 0,
            originalTriangles: 0,
            optimizedTriangles: 0,
            texturesOptimized: 0,
            materialsProcessed: 0
        }
    }

    /**
     * حفظ الملفات المصدرة
     */
    async saveExportedFiles(
        files: ExportedFile[],
        basePath: string
    ): Promise<{ success: boolean; savedFiles: string[]; error?: string }> {
        try {
            const savedFiles: string[] = []

            for (const file of files) {
                const filePath = `${basePath}/${file.filename}`

                // تحويل البيانات إلى تنسيق مناسب للحفظ
                let dataToSave: string | ArrayBuffer

                if (file.data instanceof ArrayBuffer) {
                    dataToSave = file.data
                } else if (file.data instanceof Blob) {
                    dataToSave = await file.data.arrayBuffer()
                } else {
                    dataToSave = file.data
                }

                // هنا يمكن استخدام Electron API لحفظ الملف
                // في الوقت الحالي نحفظ المسار فقط
                savedFiles.push(filePath)
            }

            return {
                success: true,
                savedFiles
            }

        } catch (error) {
            return {
                success: false,
                savedFiles: [],
                error: `خطأ في حفظ الملفات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            }
        }
    }

    /**
     * التحقق من صحة خيارات التصدير
     */
    validateExportOptions(options: Partial<GameExportOptions>): { valid: boolean; errors: string[] } {
        const errors: string[] = []

        // التحقق من الصيغة
        if (options.format && !['glb', 'obj'].includes(options.format)) {
            errors.push('صيغة التصدير غير مدعومة')
        }

        // التحقق من الجودة
        if (options.quality && !['high', 'medium', 'low'].includes(options.quality)) {
            errors.push('مستوى الجودة غير صحيح')
        }

        // التحقق من المحرك المستهدف
        if (options.targetEngine && !['unity', 'unreal', 'godot', 'generic'].includes(options.targetEngine)) {
            errors.push('المحرك المستهدف غير مدعوم')
        }

        // التحقق من حجم النسيج
        if (options.maxTextureSize && ![512, 1024, 2048, 4096].includes(options.maxTextureSize)) {
            errors.push('حجم النسيج الأقصى غير صحيح')
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }

    /**
     * الحصول على خيارات التصدير الافتراضية لمحرك معين
     */
    getDefaultOptionsForEngine(engine: 'unity' | 'unreal' | 'godot'): Partial<GameExportOptions> {
        const baseOptions: Partial<GameExportOptions> = {
            targetEngine: engine,
            optimizeForGames: true,
            includePBRMaterials: true
        }

        switch (engine) {
            case 'unity':
                return {
                    ...baseOptions,
                    format: 'glb',
                    quality: 'medium',
                    generateLOD: true,
                    textureAtlasing: true,
                    maxTextureSize: 1024,
                    compressionFormat: 'draco'
                }

            case 'unreal':
                return {
                    ...baseOptions,
                    format: 'glb',
                    quality: 'high',
                    generateLOD: true,
                    textureAtlasing: false, // Unreal يفضل إدارة النسيج بنفسه
                    maxTextureSize: 2048,
                    compressionFormat: 'none'
                }

            case 'godot':
                return {
                    ...baseOptions,
                    format: 'glb',
                    quality: 'medium',
                    generateLOD: false, // Godot يدير LOD بنفسه
                    textureAtlasing: true,
                    maxTextureSize: 1024,
                    compressionFormat: 'draco'
                }

            default:
                return baseOptions
        }
    }
}