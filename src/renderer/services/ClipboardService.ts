/**
 * خدمة إدارة الحافظة المتقدمة
 * Advanced Clipboard Management Service
 */

import { BuildingElement, Material } from '../store/types'

export interface ClipboardEntry {
    id: string
    type: 'elements' | 'materials' | 'mixed'
    timestamp: number
    data: {
        elements?: BuildingElement[]
        materials?: Material[]
        metadata?: {
            source: string
            description: string
            elementCount: number
            materialCount: number
        }
    }
}

export interface ClipboardOptions {
    includeProperties?: boolean
    includeMaterials?: boolean
    preserveIds?: boolean
    offsetPosition?: { x: number; y: number; z: number }
}

export class ClipboardService {
    private static instance: ClipboardService
    private clipboard: ClipboardEntry[] = []
    private maxHistorySize = 10
    private currentIndex = -1

    private constructor() {
        this.loadFromStorage()
    }

    public static getInstance(): ClipboardService {
        if (!ClipboardService.instance) {
            ClipboardService.instance = new ClipboardService()
        }
        return ClipboardService.instance
    }

    /**
     * نسخ العناصر إلى الحافظة
     * Copy elements to clipboard
     */
    public copyElements(
        elements: BuildingElement[],
        materials: Material[] = [],
        options: ClipboardOptions = {}
    ): string {
        if (elements.length === 0) {
            throw new Error('لا توجد عناصر للنسخ')
        }

        const entryId = this.generateId()
        const timestamp = Date.now()

        // تحضير البيانات للنسخ
        const elementsData = elements.map(element => ({
            ...element,
            // إزالة المعرفات إذا لم يتم الحفاظ عليها
            id: options.preserveIds ? element.id : undefined,
            // تطبيق الإزاحة إذا تم تحديدها
            position: options.offsetPosition ? {
                x: element.position.x + options.offsetPosition.x,
                y: element.position.y + options.offsetPosition.y,
                z: element.position.z + options.offsetPosition.z
            } : element.position
        }))

        // تحضير المواد إذا تم تضمينها
        const materialsData = options.includeMaterials ? materials : []

        const entry: ClipboardEntry = {
            id: entryId,
            type: materialsData.length > 0 ? 'mixed' : 'elements',
            timestamp,
            data: {
                elements: elementsData,
                materials: materialsData,
                metadata: {
                    source: 'Building Forge',
                    description: `${elements.length} عنصر${materialsData.length > 0 ? ` و ${materialsData.length} مادة` : ''}`,
                    elementCount: elements.length,
                    materialCount: materialsData.length
                }
            }
        }

        // إضافة إلى الحافظة
        this.addToClipboard(entry)

        // نسخ إلى حافظة النظام إذا أمكن
        this.copyToSystemClipboard(entry)

        return entryId
    }

    /**
     * نسخ المواد إلى الحافظة
     * Copy materials to clipboard
     */
    public copyMaterials(materials: Material[]): string {
        if (materials.length === 0) {
            throw new Error('لا توجد مواد للنسخ')
        }

        const entryId = this.generateId()
        const timestamp = Date.now()

        const entry: ClipboardEntry = {
            id: entryId,
            type: 'materials',
            timestamp,
            data: {
                materials: materials.map(material => ({ ...material })),
                metadata: {
                    source: 'Building Forge',
                    description: `${materials.length} مادة`,
                    elementCount: 0,
                    materialCount: materials.length
                }
            }
        }

        this.addToClipboard(entry)
        this.copyToSystemClipboard(entry)

        return entryId
    }

    /**
     * لصق من الحافظة
     * Paste from clipboard
     */
    public paste(options: ClipboardOptions = {}): ClipboardEntry | null {
        const entry = this.getCurrentEntry()
        if (!entry) return null

        // إنشاء نسخة عميقة لتجنب تعديل البيانات الأصلية
        const clonedEntry: ClipboardEntry = {
            ...entry,
            data: {
                ...entry.data,
                elements: entry.data.elements ? entry.data.elements.map(element => ({ ...element })) : undefined,
                materials: entry.data.materials ? entry.data.materials.map(material => ({ ...material })) : undefined
            }
        }

        // تطبيق الخيارات على البيانات المنسوخة
        if (clonedEntry.data.elements && options.offsetPosition) {
            clonedEntry.data.elements = clonedEntry.data.elements.map(element => ({
                ...element,
                position: {
                    x: element.position.x + options.offsetPosition!.x,
                    y: element.position.y + options.offsetPosition!.y,
                    z: element.position.z + options.offsetPosition!.z
                }
            }))
        }

        return clonedEntry
    }

    /**
     * لصق متعدد - لصق نفس المحتوى عدة مرات
     * Multi-paste - paste same content multiple times
     */
    public multiPaste(count: number, spacing: { x: number; y: number; z: number }): ClipboardEntry[] {
        const entry = this.getCurrentEntry()
        if (!entry || !entry.data.elements) return []

        const results: ClipboardEntry[] = []

        for (let i = 0; i < count; i++) {
            const offset = {
                x: spacing.x * i,
                y: spacing.y * i,
                z: spacing.z * i
            }

            const pastedEntry = this.paste({ offsetPosition: offset })
            if (pastedEntry) {
                results.push(pastedEntry)
            }
        }

        return results
    }

    /**
     * الحصول على محتوى الحافظة الحالي
     * Get current clipboard content
     */
    public getCurrentEntry(): ClipboardEntry | null {
        if (this.currentIndex >= 0 && this.currentIndex < this.clipboard.length) {
            return { ...this.clipboard[this.currentIndex] }
        }
        return null
    }

    /**
     * الحصول على تاريخ الحافظة
     * Get clipboard history
     */
    public getHistory(): ClipboardEntry[] {
        return [...this.clipboard]
    }

    /**
     * التنقل في تاريخ الحافظة
     * Navigate clipboard history
     */
    public navigateHistory(direction: 'previous' | 'next'): ClipboardEntry | null {
        if (this.clipboard.length === 0) return null

        if (direction === 'previous' && this.currentIndex > 0) {
            this.currentIndex--
        } else if (direction === 'next' && this.currentIndex < this.clipboard.length - 1) {
            this.currentIndex++
        }

        return this.getCurrentEntry()
    }

    /**
     * مسح الحافظة
     * Clear clipboard
     */
    public clear(): void {
        this.clipboard = []
        this.currentIndex = -1
        this.saveToStorage()
    }

    /**
     * حذف إدخال محدد من التاريخ
     * Remove specific entry from history
     */
    public removeEntry(entryId: string): boolean {
        const index = this.clipboard.findIndex(entry => entry.id === entryId)
        if (index === -1) return false

        this.clipboard.splice(index, 1)

        // تعديل المؤشر الحالي
        if (this.currentIndex >= index) {
            this.currentIndex = Math.max(0, this.currentIndex - 1)
        }

        if (this.clipboard.length === 0) {
            this.currentIndex = -1
        }

        this.saveToStorage()
        return true
    }

    /**
     * التحقق من وجود محتوى في الحافظة
     * Check if clipboard has content
     */
    public hasContent(): boolean {
        return this.clipboard.length > 0
    }

    /**
     * التحقق من نوع المحتوى
     * Check content type
     */
    public getContentType(): 'elements' | 'materials' | 'mixed' | null {
        const entry = this.getCurrentEntry()
        return entry ? entry.type : null
    }

    /**
     * الحصول على إحصائيات المحتوى
     * Get content statistics
     */
    public getContentStats(): { elements: number; materials: number } | null {
        const entry = this.getCurrentEntry()
        if (!entry) return null

        return {
            elements: entry.data.elements?.length || 0,
            materials: entry.data.materials?.length || 0
        }
    }

    /**
     * نسخ ذكي - يحدد تلقائياً ما يجب نسخه بناءً على السياق
     * Smart copy - automatically determines what to copy based on context
     */
    public smartCopy(
        elements: BuildingElement[],
        materials: Material[],
        context: 'selection' | 'tool' | 'material-editor'
    ): string {
        const options: ClipboardOptions = {
            includeProperties: true,
            includeMaterials: context === 'selection' || context === 'material-editor',
            preserveIds: false,
            offsetPosition: context === 'selection' ? { x: 1, y: 0, z: 1 } : undefined
        }

        if (context === 'material-editor' && materials.length > 0) {
            return this.copyMaterials(materials)
        }

        return this.copyElements(elements, materials, options)
    }

    /**
     * لصق ذكي - يحدد تلقائياً كيفية اللصق بناءً على السياق
     * Smart paste - automatically determines how to paste based on context
     */
    public smartPaste(context: 'viewport' | 'material-editor', cursorPosition?: { x: number; y: number; z: number }): ClipboardEntry | null {
        const options: ClipboardOptions = {
            offsetPosition: cursorPosition || { x: 0, y: 0, z: 0 }
        }

        return this.paste(options)
    }

    // Private methods

    private addToClipboard(entry: ClipboardEntry): void {
        // إضافة في المقدمة
        this.clipboard.unshift(entry)

        // الحفاظ على الحد الأقصى للحجم
        if (this.clipboard.length > this.maxHistorySize) {
            this.clipboard = this.clipboard.slice(0, this.maxHistorySize)
        }

        this.currentIndex = 0
        this.saveToStorage()
    }

    private async copyToSystemClipboard(entry: ClipboardEntry): Promise<void> {
        try {
            // محاولة النسخ إلى حافظة النظام
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                const text = JSON.stringify(entry, null, 2)
                await navigator.clipboard.writeText(text)
            }
        } catch (error) {
            console.warn('فشل في النسخ إلى حافظة النظام:', error)
        }
    }

    private generateId(): string {
        return `clipboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem('buildingforge_clipboard', JSON.stringify({
                clipboard: this.clipboard,
                currentIndex: this.currentIndex
            }))
        } catch (error) {
            console.warn('فشل في حفظ الحافظة:', error)
        }
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem('buildingforge_clipboard')
            if (stored) {
                const data = JSON.parse(stored)
                this.clipboard = data.clipboard || []
                this.currentIndex = data.currentIndex || -1

                // تنظيف الإدخالات القديمة (أكثر من 24 ساعة)
                const now = Date.now()
                const maxAge = 24 * 60 * 60 * 1000 // 24 ساعة
                this.clipboard = this.clipboard.filter(entry =>
                    now - entry.timestamp < maxAge
                )

                if (this.clipboard.length === 0) {
                    this.currentIndex = -1
                } else if (this.currentIndex >= this.clipboard.length) {
                    this.currentIndex = this.clipboard.length - 1
                }
            }
        } catch (error) {
            console.warn('فشل في تحميل الحافظة:', error)
            this.clipboard = []
            this.currentIndex = -1
        }
    }
}

// Export singleton instance
export const clipboardService = ClipboardService.getInstance()
export default clipboardService