import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store'
import { BuildingElement } from '../../store/types'
import { ToolContext, ToolEvent } from '../BaseTool'
import { SelectTool } from '../SelectTool'

// Mock the store
vi.mock('../../store', () => ({
    useStore: {
        getState: vi.fn(),
        subscribe: vi.fn()
    }
}))

describe('Debug SelectTool', () => {
    let selectTool: SelectTool
    let mockContext: ToolContext
    let mockStore: any

    beforeEach(() => {
        // Setup mock store
        mockStore = {
            elements: [],
            selectionState: {
                selectedElements: [],
                hoveredElement: undefined,
                transformMode: 'translate',
                transformSpace: 'local'
            },
            project: {
                settings: {
                    snapToGrid: false,
                    gridSize: 1
                }
            },
            selectElement: vi.fn(),
            selectElements: vi.fn(),
            deselectElement: vi.fn(),
            clearSelection: vi.fn(),
            setHoveredElement: vi.fn(),
            setTransformMode: vi.fn(),
            getElementById: vi.fn(),
            updateElement: vi.fn(),
            removeElements: vi.fn(),
            duplicateElement: vi.fn(),
            updateProject: vi.fn()
        }

        vi.mocked(useStore.getState).mockReturnValue(mockStore)

        // Create select tool
        selectTool = new SelectTool()

        // Create mock context
        const mockCamera = new THREE.PerspectiveCamera()
        const mockScene = new THREE.Scene()
        const mockRaycaster = new THREE.Raycaster()
        const mockRenderer = {
            domElement: document.createElement('canvas')
        } as THREE.WebGLRenderer
        const mockCanvas = document.createElement('canvas')

        mockContext = {
            camera: mockCamera,
            scene: mockScene,
            raycaster: mockRaycaster,
            renderer: mockRenderer,
            canvas: mockCanvas
        }

        selectTool.activate(mockContext)
    })

    it('should debug multi-selection behavior', () => {
        // Create test element
        const testElement: BuildingElement = {
            id: 'test-element',
            type: 'wall',
            name: 'Test Wall',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            properties: {},
            visible: true,
            locked: false,
            created: '2024-01-01T00:00:00Z',
            modified: '2024-01-01T00:00:00Z'
        }

        // Setup store - element NOT already selected
        mockStore.elements = [testElement]
        mockStore.getElementById.mockReturnValue(testElement)
        mockStore.selectionState.selectedElements = [] // NOT selected

        // Clear mock calls
        mockStore.selectElement.mockClear()
        mockStore.deselectElement.mockClear()

        // Mock intersection methods
        vi.spyOn(selectTool as any, 'getIntersectionPoint')
            .mockReturnValue(new THREE.Vector3(0, 0, 0))
        vi.spyOn(selectTool as any, 'getElementAtPoint')
            .mockReturnValue(testElement)

        // Create selection event with Ctrl
        const event: ToolEvent = {
            type: 'mousedown',
            position: new THREE.Vector3(0, 0, 0),
            button: 0,
            ctrlKey: true // Using Ctrl
        }

        console.log('Before handleEvent:')
        console.log('- selectedElements:', mockStore.selectionState.selectedElements)
        console.log('- ctrlKey:', event.ctrlKey)
        console.log('- element:', testElement.id)

        const result = selectTool.handleEvent(event)

        console.log('After handleEvent:')
        console.log('- result:', result)
        console.log('- selectElement calls:', mockStore.selectElement.mock.calls)
        console.log('- deselectElement calls:', mockStore.deselectElement.mock.calls)

        // This should call selectElement with true for multi-select
        expect(mockStore.selectElement).toHaveBeenCalledWith('test-element', true)
    })
})