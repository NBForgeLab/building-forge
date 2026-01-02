/**
 * History slice لإدارة التاريخ (Undo/Redo)
 * History slice for managing history (Undo/Redo)
 */

import { StateCreator } from 'zustand'
import { HistoryEntry, HistorySlice, StoreState } from '../types'
import { generateId } from '../utils'

// Helper function to sanitize data before storing in history
function sanitizeHistoryData(data: any): any {
    if (!data) return null

    // If it's a simple value, return as is
    if (typeof data !== 'object') return data

    // If it's an array, limit size and sanitize elements
    if (Array.isArray(data)) {
        return data.slice(0, 100).map(item => sanitizeHistoryData(item))
    }

    // For objects, only keep essential properties and avoid deep nesting
    const sanitized: any = {}
    const allowedKeys = ['id', 'type', 'name', 'elementId', 'materialId', 'previousState', 'action', 'duration']

    for (const key of allowedKeys) {
        if (key in data) {
            const value = data[key]
            // Avoid storing large nested objects
            if (typeof value === 'object' && value !== null) {
                if (key === 'previousState') {
                    // Only store essential properties for previous state
                    sanitized[key] = {
                        id: value.id,
                        type: value.type,
                        name: value.name
                    }
                } else {
                    sanitized[key] = String(value).substring(0, 200) // Limit string length
                }
            } else {
                sanitized[key] = value
            }
        }
    }

    return sanitized
}

export const createHistorySlice: StateCreator<
    StoreState,
    [],
    [],
    HistorySlice
> = (set, get) => ({
    historyState: {
        past: [],
        present: {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: 'initial',
            description: 'الحالة الأولية',
            data: null
        },
        future: [],
        maxHistorySize: 50
    },

    addHistoryEntry: (action: string, description: string, data: any) => {
        // Prevent storing large state objects to avoid exponential growth
        const sanitizedData = sanitizeHistoryData(data)

        const newEntry: HistoryEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action,
            description,
            data: sanitizedData
        }

        set(state => {
            const { past, present, maxHistorySize } = state.historyState

            // Add current present to past
            const newPast = [...past, present]

            // Limit history size
            const limitedPast = newPast.length > maxHistorySize
                ? newPast.slice(-maxHistorySize)
                : newPast

            return {
                historyState: {
                    ...state.historyState,
                    past: limitedPast,
                    present: newEntry,
                    future: [] // Clear future when new action is performed
                }
            }
        })
    },

    undo: () => {
        const { past, present, future } = get().historyState

        if (past.length === 0) return false

        const previous = past[past.length - 1]
        const newPast = past.slice(0, past.length - 1)

        set(state => ({
            historyState: {
                ...state.historyState,
                past: newPast,
                present: previous,
                future: [present, ...future]
            }
        }))

        // Apply the undo operation
        applyHistoryEntry(previous, get)

        return true
    },

    redo: () => {
        const { past, present, future } = get().historyState

        if (future.length === 0) return false

        const next = future[0]
        const newFuture = future.slice(1)

        set(state => ({
            historyState: {
                ...state.historyState,
                past: [...past, present],
                present: next,
                future: newFuture
            }
        }))

        // Apply the redo operation
        applyHistoryEntry(next, get)

        return true
    },

    clearHistory: () => {
        set(state => ({
            historyState: {
                ...state.historyState,
                past: [],
                future: [],
                present: {
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    action: 'clear',
                    description: 'تم مسح التاريخ',
                    data: null
                }
            }
        }))
    },

    canUndo: () => {
        return get().historyState.past.length > 0
    },

    canRedo: () => {
        return get().historyState.future.length > 0
    }
})

// Helper function to apply history entries
function applyHistoryEntry(entry: HistoryEntry, get: () => StoreState) {
    const { action, data } = entry

    switch (action) {
        case 'element:add':
            // Remove the element that was added
            if (data.elementId) {
                const elements = get().elements.filter(el => el.id !== data.elementId)
                // Note: This is a simplified approach. In a real implementation,
                // you might want to store the full state snapshot instead.
            }
            break

        case 'element:remove':
            // Re-add the element that was removed
            if (data.element) {
                get().addElement(data.element)
            }
            break

        case 'element:update':
            // Revert the element to its previous state
            if (data.elementId && data.previousState) {
                get().updateElement(data.elementId, data.previousState)
            }
            break

        case 'elements:remove':
            // Re-add all elements that were removed
            if (data.elements) {
                data.elements.forEach((element: any) => {
                    get().addElement(element)
                })
            }
            break

        case 'material:add':
            // Remove the material that was added
            if (data.materialId) {
                const materials = get().materials.filter(mat => mat.id !== data.materialId)
                // Apply the change
            }
            break

        case 'material:remove':
            // Re-add the material that was removed
            if (data.material) {
                get().addMaterial(data.material)
            }
            break

        case 'material:update':
            // Revert the material to its previous state
            if (data.materialId && data.previousState) {
                get().updateMaterial(data.materialId, data.previousState)
            }
            break

        case 'selection:select':
            // Revert selection
            if (data.elementId) {
                get().selectElement(data.elementId)
            }
            break

        case 'selection:select-multiple':
            // Revert multiple selection
            if (data.elementIds) {
                get().selectElements(data.elementIds)
            }
            break

        case 'selection:clear':
            // Restore previous selection
            if (data.previousSelection) {
                get().selectElements(data.previousSelection)
            }
            break

        case 'tool:activate':
            // Revert to previous tool
            if (data.previousTool) {
                get().setActiveTool(data.previousTool)
            }
            break

        case 'project:create':
        case 'project:load':
        case 'project:update':
            // These operations might need more complex state restoration
            break

        default:
            console.warn(`Unknown history action: ${action}`)
    }
}