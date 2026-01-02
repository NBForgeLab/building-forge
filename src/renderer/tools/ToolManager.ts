/**
 * مدير الأدوات المركزي
 * Central tool manager
 */

import { useStore } from '../store'
import { ToolType } from '../store/types'
import { BaseTool, ToolContext, ToolEvent, ToolResult } from './BaseTool'

// Import tool implementations
import { CutTool } from './CutTool'
import { DoorTool } from './DoorTool'
import { FloorTool } from './FloorTool'
import { MoveTool } from './MoveTool'
import { RotateTool } from './RotateTool'
import { ScaleTool } from './ScaleTool'
import { SelectTool } from './SelectTool'
import { WallTool } from './WallTool'
import { WindowTool } from './WindowTool'

export interface ToolManagerConfig {
    enableKeyboardShortcuts: boolean
    enableSnapToGrid: boolean
    gridSize: number
    enablePreview: boolean
}

/**
 * مدير الأدوات المسؤول عن إدارة جميع الأدوات وتفاعلها
 * Tool manager responsible for managing all tools and their interactions
 */
export class ToolManager {
    private _tools: Map<ToolType, BaseTool> = new Map()
    private _activeTool?: BaseTool
    private _context?: ToolContext
    private _config: ToolManagerConfig
    private _eventListeners: Map<string, (event: any) => void> = new Map()

    constructor(config: Partial<ToolManagerConfig> = {}) {
        this._config = {
            enableKeyboardShortcuts: true,
            enableSnapToGrid: true,
            gridSize: 1,
            enablePreview: true,
            ...config
        }

        this.initializeTools()
    }

    // Initialize all available tools
    private initializeTools(): void {
        const tools: BaseTool[] = [
            new SelectTool(),
            new WallTool(),
            new FloorTool(),
            new DoorTool(),
            new WindowTool(),
            new CutTool(),
            new MoveTool(),
            new RotateTool(),
            new ScaleTool()
        ]

        tools.forEach(tool => {
            this._tools.set(tool.type, tool)
        })
    }

    // Set the 3D context for tools
    setContext(context: ToolContext): void {
        this._context = context
        this.setupEventListeners()
    }

    // Get available tools
    getTools(): BaseTool[] {
        return Array.from(this._tools.values())
    }

    // Get tool by type
    getTool(type: ToolType): BaseTool | undefined {
        return this._tools.get(type)
    }

    // Get active tool
    getActiveTool(): BaseTool | undefined {
        return this._activeTool
    }

    // Activate a tool
    activateTool(type: ToolType): boolean {
        const tool = this._tools.get(type)
        if (!tool || !this._context) {
            console.warn(`Tool ${type} not found or context not set`)
            return false
        }

        // Deactivate current tool
        if (this._activeTool) {
            this._activeTool.deactivate()
        }

        // Activate new tool
        try {
            tool.activate(this._context)
            this._activeTool = tool

            // Update store
            const store = useStore.getState()
            store.setActiveTool(type)

            console.log(`Activated tool: ${tool.getName()}`)
            return true
        } catch (error) {
            console.error(`Failed to activate tool ${type}:`, error)
            return false
        }
    }

    // Deactivate current tool
    deactivateTool(): void {
        if (this._activeTool) {
            this._activeTool.deactivate()
            this._activeTool = undefined

            // Update store
            const store = useStore.getState()
            store.setActiveTool('select')
        }
    }

    // Handle tool events
    handleEvent(event: ToolEvent): ToolResult | null {
        if (!this._activeTool) {
            return null
        }

        try {
            const result = this._activeTool.handleEvent(event)

            if (result) {
                this.processToolResult(result)
            }

            return result
        } catch (error) {
            console.error('Error handling tool event:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    // Process tool results
    private processToolResult(result: ToolResult): void {
        const store = useStore.getState()

        if (result.success) {
            // Add elements to store
            if (result.element) {
                store.addElement(result.element)
                store.addHistoryEntry(
                    'element:add',
                    `تم إضافة عنصر: ${result.element.name}`,
                    { elementId: result.element.id }
                )
            }

            if (result.elements) {
                result.elements.forEach(element => {
                    store.addElement(element)
                })
                store.addHistoryEntry(
                    'elements:add',
                    `تم إضافة ${result.elements.length} عناصر`,
                    { elementIds: result.elements.map(e => e.id) }
                )
            }

            // Clear preview if element was created
            if (result.element || result.elements) {
                store.clearPreview()
            }
        } else if (result.error) {
            // Handle error
            store.setError(result.error)
            console.error('Tool error:', result.error)
        }
    }

    // Setup event listeners for the canvas
    private setupEventListeners(): void {
        if (!this._context) return

        const { canvas } = this._context

        // Mouse events
        const onMouseDown = (event: MouseEvent) => {
            const toolEvent = this.createToolEvent('mousedown', event)
            this.handleEvent(toolEvent)
        }

        const onMouseMove = (event: MouseEvent) => {
            const toolEvent = this.createToolEvent('mousemove', event)
            this.handleEvent(toolEvent)
        }

        const onMouseUp = (event: MouseEvent) => {
            const toolEvent = this.createToolEvent('mouseup', event)
            this.handleEvent(toolEvent)
        }

        // Keyboard events
        const onKeyDown = (event: KeyboardEvent) => {
            if (this._config.enableKeyboardShortcuts) {
                this.handleKeyboardShortcut(event)
            }

            const toolEvent = this.createToolEvent('keydown', event)
            this.handleEvent(toolEvent)
        }

        const onKeyUp = (event: KeyboardEvent) => {
            const toolEvent = this.createToolEvent('keyup', event)
            this.handleEvent(toolEvent)
        }

        // Wheel events
        const onWheel = (event: WheelEvent) => {
            const toolEvent = this.createToolEvent('wheel', event)
            this.handleEvent(toolEvent)
        }

        // Add event listeners
        canvas.addEventListener('mousedown', onMouseDown)
        canvas.addEventListener('mousemove', onMouseMove)
        canvas.addEventListener('mouseup', onMouseUp)
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('keyup', onKeyUp)
        canvas.addEventListener('wheel', onWheel)

        // Store listeners for cleanup
        this._eventListeners.set('mousedown', onMouseDown)
        this._eventListeners.set('mousemove', onMouseMove)
        this._eventListeners.set('mouseup', onMouseUp)
        this._eventListeners.set('keydown', onKeyDown)
        this._eventListeners.set('keyup', onKeyUp)
        this._eventListeners.set('wheel', onWheel)
    }

    // Create tool event from DOM event
    private createToolEvent(type: ToolEvent['type'], event: MouseEvent | KeyboardEvent | WheelEvent): ToolEvent {
        const rect = this._context!.canvas.getBoundingClientRect()

        let position = { x: 0, y: 0, z: 0 }

        if (event instanceof MouseEvent) {
            // Convert to normalized device coordinates (-1 to +1)
            position.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            position.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
        }

        const toolEvent: ToolEvent = {
            type,
            position,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey
        }

        if (event instanceof MouseEvent) {
            toolEvent.button = event.button
        }

        if (event instanceof KeyboardEvent) {
            toolEvent.key = event.key
        }

        if (event instanceof WheelEvent) {
            toolEvent.delta = event.deltaY
        }

        return toolEvent
    }

    // Handle keyboard shortcuts
    private handleKeyboardShortcut(event: KeyboardEvent): void {
        // Prevent default for tool shortcuts
        const shortcuts: Record<string, ToolType> = {
            'v': 'select',
            'w': 'wall',
            'f': 'floor',
            'd': 'door',
            'n': 'window',
            'c': 'cut'
        }

        const key = event.key.toLowerCase()
        if (shortcuts[key] && !event.ctrlKey && !event.altKey) {
            event.preventDefault()
            this.activateTool(shortcuts[key])
        }

        // Handle other shortcuts
        if (event.ctrlKey) {
            switch (event.key.toLowerCase()) {
                case 'z':
                    event.preventDefault()
                    if (event.shiftKey) {
                        useStore.getState().redo()
                    } else {
                        useStore.getState().undo()
                    }
                    break
                case 'a':
                    event.preventDefault()
                    // Select all elements
                    const store = useStore.getState()
                    const allElementIds = store.elements.map(e => e.id)
                    store.selectElements(allElementIds)
                    break
                case 'd':
                    event.preventDefault()
                    // Duplicate selected elements
                    const selectedIds = useStore.getState().selectionState.selectedElements
                    selectedIds.forEach(id => {
                        useStore.getState().duplicateElement(id)
                    })
                    break
            }
        }

        // Handle transform mode shortcuts
        if (!event.ctrlKey && !event.altKey) {
            switch (event.key.toLowerCase()) {
                case 'g':
                    event.preventDefault()
                    // Activate move tool or toggle move mode
                    const store = useStore.getState()
                    if (store.selectionState.selectedElements.length > 0) {
                        store.setTransformMode('translate')
                        this.activateTool('select') // Move tool works within select context
                    }
                    break
                case 'r':
                    event.preventDefault()
                    // Activate rotate mode
                    const storeR = useStore.getState()
                    if (storeR.selectionState.selectedElements.length > 0) {
                        storeR.setTransformMode('rotate')
                        this.activateTool('select')
                    }
                    break
                case 's':
                    if (!event.ctrlKey) { // Avoid conflict with Ctrl+S (save)
                        event.preventDefault()
                        // Activate scale mode
                        const storeS = useStore.getState()
                        if (storeS.selectionState.selectedElements.length > 0) {
                            storeS.setTransformMode('scale')
                            this.activateTool('select')
                        }
                    }
                    break
                case 'tab':
                    if (event.shiftKey) {
                        event.preventDefault()
                        // Open numeric transform panel
                        const storeT = useStore.getState()
                        if (storeT.selectionState.selectedElements.length > 0) {
                            // This would trigger opening the numeric panel
                            // Implementation depends on how the panel is managed
                        }
                    }
                    break
            }
        }

        // Handle delete key
        if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault()
            const selectedIds = useStore.getState().selectionState.selectedElements
            if (selectedIds.length > 0) {
                useStore.getState().removeElements(selectedIds)
                useStore.getState().clearSelection()
            }
        }

        // Handle escape key
        if (event.key === 'Escape') {
            event.preventDefault()
            useStore.getState().clearSelection()
            useStore.getState().clearPreview()
        }
    }

    // Update configuration
    updateConfig(config: Partial<ToolManagerConfig>): void {
        this._config = { ...this._config, ...config }
    }

    // Get configuration
    getConfig(): ToolManagerConfig {
        return { ...this._config }
    }

    // Cleanup
    dispose(): void {
        // Deactivate current tool
        this.deactivateTool()

        // Remove event listeners
        if (this._context) {
            const { canvas } = this._context

            this._eventListeners.forEach((listener, type) => {
                if (type === 'keydown' || type === 'keyup') {
                    document.removeEventListener(type, listener)
                } else {
                    canvas.removeEventListener(type, listener)
                }
            })
        }

        // Clear references
        this._eventListeners.clear()
        this._tools.clear()
        this._context = undefined
    }
}

// Singleton instance
let toolManagerInstance: ToolManager | null = null

export function getToolManager(): ToolManager {
    if (!toolManagerInstance) {
        toolManagerInstance = new ToolManager()
    }
    return toolManagerInstance
}

export function createToolManager(config?: Partial<ToolManagerConfig>): ToolManager {
    toolManagerInstance = new ToolManager(config)
    return toolManagerInstance
}