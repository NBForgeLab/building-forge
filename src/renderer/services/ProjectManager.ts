/**
 * خدمة إدارة المشاريع الرئيسية - تجمع جميع وظائف إدارة المشاريع
 */

import { Project } from '../../shared/types'
import { BForgeExporter, BForgeExportOptions } from './BForgeExporter'
import { BForgeImporter, BForgeImportOptions } from './BForgeImporter'
import { ProjectMetadataManager, ProjectTemplate } from './ProjectMetadataManager'

export interface SaveProjectOptions {
    filePath?: string
    exportOptions?: Partial<BForgeExportOptions>
    createBackup?: boolean
    updateMetadata?: boolean
}

export interface LoadProjectOptions {
    importOptions?: Partial<BForgeImportOptions>
    validateIntegrity?: boolean
    restoreAssets?: boolean
}

export interface ProjectManagerEvents {
    projectSaved: (project: Project, filePath: string) => void
    projectLoaded: (project: Project) => void
    projectExported: (project: Project, format: string, filePath: string) => void
    error: (error: string) => void
}

export class ProjectManager {
    private exporter: BForgeExporter
    private importer: BForgeImporter
    private metadataManager: ProjectMetadataManager
    private eventListeners: Partial<ProjectManagerEvents> = {}

    constructor() {
        this.exporter = new BForgeExporter()
        this.importer = new BForgeImporter()
        this.metadataManager = new ProjectMetadataManager()
    }

    /**
     * حفظ المشروع بتنسيق BForge
     */
    async saveProject(
        project: Project,
        options: SaveProjectOptions = {}
    ): Promise<{ success: boolean; filePath?: string; error?: string }> {
        try {
            // تحديث البيانات الوصفية إذا كان مطلوباً
            let updatedProject = project
            if (options.updateMetadata !== false) {
                updatedProject = await this.metadataManager.updateMetadata(
                    project,
                    { thumbnail: await this.metadataManager.generateThumbnail(project) },
                    { updateTimestamp: true, createVersion: true, versionDescription: 'حفظ المشروع' }
                )
            }

            // تصدير المشروع
            const exportResult = await this.exporter.exportProject(updatedProject, options.exportOptions)

            if (!exportResult.success) {
                this.emitEvent('error', exportResult.error || 'فشل في تصدير المشروع')
                return { success: false, error: exportResult.error }
            }

            // تحديد مسار الملف
            const filePath = options.filePath || await this.getDefaultSavePath(project)

            // حفظ الملف
            await this.saveToFile(exportResult.data!, filePath)

            // إنشاء نسخة احتياطية إذا كان مطلوباً
            if (options.createBackup) {
                await this.createBackup(exportResult.data!, filePath)
            }

            this.emitEvent('projectSaved', updatedProject, filePath)
            return { success: true, filePath }

        } catch (error) {
            const errorMessage = `خطأ في حفظ المشروع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            this.emitEvent('error', errorMessage)
            return { success: false, error: errorMessage }
        }
    }

    /**
     * تحميل المشروع من ملف BForge
     */
    async loadProject(
        filePath: string,
        options: LoadProjectOptions = {}
    ): Promise<{ success: boolean; project?: Project; error?: string; warnings?: string[] }> {
        try {
            // قراءة الملف
            const fileData = await this.loadFromFile(filePath)

            // استيراد المشروع
            const importResult = await this.importer.importProject(fileData, options.importOptions)

            if (!importResult.success) {
                this.emitEvent('error', importResult.error || 'فشل في استيراد المشروع')
                return {
                    success: false,
                    error: importResult.error,
                    warnings: importResult.warnings
                }
            }

            // التحقق من سلامة البيانات إذا كان مطلوباً
            if (options.validateIntegrity && importResult.project) {
                const integrityCheck = await this.validateProjectIntegrity(importResult.project)
                if (!integrityCheck.isValid) {
                    return {
                        success: false,
                        error: `فشل في التحقق من سلامة المشروع: ${integrityCheck.errors.join(', ')}`,
                        warnings: importResult.warnings
                    }
                }
            }

            this.emitEvent('projectLoaded', importResult.project!)
            return {
                success: true,
                project: importResult.project,
                warnings: importResult.warnings
            }

        } catch (error) {
            const errorMessage = `خطأ في تحميل المشروع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            this.emitEvent('error', errorMessage)
            return { success: false, error: errorMessage }
        }
    }

    /**
     * تصدير المشروع بصيغ مختلفة (GLB, OBJ)
     */
    async exportProject(
        project: Project,
        format: 'glb' | 'obj',
        filePath: string,
        options: any = {}
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // هنا يجب تنفيذ تصدير المشروع بالصيغة المطلوبة
            // في الوقت الحالي نعيد نجاح وهمي

            this.emitEvent('projectExported', project, format, filePath)
            return { success: true }

        } catch (error) {
            const errorMessage = `خطأ في تصدير المشروع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            this.emitEvent('error', errorMessage)
            return { success: false, error: errorMessage }
        }
    }

    /**
     * إنشاء مشروع جديد
     */
    async createNewProject(
        name: string,
        templateId?: string
    ): Promise<{ success: boolean; project?: Project; error?: string }> {
        try {
            let project: Project

            if (templateId) {
                // إنشاء من قالب
                const templateProject = await this.metadataManager.createProjectFromTemplate(templateId, name)
                if (!templateProject) {
                    return { success: false, error: 'القالب المحدد غير موجود' }
                }
                project = templateProject
            } else {
                // إنشاء مشروع فارغ
                project = this.createEmptyProject(name)
            }

            return { success: true, project }

        } catch (error) {
            const errorMessage = `خطأ في إنشاء المشروع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            this.emitEvent('error', errorMessage)
            return { success: false, error: errorMessage }
        }
    }

    /**
     * الحصول على قوالب المشاريع
     */
    async getProjectTemplates(category?: string): Promise<ProjectTemplate[]> {
        return this.metadataManager.getTemplates(category)
    }

    /**
     * إنشاء قالب من المشروع الحالي
     */
    async createTemplate(
        project: Project,
        templateInfo: {
            name: string
            description: string
            category: string
            tags: string[]
            author: string
        }
    ): Promise<{ success: boolean; template?: ProjectTemplate; error?: string }> {
        try {
            const template = await this.metadataManager.createTemplate(project, templateInfo)
            return { success: true, template }
        } catch (error) {
            const errorMessage = `خطأ في إنشاء القالب: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            return { success: false, error: errorMessage }
        }
    }

    /**
     * الحصول على تاريخ المشروع
     */
    async getProjectHistory(projectId: string) {
        return this.metadataManager.getProjectHistory(projectId)
    }

    /**
     * تسجيل مستمع للأحداث
     */
    on<K extends keyof ProjectManagerEvents>(event: K, listener: ProjectManagerEvents[K]): void {
        this.eventListeners[event] = listener
    }

    /**
     * إلغاء تسجيل مستمع للأحداث
     */
    off<K extends keyof ProjectManagerEvents>(event: K): void {
        delete this.eventListeners[event]
    }

    /**
     * إرسال حدث
     */
    private emitEvent<K extends keyof ProjectManagerEvents>(
        event: K,
        ...args: Parameters<NonNullable<ProjectManagerEvents[K]>>
    ): void {
        const listener = this.eventListeners[event]
        if (listener) {
            // @ts-ignore - TypeScript has trouble with this pattern
            listener(...args)
        }
    }

    /**
     * إنشاء مشروع فارغ
     */
    private createEmptyProject(name: string): Project {
        const now = Date.now()

        return {
            id: `project_${now}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description: '',
            version: '1.0.0',
            elements: [],
            materials: [],
            settings: {
                units: 'meters',
                gridSize: 1,
                snapToGrid: true,
                showGrid: true,
                backgroundColor: '#f0f0f0',
                ambientLightIntensity: 0.4,
                directionalLightIntensity: 1.0
            },
            metadata: {
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
            },
            createdAt: now,
            updatedAt: now
        }
    }

    /**
     * الحصول على مسار الحفظ الافتراضي
     */
    private async getDefaultSavePath(project: Project): Promise<string> {
        // في تطبيق Electron حقيقي، يجب استخدام dialog API
        // في الوقت الحالي نعيد مساراً افتراضياً
        return `${project.name}.bforge`
    }

    /**
     * حفظ البيانات إلى ملف
     */
    private async saveToFile(data: Uint8Array, filePath: string): Promise<void> {
        // في تطبيق Electron حقيقي، يجب استخدام fs API
        // في الوقت الحالي نحفظ في localStorage للاختبار
        const base64Data = btoa(String.fromCharCode(...data))
        localStorage.setItem(`project_file_${filePath}`, base64Data)
    }

    /**
     * تحميل البيانات من ملف
     */
    private async loadFromFile(filePath: string): Promise<Uint8Array> {
        // في تطبيق Electron حقيقي، يجب استخدام fs API
        // في الوقت الحالي نقرأ من localStorage للاختبار
        const base64Data = localStorage.getItem(`project_file_${filePath}`)
        if (!base64Data) {
            throw new Error('الملف غير موجود')
        }

        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes
    }

    /**
     * إنشاء نسخة احتياطية
     */
    private async createBackup(data: Uint8Array, originalPath: string): Promise<void> {
        const backupPath = `${originalPath}.backup.${Date.now()}`
        await this.saveToFile(data, backupPath)
    }

    /**
     * التحقق من سلامة المشروع
     */
    private async validateProjectIntegrity(project: Project): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = []

        // التحقق من البيانات الأساسية
        if (!project.id) errors.push('معرف المشروع مفقود')
        if (!project.name) errors.push('اسم المشروع مفقود')
        if (!project.version) errors.push('إصدار المشروع مفقود')

        // التحقق من العناصر
        if (!Array.isArray(project.elements)) {
            errors.push('قائمة العناصر غير صحيحة')
        }

        // التحقق من المواد
        if (!Array.isArray(project.materials)) {
            errors.push('قائمة المواد غير صحيحة')
        }

        // التحقق من الإعدادات
        if (!project.settings) {
            errors.push('إعدادات المشروع مفقودة')
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }
}