/**
 * Elements slice لإدارة عناصر المبنى
 * Elements slice for managing building elements
 */

import { StateCreator } from 'zustand'
import { BuildingElement, ElementsSlice, ElementType, StoreState } from '../types'
import { generateId } from '../utils'

export const createElementsSlice: StateCreator<
    StoreState,
    [],
    [],
    ElementsSlice
> = (set, get) => ({
    elements: [],

    addElement: (element: BuildingElement) => {
        const newElement: BuildingElement = {
            ...element,
            id: element.id || generateId(),
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }

        set(state => ({
            elements: [...state.elements, newElement]
        }))

        // Update project if exists
        const project = get().project
        if (project) {
            get().updateProject({
                elements: [...get().elements],
                modified: new Date().toISOString()
            })
        }

        // Add history entry
        get().addHistoryEntry(
            'element:add',
            `تم إضافة عنصر: ${newElement.name}`,
            { elementId: newElement.id, element: newElement }
        )
    },

    updateElement: (id: string, updates: Partial<BuildingElement>) => {
        const element = get().getElementById(id)
        if (!element) return

        const updatedElement: BuildingElement = {
            ...element,
            ...updates,
            modified: new Date().toISOString()
        }

        set(state => ({
            elements: state.elements.map(el =>
                el.id === id ? updatedElement : el
            )
        }))

        // Update project if exists
        const project = get().project
        if (project) {
            get().updateProject({
                elements: [...get().elements],
                modified: new Date().toISOString()
            })
        }

        // Add history entry
        get().addHistoryEntry(
            'element:update',
            `تم تحديث عنصر: ${element.name}`,
            { elementId: id, updates, previousState: element }
        )
    },

    removeElement: (id: string) => {
        const element = get().getElementById(id)
        if (!element) return

        set(state => ({
            elements: state.elements.filter(el => el.id !== id)
        }))

        // Remove from selection if selected
        const { selectedElements } = get().selectionState
        if (selectedElements.includes(id)) {
            get().deselectElement(id)
        }

        // Update project if exists
        const project = get().project
        if (project) {
            get().updateProject({
                elements: [...get().elements],
                modified: new Date().toISOString()
            })
        }

        // Add history entry
        get().addHistoryEntry(
            'element:remove',
            `تم حذف عنصر: ${element.name}`,
            { elementId: id, element }
        )
    },

    removeElements: (ids: string[]) => {
        const elementsToRemove = ids.map(id => get().getElementById(id)).filter(Boolean)
        if (elementsToRemove.length === 0) return

        set(state => ({
            elements: state.elements.filter(el => !ids.includes(el.id))
        }))

        // Remove from selection
        ids.forEach(id => {
            const { selectedElements } = get().selectionState
            if (selectedElements.includes(id)) {
                get().deselectElement(id)
            }
        })

        // Update project if exists
        const project = get().project
        if (project) {
            get().updateProject({
                elements: [...get().elements],
                modified: new Date().toISOString()
            })
        }

        // Add history entry
        get().addHistoryEntry(
            'elements:remove',
            `تم حذف ${elementsToRemove.length} عنصر`,
            { elementIds: ids, elements: elementsToRemove }
        )
    },

    duplicateElement: (id: string) => {
        const element = get().getElementById(id)
        if (!element) return

        const duplicatedElement: BuildingElement = {
            ...element,
            id: generateId(),
            name: `${element.name} - نسخة`,
            position: {
                x: element.position.x + 1,
                y: element.position.y,
                z: element.position.z + 1
            },
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }

        get().addElement(duplicatedElement)

        // Select the duplicated element
        get().selectElement(duplicatedElement.id)

        return duplicatedElement.id
    },

    duplicateElements: (ids: string[]) => {
        const elements = ids.map(id => get().getElementById(id)).filter(Boolean)
        if (elements.length === 0) return []

        const duplicatedIds: string[] = []

        elements.forEach(element => {
            const duplicatedElement: BuildingElement = {
                ...element,
                id: generateId(),
                name: `${element.name} - نسخة`,
                position: {
                    x: element.position.x + 1,
                    y: element.position.y,
                    z: element.position.z + 1
                },
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            get().addElement(duplicatedElement)
            duplicatedIds.push(duplicatedElement.id)
        })

        // Select the duplicated elements
        get().selectElements(duplicatedIds)

        // Add history entry
        get().addHistoryEntry(
            'elements:duplicate',
            `تم نسخ ${elements.length} عنصر`,
            { originalIds: ids, duplicatedIds }
        )

        return duplicatedIds
    },

    getElementById: (id: string) => {
        return get().elements.find(element => element.id === id)
    },

    getElementsByType: (type: ElementType) => {
        return get().elements.filter(element => element.type === type)
    }
})