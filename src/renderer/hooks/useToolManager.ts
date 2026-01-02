/**
 * خطاف لإدارة الأدوات
 * Hook for tool management
 */

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { ToolType } from '../store/types'
import { ToolContext, ToolManager, createToolManager } from '../tools'

export interface UseToolManagerOptions {
    enableKeyboardShortcuts?: boolean
    enableSnapToGrid?: boolean
    gridSize?: number
    enablePreview?: boolean
}

export function useToolManager(options: UseToolManagerOptions = {}) {
    const toolManagerRef = useRef<ToolManager | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const store = useStore()

    // Initialize tool manager
    useEffect(() => {
        if (!toolManagerRef.current) {
            toolManagerRef.current = createToolManager({
                enableKeyboardShortcuts: options.enableKeyboardShortcuts ?? true,
                enableSnapToGrid: options.enableSnapToGrid ?? true,
                gridSize: options.gridSize ?? 1,
                enablePreview: options.enablePreview ?? true
            })
        }

        return () => {
            if (toolManagerRef.current) {
                toolManagerRef.current.dispose()
                toolManagerRef.current = null
            }
        }
    }, [])

    // Set up context when Three.js objects are available
    const setupContext = (context: ToolContext) => {
        if (toolManagerRef.current) {
            toolManagerRef.current.setContext(context)
            setIsInitialized(true)

            // Activate the current tool from store
            const currentTool = store.toolState.activeTool
            toolManagerRef.current.activateTool(currentTool)
        }
    }

    // Subscribe to tool changes from store
    useEffect(() => {
        const unsubscribe = useStore.subscribe(
            (state) => state.toolState.activeTool,
            (activeTool) => {
                if (toolManagerRef.current && isInitialized) {
                    toolManagerRef.current.activateTool(activeTool)
                }
            }
        )

        return unsubscribe
    }, [isInitialized])

    // Subscribe to tool properties changes
    useEffect(() => {
        const unsubscribe = useStore.subscribe(
            (state) => state.toolState.toolProperties,
            (toolProperties) => {
                if (toolManagerRef.current && isInitialized) {
                    // Update tool manager config based on properties
                    const project = store.project
                    if (project) {
                        toolManagerRef.current.updateConfig({
                            enableSnapToGrid: project.settings.snapToGrid,
                            gridSize: project.settings.gridSize
                        })
                    }
                }
            }
        )

        return unsubscribe
    }, [isInitialized])

    // Tool management functions
    const activateTool = (tool: ToolType) => {
        if (toolManagerRef.current) {
            return toolManagerRef.current.activateTool(tool)
        }
        return false
    }

    const getActiveTool = () => {
        if (toolManagerRef.current) {
            return toolManagerRef.current.getActiveTool()
        }
        return undefined
    }

    const getTools = () => {
        if (toolManagerRef.current) {
            return toolManagerRef.current.getTools()
        }
        return []
    }

    const updateConfig = (config: Partial<UseToolManagerOptions>) => {
        if (toolManagerRef.current) {
            toolManagerRef.current.updateConfig(config)
        }
    }

    return {
        toolManager: toolManagerRef.current,
        isInitialized,
        setupContext,
        activateTool,
        getActiveTool,
        getTools,
        updateConfig
    }
}

// Hook for accessing tool manager in components
export function useTools() {
    const store = useStore()

    return {
        activeTool: store.toolState.activeTool,
        toolProperties: store.toolState.toolProperties,
        previewElement: store.toolState.previewElement,
        setActiveTool: store.setActiveTool,
        updateToolProperties: store.updateToolProperties,
        setPreviewElement: store.setPreviewElement,
        clearPreview: store.clearPreview
    }
}