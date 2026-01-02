/**
 * اختبارات الفئة الأساسية للأدوات
 * Tests for BaseTool class
 */

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseTool, ToolContext, ToolEvent } from '../BaseTool'

// Mock tool implementation for testing
class MockTool extends BaseTool {
    constructor() {
        super('select')
    }

    getName(): string {
        return 'Mock Tool'
    }

    getDescription(): string {
        return 'A mock tool for testing'
    }

    getIcon(): string {
        return 'mock-icon'
    }

    getShortcut(): string {
        return 'M'
    }

    // Expose protected methods for testing
    public testCreateSuccessResult = this.createSuccessResult
    public testCreateErrorResult = this.createErrorResult
    public testGetIntersectionPoint = this.getIntersectionPoint
    public testSnapToGrid = this.snapToGrid
    public testCalculateDistance = this.calculateDistance
    public testGenerateElementId = this.generateElementId
    public testCreateBaseElement = this.createBaseElement
}

describe('BaseTool', () => {
    let mockTool: MockTool
    let mockContext: ToolContext

    beforeEach(() => {
        mockTool = new MockTool()

        // Create mock Three.js objects
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
    })

    describe('Tool Properties', () => {
        it('should have correct type', () => {
            expect(mockTool.type).toBe('select')
        })

        it('should have correct name', () => {
            expect(mockTool.getName()).toBe('Mock Tool')
        })

        it('should have correct description', () => {
            expect(mockTool.getDescription()).toBe('A mock tool for testing')
        })

        it('should have correct icon', () => {
            expect(mockTool.getIcon()).toBe('mock-icon')
        })

        it('should have correct shortcut', () => {
            expect(mockTool.getShortcut()).toBe('M')
        })
    })

    describe('Tool State Management', () => {
        it('should start in idle state', () => {
            expect(mockTool.state).toBe('idle')
            expect(mockTool.isActive).toBe(false)
        })

        it('should activate correctly', () => {
            mockTool.activate(mockContext)

            expect(mockTool.isActive).toBe(true)
            expect(mockTool.state).toBe('active')
        })

        it('should deactivate correctly', () => {
            mockTool.activate(mockContext)
            mockTool.deactivate()

            expect(mockTool.isActive).toBe(false)
            expect(mockTool.state).toBe('idle')
        })
    })

    describe('Event Handling', () => {
        beforeEach(() => {
            mockTool.activate(mockContext)
        })

        it('should handle mouse events', () => {
            const mouseEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const result = mockTool.handleEvent(mouseEvent)
            // Base implementation returns null
            expect(result).toBeNull()
        })

        it('should handle keyboard events', () => {
            const keyEvent: ToolEvent = {
                type: 'keydown',
                position: new THREE.Vector3(0, 0, 0),
                key: 'Escape'
            }

            const result = mockTool.handleEvent(keyEvent)
            expect(result).toBeNull()
        })

        it('should not handle events when inactive', () => {
            mockTool.deactivate()

            const mouseEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const result = mockTool.handleEvent(mouseEvent)
            expect(result).toBeNull()
        })
    })

    describe('Utility Methods', () => {
        beforeEach(() => {
            mockTool.activate(mockContext)
        })

        it('should create success result', () => {
            const result = mockTool.testCreateSuccessResult(
                undefined,
                undefined,
                'Success message'
            )

            expect(result.success).toBe(true)
            expect(result.message).toBe('Success message')
            expect(result.error).toBeUndefined()
        })

        it('should create error result', () => {
            const result = mockTool.testCreateErrorResult('Error message')

            expect(result.success).toBe(false)
            expect(result.error).toBe('Error message')
            expect(result.message).toBeUndefined()
        })

        it('should snap to grid correctly', () => {
            const point = new THREE.Vector3(1.3, 2.7, 3.1)
            const snapped = mockTool.testSnapToGrid(point, 1)

            expect(snapped.x).toBe(1)
            expect(snapped.y).toBe(3)
            expect(snapped.z).toBe(3)
        })

        it('should snap to grid with custom size', () => {
            const point = new THREE.Vector3(1.3, 2.7, 3.1)
            const snapped = mockTool.testSnapToGrid(point, 0.5)

            expect(snapped.x).toBe(1.5)
            expect(snapped.y).toBe(2.5)
            expect(snapped.z).toBe(3.0)
        })

        it('should calculate distance correctly', () => {
            const point1 = new THREE.Vector3(0, 0, 0)
            const point2 = new THREE.Vector3(3, 4, 0)
            const distance = mockTool.testCalculateDistance(point1, point2)

            expect(distance).toBe(5) // 3-4-5 triangle
        })

        it('should generate unique element IDs', () => {
            const id1 = mockTool.testGenerateElementId()
            const id2 = mockTool.testGenerateElementId()

            expect(id1).toMatch(/^select_\d+_[a-z0-9]+$/)
            expect(id2).toMatch(/^select_\d+_[a-z0-9]+$/)
            expect(id1).not.toBe(id2)
        })

        it('should create base element correctly', () => {
            const position = new THREE.Vector3(1, 2, 3)
            const properties = { width: 10, height: 20 }

            const element = mockTool.testCreateBaseElement(position, properties)

            expect(element.type).toBe('select')
            expect(element.position).toEqual({ x: 1, y: 2, z: 3 })
            expect(element.rotation).toEqual({ x: 0, y: 0, z: 0 })
            expect(element.scale).toEqual({ x: 1, y: 1, z: 1 })
            expect(element.properties).toEqual(properties)
            expect(element.visible).toBe(true)
            expect(element.locked).toBe(false)
            expect(element.id).toMatch(/^select_\d+_[a-z0-9]+$/)
            expect(element.name).toMatch(/^Mock Tool \d+$/)
            expect(element.created).toBeDefined()
            expect(element.modified).toBeDefined()
        })
    })

    describe('Intersection Point Calculation', () => {
        beforeEach(() => {
            mockTool.activate(mockContext)
        })

        it('should handle intersection calculation', () => {
            // Mock raycaster behavior
            const mockIntersect = {
                point: new THREE.Vector3(5, 0, 5),
                distance: 10,
                object: new THREE.Mesh()
            }

            vi.spyOn(mockContext.raycaster, 'setFromCamera')
                .mockImplementation(() => { })

            vi.spyOn(mockContext.raycaster, 'intersectObjects')
                .mockReturnValue([mockIntersect] as any)

            const event: ToolEvent = {
                type: 'mousemove',
                position: new THREE.Vector3(0.5, 0.5, 0)
            }

            const result = mockTool.testGetIntersectionPoint(event)
            expect(result).toEqual(new THREE.Vector3(5, 0, 5))
        })

        it('should project to ground plane when no intersection', () => {
            // Mock raycaster to return no intersections
            vi.spyOn(mockContext.raycaster, 'intersectObjects')
                .mockReturnValue([])

            // Mock setFromCamera method
            vi.spyOn(mockContext.raycaster, 'setFromCamera')
                .mockImplementation(() => { })

            // Mock ray intersection with ground plane
            const mockRay = {
                intersectPlane: vi.fn().mockImplementation((plane, target) => {
                    target.set(2, 0, 3)
                    return target
                })
            }
            mockContext.raycaster.ray = mockRay as any

            const event: ToolEvent = {
                type: 'mousemove',
                position: new THREE.Vector3(0.5, 0.5, 0)
            }

            const result = mockTool.testGetIntersectionPoint(event)
            expect(result).toEqual(new THREE.Vector3(2, 0, 3))
        })
    })
})