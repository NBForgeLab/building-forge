/**
 * أداة التحريك المتقدمة
 * Advanced move tool with gizmos and precise control
 */

import { Plane, Raycaster, Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface MoveGizmoData {
    visible: boolean
    position: Vector3
    activeAxis?: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz'
    hoveredAxis?: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz'
}

export interface MoveConstraint {
    axis?: 'x' | 'y' | 'z'
    plane?: 'xy' | 'xz' | 'yz'
    snapToGrid: boolean
    snapDistance: number
}

export class MoveTool extends BaseTool {
    private _isDragging = false
    private _dragStart?: Vector3
    private _dragStartScreen?: { x: number; y: number }
    private _gizmoData?: MoveGizmoData
    private _constraint: MoveConstraint = {
        snapToGrid: true,
        snapDistance: 0.1
    }
    private _initialPositions: Map<string, Vector3> = new Map()
    private _dragPlane?: Plane
    private _dragAxis?: Vector3

    constructor() {
        super('select') // MoveTool works within select tool context
    }

    getName(): string {
        return 'أداة التحريك'
    }

    getDescription(): string {
        return 'تحريك العناصر المحددة بدقة مع محاور التحكم والمحاذاة للشبكة'
    }

    getIcon(): string {
        return 'move'
    }

    getShortcut(): string {
        return 'G'
    }

    protected onActivate(): void {
        const store = useStore.getState()
        store.setTransformMode('translate')
        this.updateGizmoVisibility()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'move'
        }
    }

    protected onDeactivate(): void {
        this.cleanup()
    }

    protected onMouseDown(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للتحريك')
        }

        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        // Check if clicking on gizmo
        const gizmoAxis = this.getGizmoAxisAtPoint(event)
        if (gizmoAxis) {
            return this.startGizmoDrag(gizmoAxis, intersectionPoint, event)
        }

        // Check if clicking on selected element
        const clickedElement = this.getElementAtPoint(intersectionPoint)
        if (clickedElement && selectedElements.includes(clickedElement.id)) {
            return this.startFreeDrag(intersectionPoint, event)
        }

        return null
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        if (this._isDragging) {
            return this.handleDrag(event)
        } else {
            return this.updateGizmoHover(event)
        }
    }

    protected onMouseUp(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        if (this._isDragging) {
            return this.finishDrag()
        }

        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        const store = useStore.getState()

        switch (event.key) {
            case 'x':
                this._constraint.axis = this._constraint.axis === 'x' ? undefined : 'x'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'x' ? 'تم تقييد التحريك للمحور X' : 'تم إلغاء تقييد المحور')

            case 'y':
                this._constraint.axis = this._constraint.axis === 'y' ? undefined : 'y'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'y' ? 'تم تقييد التحريك للمحور Y' : 'تم إلغاء تقييد المحور')

            case 'z':
                this._constraint.axis = this._constraint.axis === 'z' ? undefined : 'z'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'z' ? 'تم تقييد التحريك للمحور Z' : 'تم إلغاء تقييد المحور')

            case 'g':
                this._constraint.snapToGrid = !this._constraint.snapToGrid
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._constraint.snapToGrid ? 'تفعيل' : 'إلغاء'} المحاذاة للشبكة`)

            case 'Shift':
                this._constraint.snapDistance = 0.01 // Fine movement
                return null

            case 'Escape':
                if (this._isDragging) {
                    this.cancelDrag()
                    return this.createSuccessResult(undefined, undefined, 'تم إلغاء التحريك')
                }
                break

            case 'Enter':
                if (this._isDragging) {
                    return this.finishDrag()
                }
                break
        }

        return null
    }

    protected onKeyUp(event: ToolEvent): ToolResult | null {
        switch (event.key) {
            case 'Shift':
                this._constraint.snapDistance = 0.1 // Normal movement
                return null
        }

        return null
    }

    // Public methods for external access
    public getGizmoData(): MoveGizmoData | undefined {
        return this._gizmoData
    }

    public getConstraint(): MoveConstraint {
        return this._constraint
    }

    public setConstraint(constraint: Partial<MoveConstraint>): void {
        this._constraint = { ...this._constraint, ...constraint }
    }

    // Private helper methods
    private updateGizmoVisibility(): void {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            this._gizmoData = undefined
            return
        }

        // Calculate center position of selected elements
        const centerPosition = this.calculateSelectionCenter(selectedElements)

        this._gizmoData = {
            visible: true,
            position: centerPosition,
            activeAxis: undefined,
            hoveredAxis: undefined
        }
    }

    private calculateSelectionCenter(elementIds: string[]): Vector3 {
        const store = useStore.getState()
        let totalX = 0, totalY = 0, totalZ = 0
        let count = 0

        elementIds.forEach(id => {
            const element = store.getElementById(id)
            if (element) {
                totalX += element.position.x
                totalY += element.position.y
                totalZ += element.position.z
                count++
            }
        })

        return new Vector3(
            count > 0 ? totalX / count : 0,
            count > 0 ? totalY / count : 0,
            count > 0 ? totalZ / count : 0
        )
    }

    private getGizmoAxisAtPoint(event: ToolEvent): string | null {
        if (!this._gizmoData || !this._context) return null

        // This would normally involve raycasting against gizmo geometry
        // For now, we'll use a simplified approach based on screen position
        const gizmoScreenPos = this.worldToScreen(this._gizmoData.position)
        if (!gizmoScreenPos) return null

        const distance = Math.sqrt(
            Math.pow(event.position.x - gizmoScreenPos.x, 2) +
            Math.pow(event.position.y - gizmoScreenPos.y, 2)
        )

        if (distance < 0.05) { // 5% of screen
            // Determine which axis based on relative position
            const dx = event.position.x - gizmoScreenPos.x
            const dy = event.position.y - gizmoScreenPos.y

            if (Math.abs(dx) > Math.abs(dy)) {
                return dx > 0 ? 'x' : 'z'
            } else {
                return dy > 0 ? 'y' : 'xy'
            }
        }

        return null
    }

    private worldToScreen(worldPos: Vector3): { x: number; y: number } | null {
        if (!this._context) return null

        const vector = worldPos.clone()
        vector.project(this._context.camera)

        return {
            x: vector.x,
            y: vector.y
        }
    }

    private startGizmoDrag(axis: string, point: Vector3, event: ToolEvent): ToolResult {
        this._isDragging = true
        this._dragStart = point
        this._dragStartScreen = { x: event.position.x, y: event.position.y }

        if (this._gizmoData) {
            this._gizmoData.activeAxis = axis as any
        }

        this.storeInitialPositions()
        this.setupDragConstraints(axis)

        return this.createSuccessResult(undefined, undefined, `بدء التحريك على المحور: ${axis}`)
    }

    private startFreeDrag(point: Vector3, event: ToolEvent): ToolResult {
        this._isDragging = true
        this._dragStart = point
        this._dragStartScreen = { x: event.position.x, y: event.position.y }

        this.storeInitialPositions()
        this.setupDragConstraints('xyz')

        return this.createSuccessResult(undefined, undefined, 'بدء التحريك الحر')
    }

    private storeInitialPositions(): void {
        const store = useStore.getState()
        this._initialPositions.clear()

        store.selectionState.selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element) {
                this._initialPositions.set(id, new Vector3(
                    element.position.x,
                    element.position.y,
                    element.position.z
                ))
            }
        })
    }

    private setupDragConstraints(axis: string): void {
        if (!this._context || !this._gizmoData) return

        const camera = this._context.camera
        const gizmoPos = this._gizmoData.position

        switch (axis) {
            case 'x':
                this._dragAxis = new Vector3(1, 0, 0)
                this._dragPlane = new Plane(new Vector3(0, 0, 1), -gizmoPos.z)
                break
            case 'y':
                this._dragAxis = new Vector3(0, 1, 0)
                this._dragPlane = new Plane(new Vector3(1, 0, 0), -gizmoPos.x)
                break
            case 'z':
                this._dragAxis = new Vector3(0, 0, 1)
                this._dragPlane = new Plane(new Vector3(1, 0, 0), -gizmoPos.x)
                break
            case 'xy':
                this._dragPlane = new Plane(new Vector3(0, 0, 1), -gizmoPos.z)
                break
            case 'xz':
                this._dragPlane = new Plane(new Vector3(0, 1, 0), -gizmoPos.y)
                break
            case 'yz':
                this._dragPlane = new Plane(new Vector3(1, 0, 0), -gizmoPos.x)
                break
            default: // xyz - free movement
                const cameraDirection = new Vector3()
                camera.getWorldDirection(cameraDirection)
                this._dragPlane = new Plane(cameraDirection, -gizmoPos.dot(cameraDirection))
                break
        }
    }

    private handleDrag(event: ToolEvent): ToolResult | null {
        if (!this._isDragging || !this._dragStart || !this._context) return null

        const currentPoint = this.getDragPoint(event)
        if (!currentPoint) return null

        const delta = currentPoint.clone().sub(this._dragStart)

        // Apply axis constraints
        if (this._constraint.axis) {
            switch (this._constraint.axis) {
                case 'x':
                    delta.y = 0
                    delta.z = 0
                    break
                case 'y':
                    delta.x = 0
                    delta.z = 0
                    break
                case 'z':
                    delta.x = 0
                    delta.y = 0
                    break
            }
        }

        // Apply snapping
        if (this._constraint.snapToGrid) {
            const store = useStore.getState()
            const gridSize = store.project?.settings.gridSize || 1

            delta.x = Math.round(delta.x / gridSize) * gridSize
            delta.y = Math.round(delta.y / gridSize) * gridSize
            delta.z = Math.round(delta.z / gridSize) * gridSize
        }

        // Apply movement to all selected elements
        this.applyMovement(delta)

        return null
    }

    private getDragPoint(event: ToolEvent): Vector3 | null {
        if (!this._context || !this._dragPlane) return null

        const raycaster = new Raycaster()
        raycaster.setFromCamera(
            { x: event.position.x, y: event.position.y },
            this._context.camera
        )

        const intersectionPoint = new Vector3()
        const intersected = raycaster.ray.intersectPlane(this._dragPlane, intersectionPoint)

        return intersected ? intersectionPoint : null
    }

    private applyMovement(delta: Vector3): void {
        const store = useStore.getState()

        this._initialPositions.forEach((initialPos, elementId) => {
            const element = store.getElementById(elementId)
            if (element && !element.locked) {
                const newPosition = {
                    x: initialPos.x + delta.x,
                    y: initialPos.y + delta.y,
                    z: initialPos.z + delta.z
                }

                store.updateElement(elementId, { position: newPosition })
            }
        })

        // Update gizmo position
        if (this._gizmoData) {
            this._gizmoData.position = this.calculateSelectionCenter(
                store.selectionState.selectedElements
            )
        }
    }

    private finishDrag(): ToolResult {
        const store = useStore.getState()
        const selectedCount = store.selectionState.selectedElements.length

        this._isDragging = false
        this._dragStart = undefined
        this._dragStartScreen = undefined
        this._dragPlane = undefined
        this._dragAxis = undefined

        if (this._gizmoData) {
            this._gizmoData.activeAxis = undefined
        }

        // Add to history
        store.addHistoryEntry(
            'move_elements',
            `تحريك ${selectedCount} عنصر`,
            {
                elementIds: store.selectionState.selectedElements,
                initialPositions: Array.from(this._initialPositions.entries())
            }
        )

        this._initialPositions.clear()

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم تحريك ${selectedCount} عنصر بنجاح`
        )
    }

    private cancelDrag(): void {
        if (!this._isDragging) return

        const store = useStore.getState()

        // Restore initial positions
        this._initialPositions.forEach((initialPos, elementId) => {
            const element = store.getElementById(elementId)
            if (element) {
                store.updateElement(elementId, {
                    position: {
                        x: initialPos.x,
                        y: initialPos.y,
                        z: initialPos.z
                    }
                })
            }
        })

        this._isDragging = false
        this._dragStart = undefined
        this._dragStartScreen = undefined
        this._dragPlane = undefined
        this._dragAxis = undefined

        if (this._gizmoData) {
            this._gizmoData.activeAxis = undefined
        }

        this._initialPositions.clear()
    }

    private updateGizmoHover(event: ToolEvent): ToolResult | null {
        if (!this._gizmoData) return null

        const hoveredAxis = this.getGizmoAxisAtPoint(event)

        if (this._gizmoData.hoveredAxis !== hoveredAxis) {
            this._gizmoData.hoveredAxis = hoveredAxis as any

            if (this._context?.canvas) {
                this._context.canvas.style.cursor = hoveredAxis ? 'move' : 'default'
            }
        }

        return null
    }

    private getElementAtPoint(point: Vector3): BuildingElement | undefined {
        const store = useStore.getState()

        let closestElement: BuildingElement | undefined
        let closestDistance = Infinity

        for (const element of store.elements) {
            if (!element.visible) continue

            const distance = point.distanceTo(new Vector3(
                element.position.x,
                element.position.y,
                element.position.z
            ))

            const threshold = this.getElementSelectionThreshold(element)

            if (distance < threshold && distance < closestDistance) {
                closestDistance = distance
                closestElement = element
            }
        }

        return closestElement
    }

    private getElementSelectionThreshold(element: BuildingElement): number {
        switch (element.type) {
            case 'wall':
                return Math.max(element.properties.thickness || 0.2, 0.5)
            case 'door':
            case 'window':
                return Math.max(element.properties.width || 1, 0.5)
            case 'floor':
                return 1.0
            default:
                return 0.5
        }
    }

    protected cleanup(): void {
        this._isDragging = false
        this._dragStart = undefined
        this._dragStartScreen = undefined
        this._gizmoData = undefined
        this._dragPlane = undefined
        this._dragAxis = undefined
        this._initialPositions.clear()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}