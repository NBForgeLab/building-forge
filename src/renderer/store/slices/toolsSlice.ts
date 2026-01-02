/**
 * Tools slice لإدارة الأدوات
 * Tools slice for managing tools
 */

import { StateCreator } from 'zustand'
import { BuildingElement, StoreState, ToolsSlice, ToolType } from '../types'

export const createToolsSlice: StateCreator<
    StoreState,
    [],
    [],
    ToolsSlice
> = (set, get) => ({
    toolState: {
        activeTool: 'select',
        toolProperties: {
            // Default tool properties
            wallThickness: 0.2,
            wallHeight: 3.0,
            doorWidth: 0.9,
            doorHeight: 2.1,
            doorType: 'single',
            windowWidth: 1.2,
            windowHeight: 1.5,
            windowType: 'single',
            floorThickness: 0.2,
            cutShape: 'rectangle',
            cutDepth: 0.1
        },
        previewElement: undefined
    },

    setActiveTool: (tool: ToolType) => {
        // Clear preview when switching tools
        get().clearPreview()

        // Clear selection when switching to non-select tools
        if (tool !== 'select') {
            get().clearSelection()
        }

        set(state => ({
            toolState: {
                ...state.toolState,
                activeTool: tool
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'tool:activate',
            `تم تفعيل أداة: ${getToolName(tool)}`,
            { tool, previousTool: get().toolState.activeTool }
        )
    },

    updateToolProperties: (properties) => {
        set(state => ({
            toolState: {
                ...state.toolState,
                toolProperties: {
                    ...state.toolState.toolProperties,
                    ...properties
                }
            }
        }))

        // Update preview element if exists
        const { previewElement } = get().toolState
        if (previewElement) {
            const updatedPreview = updatePreviewWithProperties(previewElement, properties)
            get().setPreviewElement(updatedPreview)
        }
    },

    setPreviewElement: (element?: BuildingElement) => {
        set(state => ({
            toolState: {
                ...state.toolState,
                previewElement: element
            }
        }))
    },

    clearPreview: () => {
        set(state => ({
            toolState: {
                ...state.toolState,
                previewElement: undefined
            }
        }))
    }
})

// Helper functions
function getToolName(tool: ToolType): string {
    const toolNames: Record<ToolType, string> = {
        select: 'التحديد',
        wall: 'الجدار',
        floor: 'الأرضية',
        door: 'الباب',
        window: 'النافذة',
        cut: 'القطع'
    }
    return toolNames[tool]
}

function updatePreviewWithProperties(
    element: BuildingElement,
    properties: any
): BuildingElement {
    const updatedProperties = { ...element.properties }

    // Update properties based on element type
    switch (element.type) {
        case 'wall':
            if (properties.wallThickness !== undefined) {
                updatedProperties.thickness = properties.wallThickness
            }
            if (properties.wallHeight !== undefined) {
                updatedProperties.height = properties.wallHeight
            }
            break

        case 'door':
            if (properties.doorWidth !== undefined) {
                updatedProperties.width = properties.doorWidth
            }
            if (properties.doorHeight !== undefined) {
                updatedProperties.height = properties.doorHeight
            }
            if (properties.doorType !== undefined) {
                updatedProperties.doorType = properties.doorType
            }
            break

        case 'window':
            if (properties.windowWidth !== undefined) {
                updatedProperties.width = properties.windowWidth
            }
            if (properties.windowHeight !== undefined) {
                updatedProperties.height = properties.windowHeight
            }
            if (properties.windowType !== undefined) {
                updatedProperties.windowType = properties.windowType
            }
            break

        case 'floor':
            if (properties.floorThickness !== undefined) {
                updatedProperties.thickness = properties.floorThickness
            }
            break

        case 'cut':
            if (properties.cutShape !== undefined) {
                updatedProperties.shape = properties.cutShape
            }
            if (properties.cutDepth !== undefined) {
                updatedProperties.depth = properties.cutDepth
            }
            break
    }

    return {
        ...element,
        properties: updatedProperties,
        modified: new Date().toISOString()
    }
}