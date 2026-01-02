/**
 * المتجر الرئيسي لإدارة الحالة
 * Main store for state management
 */

import { isDev } from '@shared/config/appConfig'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Import types
import { StoreState } from './types'

// Import slices
import { createAppSlice } from './slices/appSlice'
import { createClipboardSlice } from './slices/clipboardSlice'
import { createElementsSlice } from './slices/elementsSlice'
import { createHistorySlice } from './slices/historySlice'
import { createMaterialsSlice } from './slices/materialsSlice'
import { createProjectSlice } from './slices/projectSlice'
import { createSelectionSlice } from './slices/selectionSlice'
import { createToolsSlice } from './slices/toolsSlice'
import { createUISlice } from './slices/uiSlice'
import { createViewportSlice } from './slices/viewportSlice'

// Import middleware
import { createAutoSaveMiddleware } from './middleware/autoSaveMiddleware'
import { createDevLoggingMiddleware, createProdLoggingMiddleware } from './middleware/loggingMiddleware'
import { createAppPersistMiddleware, createMaterialsPersistMiddleware, createUIPersistMiddleware } from './middleware/persistMiddleware'

// Create the main store
export const useStore = create<StoreState>()(
    subscribeWithSelector(
        immer(
            // Apply middleware based on environment
            isDev()
                ? createDevLoggingMiddleware()(
                    createUIPersistMiddleware()(
                        createAppPersistMiddleware()(
                            createMaterialsPersistMiddleware()(
                                (set, get, api) => ({
                                    // Combine all slices
                                    ...createProjectSlice(set, get, api),
                                    ...createElementsSlice(set, get, api),
                                    ...createMaterialsSlice(set, get, api),
                                    ...createToolsSlice(set, get, api),
                                    ...createSelectionSlice(set, get, api),
                                    ...createHistorySlice(set, get, api),
                                    ...createViewportSlice(set, get, api),
                                    ...createUISlice(set, get, api),
                                    ...createAppSlice(set, get, api),
                                    ...createClipboardSlice(set, get, api)
                                })
                            )
                        )
                    )
                )
                : createProdLoggingMiddleware()(
                    createUIPersistMiddleware()(
                        createAppPersistMiddleware()(
                            createMaterialsPersistMiddleware()(
                                (set, get, api) => ({
                                    // Combine all slices
                                    ...createProjectSlice(set, get, api),
                                    ...createElementsSlice(set, get, api),
                                    ...createMaterialsSlice(set, get, api),
                                    ...createToolsSlice(set, get, api),
                                    ...createSelectionSlice(set, get, api),
                                    ...createHistorySlice(set, get, api),
                                    ...createViewportSlice(set, get, api),
                                    ...createUISlice(set, get, api),
                                    ...createAppSlice(set, get, api),
                                    ...createClipboardSlice(set, get, api)
                                })
                            )
                        )
                    )
                )
        )
    )
)

// Create store with auto-save when Electron service is available
export function createStoreWithAutoSave(electronService: any) {
    return create<StoreState>()(
        subscribeWithSelector(
            immer(
                createAutoSaveMiddleware(electronService)(
                    isDev()
                        ? createDevLoggingMiddleware()(
                            createUIPersistMiddleware()(
                                createAppPersistMiddleware()(
                                    createMaterialsPersistMiddleware()(
                                        (set, get, api) => ({
                                            // Combine all slices
                                            ...createProjectSlice(set, get, api),
                                            ...createElementsSlice(set, get, api),
                                            ...createMaterialsSlice(set, get, api),
                                            ...createToolsSlice(set, get, api),
                                            ...createSelectionSlice(set, get, api),
                                            ...createHistorySlice(set, get, api),
                                            ...createViewportSlice(set, get, api),
                                            ...createUISlice(set, get, api),
                                            ...createAppSlice(set, get, api),
                                            ...createClipboardSlice(set, get, api)
                                        })
                                    )
                                )
                            )
                        )
                        : createProdLoggingMiddleware()(
                            createUIPersistMiddleware()(
                                createAppPersistMiddleware()(
                                    createMaterialsPersistMiddleware()(
                                        (set, get, api) => ({
                                            // Combine all slices
                                            ...createProjectSlice(set, get, api),
                                            ...createElementsSlice(set, get, api),
                                            ...createMaterialsSlice(set, get, api),
                                            ...createToolsSlice(set, get, api),
                                            ...createSelectionSlice(set, get, api),
                                            ...createHistorySlice(set, get, api),
                                            ...createViewportSlice(set, get, api),
                                            ...createUISlice(set, get, api),
                                            ...createAppSlice(set, get, api),
                                            ...createClipboardSlice(set, get, api)
                                        })
                                    )
                                )
                            )
                        )
                )
            )
        )
    )
}

// Selectors for better performance
export const useProject = () => useStore(state => state.project)
export const useElements = () => useStore(state => state.elements)
export const useMaterials = () => useStore(state => state.materials)
export const useToolState = () => useStore(state => state.toolState)
export const useSelectionState = () => useStore(state => state.selectionState)
export const useHistoryState = () => useStore(state => state.historyState)
export const useViewportState = () => useStore(state => state.viewportState)
export const useUIState = () => useStore(state => state.uiState)
export const useAppState = () => useStore(state => state.appState)
export const useClipboardState = () => useStore(state => state.clipboardState)

// Action selectors
export const useProjectActions = () => useStore(state => ({
    setProject: state.setProject,
    updateProject: state.updateProject,
    createNewProject: state.createNewProject,
    clearProject: state.clearProject
}))

export const useElementActions = () => useStore(state => ({
    addElement: state.addElement,
    updateElement: state.updateElement,
    removeElement: state.removeElement,
    removeElements: state.removeElements,
    duplicateElement: state.duplicateElement,
    duplicateElements: state.duplicateElements,
    getElementById: state.getElementById,
    getElementsByType: state.getElementsByType
}))

export const useMaterialActions = () => useStore(state => ({
    addMaterial: state.addMaterial,
    updateMaterial: state.updateMaterial,
    removeMaterial: state.removeMaterial,
    duplicateMaterial: state.duplicateMaterial,
    getMaterialById: state.getMaterialById,
    getDefaultMaterials: state.getDefaultMaterials
}))

export const useToolActions = () => useStore(state => ({
    setActiveTool: state.setActiveTool,
    updateToolProperties: state.updateToolProperties,
    setPreviewElement: state.setPreviewElement,
    clearPreview: state.clearPreview
}))

export const useSelectionActions = () => useStore(state => ({
    selectElement: state.selectElement,
    selectElements: state.selectElements,
    deselectElement: state.deselectElement,
    clearSelection: state.clearSelection,
    setHoveredElement: state.setHoveredElement,
    setTransformMode: state.setTransformMode,
    setTransformSpace: state.setTransformSpace
}))

export const useHistoryActions = () => useStore(state => ({
    addHistoryEntry: state.addHistoryEntry,
    undo: state.undo,
    redo: state.redo,
    clearHistory: state.clearHistory,
    canUndo: state.canUndo,
    canRedo: state.canRedo
}))

export const useViewportActions = () => useStore(state => ({
    updateCamera: state.updateCamera,
    updateLighting: state.updateLighting,
    updateRendering: state.updateRendering,
    updateGrid: state.updateGrid,
    setCameraPreset: state.setCameraPreset,
    resetCamera: state.resetCamera
}))

export const useUIActions = () => useStore(state => ({
    updateUI: state.updateUI,
    toggleGrid: state.toggleGrid,
    toggleStats: state.toggleStats,
    toggleWireframe: state.toggleWireframe,
    setTheme: state.setTheme,
    setLanguage: state.setLanguage
}))

export const useAppActions = () => useStore(state => ({
    setInitialized: state.setInitialized,
    setLoading: state.setLoading,
    setError: state.setError,
    setLastSaved: state.setLastSaved,
    setAutoSave: state.setAutoSave,
    addRecentProject: state.addRecentProject,
    removeRecentProject: state.removeRecentProject
}))

export const useClipboardActions = () => useStore(state => ({
    copySelectedElements: state.copySelectedElements,
    copyElements: state.copyElements,
    copyMaterials: state.copyMaterials,
    pasteElements: state.pasteElements,
    pasteMaterials: state.pasteMaterials,
    multiPasteElements: state.multiPasteElements,
    smartCopy: state.smartCopy,
    smartPaste: state.smartPaste,
    updateClipboardState: state.updateClipboardState,
    navigateClipboardHistory: state.navigateClipboardHistory,
    clearClipboard: state.clearClipboard,
    removeClipboardEntry: state.removeClipboardEntry,
    canPaste: state.canPaste,
    getClipboardPreview: state.getClipboardPreview
}))

// Computed selectors
export const useSelectedElements = () => useStore(state => {
    const { selectedElements } = state.selectionState
    return selectedElements.map(id => state.getElementById(id)).filter(Boolean)
})

export const useCanUndoRedo = () => useStore(state => ({
    canUndo: state.canUndo(),
    canRedo: state.canRedo()
}))

export const useProjectStats = () => useStore(state => {
    if (!state.project) return null

    const elementsByType = state.elements.reduce((acc, element) => {
        acc[element.type] = (acc[element.type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return {
        totalElements: state.elements.length,
        totalMaterials: state.materials.length,
        elementsByType,
        lastModified: state.project.modified,
        projectSize: JSON.stringify(state.project).length
    }
})

// Initialize store
export function initializeStore() {
    const store = useStore.getState()

    // Set initial state
    store.setInitialized(true)

    // Apply theme
    document.documentElement.classList.add(store.uiState.theme)
    document.documentElement.dir = store.uiState.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = store.uiState.language

    // Initialize default materials if empty
    if (store.materials.length === 0) {
        const defaultMaterials = store.getDefaultMaterials()
        defaultMaterials.forEach(material => {
            store.addMaterial(material)
        })
    }

    // Initialize clipboard state
    store.updateClipboardState()
}

// Export store instance for external access
export { useStore as store }
export default useStore