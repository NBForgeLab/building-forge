/**
 * خدمة استيراد مشاريع BForge مع استعادة الحالة الكاملة ومعالجة الأخطاء
 */

import * as pako from 'pako'
import { Project } from '../../shared/types'
import { BForgeExportOptions, BForgeProjectData } from './BForgeExporter'

export interface BForgeImportOptions {
    validateChecksum: boolean
    restoreAssets: boolean
    restoreTextures: boolean
    createBackup: boolean
    migrationMode: 'strict' | 'compatible' | 'force'
}

export interface ImportResult {
    success: boolean
    project?: Project
    error?: string
    warnings: string[]
    stats: {
        originalSize: number
        decompressedSize: number
        assetsRestored: number
        texturesRestored: number
        elementsCount: number
        migrationApplied: boolean
    }
    metadata?: {
        exportedAt: number
        version: string
        schema: string
        exportOptions: BForgeExportOptions
    }
}

export interface MigrationResult {
    success: boolean
    migratedData?: BForgeProjectData
    error?: string
    changes: string[]
}

export class BForgeImporter {
    private static readonly SUPPORTED_VERSIONS = ['1.0.0']
    private static readonly SUPPORTED_SCHEMAS = ['1.0.0']

    /**
     * استيراد مشروع من بيانات BForge مضغوطة
     */
    async importProject(
        compressedData: Uint8Array,
        options: Partial<BForgeImportOptions> = {}
    ): Promise<ImportResult> {
        const importOptions: BForgeImportOptions = {
            validateChecksum: true,
            restoreAssets: true,
            restoreTextures: true,
            createBackup: false,
            migrationMode: 'compatible',
            ...options
        }

        const warnings: string[] = []

        try {
            // إلغاء ضغط البيانات
            const decompressedData = this.decompressData(compressedData)
            const jsonString = new TextDecoder().decode(decompressedData)

            // تحليل JSON
            let projectData: BForgeProjectData
            try {
                projectData = JSON.parse(jsonString)
            } catch (error) {
                return {
                    success: false,
                    error: 'فشل في تحليل بيانات المشروع: البيانات تالفة أو غير صحيحة',
                    warnings,
                    stats: this.createEmptyStats()
                }
            }

            // التحقق من التوافق والإصدار
            const compatibilityResult = this.checkCompatibility(projectData, importOptions)
            if (!compatibilityResult.success) {
                return {
                    success: false,
                    error: compatibilityResult.error,
                    warnings,
                    stats: this.createEmptyStats()
                }
            }

            // تطبيق الترحيل إذا كان مطلوباً
            if (compatibilityResult.needsMigration) {
                const migrationResult = await this.migrateProject(projectData, importOptions)
                if (!migrationResult.success) {
                    return {
                        success: false,
                        error: `فشل في ترحيل المشروع: ${migrationResult.error}`,
                        warnings,
                        stats: this.createEmptyStats()
                    }
                }
                projectData = migrationResult.migratedData!
                warnings.push(...migrationResult.changes)
            }

            // التحقق من checksum
            if (importOptions.validateChecksum) {
                const checksumValid = await this.validateChecksum(projectData, jsonString)
                if (!checksumValid) {
                    if (importOptions.migrationMode === 'strict') {
                        return {
                            success: false,
                            error: 'فشل في التحقق من سلامة البيانات: checksum غير صحيح',
                            warnings,
                            stats: this.createEmptyStats()
                        }
                    } else {
                        warnings.push('تحذير: checksum غير صحيح، قد تكون البيانات تالفة')
                    }
                }
            }

            // التحقق من صحة بيانات المشروع
            const validationResult = this.validateProjectData(projectData.project)
            if (!validationResult.isValid) {
                if (importOptions.migrationMode === 'strict') {
                    return {
                        success: false,
                        error: `بيانات المشروع غير صحيحة: ${validationResult.errors.join(', ')}`,
                        warnings,
                        stats: this.createEmptyStats()
                    }
                } else {
                    warnings.push(...validationResult.errors.map(error => `تحذير: ${error}`))
                }
            }

            // استعادة الأصول
            let assetsRestored = 0
            if (importOptions.restoreAssets && projectData.assets) {
                assetsRestored = await this.restoreAssets(projectData.assets)
            }

            // استعادة النسيج
            let texturesRestored = 0
            if (importOptions.restoreTextures && projectData.textures) {
                texturesRestored = await this.restoreTextures(projectData.textures)
            }

            // إنشاء نسخة احتياطية إذا كان مطلوباً
            if (importOptions.createBackup) {
                await this.createBackup(projectData.project)
            }

            const stats = {
                originalSize: compressedData.length,
                decompressedSize: decompressedData.length,
                assetsRestored,
                texturesRestored,
                elementsCount: projectData.project.elements.length,
                migrationApplied: compatibilityResult.needsMigration || false
            }

            return {
                success: true,
                project: projectData.project,
                warnings,
                stats,
                metadata: {
                    exportedAt: projectData.exportedAt,
                    version: projectData.version,
                    schema: projectData.schema,
                    exportOptions: projectData.exportOptions
                }
            }

        } catch (error) {
            return {
                success: false,
                error: `خطأ في الاستيراد: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                warnings,
                stats: this.createEmptyStats()
            }
        }
    }

    /**
     * إلغاء ضغط البيانات
     */
    private decompressData(compressedData: Uint8Array): Uint8Array {
        try {
            // محاولة إلغاء الضغط كـ gzip أولاً
            return pako.ungzip(compressedData)
        } catch (gzipError) {
            try {
                // محاولة إلغاء الضغط كـ deflate
                return pako.inflate(compressedData)
            } catch (deflateError) {
                throw new Error('فشل في إلغاء ضغط البيانات: تنسيق ضغط غير مدعوم')
            }
        }
    }

    /**
     * التحقق من التوافق والحاجة للترحيل
     */
    private checkCompatibility(
        projectData: BForgeProjectData,
        options: BForgeImportOptions
    ): { success: boolean; error?: string; needsMigration?: boolean } {
        // التحقق من وجود البيانات الأساسية
        if (!projectData.version || !projectData.schema) {
            return {
                success: false,
                error: 'بيانات الإصدار أو المخطط مفقودة'
            }
        }

        // التحقق من دعم الإصدار
        const versionSupported = BForgeImporter.SUPPORTED_VERSIONS.includes(projectData.version)
        const schemaSupported = BForgeImporter.SUPPORTED_SCHEMAS.includes(projectData.schema)

        if (!versionSupported || !schemaSupported) {
            if (options.migrationMode === 'strict') {
                return {
                    success: false,
                    error: `إصدار غير مدعوم: ${projectData.version} (مخطط: ${projectData.schema})`
                }
            } else if (options.migrationMode === 'force') {
                return {
                    success: true,
                    needsMigration: true
                }
            } else {
                // وضع compatible - محاولة الترحيل التلقائي
                return {
                    success: true,
                    needsMigration: !versionSupported || !schemaSupported
                }
            }
        }

        return { success: true, needsMigration: false }
    }

    /**
     * ترحيل المشروع للإصدار الحالي
     */
    private async migrateProject(
        projectData: BForgeProjectData,
        options: BForgeImportOptions
    ): Promise<MigrationResult> {
        const changes: string[] = []

        try {
            // نسخ البيانات لتجنب تعديل الأصل
            const migratedData: BForgeProjectData = JSON.parse(JSON.stringify(projectData))

            // ترحيل الإصدار
            if (!BForgeImporter.SUPPORTED_VERSIONS.includes(projectData.version)) {
                migratedData.version = BForgeImporter.SUPPORTED_VERSIONS[0]
                changes.push(`تم ترحيل الإصدار من ${projectData.version} إلى ${migratedData.version}`)
            }

            // ترحيل المخطط
            if (!BForgeImporter.SUPPORTED_SCHEMAS.includes(projectData.schema)) {
                migratedData.schema = BForgeImporter.SUPPORTED_SCHEMAS[0]
                changes.push(`تم ترحيل المخطط من ${projectData.schema} إلى ${migratedData.schema}`)
            }

            // ترحيل بيانات المشروع
            const projectMigrationResult = this.migrateProjectData(migratedData.project)
            if (projectMigrationResult.changes.length > 0) {
                migratedData.project = projectMigrationResult.project
                changes.push(...projectMigrationResult.changes)
            }

            // إعادة حساب checksum بعد الترحيل
            const jsonString = JSON.stringify({
                ...migratedData,
                checksum: '' // إزالة checksum القديم مؤقتاً
            })
            migratedData.checksum = await this.calculateChecksum(jsonString)
            changes.push('تم إعادة حساب checksum بعد الترحيل')

            return {
                success: true,
                migratedData,
                changes
            }

        } catch (error) {
            return {
                success: false,
                error: `فشل في الترحيل: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                changes
            }
        }
    }

    /**
     * ترحيل بيانات المشروع
     */
    private migrateProjectData(project: Project): { project: Project; changes: string[] } {
        const changes: string[] = []
        const migratedProject = { ...project }

        // إضافة الحقول المفقودة مع القيم الافتراضية
        if (!migratedProject.metadata) {
            migratedProject.metadata = {
                author: undefined,
                tags: [],
                thumbnail: undefined,
                exportSettings: {
                    format: 'glb',
                    quality: 'medium',
                    includeTextures: true,
                    generateCollisionMesh: false,
                    optimizeForGames: true
                }
            }
            changes.push('تم إضافة البيانات الوصفية الافتراضية')
        }

        // ترحيل العناصر
        migratedProject.elements = migratedProject.elements.map(element => {
            const migratedElement = { ...element }

            // إضافة الحقول المفقودة
            if (typeof migratedElement.visible === 'undefined') {
                migratedElement.visible = true
                changes.push(`تم إضافة خاصية الرؤية للعنصر ${element.id}`)
            }

            if (typeof migratedElement.locked === 'undefined') {
                migratedElement.locked = false
                changes.push(`تم إضافة خاصية القفل للعنصر ${element.id}`)
            }

            if (!migratedElement.metadata) {
                migratedElement.metadata = {}
                changes.push(`تم إضافة البيانات الوصفية للعنصر ${element.id}`)
            }

            return migratedElement
        })

        return { project: migratedProject, changes }
    }

    /**
     * التحقق من صحة checksum
     */
    private async validateChecksum(projectData: BForgeProjectData, originalJson: string): Promise<boolean> {
        try {
            // إنشاء نسخة من البيانات بدون checksum لإعادة الحساب
            const dataWithoutChecksum = { ...projectData, checksum: '' }
            const jsonWithoutChecksum = JSON.stringify(dataWithoutChecksum)

            const calculatedChecksum = await this.calculateChecksum(jsonWithoutChecksum)
            return calculatedChecksum === projectData.checksum
        } catch (error) {
            console.error('خطأ في التحقق من checksum:', error)
            return false
        }
    }

    /**
     * التحقق من صحة بيانات المشروع
     */
    private validateProjectData(project: Project): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // التحقق من البيانات الأساسية
        if (!project.id) errors.push('معرف المشروع مفقود')
        if (!project.name) errors.push('اسم المشروع مفقود')
        if (!project.version) errors.push('إصدار المشروع مفقود')

        // التحقق من العناصر
        if (!Array.isArray(project.elements)) {
            errors.push('قائمة العناصر ليست مصفوفة')
        } else {
            project.elements.forEach((element, index) => {
                if (!element.id) errors.push(`العنصر ${index}: معرف مفقود`)
                if (!element.type) errors.push(`العنصر ${index}: نوع مفقود`)
                if (!element.position) errors.push(`العنصر ${index}: موضع مفقود`)
            })
        }

        // التحقق من المواد
        if (!Array.isArray(project.materials)) {
            errors.push('قائمة المواد ليست مصفوفة')
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * استعادة الأصول من البيانات المضمنة
     */
    private async restoreAssets(assets: { [key: string]: string }): Promise<number> {
        let restoredCount = 0

        for (const [assetId, assetData] of Object.entries(assets)) {
            try {
                await this.saveAssetData(assetId, assetData)
                restoredCount++
            } catch (error) {
                console.warn(`فشل في استعادة الأصل ${assetId}:`, error)
            }
        }

        return restoredCount
    }

    /**
     * استعادة النسيج من البيانات المضمنة
     */
    private async restoreTextures(textures: { [key: string]: string }): Promise<number> {
        let restoredCount = 0

        for (const [textureUrl, textureData] of Object.entries(textures)) {
            try {
                await this.saveTextureData(textureUrl, textureData)
                restoredCount++
            } catch (error) {
                console.warn(`فشل في استعادة النسيج ${textureUrl}:`, error)
            }
        }

        return restoredCount
    }

    /**
     * حفظ بيانات الأصل المستعادة
     */
    private async saveAssetData(assetId: string, assetData: string): Promise<void> {
        // هذه الدالة ستحتاج إلى تنفيذ حسب نظام إدارة الأصول
        // في الوقت الحالي نتجاهلها
    }

    /**
     * حفظ بيانات النسيج المستعادة
     */
    private async saveTextureData(textureUrl: string, textureData: string): Promise<void> {
        // هذه الدالة ستحتاج إلى تنفيذ حسب نظام إدارة النسيج
        // في الوقت الحالي نتجاهلها
    }

    /**
     * إنشاء نسخة احتياطية من المشروع
     */
    private async createBackup(project: Project): Promise<void> {
        // هذه الدالة ستحتاج إلى تنفيذ حسب نظام النسخ الاحتياطي
        // في الوقت الحالي نتجاهلها
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
            decompressedSize: 0,
            assetsRestored: 0,
            texturesRestored: 0,
            elementsCount: 0,
            migrationApplied: false
        }
    }
}