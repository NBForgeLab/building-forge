/**
 * اختبارات مدير الأدوات
 * Tests for ToolManager class
 */

import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../../store'
import { ToolContext, ToolEvent } from '../BaseTool'
import { ToolManager, ToolManagerConfig } from '../ToolManager'

// Mock the store
vi.mock('../../store', () => ({
    useStore: {
        getState: vi.fn(),
        subscribe: vi.fn()
    }
}))

// Mock tool implementations
vi.mock('../SelectTool', () => ({
    SelectTool: class MockSelectTool {
        type = 'select'
        getName = () => 'Select Tool'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../WallTool', () => ({
    WallTool: class MockWallTool {
        type = 'wall'
        getName = () => 'Wall Tool'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../FloorTool', () => ({
    FloorTool: class MockFloorTool {
        type = 'floor'
        getName = () => 'Floor Tool'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../DoorTool', () => ({
    DoorTool: class MockDoorTool {
        type = 'door'
        getName = () => 'Door Tool'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../WindowTool', () => ({
    WindowTool: class MockWindowTool {
        type = 'window'
        getName = () => 'Window Tool'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

vi.mock('../CutTool', () => ({
    CutTool: class MockCutTool {
        type = 'cut'
        getName = () => 'Cut Tool'
        activate = vi.fn()
        deactivate = vi.fn()
        handleEvent = vi.fn()
    }
}))

describe('ToolManager', () => {
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
        const config: Partial<ToolManagerConfig> = {
            enableKeyboardShortcuts: true,
            enableSnapToGrid: true,
            gridSize: 1,
            enablePreview: true
        }
        toolManager = new ToolManager(config)

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
        toolManager.dispose()
        vi.clearAllMocks()
    })

    describe('Initialization', () => {
        it('should initialize with all tools', () => {
            const tools = toolManager.getTools()
            expect(tools).toHaveLength(6)

            const toolTypes = tools.map(tool => tool.type)
            expect(toolTypes).toContain('select')
            expect(toolTypes).toContain('wall')
            expect(toolTypes).toContain('floor')
            expect(toolTypes).toContain('door')
            expect(toolTypes).toContain('window')
            expect(toolTypes).toContain('cut')
        })

        it('should set context correctly', () => {
            expect(toolManager['_context']).toBe(mockContext)
        })

        it('should have correct default configuration', () => {
            const config = toolManager.getConfig()
            expect(config.enableKeyboardShortcuts).toBe(true)
            expect(config.enableSnapToGrid).toBe(true)
            expect(config.gridSize).toBe(1)
            expect(config.enablePreview).toBe(true)
        })
    })

    describe('Tool Activation', () => {
        it('should activate tool successfully', () => {
            const success = toolManager.activateTool('wall')
            expect(success).toBe(true)

            const activeTool = toolManager.getActiveTool()
            expect(activeTool?.type).toBe('wall')
            expect(mockStore.setActiveTool).toHaveBeenCalledWith('wall')
        })

        it('should deactivate previous tool when activating new one', () => {
            // Activate first tool
            toolManager.activateTool('wall')
            const wallTool = toolManager.getActiveTool()

            // Activate second tool
            toolManager.activateTool('floor')

            expect(wallTool?.deactivate).toHaveBeenCalled()

            const activeTool = toolManager.getActiveTool()
            expect(activeTool?.type).toBe('floor')
        })

        it('should fail to activate non-existent tool', () => {
            const success = toolManager.activateTool('nonexistent' as any)
            expect(success).toBe(false)
        })

        it('should deactivate current tool', () => {
            toolManager.activateTool('wall')
            const wallTool = toolManager.getActiveTool()

            toolManager.deactivateTool()

            expect(wallTool?.deactivate).toHaveBeenCalled()
            expect(toolManager.getActiveTool()).toBeUndefined()
            expect(mockStore.setActiveTool).toHaveBeenCalledWith('select')
        })
    })

    describe('Event Handling', () => {
        beforeEach(() => {
            toolManager.activateTool('select')
        })

        it('should handle tool events', () => {
            const mockEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const activeTool = toolManager.getActiveTool()
            vi.mocked(activeTool!.handleEvent).mockReturnValue({
                success: true,
                message: 'Test success'
            })

            const result = toolManager.handleEvent(mockEvent)

            expect(activeTool?.handleEvent).toHaveBeenCalledWith(mockEvent)
            expect(result?.success).toBe(true)
        })

        it('should not handle events when no tool is active', () => {
            toolManager.deactivateTool()

            const mockEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const result = toolManager.handleEvent(mockEvent)
            expect(result).toBeNull()
        })

        it('should handle tool errors gracefully', () => {
            const mockEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const activeTool = toolManager.getActiveTool()
            vi.mocked(activeTool!.handleEvent).mockImplementation(() => {
                throw new Error('Tool error')
            })

            const result = toolManager.handleEvent(mockEvent)

            expect(result?.success).toBe(false)
            expect(result?.error).toBe('Tool error')
        })
    })

    describe('Tool Results Processing', () => {
        beforeEach(() => {
            toolManager.activateTool('wall')
        })

        it('should process successful element creation', () => {
            const mockElement = {
                id: 'test-element',
                name: 'Test Element',
                type: 'wall'
            }

            const mockEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const activeTool = toolManager.getActiveTool()
            vi.mocked(activeTool!.handleEvent).mockReturnValue({
                success: true,
                element: mockElement as any
            })

            toolManager.handleEvent(mockEvent)

            expect(mockStore.addElement).toHaveBeenCalledWith(mockElement)
            expect(mockStore.addHistoryEntry).toHaveBeenCalledWith(
                'element:add',
                expect.stringContaining('Test Element'),
                { elementId: 'test-element' }
            )
            expect(mockStore.clearPreview).toHaveBeenCalled()
        })

        it('should process multiple element creation', () => {
            const mockElements = [
                { id: 'element-1', name: 'Element 1', type: 'wall' },
                { id: 'element-2', name: 'Element 2', type: 'wall' }
            ]

            const mockEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const activeTool = toolManager.getActiveTool()
            vi.mocked(activeTool!.handleEvent).mockReturnValue({
                success: true,
                elements: mockElements as any
            })

            toolManager.handleEvent(mockEvent)

            expect(mockStore.addElement).toHaveBeenCalledTimes(2)
            expect(mockStore.addHistoryEntry).toHaveBeenCalledWith(
                'elements:add',
                expect.stringContaining('2'),
                { elementIds: ['element-1', 'element-2'] }
            )
        })

        it('should handle tool errors', () => {
            const mockEvent: ToolEvent = {
                type: 'mousedown',
                position: new THREE.Vector3(0, 0, 0),
                button: 0
            }

            const activeTool = toolManager.getActiveTool()
            vi.mocked(activeTool!.handleEvent).mockReturnValue({
                success: false,
                error: 'Tool operation failed'
            })

            toolManager.handleEvent(mockEvent)

            expect(mockStore.setError).toHaveBeenCalledWith('Tool operation failed')
        })
    })

    describe('Configuration Management', () => {
        it('should update configuration', () => {
            const newConfig = {
                enableSnapToGrid: false,
                gridSize: 2
            }

            toolManager.updateConfig(newConfig)

            const config = toolManager.getConfig()
            expect(config.enableSnapToGrid).toBe(false)
            expect(config.gridSize).toBe(2)
            expect(config.enableKeyboardShortcuts).toBe(true) // Should preserve existing
        })
    })

    describe('Cleanup', () => {
        it('should dispose properly', () => {
            toolManager.activateTool('wall')
            const activeTool = toolManager.getActiveTool()

            toolManager.dispose()

            expect(activeTool?.deactivate).toHaveBeenCalled()
            expect(toolManager.getActiveTool()).toBeUndefined()
        })
    })
})