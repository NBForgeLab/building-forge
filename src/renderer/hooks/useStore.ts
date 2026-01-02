/**
 * Custom hooks لاستخدام المتجر
 * Custom hooks for using the store
 */

import { useCallback, useEffect } from 'react'
import {
    useAppActions,
    useCanUndoRedo,
    useElementActions,
    useHistoryActions,
    useMaterialActions,
    useProjectActions,
    useProjectStats,
    useSelectedElements,
    useSelectionActions,
    useStore,
    useToolActions,
    useUIActions,
    useViewportActions
} from '../store'
import { BuildingElement, ElementType, Material, ToolType } from '../store/types'

/**
 * Hook for project management
 */
export function useProject() {
    const project = useStore(state => state.project)
    const actions = useProjectActions()

    const createProject = useCallback((name: string) => {
        actions.createNewProject(name)
    }, [actions])

    const saveProject = useCallback(async () => {
        if (!project) return false

        // This would integrate with Electron service
        // For now, just update the modified timestamp
        actions.updateProject({ modified: new Date().toISOString() })
        return true
    }, [project, actions])

    return {
        project,
        ...actions,
        createProject,
        saveProject,
        hasProject: !!project
    }
}

/**
 * Hook for element management
 */
export function useElements() {
    const elements = useStore(state => state.elements)
    const actions = useElementActions()

    const createElement = useCallback((type: ElementType, properties: any = {}) => {
        const newElement: BuildingElement = {
            id: '',
            type,
            name: `${getElementTypeName(type)} جديد`,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            properties,
            visible: true,
            locked: false,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }

        actions.addElement(newElement)
        return newElement
    }, [actions])

    const getElementsByType = useCallback((type: ElementType) => {
        return actions.getElementsByType(type)
    }, [actions])

    return {
        elements,
        ...actions,
        createElement,
        getElementsByType,
        elementCount: elements.length
    }
}

/**
 * Hook for material management
 */
export function useMaterials() {
    const materials = useStore(state => state.materials)
    const actions = useMaterialActions()

    const createMaterial = useCallback((name: string, type: 'pbr' | 'basic' = 'pbr') => {
        const newMaterial: Material = {
            id: '',
            name,
            type,
            properties: {
                albedo: '#ffffff',
                metallic: 0.0,
                roughness: 0.5,
                normal: 0.5,
                emission: '#000000',
                emissionIntensity: 0.0,
                opacity: 1.0,
                transparent: false
            },
            textures: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }

        actions.addMaterial(newMaterial)
        return newMaterial
    }, [actions])

    const getDefaultMaterials = useCallback(() => {
        return actions.getDefaultMaterials()
    }, [actions])

    return {
        materials,
        ...actions,
        createMaterial,
        getDefaultMaterials,
        materialCount: materials.length
    }
}

/**
 * Hook for tool management
 */
export function useTools() {
    const toolState = useStore(state => state.toolState)
    const actions = useToolActions()

    const activateTool = useCallback((tool: ToolType) => {
        actions.setActiveTool(tool)
    }, [actions])

    const isToolActive = useCallback((tool: ToolType) => {
        return toolState.activeTool === tool
    }, [toolState.activeTool])

    return {
        toolState,
        ...actions,
        activateTool,
        isToolActive,
        activeTool: toolState.activeTool,
        toolProperties: toolState.toolProperties,
        previewElement: toolState.previewElement
    }
}

/**
 * Hook for selection management
 */
export function useSelection() {
    const selectionState = useStore(state => state.selectionState)
    const selectedElements = useSelectedElements()
    const actions = useSelectionActions()

    const hasSelection = selectedElements.length > 0
    const isSingleSelection = selectedElements.length === 1
    const isMultiSelection = selectedElements.length > 1

    const isElementSelected = useCallback((id: string) => {
        return selectionState.selectedElements.includes(id)
    }, [selectionState.selectedElements])

    const toggleElementSelection = useCallback((id: string) => {
        if (isElementSelected(id)) {
            actions.deselectElement(id)
        } else {
            actions.selectElement(id, true)
        }
    }, [isElementSelected, actions])

    return {
        selectionState,
        selectedElements,
        ...actions,
        hasSelection,
        isSingleSelection,
        isMultiSelection,
        isElementSelected,
        toggleElementSelection,
        selectedCount: selectedElements.length
    }
}

/**
 * Hook for history management (Undo/Redo)
 */
export function useHistory() {
    const historyState = useStore(state => state.historyState)
    const { canUndo, canRedo } = useCanUndoRedo()
    const actions = useHistoryActions()

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                event.preventDefault()
                if (event.shiftKey) {
                    if (canRedo) actions.redo()
                } else {
                    if (canUndo) actions.undo()
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [canUndo, canRedo, actions])

    return {
        historyState,
        ...actions,
        canUndo,
        canRedo,
        historySize: historyState.past.length + historyState.future.length + 1
    }
}

/**
 * Hook for viewport management
 */
export function useViewport() {
    const viewportState = useStore(state => state.viewportState)
    const actions = useViewportActions()

    const setViewMode = useCallback((mode: 'perspective' | 'orthographic') => {
        actions.updateCamera({ viewMode: mode })
    }, [actions])

    const toggleWireframe = useCallback(() => {
        actions.updateRendering({
            wireframe: !viewportState.rendering.wireframe
        })
    }, [viewportState.rendering.wireframe, actions])

    const toggleGrid = useCallback(() => {
        actions.updateGrid({
            visible: !viewportState.grid.visible
        })
    }, [viewportState.grid.visible, actions])

    return {
        viewportState,
        ...actions,
        setViewMode,
        toggleWireframe,
        toggleGrid,
        camera: viewportState.camera,
        lighting: viewportState.lighting,
        rendering: viewportState.rendering,
        grid: viewportState.grid
    }
}

/**
 * Hook for UI state management
 */
export function useUI() {
    const uiState = useStore(state => state.uiState)
    const actions = useUIActions()

    const toggleTheme = useCallback(() => {
        const newTheme = uiState.theme === 'dark' ? 'light' : 'dark'
        actions.setTheme(newTheme)
    }, [uiState.theme, actions])

    const toggleLanguage = useCallback(() => {
        const newLanguage = uiState.language === 'ar' ? 'en' : 'ar'
        actions.setLanguage(newLanguage)
    }, [uiState.language, actions])

    return {
        uiState,
        ...actions,
        toggleTheme,
        toggleLanguage,
        isDarkTheme: uiState.theme === 'dark',
        isArabic: uiState.language === 'ar'
    }
}

/**
 * Hook for app state management
 */
export function useApp() {
    const appState = useStore(state => state.appState)
    const actions = useAppActions()

    const toggleAutoSave = useCallback(() => {
        actions.setAutoSave(!appState.autoSave)
    }, [appState.autoSave, actions])

    return {
        appState,
        ...actions,
        toggleAutoSave,
        isInitialized: appState.initialized,
        isLoading: appState.loading,
        hasError: !!appState.error,
        recentProjectsCount: appState.recentProjects.length
    }
}

/**
 * Hook for project statistics
 */
export function useProjectStatistics() {
    const stats = useProjectStats()

    return {
        stats,
        hasStats: !!stats
    }
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts() {
    const { activateTool } = useTools()
    const { clearSelection } = useSelection()
    const { undo, redo, canUndo, canRedo } = useHistory()

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't handle shortcuts when typing in inputs
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement) {
                return
            }

            // Tool shortcuts
            if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                switch (event.key.toLowerCase()) {
                    case 'v':
                        event.preventDefault()
                        activateTool('select')
                        break
                    case 'w':
                        event.preventDefault()
                        activateTool('wall')
                        break
                    case 'f':
                        event.preventDefault()
                        activateTool('floor')
                        break
                    case 'd':
                        event.preventDefault()
                        activateTool('door')
                        break
                    case 'n':
                        event.preventDefault()
                        activateTool('window')
                        break
                    case 'c':
                        event.preventDefault()
                        activateTool('cut')
                        break
                    case 'escape':
                        event.preventDefault()
                        clearSelection()
                        break
                }
            }

            // Undo/Redo shortcuts (handled in useHistory)
            // File shortcuts would be handled by Electron service
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [activateTool, clearSelection, undo, redo, canUndo, canRedo])
}

// Helper functions
function getElementTypeName(type: ElementType): string {
    const typeNames: Record<ElementType, string> = {
        wall: 'جدار',
        floor: 'أرضية',
        door: 'باب',
        window: 'نافذة',
        cut: 'قطع',
        custom: 'مخصص'
    }
    return typeNames[type]
}