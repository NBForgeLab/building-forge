/**
 * خدمة تصدير مشاريع BForge مع ضغط متقدم ودعم تضمين الأصول
 */

import * as pako from 'pako'
import { Material, Project } from '../../shared/types'

export interface BForgeExportOptions {
    includeAssets: boolean
    compressionLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    compressionAlgorithm: 'gzip' | 'deflate'
    validateBeforeExport: boolean
    embedTextures: boolean
}

export interface BForgeProjectData {
    version: string
    schema: string
    project: Project
    assets?: { [key: string]: string } // base64 encoded assets
    textures?: { [key: string]: string } // base64 encoded textures
    checksum: string
    exportedAt: number
    exportOptions: BForgeExportOptions
}

export interface ExportResult {
    success: boolean
    data?: Uint8Array
    error?: string
    stats: {
        originalSize: number
        compressedSize: number
        compressionRatio: number
        assetsCount: number
        texturesCount: number
        elementsCount: number
    }
}

export class BForgeExporter {
    private static readonly SCHEMA_VERSION = '1.0.0'
    private static readonly BFORGE_VERSION = '1.0.0'

    /**
     * تصدير مشروع إلى تنسيق BForge مضغوط
     */
    async exportProject(
        project: Project,
        options: Partial<BForgeExportOptions> = {}
    ): Promise<ExportResult> {
        try {
            const exportOptions: BForgeExportOptions = {
                includeAssets: true,
                compressionLevel: 6,
                compressionAlgorithm: 'gzip',
                validateBeforeExport: true,
                embedTextures: true,
                ...options
            }

            // التحقق من صحة المشروع قبل التصدير
            if (exportOptions.validateBeforeExport) {
                const validationResult = this.validateProject(project)
                if (!validationResult.isValid) {
                    return {
                        success: false,
                        error: `فشل التحقق من صحة المشروع: ${validationResult.errors.join(', ')}`,
                        stats: this.createEmptyStats()
                    }
                }
            }

            // إنشاء بيانات المشروع
            const projectData: BForgeProjectData = {
                version: BForgeExporter.BFORGE_VERSION,
                schema: BForgeExporter.SCHEMA_VERSION,
                project: this.sanitizeProject(project),
                exportedAt: Date.now(),
                exportOptions,
                checksum: '' // سيتم حسابه لاحقاً
            }

            // تضمين الأصول إذا كان مطلوباً
            if (exportOptions.includeAssets) {
                projectData.assets = await this.embedAssets(project)
            }

            // تضمين النسيج إذا كان مطلوباً
            if (exportOptions.embedTextures) {
                projectData.textures = await this.embedTextures(project.materials)
            }

            // تسلسل البيانات إلى JSON
            const jsonData = JSON.stringify(projectData, null, 0)
            const originalSize = new TextEncoder().encode(jsonData).length

            // حساب checksum
            projectData.checksum = await this.calculateChecksum(jsonData)
            const finalJsonData = JSON.stringify(projectData, null, 0)

            // ضغط البيانات
            const compressedData = this.compressData(
                new TextEncoder().encode(finalJsonData),
                exportOptions
            )

            const stats = {
                originalSize,
                compressedSize: compressedData.length,
                compressionRatio: Math.round((1 - compressedData.length / originalSize) * 100),
                assetsCount: Object.keys(projectData.assets || {}).length,
                texturesCount: Object.keys(projectData.textures || {}).length,
                elementsCount: project.elements.length
            }

            return {
                success: true,
                data: compressedData,
                stats
            }

        } catch (error) {
            return {
                success: false,
                error: `خطأ في التصدير: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                stats: this.createEmptyStats()
            }
        }
    }

    /**
     * التحقق من صحة المشروع قبل التصدير
     */
    private validateProject(project: Project): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // التحقق من البيانات الأساسية
        if (!project.id || project.id.trim() === '') {
            errors.push('معرف المشروع مطلوب')
        }

        if (!project.name || project.name.trim() === '') {
            errors.push('اسم المشروع مطلوب')
        }

        if (!project.version || project.version.trim() === '') {
            errors.push('إصدار المشروع مطلوب')
        }

        // التحقق من العناصر
        if (!Array.isArray(project.elements)) {
            errors.push('قائمة العناصر يجب أن تكون مصفوفة')
        } else {
            project.elements.forEach((element, index) => {
                if (!element.id || element.id.trim() === '') {
                    errors.push(`العنصر ${index + 1}: معرف العنصر مطلوب`)
                }
                if (!element.type) {
                    errors.push(`العنصر ${index + 1}: نوع العنصر مطلوب`)
                }
                if (!element.position || typeof element.position.x !== 'number') {
                    errors.push(`العنصر ${index + 1}: موضع العنصر غير صحيح`)
                }
            })
        }

        // التحقق من المواد
        if (!Array.isArray(project.materials)) {
            errors.push('قائمة المواد يجب أن تكون مصفوفة')
        } else {
            project.materials.forEach((material, index) => {
                if (!material.id || material.id.trim() === '') {
                    errors.push(`المادة ${index + 1}: معرف المادة مطلوب`)
                }
                if (!material.name || material.name.trim() === '') {
                    errors.push(`المادة ${index + 1}: اسم المادة مطلوب`)
                }
            })
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * تنظيف بيانات المشروع من البيانات غير الضرورية
     */
    private sanitizeProject(project: Project): Project {
        return {
            ...project,
            elements: project.elements.map(element => ({
                ...element,
                // إزالة البيانات المؤقتة أو غير الضرورية
                selected: false // إعادة تعيين حالة التحديد
            })),
            // تنظيف البيانات الوصفية
            metadata: {
                ...project.metadata,
                thumbnail: project.metadata.thumbnail || undefined
            }
        }
    }

    /**
     * تضمين الأصول في المشروع كـ base64
     */
    private async embedAssets(project: Project): Promise<{ [key: string]: string }> {
        const assets: { [key: string]: string } = {}

        // البحث عن جميع الأصول المستخدمة في المشروع
        const assetIds = new Set<string>()

        project.elements.forEach(element => {
            if (element.type === 'asset' && element.metadata.assetId) {
                assetIds.add(element.metadata.assetId as string)
            }
        })

        // تحويل كل أصل إلى base64
        for (const assetId of assetIds) {
            try {
                const assetData = await this.loadAssetData(assetId)
                if (assetData) {
                    assets[assetId] = assetData
                }
            } catch (error) {
                console.warn(`فشل في تحميل الأصل ${assetId}:`, error)
            }
        }

        return assets
    }

    /**
     * تضمين النسيج في المشروع كـ base64
     */
    private async embedTextures(materials: Material[]): Promise<{ [key: string]: string }> {
        const textures: { [key: string]: string } = {}

        // البحث عن جميع النسيج المستخدمة
        const textureUrls = new Set<string>()

        materials.forEach(material => {
            if (material.albedo && !material.albedo.startsWith('#')) {
                textureUrls.add(material.albedo)
            }
            if (material.normal) {
                textureUrls.add(material.normal)
            }
            if (material.emissive) {
                textureUrls.add(material.emissive)
            }
        })

        // تحويل كل نسيج إلى base64
        for (const textureUrl of textureUrls) {
            try {
                const textureData = await this.loadTextureData(textureUrl)
                if (textureData) {
                    textures[textureUrl] = textureData
                }
            } catch (error) {
                console.warn(`فشل في تحميل النسيج ${textureUrl}:`, error)
            }
        }

        return textures
    }

    /**
     * تحميل بيانات الأصل وتحويلها إلى base64
     */
    private async loadAssetData(assetId: string): Promise<string | null> {
        // هذه الدالة ستحتاج إلى تنفيذ حسب نظام إدارة الأصول
        // في الوقت الحالي نعيد null
        return null
    }

    /**
     * تحميل بيانات النسيج وتحويلها إلى base64
     */
    private async loadTextureData(textureUrl: string): Promise<string | null> {
        try {
            const response = await fetch(textureUrl)
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const blob = await response.blob()
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })
        } catch (error) {
            console.error(`فشل في تحميل النسيج ${textureUrl}:`, error)
            return null
        }
    }

    /**
     * ضغط البيانات باستخدام الخوارزمية المحددة
     */
    private compressData(data: Uint8Array, options: BForgeExportOptions): Uint8Array {
        const compressionOptions = {
            level: options.compressionLevel,
            windowBits: options.compressionAlgorithm === 'gzip' ? 15 + 16 : 15
        }

        if (options.compressionAlgorithm === 'gzip') {
            return pako.gzip(data, compressionOptions)
        } else {
            return pako.deflate(data, compressionOptions)
        }
    }

    /**
     * حساب checksum للبيانات
     */
    private async calculateChecksum(data: string): Promise<string> {
        const encoder = new TextEncoder()
        const dataBuffer = encoder.encode(data)
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    /**
     * إنشاء إحصائيات فارغة
     */
    private createEmptyStats() {
        return {
            originalSize: 0,
            compressedSize: 0,
            compressionRatio: 0,
            assetsCount: 0,
            texturesCount: 0,
            elementsCount: 0
        }
    }
}