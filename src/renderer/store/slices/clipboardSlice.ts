/**
 * Clipboard slice لإدارة عمليات النسخ واللصق
 * Clipboard slice for managing copy and paste operations
 */

import { StateCreator } from 'zustand'
import { ClipboardOptions, clipboardService } from '../../services/ClipboardService'
import { BuildingElement, ClipboardSlice, Material, StoreState } from '../types'
import { generateId } from '../utils'

export const createClipboardSlice: StateCreator<
    StoreState,
    [],
    [],
    ClipboardSlice
> = (set, get) => ({
    clipboardState: {
        hasContent: false,
        contentType: null,
        contentStats: null,
        history: [],
        currentIndex: -1
    },

    // Copy operations
    copySelectedElements: (options?: ClipboardOptions) => {
        const { selectedElements } = get().selectionState
        const elements = selectedElements
            .map(id => get().getElementById(id))
            .filter(Boolean) as BuildingElement[]

        if (elements.length === 0) {
            throw new Error('لا توجد عناصر محددة للنسخ')
        }

        // جمع المواد المرتبطة بالعناصر
        const materials: Material[] = []
        if (options?.includeMaterials) {
            elements.forEach(element => {
                if (element.materialId) {
                    const material = get().getMaterialById(element.materialId)
                    if (material && !materials.find(m => m.id === material.id)) {
                        materials.push(material)
                    }
                }
            })
        }

        const entryId = clipboardService.copyElements(elements, materials, options)

        // تحديث حالة الحافظة
        get().updateClipboardState()

        // إضافة إدخال في التاريخ
        get().addHistoryEntry(
            'clipboard:copy',
            `تم نسخ ${elements.length} عنصر`,
            { elementIds: selectedElements, entryId }
        )

        return entryId
    },

    copyElements: (elementIds: string[], options?: ClipboardOptions) => {
        const elements = elementIds
            .map(id => get().getElementById(id))
            .filter(Boolean) as BuildingElement[]

        if (elements.length === 0) {
            throw new Error('لا توجد عناصر صالحة للنسخ')
        }

        // جمع المواد المرتبطة
        const materials: Material[] = []
        if (options?.includeMaterials) {
            elements.forEach(element => {
                if (element.materialId) {
                    const material = get().getMaterialById(element.materialId)
                    if (material && !materials.find(m => m.id === material.id)) {
                        materials.push(material)
                    }
                }
            })
        }

        const entryId = clipboardService.copyElements(elements, materials, options)
        get().updateClipboardState()

        get().addHistoryEntry(
            'clipboard:copy',
            `تم نسخ ${elements.length} عنصر`,
            { elementIds, entryId }
        )

        return entryId
    },

    copyMaterials: (materialIds: string[]) => {
        const materials = materialIds
            .map(id => get().getMaterialById(id))
            .filter(Boolean) as Material[]

        if (materials.length === 0) {
            throw new Error('لا توجد مواد صالحة للنسخ')
        }

        const entryId = clipboardService.copyMaterials(materials)
        get().updateClipboardState()

        get().addHistoryEntry(
            'clipboard:copy-materials',
            `تم نسخ ${materials.length} مادة`,
            { materialIds, entryId }
        )

        return entryId
    },

    // Paste operations
    pasteElements: (options?: ClipboardOptions) => {
        const entry = clipboardService.paste(options)
        if (!entry || !entry.data.elements) {
            throw new Error('لا يوجد محتوى صالح للصق')
        }

        const pastedElementIds: string[] = []

        // لصق العناصر
        entry.data.elements.forEach(elementData => {
            const newElement: BuildingElement = {
                ...elementData,
                id: generateId(),
                name: `${elementData.name} - نسخة`,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            get().addElement(newElement)
            pastedElementIds.push(newElement.id)
        })

        // لصق المواد إذا كانت موجودة
        if (entry.data.materials && options?.includeMaterials) {
            entry.data.materials.forEach(materialData => {
                const existingMaterial = get().materials.find(m =>
                    m.name === materialData.name &&
                    JSON.stringify(m.properties) === JSON.stringify(materialData.properties)
                )

                if (!existingMaterial) {
                    const newMaterial: Material = {
                        ...materialData,
                        id: generateId(),
                        name: `${materialData.name} - نسخة`,
                        created: new Date().toISOString(),
                        modified: new Date().toISOString()
                    }

                    get().addMaterial(newMaterial)
                }
            })
        }

        // تحديد العناصر الملصقة
        get().selectElements(pastedElementIds)

        get().addHistoryEntry(
            'clipboard:paste',
            `تم لصق ${pastedElementIds.length} عنصر`,
            { pastedElementIds, entryId: entry.id }
        )

        return pastedElementIds
    },

    pasteMaterials: () => {
        const entry = clipboardService.paste()
        if (!entry || !entry.data.materials) {
            throw new Error('لا توجد مواد صالحة للصق')
        }

        const pastedMaterialIds: string[] = []

        entry.data.materials.forEach(materialData => {
            const newMaterial: Material = {
                ...materialData,
                id: generateId(),
                name: `${materialData.name} - نسخة`,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            get().addMaterial(newMaterial)
            pastedMaterialIds.push(newMaterial.id)
        })

        get().addHistoryEntry(
            'clipboard:paste-materials',
            `تم لصق ${pastedMaterialIds.length} مادة`,
            { pastedMaterialIds, entryId: entry.id }
        )

        return pastedMaterialIds
    },

    // Multi-paste operations
    multiPasteElements: (count: number, spacing: { x: number; y: number; z: number }) => {
        const entries = clipboardService.multiPaste(count, spacing)
        if (entries.length === 0) {
            throw new Error('فشل في اللصق المتعدد')
        }

        const allPastedIds: string[] = []

        entries.forEach(entry => {
            if (entry.data.elements) {
                entry.data.elements.forEach(elementData => {
                    const newElement: BuildingElement = {
                        ...elementData,
                        id: generateId(),
                        name: `${elementData.name} - نسخة`,
                        created: new Date().toISOString(),
                        modified: new Date().toISOString()
                    }

                    get().addElement(newElement)
                    allPastedIds.push(newElement.id)
                })
            }
        })

        get().selectElements(allPastedIds)

        get().addHistoryEntry(
            'clipboard:multi-paste',
            `تم اللصق المتعدد: ${allPastedIds.length} عنصر`,
            { pastedElementIds: allPastedIds, count, spacing }
        )

        return allPastedIds
    },

    // Smart operations
    smartCopy: (context: 'selection' | 'tool' | 'material-editor') => {
        const { selectedElements } = get().selectionState
        const elements = selectedElements
            .map(id => get().getElementById(id))
            .filter(Boolean) as BuildingElement[]

        const materials = get().materials.filter(material =>
            elements.some(element => element.materialId === material.id)
        )

        const entryId = clipboardService.smartCopy(elements, materials, context)
        get().updateClipboardState()

        get().addHistoryEntry(
            'clipboard:smart-copy',
            `نسخ ذكي: ${elements.length} عنصر`,
            { elementIds: selectedElements, context, entryId }
        )

        return entryId
    },

    smartPaste: (context: 'viewport' | 'material-editor', cursorPosition?: { x: number; y: number; z: number }) => {
        const entry = clipboardService.smartPaste(context, cursorPosition)
        if (!entry) {
            throw new Error('لا يوجد محتوى للصق الذكي')
        }

        if (context === 'material-editor' && entry.data.materials) {
            return get().pasteMaterials()
        } else if (entry.data.elements) {
            return get().pasteElements({ offsetPosition: cursorPosition })
        }

        throw new Error('نوع محتوى غير مدعوم للصق الذكي')
    },

    // Clipboard management
    updateClipboardState: () => {
        const hasContent = clipboardService.hasContent()
        const contentType = clipboardService.getContentType()
        const contentStats = clipboardService.getContentStats()
        const history = clipboardService.getHistory()

        set(state => ({
            clipboardState: {
                ...state.clipboardState,
                hasContent,
                contentType,
                contentStats,
                history,
                currentIndex: history.length > 0 ? 0 : -1
            }
        }))
    },

    navigateClipboardHistory: (direction: 'previous' | 'next') => {
        const entry = clipboardService.navigateHistory(direction)
        get().updateClipboardState()
        return entry
    },

    clearClipboard: () => {
        clipboardService.clear()
        get().updateClipboardState()

        get().addHistoryEntry(
            'clipboard:clear',
            'تم مسح الحافظة',
            {}
        )
    },

    removeClipboardEntry: (entryId: string) => {
        const success = clipboardService.removeEntry(entryId)
        if (success) {
            get().updateClipboardState()
        }
        return success
    },

    // Utility methods
    canPaste: () => {
        return clipboardService.hasContent()
    },

    getClipboardPreview: () => {
        const entry = clipboardService.getCurrentEntry()
        if (!entry) return null

        return {
            type: entry.type,
            elementCount: entry.data.elements?.length || 0,
            materialCount: entry.data.materials?.length || 0,
            description: entry.data.metadata?.description || '',
            timestamp: entry.timestamp
        }
    }
})