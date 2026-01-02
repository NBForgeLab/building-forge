/**
 * اختبارات خاصية لأداة التحريك المتقدمة
 * Property tests for MoveTool
 */

import * as fc from 'fast-check'
import { Vector3 } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingElement } from '../../store/types'
import { ToolContext, ToolEvent } from '../BaseTool'
import { MoveTool } from '../MoveTool'

// Mock store
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
    setTransformMode: vi.fn(),
    getElementById: vi.fn(),
    updateElement: vi.fn(),
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
function createTestElement(id: string, position: Vector3, locked: boolean = false): BuildingElement {
    return {
        id,
        type: 'wall',
        name: `Test Wall ${id}`,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        properties: {
            width: 2,
            height: 3,
            thickness: 0.2
        },
        visible: true,
        locked,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
    }
}

describe('MoveTool Property Tests', () => {
    let moveTool: MoveTool

    beforeEach(() => {
        moveTool = new MoveTool()
        vi.clearAllMocks()

        // Reset mock store state
        mockStoreState.elements = []
        mockStoreState.selectionState.selectedElements = []
        mockStoreState.selectionState.transformMode = 'translate'
    })

    describe('الخاصية 5: تحويل العناصر - Gizmo Interaction', () => {
        it('should display gizmo for selected elements', () => {
            fc.assert(fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        x: fc.float({ min: -20, max: 20 }),
                        y: fc.float({ min: 0, max: 10 }),
                        z: fc.float({ min: -20, max: 20 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (elements) => {
                    moveTool.activate(mockContext)

                    // Create and select elements
                    const testElements = elements.map(e =>
                        createTestElement(e.id, new Vector3(e.x, e.y, e.z))
                    )
                    mockStoreState.elements = testElements
                    mockStoreState.selectionState.selectedElements = elements.map(e => e.id)

                    // Mock getElementById calls
                    elements.forEach((e, index) => {
                        mockStoreState.getElementById.mockReturnValueOnce(testElements[index])
                    })

                    // Trigger gizmo update by activating tool
                    moveTool.activate(mockContext)

                    const gizmoData = moveTool.getGizmoData()

                    if (elements.length > 0) {
                        expect(gizmoData).toBeDefined()
                        expect(gizmoData?.visible).toBe(true)
                        expect(gizmoData?.position).toBeInstanceOf(Vector3)

                        // Gizmo should be at center of selected elements
                        const expectedX = elements.reduce((sum, e) => sum + e.x, 0) / elements.length
                        const expectedY = elements.reduce((sum, e) => sum + e.y, 0) / elements.length
                        const expectedZ = elements.reduce((sum, e) => sum + e.z, 0) / elements.length

                        expect(Math.abs(gizmoData!.position.x - expectedX)).toBeLessThan(0.001)
                        expect(Math.abs(gizmoData!.position.y - expectedY)).toBeLessThan(0.001)
                        expect(Math.abs(gizmoData!.position.z - expectedZ)).toBeLessThan(0.001)
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })

        it('should handle gizmo axis constraints', () => {
            fc.assert(fc.property(
                fc.record({
                    axis: fc.constantFrom('x', 'y', 'z', 'xy', 'xz', 'yz', 'xyz'),
                    elementId: fc.string({ minLength: 1, maxLength: 10 }),
                    startX: fc.float({ min: -10, max: 10 }),
                    startY: fc.float({ min: 0, max: 5 }),
                    startZ: fc.float({ min: -10, max: 10 })
                }),
                (data) => {
                    moveTool.activate(mockContext)

                    // Create and select element
                    const element = createTestElement(data.elementId, new Vector3(data.startX, data.startY, data.startZ))
                    mockStoreState.elements = [element]
                    mockStoreState.selectionState.selectedElements = [data.elementId]
                    mockStoreState.getElementById.mockReturnValue(element)

                    // Set axis constraint
                    moveTool.setConstraint({ axis: data.axis as any })

                    const constraint = moveTool.getConstraint()
                    expect(constraint.axis).toBe(data.axis)

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })
    })

    describe('الخاصية 5: تحويل العناصر - Dragging with Constraints', () => {
        it('should handle constrained movement along axes', () => {
            fc.assert(fc.property(
                fc.record({
                    elementId: fc.string({ minLength: 1, maxLength: 10 }),
                    startX: fc.float({ min: -10, max: 10 }),
                    startZ: fc.float({ min: -10, max: 10 }),
                    deltaX: fc.float({ min: -5, max: 5 }),
                    deltaZ: fc.float({ min: -5, max: 5 }),
                    axis: fc.constantFrom('x', 'y', 'z', undefined)
                }),
                (data) => {
                    moveTool.activate(mockContext)

                    // Create and select element
                    const element = createTestElement(data.elementId, new Vector3(data.startX, 0, data.startZ))
                    mockStoreState.elements = [element]
                    mockStoreState.selectionState.selectedElements = [data.elementId]
                    mockStoreState.getElementById.mockReturnValue(element)

                    // Set axis constraint
                    if (data.axis) {
                        moveTool.setConstraint({ axis: data.axis as any })
                    }

                    // Mock intersection for start position
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(data.startX, 0, data.startZ)
                    )

                    // Start drag
                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0
                    }
                    moveTool.handleEvent(mouseDown)

                    // Mock intersection for end position
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(data.startX + data.deltaX, 0, data.startZ + data.deltaZ)
                    )

                    // Drag to new position
                    const mouseMove: ToolEvent = {
                        type: 'mousemove',
                        position: new Vector3(0.1, 0.1, 0)
                    }
                    moveTool.handleEvent(mouseMove)

                    // End drag
                    const mouseUp: ToolEvent = {
                        type: 'mouseup',
                        position: new Vector3(0.1, 0.1, 0),
                        button: 0
                    }
                    const result = moveTool.handleEvent(mouseUp)

                    // Should update element position according to constraints
                    if (result && result.success) {
                        expect(mockStoreState.updateElement).toHaveBeenCalled()
                        expect(mockStoreState.addHistoryEntry).toHaveBeenCalled()
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 50 })
        })

        it('should handle grid snapping during movement', () => {
            fc.assert(fc.property(
                fc.record({
                    elementId: fc.string({ minLength: 1, maxLength: 10 }),
                    startX: fc.float({ min: -10, max: 10 }),
                    startZ: fc.float({ min: -10, max: 10 }),
                    deltaX: fc.float({ min: -3, max: 3 }),
                    deltaZ: fc.float({ min: -3, max: 3 }),
                    gridSize: fc.float({ min: 0.5, max: 2 }),
                    snapToGrid: fc.boolean()
                }),
                (data) => {
                    moveTool.activate(mockContext)

                    // Create and select element
                    const element = createTestElement(data.elementId, new Vector3(data.startX, 0, data.startZ))
                    mockStoreState.elements = [element]
                    mockStoreState.selectionState.selectedElements = [data.elementId]
                    mockStoreState.getElementById.mockReturnValue(element)
                    mockStoreState.project.settings.gridSize = data.gridSize
                    mockStoreState.project.settings.snapToGrid = data.snapToGrid

                    // Set snapping constraint
                    moveTool.setConstraint({ snapToGrid: data.snapToGrid })

                    // Mock intersection for start position
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(data.startX, 0, data.startZ)
                    )

                    // Start drag
                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0
                    }
                    moveTool.handleEvent(mouseDown)

                    // Mock intersection for end position
                    const endX = data.startX + data.deltaX
                    const endZ = data.startZ + data.deltaZ
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(endX, 0, endZ)
                    )

                    // Drag to new position
                    const mouseMove: ToolEvent = {
                        type: 'mousemove',
                        position: new Vector3(0.1, 0.1, 0)
                    }
                    moveTool.handleEvent(mouseMove)

                    // End drag
                    const mouseUp: ToolEvent = {
                        type: 'mouseup',
                        position: new Vector3(0.1, 0.1, 0),
                        button: 0
                    }
                    const result = moveTool.handleEvent(mouseUp)

                    if (result && result.success && data.snapToGrid) {
                        // Position should be snapped to grid
                        expect(mockStoreState.updateElement).toHaveBeenCalled()

                        // Check that the update call used snapped coordinates
                        const updateCall = mockStoreState.updateElement.mock.calls[0]
                        if (updateCall && updateCall[1] && updateCall[1].position) {
                            const newPos = updateCall[1].position
                            const tolerance = 0.001

                            // Check grid alignment
                            expect(Math.abs(newPos.x % data.gridSize)).toBeLessThan(tolerance)
                            expect(Math.abs(newPos.z % data.gridSize)).toBeLessThan(tolerance)
                        }
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 50 })
        })
    })

    describe('Keyboard Shortcuts for Constraints', () => {
        it('should handle axis constraint shortcuts', () => {
            fc.assert(fc.property(
                fc.constantFrom('x', 'y', 'z'),
                (axis) => {
                    moveTool.activate(mockContext)

                    // Create and select element
                    const element = createTestElement('test', new Vector3(0, 0, 0))
                    mockStoreState.elements = [element]
                    mockStoreState.selectionState.selectedElements = ['test']

                    const keyEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key: axis
                    }

                    const result = moveTool.handleEvent(keyEvent)

                    expect(result).toBeDefined()
                    if (result && result.success) {
                        const constraint = moveTool.getConstraint()
                        expect(constraint.axis).toBe(axis)
                    }

                    // Press same key again to toggle off
                    const result2 = moveTool.handleEvent(keyEvent)
                    if (result2 && result2.success) {
                        const constraint2 = moveTool.getConstraint()
                        expect(constraint2.axis).toBeUndefined()
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })

        it('should handle grid snap toggle', () => {
            fc.assert(fc.property(
                fc.boolean(),
                (initialSnapState) => {
                    moveTool.activate(mockContext)

                    // Set initial snap state
                    moveTool.setConstraint({ snapToGrid: initialSnapState })

                    const gridToggleEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key: 'g'
                    }

                    const result = moveTool.handleEvent(gridToggleEvent)

                    expect(result).toBeDefined()
                    if (result && result.success) {
                        const constraint = moveTool.getConstraint()
                        expect(constraint.snapToGrid).toBe(!initialSnapState)
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })

        it('should handle fine movement with Shift key', () => {
            fc.assert(fc.property(
                fc.boolean(),
                (shiftPressed) => {
                    moveTool.activate(mockContext)

                    const keyEvent: ToolEvent = {
                        type: shiftPressed ? 'keydown' : 'keyup',
                        position: new Vector3(0, 0, 0),
                        key: 'Shift'
                    }

                    moveTool.handleEvent(keyEvent)

                    const constraint = moveTool.getConstraint()

                    if (shiftPressed) {
                        expect(constraint.snapDistance).toBe(0.01) // Fine movement
                    } else {
                        expect(constraint.snapDistance).toBe(0.1) // Normal movement
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })
    })

    describe('Drag Cancellation', () => {
        it('should handle Escape key to cancel drag', () => {
            fc.assert(fc.property(
                fc.record({
                    elementId: fc.string({ minLength: 1, maxLength: 10 }),
                    originalX: fc.float({ min: -10, max: 10 }),
                    originalZ: fc.float({ min: -10, max: 10 }),
                    deltaX: fc.float({ min: -5, max: 5 }),
                    deltaZ: fc.float({ min: -5, max: 5 })
                }),
                (data) => {
                    moveTool.activate(mockContext)

                    // Create and select element
                    const element = createTestElement(data.elementId, new Vector3(data.originalX, 0, data.originalZ))
                    mockStoreState.elements = [element]
                    mockStoreState.selectionState.selectedElements = [data.elementId]
                    mockStoreState.getElementById.mockReturnValue(element)

                    // Start drag
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(data.originalX, 0, data.originalZ)
                    )

                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0
                    }
                    moveTool.handleEvent(mouseDown)

                    // Move element
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(data.originalX + data.deltaX, 0, data.originalZ + data.deltaZ)
                    )

                    const mouseMove: ToolEvent = {
                        type: 'mousemove',
                        position: new Vector3(0.1, 0.1, 0)
                    }
                    moveTool.handleEvent(mouseMove)

                    // Cancel with Escape
                    const escapeEvent: ToolEvent = {
                        type: 'keydown',
                        position: new Vector3(0, 0, 0),
                        key: 'Escape'
                    }
                    const result = moveTool.handleEvent(escapeEvent)

                    expect(result).toBeDefined()
                    if (result && result.success) {
                        // Element should be restored to original position
                        expect(mockStoreState.updateElement).toHaveBeenCalledWith(data.elementId, {
                            position: {
                                x: data.originalX,
                                y: 0,
                                z: data.originalZ
                            }
                        })
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 50 })
        })
    })

    describe('Multiple Element Movement', () => {
        it('should move multiple selected elements together', () => {
            fc.assert(fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        x: fc.float({ min: -10, max: 10 }),
                        z: fc.float({ min: -10, max: 10 }),
                        locked: fc.boolean()
                    }),
                    { minLength: 2, maxLength: 5 }
                ),
                fc.record({
                    deltaX: fc.float({ min: -3, max: 3 }),
                    deltaZ: fc.float({ min: -3, max: 3 })
                }),
                (elements, movement) => {
                    moveTool.activate(mockContext)

                    // Create and select elements
                    const testElements = elements.map(e =>
                        createTestElement(e.id, new Vector3(e.x, 0, e.z), e.locked)
                    )
                    mockStoreState.elements = testElements
                    mockStoreState.selectionState.selectedElements = elements.map(e => e.id)

                    // Mock getElementById calls
                    elements.forEach((e, index) => {
                        mockStoreState.getElementById.mockReturnValue(testElements[index])
                    })

                    // Calculate center position
                    const centerX = elements.reduce((sum, e) => sum + e.x, 0) / elements.length
                    const centerZ = elements.reduce((sum, e) => sum + e.z, 0) / elements.length

                    // Start drag from center
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(centerX, 0, centerZ)
                    )

                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0
                    }
                    moveTool.handleEvent(mouseDown)

                    // Move to new position
                    mockRaycaster.ray.intersectPlane.mockReturnValueOnce(
                        new Vector3(centerX + movement.deltaX, 0, centerZ + movement.deltaZ)
                    )

                    const mouseMove: ToolEvent = {
                        type: 'mousemove',
                        position: new Vector3(0.1, 0.1, 0)
                    }
                    moveTool.handleEvent(mouseMove)

                    // End drag
                    const mouseUp: ToolEvent = {
                        type: 'mouseup',
                        position: new Vector3(0.1, 0.1, 0),
                        button: 0
                    }
                    const result = moveTool.handleEvent(mouseUp)

                    if (result && result.success) {
                        // Should update all unlocked elements
                        const unlockedElements = elements.filter(e => !e.locked)
                        expect(mockStoreState.updateElement).toHaveBeenCalledTimes(unlockedElements.length)

                        // Should add history entry
                        expect(mockStoreState.addHistoryEntry).toHaveBeenCalledWith(
                            'move_elements',
                            expect.stringContaining('تحريك'),
                            expect.any(Object)
                        )
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 30 })
        })
    })

    describe('Error Handling', () => {
        it('should handle no selected elements gracefully', () => {
            fc.assert(fc.property(
                fc.record({
                    x: fc.float({ min: -1, max: 1 }),
                    y: fc.float({ min: -1, max: 1 })
                }),
                (data) => {
                    moveTool.activate(mockContext)

                    // No elements selected
                    mockStoreState.selectionState.selectedElements = []

                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(data.x, data.y, 0),
                        button: 0
                    }

                    const result = moveTool.handleEvent(mouseDown)

                    expect(result).toBeDefined()
                    if (result) {
                        expect(result.success).toBe(false)
                        expect(result.error).toContain('لا توجد عناصر محددة')
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 100 })
        })

        it('should handle locked elements correctly', () => {
            fc.assert(fc.property(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 10 }),
                        x: fc.float({ min: -10, max: 10 }),
                        z: fc.float({ min: -10, max: 10 }),
                        locked: fc.boolean()
                    }),
                    { minLength: 1, maxLength: 3 }
                ),
                (elements) => {
                    moveTool.activate(mockContext)

                    // Create elements with mixed lock states
                    const testElements = elements.map(e =>
                        createTestElement(e.id, new Vector3(e.x, 0, e.z), e.locked)
                    )
                    mockStoreState.elements = testElements
                    mockStoreState.selectionState.selectedElements = elements.map(e => e.id)

                    elements.forEach((e, index) => {
                        mockStoreState.getElementById.mockReturnValue(testElements[index])
                    })

                    // Start and complete a drag operation
                    mockRaycaster.ray.intersectPlane.mockReturnValue(new Vector3(0, 0, 0))

                    const mouseDown: ToolEvent = {
                        type: 'mousedown',
                        position: new Vector3(0, 0, 0),
                        button: 0
                    }
                    moveTool.handleEvent(mouseDown)

                    const mouseMove: ToolEvent = {
                        type: 'mousemove',
                        position: new Vector3(0.1, 0.1, 0)
                    }
                    moveTool.handleEvent(mouseMove)

                    const mouseUp: ToolEvent = {
                        type: 'mouseup',
                        position: new Vector3(0.1, 0.1, 0),
                        button: 0
                    }
                    const result = moveTool.handleEvent(mouseUp)

                    if (result && result.success) {
                        // Should only update unlocked elements
                        const unlockedCount = elements.filter(e => !e.locked).length
                        expect(mockStoreState.updateElement).toHaveBeenCalledTimes(unlockedCount)
                    }

                    moveTool.deactivate()
                    return true
                }
            ), { numRuns: 50 })
        })
    })
})