/**
 * اختبارات الخصائص لتفعيل الأدوات
 * Property-based tests for tool activation
 * 
 * الخاصية 1: تفعيل الأدوات
 * Property 1: Tool Activation
 * تتحقق من: المتطلبات 2.1, 2.3, 2.4, 2.5
 * Verifies: Requirements 2.1, 2.3, 2.4, 2.5
 */

import fc from 'fast-check'
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store'
import { ToolType } from '../../store/types'
import { ToolContext } from '../BaseTool'
import { ToolManager } from '../ToolManager'

// Mock the store
vi.mock('../../store', () => ({
    useStore: {
        getState: vi.fn(),
        subscribe: vi.fn()
    }
}))

// Mock all tool implementations
vi.mock('../SelectTool', () => ({
    SelectTool: class MockSelectTool {
        type = 'select'
        getName = () => 'Select Tool'
        getDescription = () => 'Select Tool Description'
        getIcon = () => 'select-icon'
        getShortcut = () => 'V'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../WallTool', () => ({
    WallTool: class MockWallTool {
        type = 'wall'
        getName = () => 'Wall Tool'
        getDescription = () => 'Wall Tool Description'
        getIcon = () => 'wall-icon'
        getShortcut = () => 'W'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../FloorTool', () => ({
    FloorTool: class MockFloorTool {
        type = 'floor'
        getName = () => 'Floor Tool'
        getDescription = () => 'Floor Tool Description'
        getIcon = () => 'floor-icon'
        getShortcut = () => 'F'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../DoorTool', () => ({
    DoorTool: class MockDoorTool {
        type = 'door'
        getName = () => 'Door Tool'
        getDescription = () => 'Door Tool Description'
        getIcon = () => 'door-icon'
        getShortcut = () => 'D'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../WindowTool', () => ({
    WindowTool: class MockWindowTool {
        type = 'window'
        getName = () => 'Window Tool'
        getDescription = () => 'Window Tool Description'
        getIcon = () => 'window-icon'
        getShortcut = () => 'N'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../MoveTool', () => ({
    MoveTool: class MockMoveTool {
        type = 'move'
        getName = () => 'Move Tool'
        getDescription = () => 'Move Tool Description'
        getIcon = () => 'move-icon'
        getShortcut = () => 'M'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../RotateTool', () => ({
    RotateTool: class MockRotateTool {
        type = 'rotate'
        getName = () => 'Rotate Tool'
        getDescription = () => 'Rotate Tool Description'
        getIcon = () => 'rotate-icon'
        getShortcut = () => 'R'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../ScaleTool', () => ({
    ScaleTool: class MockScaleTool {
        type = 'scale'
        getName = () => 'Scale Tool'
        getDescription = () => 'Scale Tool Description'
        getIcon = () => 'scale-icon'
        getShortcut = () => 'S'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

describe('Property Tests: Tool Activation', () => {
    let toolManager: ToolManager
    let mockContext: ToolContext
    let mockStore: any

    beforeEach(() => {
        // Setup mock store
        mockStore = {
            setActiveTool: vi.fn(),
            addElement: vi.fn(),
            addHistoryEntry: vi.fn(),
            clearPreview: vi.fn(),
            setError: vi.fn(),
            elements: [],
            selectionState: { selectedElements: [] }
        }

        vi.mocked(useStore.getState).mockReturnValue(mockStore)

        // Create tool manager
        toolManager = new ToolManager({
            enableKeyboardShortcuts: true,
            enableSnapToGrid: true,
            gridSize: 1,
            enablePreview: true
        })

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

        toolManager.setContext(mockContext)
    })

    afterEach(() => {
        if (toolManager && typeof toolManager.dispose === 'function') {
            toolManager.dispose()
        }
        vi.clearAllMocks()
    })

    /**
     * الخاصية 1: تفعيل الأدوات
     * Property 1: Tool Activation
     * 
     * المتطلبات المتحققة:
     * - 2.1: إدارة الأدوات المركزية
     * - 2.3: تفعيل وإلغاء تفعيل الأدوات
     * - 2.4: معالجة الأحداث
     * - 2.5: إدارة الحالة
     */
    it('Property 1: Tool activation should be consistent and reliable', () => {
        // Generator for valid tool types
        const validToolGen = fc.constantFrom<ToolType>(
            'select', 'wall', 'floor', 'door', 'window', 'cut', 'move', 'rotate', 'scale'
        )

        fc.assert(
            fc.property(validToolGen, (toolType) => {
                // Reset state
                toolManager.deactivateTool()
                vi.clearAllMocks()

                // Activate tool
                const success = toolManager.activateTool(toolType)
                const activeTool = toolManager.getActiveTool()

                // Verify activation success
                expect(success).toBe(true)
                expect(activeTool).toBeDefined()
                expect(activeTool?.type).toBe(toolType)

                // Verify store was updated
                expect(mockStore.setActiveTool).toHaveBeenCalledWith(toolType)

                // Verify tool was activated
                expect(activeTool?.activate).toHaveBeenCalledWith(mockContext)

                return true
            }),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية التبديل بين الأدوات
     * Tool switching property
     */
    it('Property: Tool switching should properly deactivate previous tool', () => {
        const validToolGen = fc.constantFrom<ToolType>(
            'select', 'wall', 'floor', 'door', 'window', 'cut', 'move', 'rotate', 'scale'
        )

        fc.assert(
            fc.property(
                fc.tuple(validToolGen, validToolGen),
                ([firstTool, secondTool]) => {
                    // Reset state
                    toolManager.deactivateTool()
                    vi.clearAllMocks()

                    // Activate first tool
                    toolManager.activateTool(firstTool)
                    const firstActiveTool = toolManager.getActiveTool()

                    // Clear mocks to track second activation
                    vi.clearAllMocks()

                    // Activate second tool
                    toolManager.activateTool(secondTool)
                    const secondActiveTool = toolManager.getActiveTool()

                    if (firstTool !== secondTool) {
                        // Previous tool should be deactivated
                        expect(firstActiveTool?.deactivate).toHaveBeenCalled()
                    }

                    // New tool should be active
                    expect(secondActiveTool?.type).toBe(secondTool)
                    expect(mockStore.setActiveTool).toHaveBeenCalledWith(secondTool)

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية إدارة الحالة
     * State management property
     */
    it('Property: Tool state should be consistent across operations', () => {
        const validToolGen = fc.constantFrom<ToolType>(
            'select', 'wall', 'floor', 'door', 'window', 'cut', 'move', 'rotate', 'scale'
        )

        const operationGen = fc.constantFrom<'activate' | 'deactivate'>(
            'activate', 'deactivate'
        )

        fc.assert(
            fc.property(
                fc.array(fc.tuple(validToolGen, operationGen), { minLength: 1, maxLength: 10 }),
                (operations) => {
                    // Reset state
                    toolManager.deactivateTool()
                    vi.clearAllMocks()

                    let expectedActiveTool: ToolType | undefined = undefined

                    for (const [toolType, operation] of operations) {
                        if (operation === 'activate') {
                            const success = toolManager.activateTool(toolType)
                            expect(success).toBe(true)
                            expectedActiveTool = toolType
                        } else {
                            toolManager.deactivateTool()
                            expectedActiveTool = undefined
                        }

                        // Verify state consistency
                        const activeTool = toolManager.getActiveTool()
                        if (expectedActiveTool) {
                            expect(activeTool?.type).toBe(expectedActiveTool)
                        } else {
                            expect(activeTool).toBeUndefined()
                        }
                    }

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية معالجة الأخطاء
     * Error handling property
     */
    it('Property: Invalid tool activation should fail gracefully', () => {
        const invalidToolGen = fc.string().filter(s =>
            !['select', 'wall', 'floor', 'door', 'window', 'cut', 'move', 'rotate', 'scale'].includes(s)
        )

        fc.assert(
            fc.property(invalidToolGen, (invalidTool) => {
                // Reset state
                toolManager.deactivateTool()
                vi.clearAllMocks()

                // Try to activate invalid tool
                const success = toolManager.activateTool(invalidTool as ToolType)
                const activeTool = toolManager.getActiveTool()

                // Should fail gracefully
                expect(success).toBe(false)
                expect(activeTool).toBeUndefined()

                // Store should not be updated with invalid tool
                expect(mockStore.setActiveTool).not.toHaveBeenCalledWith(invalidTool)

                return true
            }),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية الاستقرار
     * Stability property
     */
    it('Property: Tool manager should remain stable under repeated operations', () => {
        const validToolGen = fc.constantFrom<ToolType>(
            'select', 'wall', 'floor', 'door', 'window', 'cut', 'move', 'rotate', 'scale'
        )

        fc.assert(
            fc.property(
                fc.array(validToolGen, { minLength: 10, maxLength: 50 }),
                (toolSequence) => {
                    // Reset state
                    toolManager.deactivateTool()
                    vi.clearAllMocks()

                    let lastTool: ToolType | undefined = undefined

                    for (const toolType of toolSequence) {
                        const success = toolManager.activateTool(toolType)
                        expect(success).toBe(true)

                        const activeTool = toolManager.getActiveTool()
                        expect(activeTool?.type).toBe(toolType)

                        lastTool = toolType
                    }

                    // Final state should be consistent
                    const finalActiveTool = toolManager.getActiveTool()
                    expect(finalActiveTool?.type).toBe(lastTool)

                    // Tool manager should still be functional
                    const tools = toolManager.getTools()
                    expect(tools).toHaveLength(9)

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })

    /**
     * خاصية الذاكرة
     * Memory management property
     */
    it('Property: Tool activation should not cause memory leaks', () => {
        const validToolGen = fc.constantFrom<ToolType>(
            'select', 'wall', 'floor', 'door', 'window', 'cut', 'move', 'rotate', 'scale'
        )

        fc.assert(
            fc.property(
                fc.array(validToolGen, { minLength: 5, maxLength: 20 }),
                (toolSequence) => {
                    // Reset state
                    toolManager.deactivateTool()
                    vi.clearAllMocks()

                    const initialTools = toolManager.getTools()
                    const initialToolCount = initialTools.length

                    // Perform many activations
                    for (const toolType of toolSequence) {
                        toolManager.activateTool(toolType)
                    }

                    // Tool count should remain constant
                    const finalTools = toolManager.getTools()
                    expect(finalTools).toHaveLength(initialToolCount)

                    // Each tool should still be functional
                    for (const tool of finalTools) {
                        expect(tool.getName()).toBeDefined()
                        expect(tool.getDescription()).toBeDefined()
                        expect(tool.getIcon()).toBeDefined()
                        expect(tool.getShortcut()).toBeDefined()
                    }

                    return true
                }
            ),
            { numRuns: 100 }
        )
    })
})