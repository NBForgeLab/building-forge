/**
 * اختبارات الخصائص لأدوات التحويل
 * Property tests for transform tools
 */

import fc from 'fast-check'
import { Vector3 } from 'three'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store'
import { BuildingElement } from '../../store/types'
import { ToolContext, ToolEvent } from '../BaseTool'
import { MoveTool } from '../MoveTool'
import { RotateTool } from '../RotateTool'
import { ScaleTool } from '../ScaleTool'
import { TransformToolsManager } from '../TransformToolsManager'

// Mock Three.js context
const mockContext: ToolContext = {
    camera: {
        position: new Vector3(0, 5, 10),
        lookAt: () => { },
        getWorldDirection: () => new Vector3(0, 0, -1),
        updateProjectionMatrix: () => { },
        project: (vector: Vector3) => vector.clone()
    } as any,
    scene: {
        children: [],
        add: () => { },
        remove: () => { }
    } as any,
    raycaster: {
        setFromCamera: () => { },
        intersectObjects: () => [],
        ray: {
            intersectPlane: () => new Vector3(0, 0, 0)
        }
    } as any,
    renderer: {} as any,
    canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        addEventListener: () => { },
        removeEventListener: () => { },
        style: { cursor: 'default' }
    } as any
}

// Generators for test data
const vector3Generator = fc.record({
    x: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
    y: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
    z: fc.float({ min: Math.fround(-100), max: Math.fround(100) })
})

const elementGenerator = fc.record({
    id: fc.string({ minLength: 1 }),
    type: fc.constantFrom('wall', 'floor', 'door', 'window', 'cut'),
    name: fc.string({ minLength: 1 }),
    position: vector3Generator,
    rotation: vector3Generator,
    scale: fc.record({
        x: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
        y: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
        z: fc.float({ min: Math.fround(0.1), max: Math.fround(10) })
    }),
    properties: fc.record({
        thickness: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(2) })),
        height: fc.option(fc.float({ min: Math.fround(0.5), max: Math.fround(5) })),
        width: fc.option(fc.float({ min: Math.fround(0.5), max: Math.fround(5) }))
    }),
    visible: fc.boolean(),
    locked: fc.boolean(),
    created: fc.date().map(d => d.toISOString()),
    modified: fc.date().map(d => d.toISOString())
}) as fc.Arbitrary<BuildingElement>

const toolEventGenerator = fc.record({
    type: fc.constantFrom('mousedown', 'mousemove', 'mouseup', 'keydown', 'keyup'),
    position: vector3Generator,
    button: fc.option(fc.integer({ min: 0, max: 2 })),
    key: fc.option(fc.string({ minLength: 1, maxLength: 1 })),
    ctrlKey: fc.boolean(),
    shiftKey: fc.boolean(),
    altKey: fc.boolean()
}) as fc.Arbitrary<ToolEvent>

describe('Transform Tools Property Tests', () => {
    let moveTool: MoveTool
    let rotateTool: RotateTool
    let scaleTool: ScaleTool
    let transformManager: TransformToolsManager

    beforeEach(() => {
        // Reset store
        useStore.getState().clearProject()
        useStore.getState().createNewProject('Test Project')

        // Initialize tools
        moveTool = new MoveTool()
        rotateTool = new RotateTool()
        scaleTool = new ScaleTool()
        transformManager = new TransformToolsManager()

        // Set context
        moveTool.activate(mockContext)
        rotateTool.activate(mockContext)
        scaleTool.activate(mockContext)
        transformManager.setContext(mockContext)
    })

    afterEach(() => {
        moveTool.deactivate()
        rotateTool.deactivate()
        scaleTool.deactivate()
        transformManager.dispose()
    })

    describe('خاصية 5: تحويل العناصر (Transform Elements)', () => {
        it('يجب أن تحافظ أداة التحريك على صحة المواضع', () => {
            fc.assert(
                fc.property(
                    fc.array(elementGenerator, { minLength: 1, maxLength: 10 }),
                    vector3Generator,
                    (elements, delta) => {
                        // Setup: Add elements to store and select them
                        const store = useStore.getState()
                        elements.forEach(element => {
                            store.addElement(element)
                            store.selectElement(element.id, true)
                        })

                        // Get initial positions
                        const initialPositions = elements.map(e => ({ ...e.position }))

                        // Apply movement
                        const result = transformManager.quickMove(delta)

                        // Verify result
                        expect(result?.success).toBe(true)

                        // Check that positions changed correctly
                        elements.forEach((element, index) => {
                            const updatedElement = store.getElementById(element.id)
                            expect(updatedElement).toBeDefined()

                            if (updatedElement && !element.locked) {
                                expect(updatedElement.position.x).toBeCloseTo(
                                    initialPositions[index].x + delta.x,
                                    5
                                )
                                expect(updatedElement.position.y).toBeCloseTo(
                                    initialPositions[index].y + delta.y,
                                    5
                                )
                                expect(updatedElement.position.z).toBeCloseTo(
                                    initialPositions[index].z + delta.z,
                                    5
                                )
                            } else if (element.locked) {
                                // Locked elements should not move
                                expect(updatedElement?.position).toEqual(element.position)
                            }
                        })

                        // Cleanup
                        store.clearSelection()
                        elements.forEach(e => store.removeElement(e.id))
                    }
                ),
                { numRuns: 100 }
            )
        })

        it('يجب أن تحافظ أداة الدوران على صحة الزوايا', () => {
            fc.assert(
                fc.property(
                    fc.array(elementGenerator, { minLength: 1, maxLength: 10 }),
                    fc.float({ min: Math.fround(-360), max: Math.fround(360) }),
                    fc.constantFrom('x', 'y', 'z'),
                    (elements, angle, axis) => {
                        // Setup
                        const store = useStore.getState()
                        elements.forEach(element => {
                            store.addElement(element)
                            store.selectElement(element.id, true)
                        })

                        // Get initial rotations
                        const initialRotations = elements.map(e => ({ ...e.rotation }))

                        // Apply rotation
                        const result = transformManager.quickRotate(angle, axis)

                        // Verify result
                        expect(result?.success).toBe(true)

                        // Check that rotations changed correctly
                        const angleRad = (angle * Math.PI) / 180
                        elements.forEach((element, index) => {
                            const updatedElement = store.getElementById(element.id)
                            expect(updatedElement).toBeDefined()

                            if (updatedElement && !element.locked) {
                                const expectedRotation = initialRotations[index][axis] + angleRad
                                expect(updatedElement.rotation[axis]).toBeCloseTo(expectedRotation, 5)
                            } else if (element.locked) {
                                // Locked elements should not rotate
                                expect(updatedElement?.rotation).toEqual(element.rotation)
                            }
                        })

                        // Cleanup
                        store.clearSelection()
                        elements.forEach(e => store.removeElement(e.id))
                    }
                ),
                { numRuns: 100 }
            )
        })

        it('يجب أن تحافظ أداة التحجيم على صحة النسب', () => {
            fc.assert(
                fc.property(
                    fc.array(elementGenerator, { minLength: 1, maxLength: 10 }),
                    fc.float({ min: 0.1, max: 5 }),
                    (elements, scaleFactor) => {
                        // Setup
                        const store = useStore.getState()
                        elements.forEach(element => {
                            store.addElement(element)
                            store.selectElement(element.id, true)
                        })

                        // Get initial scales
                        const initialScales = elements.map(e => ({ ...e.scale }))

                        // Apply scaling
                        const result = transformManager.quickScale(scaleFactor)

                        // Verify result
                        expect(result?.success).toBe(true)

                        // Check that scales changed correctly
                        elements.forEach((element, index) => {
                            const updatedElement = store.getElementById(element.id)
                            expect(updatedElement).toBeDefined()

                            if (updatedElement && !element.locked) {
                                expect(updatedElement.scale.x).toBeCloseTo(
                                    initialScales[index].x * scaleFactor,
                                    5
                                )
                                expect(updatedElement.scale.y).toBeCloseTo(
                                    initialScales[index].y * scaleFactor,
                                    5
                                )
                                expect(updatedElement.scale.z).toBeCloseTo(
                                    initialScales[index].z * scaleFactor,
                                    5
                                )
                            } else if (element.locked) {
                                // Locked elements should not scale
                                expect(updatedElement?.scale).toEqual(element.scale)
                            }
                        })

                        // Cleanup
                        store.clearSelection()
                        elements.forEach(e => store.removeElement(e.id))
                    }
                ),
                { numRuns: 100 }
            )
        })
    })

    describe('خاصية 6: التحديد المتعدد (Multi-Selection)', () => {
        it('يجب أن تعمل أدوات التحويل مع التحديد المتعدد', () => {
            fc.assert(
                fc.property(
                    fc.array(elementGenerator, { minLength: 2, maxLength: 20 }),
                    vector3Generator,
                    (elements, delta) => {
                        // Setup: Add elements and select all
                        const store = useStore.getState()
                        elements.forEach(element => {
                            store.addElement(element)
                        })

                        const elementIds = elements.map(e => e.id)
                        store.selectElements(elementIds)

                        // Verify all elements are selected
                        expect(store.selectionState.selectedElements).toHaveLength(elements.length)

                        // Apply transformation
                        const result = transformManager.quickMove(delta)

                        // Verify all non-locked elements were transformed
                        expect(result?.success).toBe(true)

                        const unlockedElements = elements.filter(e => !e.locked)
                        unlockedElements.forEach(element => {
                            const updatedElement = store.getElementById(element.id)
                            expect(updatedElement).toBeDefined()
                            expect(updatedElement?.position.x).toBeCloseTo(
                                element.position.x + delta.x,
                                5
                            )
                        })

                        // Cleanup
                        store.clearSelection()
                        elements.forEach(e => store.removeElement(e.id))
                    }
                ),
                { numRuns: 100 }
            )
        })

        it('يجب أن تحسب أدوات التحويل المركز الصحيح للتحديد المتعدد', () => {
            fc.assert(
                fc.property(
                    fc.array(elementGenerator, { minLength: 2, maxLength: 10 }),
                    (elements) => {
                        // Setup
                        const store = useStore.getState()
                        elements.forEach(element => {
                            store.addElement(element)
                            store.selectElement(element.id, true)
                        })

                        // Update transform tools to generate gizmo data
                        transformManager.updateTransformTools()

                        // Get gizmo state
                        const gizmoState = transformManager.getGizmoState()

                        // Calculate expected center
                        const expectedCenter = {
                            x: elements.reduce((sum, e) => sum + e.position.x, 0) / elements.length,
                            y: elements.reduce((sum, e) => sum + e.position.y, 0) / elements.length,
                            z: elements.reduce((sum, e) => sum + e.position.z, 0) / elements.length
                        }

                        // Verify gizmo position matches expected center
                        if (gizmoState.moveData) {
                            expect(gizmoState.moveData.position.x).toBeCloseTo(expectedCenter.x, 5)
                            expect(gizmoState.moveData.position.y).toBeCloseTo(expectedCenter.y, 5)
                            expect(gizmoState.moveData.position.z).toBeCloseTo(expectedCenter.z, 5)
                        }

                        // Cleanup
                        store.clearSelection()
                        elements.forEach(e => store.removeElement(e.id))
                    }
                ),
                { numRuns: 100 }
            )
        })
    })

    describe('خاصية: Snap-to-Grid Functionality', () => {
        it('يجب أن تعمل المحاذاة للشبكة بشكل صحيح', () => {
            fc.assert(
                fc.property(
                    elementGenerator,
                    vector3Generator,
                    fc.float({ min: 0.1, max: 2 }),
                    (element, delta, gridSize) => {
                        // Setup
                        const store = useStore.getState()
                        store.addElement(element)
                        store.selectElement(element.id, false)

                        // Enable snap to grid
                        transformManager.setMoveConstraint({
                            snapToGrid: true,
                            snapDistance: gridSize
                        })

                        // Apply movement
                        const result = transformManager.quickMove(delta)
                        expect(result?.success).toBe(true)

                        // Verify position is snapped to grid
                        const updatedElement = store.getElementById(element.id)
                        expect(updatedElement).toBeDefined()

                        if (updatedElement && !element.locked) {
                            const expectedX = Math.round((element.position.x + delta.x) / gridSize) * gridSize
                            const expectedY = Math.round((element.position.y + delta.y) / gridSize) * gridSize
                            const expectedZ = Math.round((element.position.z + delta.z) / gridSize) * gridSize

                            expect(updatedElement.position.x).toBeCloseTo(expectedX, 5)
                            expect(updatedElement.position.y).toBeCloseTo(expectedY, 5)
                            expect(updatedElement.position.z).toBeCloseTo(expectedZ, 5)
                        }

                        // Cleanup
                        store.clearSelection()
                        store.removeElement(element.id)
                    }
                ),
                { numRuns: 100 }
            )
        })
    })

    describe('خاصية: Uniform Scaling', () => {
        it('يجب أن يحافظ التحجيم المتناسق على النسب', () => {
            fc.assert(
                fc.property(
                    elementGenerator,
                    fc.float({ min: 0.1, max: 5 }),
                    (element, scaleFactor) => {
                        // Setup
                        const store = useStore.getState()
                        store.addElement(element)
                        store.selectElement(element.id, false)

                        // Enable uniform scaling
                        transformManager.setScaleConstraint({
                            uniform: true,
                            preserveAspectRatio: true,
                            minScale: 0.1,
                            maxScale: 10
                        })

                        // Get initial scale ratios
                        const initialRatioXY = element.scale.x / element.scale.y
                        const initialRatioXZ = element.scale.x / element.scale.z
                        const initialRatioYZ = element.scale.y / element.scale.z

                        // Apply scaling
                        const result = transformManager.quickScale(scaleFactor)
                        expect(result?.success).toBe(true)

                        // Verify ratios are preserved
                        const updatedElement = store.getElementById(element.id)
                        expect(updatedElement).toBeDefined()

                        if (updatedElement && !element.locked) {
                            const newRatioXY = updatedElement.scale.x / updatedElement.scale.y
                            const newRatioXZ = updatedElement.scale.x / updatedElement.scale.z
                            const newRatioYZ = updatedElement.scale.y / updatedElement.scale.z

                            expect(newRatioXY).toBeCloseTo(initialRatioXY, 3)
                            expect(newRatioXZ).toBeCloseTo(initialRatioXZ, 3)
                            expect(newRatioYZ).toBeCloseTo(initialRatioYZ, 3)
                        }

                        // Cleanup
                        store.clearSelection()
                        store.removeElement(element.id)
                    }
                ),
                { numRuns: 100 }
            )
        })
    })

    describe('خاصية: Transform History and Undo/Redo', () => {
        it('يجب أن تسجل التحويلات في التاريخ وتدعم التراجع', () => {
            fc.assert(
                fc.property(
                    elementGenerator,
                    vector3Generator,
                    (element, delta) => {
                        // Setup
                        const store = useStore.getState()
                        store.addElement(element)
                        store.selectElement(element.id, false)

                        // Get initial state
                        const initialPosition = { ...element.position }
                        const initialHistoryLength = store.historyState.past.length

                        // Apply transformation
                        const result = transformManager.quickMove(delta)
                        expect(result?.success).toBe(true)

                        // Verify history was updated
                        expect(store.historyState.past.length).toBe(initialHistoryLength + 1)

                        // Verify element was transformed
                        const transformedElement = store.getElementById(element.id)
                        expect(transformedElement).toBeDefined()

                        if (transformedElement && !element.locked) {
                            expect(transformedElement.position.x).toBeCloseTo(
                                initialPosition.x + delta.x,
                                5
                            )
                        }

                        // Test undo
                        if (store.canUndo()) {
                            store.undo()

                            const undoneElement = store.getElementById(element.id)
                            expect(undoneElement).toBeDefined()

                            if (undoneElement) {
                                expect(undoneElement.position.x).toBeCloseTo(initialPosition.x, 5)
                                expect(undoneElement.position.y).toBeCloseTo(initialPosition.y, 5)
                                expect(undoneElement.position.z).toBeCloseTo(initialPosition.z, 5)
                            }
                        }

                        // Cleanup
                        store.clearSelection()
                        store.removeElement(element.id)
                    }
                ),
                { numRuns: 100 }
            )
        })
    })

    describe('خاصية: Numeric Input Precision', () => {
        it('يجب أن تطبق القيم الرقمية بدقة', () => {
            fc.assert(
                fc.property(
                    elementGenerator,
                    vector3Generator,
                    (element, targetPosition) => {
                        // Setup
                        const store = useStore.getState()
                        store.addElement(element)
                        store.selectElement(element.id, false)

                        // Calculate delta for absolute positioning
                        const delta = {
                            x: targetPosition.x - element.position.x,
                            y: targetPosition.y - element.position.y,
                            z: targetPosition.z - element.position.z
                        }

                        // Apply precise movement
                        const result = transformManager.quickMove(delta)
                        expect(result?.success).toBe(true)

                        // Verify precise positioning
                        const updatedElement = store.getElementById(element.id)
                        expect(updatedElement).toBeDefined()

                        if (updatedElement && !element.locked) {
                            expect(updatedElement.position.x).toBeCloseTo(targetPosition.x, 10)
                            expect(updatedElement.position.y).toBeCloseTo(targetPosition.y, 10)
                            expect(updatedElement.position.z).toBeCloseTo(targetPosition.z, 10)
                        }

                        // Cleanup
                        store.clearSelection()
                        store.removeElement(element.id)
                    }
                ),
                { numRuns: 100 }
            )
        })
    })
})