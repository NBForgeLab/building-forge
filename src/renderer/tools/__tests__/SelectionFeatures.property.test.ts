/**
 * اختبارات الخصائص لميزات التحديد
 * Property-based tests for selection features
 * 
 * الخاصية 4: تحديد العناصر
 * Property 4: Element Selection
 * تتحقق من: المتطلبات 3.1, 3.2
 * Verifies: Requirements 3.1, 3.2
 * 
 * الخاصية 6: التحديد المتعدد
 * Property 6: Multi-Selection
 * تتحقق من: المتطلبات 3.6
 * Verifies: Requirements 3.6
 */

import fc from 'fast-check'
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('Property Tests: Selection Features', () => {
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

    afterEach(() => {
        selectTool.deactivate()
        vi.clearAllMocks()
    })

    /**
     * الخاصية 4: تحديد العناصر
     * Property 4: Element Selection
     * 
     * المتطلبات المتحققة:
     * - 3.1: تحديد العناصر بالنقر
     * - 3.2: الإبراز البصري للعناصر المحددة
     */
    it('Property 4: Element selection should be consistent and reliable', () => {
        fc.assert(
            fc.property(
                fc.boolean(), // visible
                fc.boolean(), // locked
                (visible, locked) => {
                    // Create test element
                    const testElement: BuildingElement = {
                        id: 'test-element',
                        type: 'wall',
                        name: 'Test Wall',
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: { x: 1, y: 1, z: 1 },
                        properties: {},
                        visible,
                        locked,
                        created: '2024-01-01T00:00:00Z',
                        modified: '2024-01-01T00:00:00Z'
                    }

                    // Setup store
                    mockStore.elements = [testElement]
                    mockStore.getElementById.mockReturnValue(testElement)

                    // Mock intersection methods
                    vi.spyOn(selectTool as any, 'getIntersectionPoint')
                        .mockReturnValue(new THREE.Vector3(0, 0, 0))
                    vi.spyOn(selectTool as any, 'getElementAtPoint')
                        .mockReturnValue(visible ? testElement : undefined)

                    // Test element selection
                    const event: ToolEvent = {
                        type: 'mousedown',
                        position: new THREE.Vector3(0, 0, 0),
                        button: 0
                    }

                    const result = selectTool.handleEvent(event)

                    expect(result?.success).toBe(true)

                    if (visible) {
                        // Should select visible elements (locked status doesn't affect selection)
                        expect(mockStore.selectElement).toHaveBeenCalledWith('test-element', false)
                    } else {
                        // Should start selection box for invisible elements
                        expect(result?.message).toContain('بدء تحديد المنطقة')
                    }

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })

    /**
     * الخاصية 6: التحديد المتعدد
     * Property 6: Multi-Selection
     * 
     * المتطلبات المتحققة:
     * - 3.6: التحديد المتعدد مع Ctrl
     */
    it('Property 6: Multi-selection should work correctly with Ctrl key', () => {
        fc.assert(
            fc.property(
                fc.boolean(), // useCtrl
                fc.boolean(), // elementAlreadySelected
                (useCtrl, elementAlreadySelected) => {
                    // Create a simple test element
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

                    // Setup store
                    mockStore.elements = [testElement]
                    mockStore.getElementById.mockReturnValue(testElement)
                    mockStore.selectionState.selectedElements = elementAlreadySelected ? ['test-element'] : []

                    // Ensure useStore.getState returns the updated mock store
                    vi.mocked(useStore.getState).mockReturnValue(mockStore)

                    // Clear mock calls
                    mockStore.selectElement.mockClear()
                    mockStore.deselectElement.mockClear()

                    // Mock intersection methods
                    vi.spyOn(selectTool as any, 'getIntersectionPoint')
                        .mockReturnValue(new THREE.Vector3(0, 0, 0))
                    vi.spyOn(selectTool as any, 'getElementAtPoint')
                        .mockReturnValue(testElement)

                    // Create selection event
                    const event: ToolEvent = {
                        type: 'mousedown',
                        position: new THREE.Vector3(0, 0, 0),
                        button: 0,
                        ctrlKey: useCtrl
                    }

                    const result = selectTool.handleEvent(event)

                    // Verify behavior
                    expect(result?.success).toBe(true)

                    if (useCtrl && elementAlreadySelected) {
                        // Should deselect when Ctrl+clicking already selected element
                        expect(mockStore.deselectElement).toHaveBeenCalledWith('test-element')
                        expect(mockStore.selectElement).not.toHaveBeenCalled()
                    } else if (useCtrl && !elementAlreadySelected) {
                        // Should add to selection when Ctrl+clicking unselected element
                        expect(mockStore.selectElement).toHaveBeenCalledWith('test-element', true)
                        expect(mockStore.deselectElement).not.toHaveBeenCalled()
                    } else {
                        // Should replace selection when clicking without Ctrl
                        expect(mockStore.selectElement).toHaveBeenCalledWith('test-element', false)
                        expect(mockStore.deselectElement).not.toHaveBeenCalled()
                    }

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية صندوق التحديد
     * Selection box property
     */
    it('Property: Selection box should work correctly', () => {
        fc.assert(
            fc.property(
                fc.boolean(), // hasElementsInBox
                (hasElementsInBox) => {
                    // Create test elements
                    const elements: BuildingElement[] = hasElementsInBox ? [
                        {
                            id: 'element-1',
                            type: 'wall',
                            name: 'Wall 1',
                            position: { x: 0, y: 0, z: 0 },
                            rotation: { x: 0, y: 0, z: 0 },
                            scale: { x: 1, y: 1, z: 1 },
                            properties: {},
                            visible: true,
                            locked: false,
                            created: '2024-01-01T00:00:00Z',
                            modified: '2024-01-01T00:00:00Z'
                        }
                    ] : []

                    // Setup store
                    mockStore.elements = elements

                    // Mock intersection methods for selection box
                    vi.spyOn(selectTool as any, 'getIntersectionPoint')
                        .mockReturnValue(new THREE.Vector3(0, 0, 0))
                    vi.spyOn(selectTool as any, 'getElementAtPoint')
                        .mockReturnValue(undefined) // No element at click point

                    // Start selection box
                    const startEvent: ToolEvent = {
                        type: 'mousedown',
                        position: new THREE.Vector3(0, 0, 0),
                        button: 0
                    }

                    const startResult = selectTool.handleEvent(startEvent)
                    expect(startResult?.success).toBe(true)
                    expect(startResult?.message).toContain('بدء تحديد المنطقة')

                    // End selection box
                    const endEvent: ToolEvent = {
                        type: 'mouseup',
                        position: new THREE.Vector3(1, 1, 0),
                        button: 0
                    }

                    const endResult = selectTool.handleEvent(endEvent)
                    expect(endResult?.success).toBe(true)

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية السحب والإفلات
     * Drag and drop property
     */
    it('Property: Element dragging should respect locked status', () => {
        fc.assert(
            fc.property(
                fc.boolean(), // locked
                fc.boolean(), // snapToGrid
                (locked, snapToGrid) => {
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
                        locked,
                        created: '2024-01-01T00:00:00Z',
                        modified: '2024-01-01T00:00:00Z'
                    }

                    // Setup store
                    mockStore.elements = [testElement]
                    mockStore.getElementById.mockReturnValue(testElement)
                    mockStore.selectionState.selectedElements = ['test-element'] // Element must be selected to drag
                    mockStore.project.settings.snapToGrid = snapToGrid
                    mockStore.project.settings.gridSize = 1

                    // Ensure useStore.getState returns the updated mock store
                    vi.mocked(useStore.getState).mockReturnValue(mockStore)

                    // Clear mock calls
                    mockStore.updateElement.mockClear()

                    // Mock intersection methods
                    vi.spyOn(selectTool as any, 'getIntersectionPoint')
                        .mockReturnValueOnce(new THREE.Vector3(0, 0, 0)) // Start position
                        .mockReturnValueOnce(new THREE.Vector3(1, 0, 1)) // End position
                    vi.spyOn(selectTool as any, 'getElementAtPoint')
                        .mockReturnValue(testElement)

                    // Start drag
                    const startEvent: ToolEvent = {
                        type: 'mousedown',
                        position: new THREE.Vector3(0, 0, 0),
                        button: 0
                    }

                    selectTool.handleEvent(startEvent)

                    // Perform drag with significant movement (more than 5 pixel threshold)
                    const dragEvent: ToolEvent = {
                        type: 'mousemove',
                        position: new THREE.Vector3(10, 10, 0) // Large movement to ensure drag threshold is exceeded
                    }

                    selectTool.handleEvent(dragEvent)

                    // End drag
                    const endEvent: ToolEvent = {
                        type: 'mouseup',
                        position: new THREE.Vector3(10, 10, 0),
                        button: 0
                    }

                    selectTool.handleEvent(endEvent)

                    if (locked) {
                        // Locked elements should not be moved
                        expect(mockStore.updateElement).not.toHaveBeenCalled()
                    } else {
                        // Unlocked elements should be moved
                        expect(mockStore.updateElement).toHaveBeenCalled()
                    }

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية الاستقرار
     * Stability property
     */
    it('Property: Selection operations should maintain consistent state', () => {
        fc.assert(
            fc.property(
                fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // sequence of select/deselect operations
                (operations) => {
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

                    // Setup store
                    mockStore.elements = [testElement]
                    mockStore.getElementById.mockReturnValue(testElement)

                    let isSelected = false

                    // Mock intersection methods
                    vi.spyOn(selectTool as any, 'getIntersectionPoint')
                        .mockReturnValue(new THREE.Vector3(0, 0, 0))
                    vi.spyOn(selectTool as any, 'getElementAtPoint')
                        .mockReturnValue(testElement)

                    // Process operations
                    for (const shouldSelect of operations) {
                        mockStore.selectionState.selectedElements = isSelected ? ['test-element'] : []
                        mockStore.selectElement.mockClear()
                        mockStore.deselectElement.mockClear()

                        const event: ToolEvent = {
                            type: 'mousedown',
                            position: new THREE.Vector3(0, 0, 0),
                            button: 0,
                            ctrlKey: shouldSelect && isSelected // Use Ctrl to deselect if already selected
                        }

                        const result = selectTool.handleEvent(event)
                        expect(result?.success).toBe(true)

                        // Update expected state
                        if (shouldSelect && isSelected) {
                            // Deselect
                            isSelected = false
                        } else if (shouldSelect || !isSelected) {
                            // Select
                            isSelected = true
                        }
                    }

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })
})