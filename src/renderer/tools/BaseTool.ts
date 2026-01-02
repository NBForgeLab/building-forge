/**
 * الفئة الأساسية للأدوات
 * Base class for all tools
 */

import { Vector3 } from 'three'
import { BuildingElement, ToolType } from '../store/types'

export type ToolState = 'idle' | 'active' | 'preview'

export interface ToolEvent {
    type: 'mousedown' | 'mousemove' | 'mouseup' | 'keydown' | 'keyup' | 'wheel'
    position: Vector3
    button?: number
    key?: string
    ctrlKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    delta?: number
}

export interface ToolContext {
    camera: THREE.Camera
    scene: THREE.Scene
    raycaster: THREE.Raycaster
    renderer: THREE.WebGLRenderer
    canvas: HTMLCanvasElement
}

export interface ToolResult {
    success: boolean
    element?: BuildingElement
    elements?: BuildingElement[]
    message?: string
    error?: string
}

/**
 * الفئة الأساسية المجردة للأدوات
 * Abstract base class for all tools
 */
export abstract class BaseTool {
    protected _type: ToolType
    protected _state: ToolState = 'idle'
    protected _context?: ToolContext
    protected _isActive = false

    constructor(type: ToolType) {
        this._type = type
    }

    // Getters
    get type(): ToolType {
        return this._type
    }

    get state(): ToolState {
        return this._state
    }

    get isActive(): boolean {
        return this._isActive
    }

    // Abstract methods that must be implemented by subclasses
    abstract getName(): string
    abstract getDescription(): string
    abstract getIcon(): string
    abstract getShortcut(): string

    // Tool lifecycle methods
    activate(context: ToolContext): void {
        this._context = context
        this._isActive = true
        this._state = 'active'
        this.onActivate()
    }

    deactivate(): void {
        this.cleanup()
        this._isActive = false
        this._state = 'idle'
        this._context = undefined
        this.onDeactivate()
    }

    // Event handling methods
    handleEvent(event: ToolEvent): ToolResult | null {
        if (!this._isActive || !this._context) {
            return null
        }

        switch (event.type) {
            case 'mousedown':
                return this.onMouseDown(event)
            case 'mousemove':
                return this.onMouseMove(event)
            case 'mouseup':
                return this.onMouseUp(event)
            case 'keydown':
                return this.onKeyDown(event)
            case 'keyup':
                return this.onKeyUp(event)
            case 'wheel':
                return this.onWheel(event)
            default:
                return null
        }
    }

    // State management
    protected setState(state: ToolState): void {
        this._state = state
        this.onStateChange(state)
    }

    // Virtual methods that can be overridden
    protected onActivate(): void {
        // Override in subclasses
    }

    protected onDeactivate(): void {
        // Override in subclasses
    }

    protected onStateChange(state: ToolState): void {
        // Override in subclasses
    }

    protected onMouseDown(event: ToolEvent): ToolResult | null {
        // Override in subclasses
        return null
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        // Override in subclasses
        return null
    }

    protected onMouseUp(event: ToolEvent): ToolResult | null {
        // Override in subclasses
        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        // Override in subclasses
        return null
    }

    protected onKeyUp(event: ToolEvent): ToolResult | null {
        // Override in subclasses
        return null
    }

    protected onWheel(event: ToolEvent): ToolResult | null {
        // Override in subclasses
        return null
    }

    // Utility methods
    protected cleanup(): void {
        // Override in subclasses to clean up resources
    }

    protected createSuccessResult(element?: BuildingElement, elements?: BuildingElement[], message?: string): ToolResult {
        return {
            success: true,
            element,
            elements,
            message
        }
    }

    protected createErrorResult(error: string): ToolResult {
        return {
            success: false,
            error
        }
    }

    // Helper methods for common operations
    protected getIntersectionPoint(event: ToolEvent): Vector3 | null {
        if (!this._context) return null

        const { raycaster, scene } = this._context

        // Update raycaster with mouse position
        raycaster.setFromCamera(
            { x: event.position.x, y: event.position.y },
            this._context.camera
        )

        // Find intersections with scene objects
        const intersects = raycaster.intersectObjects(scene.children, true)

        if (intersects.length > 0) {
            return intersects[0].point
        }

        // If no intersection, project onto ground plane (y = 0)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const intersectionPoint = new THREE.Vector3()
        raycaster.ray.intersectPlane(groundPlane, intersectionPoint)

        return intersectionPoint
    }

    protected snapToGrid(position: Vector3, gridSize: number = 1): Vector3 {
        return new Vector3(
            Math.round(position.x / gridSize) * gridSize,
            Math.round(position.y / gridSize) * gridSize,
            Math.round(position.z / gridSize) * gridSize
        )
    }

    protected calculateDistance(point1: Vector3, point2: Vector3): number {
        return point1.distanceTo(point2)
    }

    protected generateElementId(): string {
        return `${this._type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    protected createBaseElement(position: Vector3, properties: any = {}): BuildingElement {
        const now = new Date().toISOString()

        return {
            id: this.generateElementId(),
            type: this._type as any, // Cast to ElementType
            name: `${this.getName()} ${Date.now()}`,
            position,
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            properties,
            visible: true,
            locked: false,
            created: now,
            modified: now
        }
    }
}

// Import THREE types
import * as THREE from 'three'
