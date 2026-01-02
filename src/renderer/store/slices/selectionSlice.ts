/**
 * Selection slice لإدارة التحديد
 * Selection slice for managing selection
 */

import { StateCreator } from 'zustand'
import { SelectionSlice, StoreState } from '../types'

export const createSelectionSlice: StateCreator<
    StoreState,
    [],
    [],
    SelectionSlice
> = (set, get) => ({
    selectionState: {
        selectedElements: [],
        hoveredElement: undefined,
        selectionBox: undefined,
        transformMode: 'translate',
        transformSpace: 'world'
    },

    selectElement: (id: string, addToSelection = false) => {
        const element = get().getElementById(id)
        if (!element) return

        set(state => {
            const currentSelection = state.selectionState.selectedElements
            let newSelection: string[]

            if (addToSelection) {
                // Add to selection if not already selected
                if (!currentSelection.includes(id)) {
                    newSelection = [...currentSelection, id]
                } else {
                    // Remove from selection if already selected (toggle)
                    newSelection = currentSelection.filter(selectedId => selectedId !== id)
                }
            } else {
                // Replace selection
                newSelection = [id]
            }

            return {
                selectionState: {
                    ...state.selectionState,
                    selectedElements: newSelection
                }
            }
        })

        // Add history entry for single selection (not multi-selection)
        if (!addToSelection) {
            get().addHistoryEntry(
                'selection:select',
                `تم تحديد عنصر: ${element.name}`,
                { elementId: id, elementName: element.name }
            )
        }
    },

    selectElements: (ids: string[]) => {
        // Filter out invalid IDs
        const validIds = ids.filter(id => get().getElementById(id) !== undefined)

        if (validIds.length === 0) return

        set(state => ({
            selectionState: {
                ...state.selectionState,
                selectedElements: validIds
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'selection:select-multiple',
            `تم تحديد ${validIds.length} عنصر`,
            { elementIds: validIds }
        )
    },

    deselectElement: (id: string) => {
        set(state => ({
            selectionState: {
                ...state.selectionState,
                selectedElements: state.selectionState.selectedElements.filter(
                    selectedId => selectedId !== id
                )
            }
        }))
    },

    clearSelection: () => {
        const currentSelection = get().selectionState.selectedElements

        if (currentSelection.length === 0) return

        set(state => ({
            selectionState: {
                ...state.selectionState,
                selectedElements: [],
                selectionBox: undefined
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'selection:clear',
            'تم إلغاء التحديد',
            { previousSelection: currentSelection }
        )
    },

    setHoveredElement: (id?: string) => {
        set(state => ({
            selectionState: {
                ...state.selectionState,
                hoveredElement: id
            }
        }))
    },

    setTransformMode: (mode) => {
        set(state => ({
            selectionState: {
                ...state.selectionState,
                transformMode: mode
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'selection:transform-mode',
            `تم تغيير وضع التحويل إلى: ${getTransformModeName(mode)}`,
            { mode, previousMode: get().selectionState.transformMode }
        )
    },

    setTransformSpace: (space) => {
        set(state => ({
            selectionState: {
                ...state.selectionState,
                transformSpace: space
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'selection:transform-space',
            `تم تغيير مساحة التحويل إلى: ${getTransformSpaceName(space)}`,
            { space, previousSpace: get().selectionState.transformSpace }
        )
    }
})

// Helper functions
function getTransformModeName(mode: 'translate' | 'rotate' | 'scale'): string {
    const modeNames = {
        translate: 'النقل',
        rotate: 'الدوران',
        scale: 'التحجيم'
    }
    return modeNames[mode]
}

function getTransformSpaceName(space: 'local' | 'world'): string {
    const spaceNames = {
        local: 'محلي',
        world: 'عالمي'
    }
    return spaceNames[space]
}