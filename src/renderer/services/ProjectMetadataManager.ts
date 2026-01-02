/**
 * خدمة إدارة البيانات الوصفية للمشاريع مع تتبع الإصدارات والتغييرات
 */

import { Project, ProjectMetadata } from '../../shared/types'

export interface ProjectVersion {
    id: string
    version: string
    timestamp: number
    author: string
    description: string
    changes: string[]
    checksum: string
}

export interface ProjectHistory {
    projectId: string
    versions: ProjectVersion[]
    currentVersion: string
    createdAt: number
    lastModified: number
}

export interface ProjectTemplate {
    id: string
    name: string
    description: string
    category: string
    thumbnail: string
    project: Project
    tags: string[]
    author: string
    createdAt: number
    downloads: number
    rating: number
}

export interface MetadataUpdateOptions {
    updateTimestamp: boolean
    createVersion: boolean
    versionDescription?: string
    author?: string
}

export class ProjectMetadataManager {
    private static readonly METADATA_VERSION = '1.0.0'
    private static readonly MAX_VERSIONS = 50 // الحد الأقصى لعدد الإصدارات المحفوظة

    /**
     * تحديث البيانات الوصفية للمشروع
     */
    async updateMetadata(
        project: Project,
        updates: Partial<ProjectMetadata>,
        options: Partial<MetadataUpdateOptions> = {}
    ): Promise<Project> {
        const updateOptions: MetadataUpdateOptions = {
            updateTimestamp: true,
            createVersion: false,
            ...options
        }

        const updatedProject = { ...project }

        // تحديث البيانات الوصفية
        updatedProject.metadata = {
            ...project.metadata,
            ...updates
        }

        // تحديث الطابع الزمني
        if (updateOptions.updateTimestamp) {
            updatedProject.updatedAt = Date.now()
        }

        // إنشاء إصدار جديد إذا كان مطلوباً
        if (updateOptions.createVersion) {
            await this.createVersion(
                updatedProject,
                updateOptions.versionDescription || 'تحديث البيانات الوصفية',
                updateOptions.author || 'مجهول'
            )
        }

        return updatedProject
    }

    /**
     * إنشاء إصدار جديد من المشروع
     */
    async createVersion(
        project: Project,
        description: string,
        author: string,
        changes: string[] = []
    ): Promise<ProjectVersion> {
        const version: ProjectVersion = {
            id: this.generateVersionId(),
            version: this.generateVersionNumber(project.id),
            timestamp: Date.now(),
            author,
            description,
            changes,
            checksum: await this.calculateProjectChecksum(project)
        }

        // حفظ الإصدار في التاريخ
        await this.saveVersionToHistory(project.id, version)

        return version
    }

    /**
     * الحصول على تاريخ المشروع
     */
    async getProjectHistory(projectId: string): Promise<ProjectHistory | null> {
        try {
            const historyData = localStorage.getItem(`project_history_${projectId}`)
            if (!historyData) {
                return null
            }

            return JSON.parse(historyData) as ProjectHistory
        } catch (error) {
            console.error('خطأ في قراءة تاريخ المشروع:', error)
            return null
        }
    }

    /**
     * إنشاء صورة مصغرة للمشروع
     */
    async generateThumbnail(project: Project, canvas?: HTMLCanvasElement): Promise<string> {
        if (!canvas) {
            // إنشاء canvas مؤقت للعرض
            canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 256
        }

        try {
            // هنا يجب تنفيذ عرض المشروع في الـ canvas
            // في الوقت الحالي نعيد صورة افتراضية
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                throw new Error('فشل في الحصول على سياق الرسم')
            }

            // رسم خلفية بسيطة
            ctx.fillStyle = '#f0f0f0'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // رسم نص بسيط
            ctx.fillStyle = '#333'
            ctx.font = '16px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(project.name, canvas.width / 2, canvas.height / 2)

            // تحويل إلى base64
            return canvas.toDataURL('image/png')
        } catch (error) {
            console.error('خطأ في إنشاء الصورة المصغرة:', error)
            // إرجاع صورة افتراضية
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        }
    }

    /**
     * إنشاء قالب من المشروع
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
    ): Promise<ProjectTemplate> {
        const thumbnail = await this.generateThumbnail(project)

        const template: ProjectTemplate = {
            id: this.generateTemplateId(),
            name: templateInfo.name,
            description: templateInfo.description,
            category: templateInfo.category,
            thumbnail,
            project: this.sanitizeProjectForTemplate(project),
            tags: templateInfo.tags,
            author: templateInfo.author,
            createdAt: Date.now(),
            downloads: 0,
            rating: 0
        }

        // حفظ القالب
        await this.saveTemplate(template)

        return template
    }

    /**
     * الحصول على جميع القوالب
     */
    async getTemplates(category?: string): Promise<ProjectTemplate[]> {
        try {
            const templatesData = localStorage.getItem('project_templates')
            if (!templatesData) {
                return []
            }

            const templates = JSON.parse(templatesData) as ProjectTemplate[]

            if (category) {
                return templates.filter(template => template.category === category)
            }

            return templates
        } catch (error) {
            console.error('خطأ في قراءة القوالب:', error)
            return []
        }
    }

    /**
     * إنشاء مشروع من قالب
     */
    async createProjectFromTemplate(templateId: string, projectName: string): Promise<Project | null> {
        try {
            const templates = await this.getTemplates()
            const template = templates.find(t => t.id === templateId)

            if (!template) {
                return null
            }

            // إنشاء مشروع جديد من القالب
            const newProject: Project = {
                ...template.project,
                id: this.generateProjectId(),
                name: projectName,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                metadata: {
                    ...template.project.metadata,
                    author: undefined, // سيتم تعيينه من قبل المستخدم الحالي
                    tags: [...template.tags]
                }
            }

            // تحديث معرفات العناصر لتجنب التضارب
            newProject.elements = newProject.elements.map(element => ({
                ...element,
                id: this.generateElementId(),
                createdAt: Date.now(),
                updatedAt: Date.now()
            }))

            // تحديث معرفات المواد
            newProject.materials = newProject.materials.map(material => ({
                ...material,
                id: this.generateMaterialId(),
                createdAt: Date.now(),
                updatedAt: Date.now()
            }))

            // تحديث إحصائيات القالب
            template.downloads++
            await this.updateTemplate(template)

            return newProject
        } catch (error) {
            console.error('خطأ في إنشاء مشروع من القالب:', error)
            return null
        }
    }

    /**
     * تتبع التغييرات في المشروع
     */
    async trackChanges(
        oldProject: Project,
        newProject: Project
    ): Promise<string[]> {
        const changes: string[] = []

        // تتبع تغييرات البيانات الأساسية
        if (oldProject.name !== newProject.name) {
            changes.push(`تم تغيير اسم المشروع من "${oldProject.name}" إلى "${newProject.name}"`)
        }

        if (oldProject.description !== newProject.description) {
            changes.push('تم تحديث وصف المشروع')
        }

        // تتبع تغييرات العناصر
        const elementChanges = this.trackElementChanges(oldProject.elements, newProject.elements)
        changes.push(...elementChanges)

        // تتبع تغييرات المواد
        const materialChanges = this.trackMaterialChanges(oldProject.materials, newProject.materials)
        changes.push(...materialChanges)

        // تتبع تغييرات الإعدادات
        const settingsChanges = this.trackSettingsChanges(oldProject.settings, newProject.settings)
        changes.push(...settingsChanges)

        return changes
    }

    /**
     * حفظ الإصدار في التاريخ
     */
    private async saveVersionToHistory(projectId: string, version: ProjectVersion): Promise<void> {
        let history = await this.getProjectHistory(projectId)

        if (!history) {
            history = {
                projectId,
                versions: [],
                currentVersion: version.version,
                createdAt: Date.now(),
                lastModified: Date.now()
            }
        }

        // إضافة الإصدار الجديد
        history.versions.push(version)
        history.currentVersion = version.version
        history.lastModified = Date.now()

        // الحفاظ على الحد الأقصى لعدد الإصدارات
        if (history.versions.length > ProjectMetadataManager.MAX_VERSIONS) {
            history.versions = history.versions.slice(-ProjectMetadataManager.MAX_VERSIONS)
        }

        // حفظ التاريخ
        localStorage.setItem(`project_history_${projectId}`, JSON.stringify(history))
    }

    /**
     * حفظ القالب
     */
    private async saveTemplate(template: ProjectTemplate): Promise<void> {
        const templates = await this.getTemplates()
        templates.push(template)
        localStorage.setItem('project_templates', JSON.stringify(templates))
    }

    /**
     * تحديث القالب
     */
    private async updateTemplate(template: ProjectTemplate): Promise<void> {
        const templates = await this.getTemplates()
        const index = templates.findIndex(t => t.id === template.id)

        if (index !== -1) {
            templates[index] = template
            localStorage.setItem('project_templates', JSON.stringify(templates))
        }
    }

    /**
     * تنظيف المشروع للقالب
     */
    private sanitizeProjectForTemplate(project: Project): Project {
        return {
            ...project,
            id: '', // سيتم إنشاء معرف جديد
            elements: project.elements.map(element => ({
                ...element,
                id: '', // سيتم إنشاء معرف جديد
                selected: false,
                locked: false
            })),
            materials: project.materials.map(material => ({
                ...material,
                id: '' // سيتم إنشاء معرف جديد
            }))
        }
    }

    /**
     * تتبع تغييرات العناصر
     */
    private trackElementChanges(oldElements: any[], newElements: any[]): string[] {
        const changes: string[] = []

        if (newElements.length > oldElements.length) {
            changes.push(`تم إضافة ${newElements.length - oldElements.length} عنصر جديد`)
        } else if (newElements.length < oldElements.length) {
            changes.push(`تم حذف ${oldElements.length - newElements.length} عنصر`)
        }

        return changes
    }

    /**
     * تتبع تغييرات المواد
     */
    private trackMaterialChanges(oldMaterials: any[], newMaterials: any[]): string[] {
        const changes: string[] = []

        if (newMaterials.length > oldMaterials.length) {
            changes.push(`تم إضافة ${newMaterials.length - oldMaterials.length} مادة جديدة`)
        } else if (newMaterials.length < oldMaterials.length) {
            changes.push(`تم حذف ${oldMaterials.length - newMaterials.length} مادة`)
        }

        return changes
    }

    /**
     * تتبع تغييرات الإعدادات
     */
    private trackSettingsChanges(oldSettings: any, newSettings: any): string[] {
        const changes: string[] = []

        if (oldSettings.units !== newSettings.units) {
            changes.push(`تم تغيير وحدة القياس إلى ${newSettings.units}`)
        }

        if (oldSettings.gridSize !== newSettings.gridSize) {
            changes.push(`تم تغيير حجم الشبكة إلى ${newSettings.gridSize}`)
        }

        return changes
    }

    /**
     * حساب checksum للمشروع
     */
    private async calculateProjectChecksum(project: Project): Promise<string> {
        const projectString = JSON.stringify(project, null, 0)
        const encoder = new TextEncoder()
        const data = encoder.encode(projectString)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    /**
     * إنشاء معرف إصدار جديد
     */
    private generateVersionId(): string {
        return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * إنشاء رقم إصدار جديد
     */
    private generateVersionNumber(projectId: string): string {
        // في تنفيذ حقيقي، يجب الحصول على آخر رقم إصدار وزيادته
        const timestamp = Date.now()
        return `1.0.${timestamp}`
    }

    /**
     * إنشاء معرف قالب جديد
     */
    private generateTemplateId(): string {
        return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * إنشاء معرف مشروع جديد
     */
    private generateProjectId(): string {
        return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * إنشاء معرف عنصر جديد
     */
    private generateElementId(): string {
        return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * إنشاء معرف مادة جديد
     */
    private generateMaterialId(): string {
        return `material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
}