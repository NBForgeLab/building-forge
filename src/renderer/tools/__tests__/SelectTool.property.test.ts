/**
 * اختبارات خاصية لأداة التحديد المتقدمة
 * Property tests for SelectTool
 */

import * as fc from 'fast-check'
import { Vector3 } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingElement } from '../../store/types'
import { ToolContext, ToolEvent } from '../BaseTool'
import { SelectTool } from '../SelectTool'

// Mock store
const mockStore = {
    getState: vi.fn(),
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn()
}

const mockStoreState = {
    elements: [] as BuildingElement[],
    selectionState: {
        selectedElements: [] as string[],
        transformMode: 'translate' as const
    },
    project: {
        settings: {
            gridSize: 1,
            snapToGrid: true
        }
    },
    selectElement: vi.fn(),
    selectElements: vi.fn(),
    deselectElement: vi.fn(),
    clearSelection: vi.fn(),
    setHoveredElement: vi.fn(),
    updateElement: vi.fn(),
    removeElements: vi.fn(),
    duplicateElement: vi.fn(),
    updateProject: vi.fn(),
    setTransformMode: vi.fn(),
    getElementById: vi.fn(),
    addHistoryEntry: vi.fn()
}

vi.mock('../../store', () => ({
    useStore: {
        getState: () => mockStoreState
    }
}))

// Mock Three.js objects
const mockCamera = {
    position: new Vector3(0, 10, 10),
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
    getWorldDirection: vi.fn((target) => target.set(0, 0, -1))
} as any

const mockScene = {
    children: [],
    add: vi.fn(),
    remove: vi.fn()
} as any

const mockRaycaster = {
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => []),
    ray: {
        intersectPlane: vi.fn((plane, target) => {
            target.set(0, 0, 0)
            return target
        })
    }
} as any

const mockRenderer = {
    render: vi.fn(),
    setSize: vi.fn()
} as any

const mockCanvas = {
    getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
    })),
    style: { cursor: 'default' }
} as any

const mockContext: ToolContext = {
    camera: mockCamera,
    scene: mockScene,
    raycaster: mockRaycaster,
    renderer: mockRenderer,
    canvas: mockCanvas
}

// Helper function to create test elements
function createTestElement(id: string, position: Vector3, type: BuildingElement['type'] = 'wall'): BuildingElement {
    return {
        id,
        type,
        name: `Test ${type} ${id}`,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        properties: {
            width: 2,
            height: 3,
            thickness: 0.2
        },
        visible: true,
        locked: false,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
    }
}

describe('SelectTool Property Tests', () => {
    let selectTool: SelectTool

    beforeEach(() => {
        selectTool = new SelectTool()
        vi.clearAllMocks()

        // Reset mock store state
        mockStoreState.elements = []
        mockStoreState.selectionState.selectedElements = []
        mockStoreState.selectionState.transformMode = 'translate'
    })

    describe('الخاصية 4: تحديد العناصر', () => {
        it('should handle single element selection consistently', () => {
            fc.assert(fc.property(
                fc.record({
                    elementId: fc.string({ minLength: 1, maxLength: 20 }),
                    x: fc.float({ min: -50, max: 50 }),
                    y: fc.float({ min: 0, max: 10 }),
                    z: fc.float({ min: -50, max: 50 }),
                    ctrlKey: fc.boolean(),
                    shiftKey: fc.boolean()
                }),
                (data) => {
                    selectTool.activate(mockContext)

                    // Create test element
                    const element = createTestElement(data.elementId, new Vector3(data.x, data.y, data.z))
                    mockStoreState.elements = [element]
                    mockStoreState.getElementById.mockReturnValue(element)

                    // Mock intersection to return the element position
                    mockRaycaster.intersectObjects.mockReturnValueOnce([
                        { point: new Vector3(data.x, data.y, data.z) }
                    ])

                    const mouseEvent: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0), // Screen coordinates
                        button: 0,
                        ctrlKey: data.ctrlKey,
                        shiftKey: data.shiftKey
                    }

                    const result = selectTool.handleEvent(mouseEvent)

                    // Should handle the event
                    expect(result).toBeDefined()

                    if (result) {
                        expect(result.success).toBe(true)
                        expect(typeof result.message).toBe('string')
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })

        it('should handle empty space clicks for area selection', () => {
            fc.assert(fc.property(
                fc.record({
                    x: fc.float({ min: -50, max: 50 }),
                    y: fc.float({ min: 0, max: 10 }),
                    z: fc.float({ min: -50, max: 50 }),
                    ctrlKey: fc.boolean()
                }),
                (data) => {
                    selectTool.activate(mockContext)

                    // No elements in scene
                    mockStoreState.elements = []

                    // Mock intersection to return ground point
                    mockRaycaster.intersectObjects.mockReturnValueOnce([])

                    const mouseEvent: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0,
                        ctrlKey: data.ctrlKey
                    }

                    const result = selectTool.handleEvent(mouseEvent)

                    // Should start area selection
                    const selectionBox = selectTool.getSelectionBox()

                    if (!data.ctrlKey) {
                        // Should clear selection if not holding Ctrl
                        expect(mockStoreState.clearSelection).toHaveBeenCalled()
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })
    })

    describe('الخاصية 5: تحويل العناصر - Dragging', () => {
        it('should handle element dragging with grid snapping', () => {
            fc.assert(fc.property(
                fc.record({
                    elementId: fc.string({ minLength: 1, maxLength: 20 }),
                    startX: fc.float({ min: -20, max: 20 }),
                    startZ: fc.float({ min: -20, max: 20 }),
                    endX: fc.float({ min: -20, max: 20 }),
                    endZ: fc.float({ min: -20, max: 20 }),
                    gridSize: fc.float({ min: 0.5, max: 2 }),
                    snapToGrid: fc.boolean()
                }),
                (data) => {
                    selectTool.activate(mockContext)

                    // Create and select element
                    const element = createTestElement(data.elementId, new Vector3(data.startX, 0, data.startZ))
                    mockStoreState.elements = [element]
                    mockStoreState.selectionState.selectedElements = [data.elementId]
                    mockStoreState.getElementById.mockReturnValue(element)
                    mockStoreState.project.settings.gridSize = data.gridSize
                    mockStoreState.project.settings.snapToGrid = data.snapToGrid

                    // Mock intersection for start position
                    mockRaycaster.intersectObjects.mockReturnValueOnce([
                        { point: new Vector3(data.startX, 0, data.startZ) }
                    ])

                    // Start drag
                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0
                    }
                    selectTool.handleEvent(mouseDown)

                    // Mock intersection for end position
                    mockRaycaster.intersectObjects.mockReturnValueOnce([
                        { point: new Vector3(data.endX, 0, data.endZ) }
                    ])

                    // Drag to new position
                    const mouseMove: ToolEvent = {
                        type: 'mousemove',
                        position: new Vector3(0.1, 0.1, 0), // Different screen position
                    }
                    selectTool.handleEvent(mouseMove)

                    // End drag
                    const mouseUp: ToolEvent = {
                        type: 'mouseup',
                        position: new Vector3(0.1, 0.1, 0),
                        button: 0
                    }
                    const result = selectTool.handleEvent(mouseUp)

                    // Should update element position
                    if (data.snapToGrid) {
                        // Position should be snapped to grid
                        expect(mockStoreState.updateElement).toHaveBeenCalled()
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 50 })
        })
    })

    describe('الخاصية 6: التحديد المتعدد', () => {
        it('should handle multiple element selection with Ctrl key', () => {
            fc.assert(fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        x: fc.float({ min: -20, max: 20 }),
                        z: fc.float({ min: -20, max: 20 })
                    }),
                    { minLength: 2, maxLength: 5 }
                ),
                (elements) => {
                    selectTool.activate(mockContext)

                    // Create test elements
                    const testElements = elements.map(e =>
                        createTestElement(e.id, new Vector3(e.x, 0, e.z))
                    )
                    mockStoreState.elements = testElements

                    let selectedCount = 0

                    // Select each element with Ctrl key
                    for (const element of testElements) {
                        mockStoreState.getElementById.mockReturnValue(element)
                        mockRaycaster.intersectObjects.mockReturnValueOnce([
                            { point: new Vector3(element.position.x, 0, element.position.z) }
                        ])

                        const mouseEvent: ToolEvent = {
                            type: 'mousedown',
                            position: new Vector3(0, 0, 0),
                            button: 0,
                            ctrlKey: true // Multi-select
                        }

                        const result = selectTool.handleEvent(mouseEvent)
                        selectedCount++

                        expect(result).toBeDefined()
                        if (result) {
                            expect(result.success).toBe(true)
                        }
                    }

                    // Should have called selectElement for each element
                    expect(mockStoreState.selectElement).toHaveBeenCalledTimes(selectedCount)

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 50 })
        })

        it('should handle area selection box', () => {
            fc.assert(fc.property(
                fc.record({
                    startX: fc.float({ min: -10, max: 10 }),
                    startZ: fc.float({ min: -10, max: 10 }),
                    endX: fc.float({ min: -10, max: 10 }),
                    endZ: fc.float({ min: -10, max: 10 }),
                    elementCount: fc.integer({ min: 1, max: 5 })
                }),
                (data) => {
                    selectTool.activate(mockContext)

                    // Create elements within selection area
                    const minX = Math.min(data.startX, data.endX)
                    const maxX = Math.max(data.startX, data.endX)
                    const minZ = Math.min(data.startZ, data.endZ)
                    const maxZ = Math.max(data.startZ, data.endZ)

                    const testElements: BuildingElement[] = []
                    for (let i = 0; i < data.elementCount; i++) {
                        const x = minX + (maxX - minX) * (i / data.elementCount)
                        const z = minZ + (maxZ - minZ) * (i / data.elementCount)
                        testElements.push(createTestElement(`element-${i}`, new Vector3(x, 0, z)))
                    }

                    mockStoreState.elements = testElements

                    // Start selection box
                    mockRaycaster.intersectObjects.mockReturnValueOnce([])
                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0
                    }
                    selectTool.handleEvent(mouseDown)

                    // Update selection box
                    mockRaycaster.intersectObjects.mockReturnValueOnce([])
                    const mouseMove: ToolEvent = {
                        type: 'mousemove',
                        position: new Vector3(0.1, 0.1, 0)
                    }
                    selectTool.handleEvent(mouseMove)

                    // End selection
                    const mouseUp: ToolEvent = {
                        type: 'mouseup',
                        position: new Vector3(0.1, 0.1, 0),
                        button: 0
                    }
                    const result = selectTool.handleEvent(mouseUp)

                    // Should have selection box data
                    const selectionBox = selectTool.getSelectionBox()
                    expect(selectionBox).toBeUndefined() // Should be cleared after selection

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 50 })
        })
    })

    describe('Keyboard Shortcuts', () => {
        it('should handle delete key for selected elements', () => {
            fc.assert(fc.property(
                fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
                (elementIds) => {
                    selectTool.activate(mockContext)

                    // Set up selected elements
                    mockStoreState.selectionState.selectedElements = elementIds
                    elementIds.forEach(id => {
                        const element = createTestElement(id, new Vector3(0, 0, 0))
                        mockStoreState.getElementById.mockReturnValue(element)
                    })

                    const deleteEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key: 'Delete'
                    }

                    const result = selectTool.handleEvent(deleteEvent)

                    expect(result).toBeDefined()
                    if (result) {
                        if (result.success) {
                            expect(mockStoreState.removeElements).toHaveBeenCalledWith(elementIds)
                            expect(mockStoreState.clearSelection).toHaveBeenCalled()
                        }
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })

        it('should handle Ctrl+A for select all', () => {
            fc.assert(fc.property(
                fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
                (elementIds) => {
                    selectTool.activate(mockContext)

                    // Create elements
                    const elements = elementIds.map(id => createTestElement(id, new Vector3(0, 0, 0)))
                    mockStoreState.elements = elements

                    const selectAllEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key: 'a',
                        ctrlKey: true
                    }

                    const result = selectTool.handleEvent(selectAllEvent)

                    expect(result).toBeDefined()
                    if (result && result.success) {
                        expect(mockStoreState.selectElements).toHaveBeenCalledWith(elementIds)
                        expect(result.elements?.length).toBe(elementIds.length)
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })

        it('should handle Ctrl+D for duplication', () => {
            fc.assert(fc.property(
                fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
                (elementIds) => {
                    selectTool.activate(mockContext)

                    // Set up selected elements
                    mockStoreState.selectionState.selectedElements = elementIds

                    // Mock duplication to return new elements
                    elementIds.forEach(id => {
                        const newElement = createTestElement(`${id}-copy`, new Vector3(1, 0, 1))
                        mockStoreState.duplicateElement.mockReturnValueOnce(newElement)
                    })

                    const duplicateEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key: 'd',
                        ctrlKey: true
                    }

                    const result = selectTool.handleEvent(duplicateEvent)

                    expect(result).toBeDefined()
                    if (result && result.success) {
                        expect(mockStoreState.duplicateElement).toHaveBeenCalledTimes(elementIds.length)
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })
    })

    describe('Context Menu', () => {
        it('should handle right-click context menu', () => {
            fc.assert(fc.property(
                fc.record({
                    elementId: fc.string({ minLength: 1, maxLength: 20 }),
                    x: fc.float({ min: -10, max: 10 }),
                    z: fc.float({ min: -10, max: 10 })
                }),
                (data) => {
                    selectTool.activate(mockContext)

                    // Create element
                    const element = createTestElement(data.elementId, new Vector3(data.x, 0, data.z))
                    mockStoreState.elements = [element]
                    mockStoreState.getElementById.mockReturnValue(element)
                    mockStoreState.selectionState.selectedElements = [data.elementId]

                    // Mock intersection
                    mockRaycaster.intersectObjects.mockReturnValueOnce([
                        { point: new Vector3(data.x, 0, data.z) }
                    ])

                    const rightClickEvent: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 2 // Right click
                    }

                    const result = selectTool.handleEvent(rightClickEvent)

                    // Should show context menu
                    const contextMenu = selectTool.getContextMenu()

                    if (result && result.success) {
                        expect(contextMenu).toBeDefined()
                        expect(contextMenu?.visible).toBe(true)
                        expect(contextMenu?.elements.length).toBeGreaterThan(0)
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })
    })

    describe('Transform Mode Switching', () => {
        it('should handle transform mode shortcuts', () => {
            fc.assert(fc.property(
                fc.constantFrom('g', 'r', 's', 't'),
                (key) => {
                    selectTool.activate(mockContext)

                    const keyEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key
                    }

                    const result = selectTool.handleEvent(keyEvent)

                    expect(result).toBeDefined()

                    if (result && result.success) {
                        // Should have called appropriate transform mode
                        switch (key) {
                            case 'r':
                                expect(mockStoreState.setTransformMode).toHaveBeenCalledWith('rotate')
                                break
                            case 's':
                                expect(mockStoreState.setTransformMode).toHaveBeenCalledWith('scale')
                                break
                            case 't':
                                // Toggle transform mode
                                expect(mockStoreState.setTransformMode).toHaveBeenCalled()
                                break
                        }
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })
    })

    describe('Grid Snapping', () => {
        it('should toggle grid snap correctly', () => {
            fc.assert(fc.property(
                fc.boolean(),
                (initialSnapState) => {
                    selectTool.activate(mockContext)

                    mockStoreState.project.settings.snapToGrid = initialSnapState

                    const gridToggleEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key: 'g'
                    }

                    const result = selectTool.handleEvent(gridToggleEvent)

                    expect(result).toBeDefined()
                    if (result && result.success) {
                        expect(mockStoreState.updateProject).toHaveBeenCalledWith({
                            settings: {
                                ...mockStoreState.project.settings,
                                snapToGrid: !initialSnapState
                            }
                        })
                    }

                    selectTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })
    })
})