/**
 * أداة الدوران المتقدمة
 * Advanced rotation tool with gizmos and precise control
 */

import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface RotateGizmoData {
    visible: boolean
    position: Vector3
    activeAxis?: 'x' | 'y' | 'z' | 'screen'
    hoveredAxis?: 'x' | 'y' | 'z' | 'screen'
    rotation: Euler
}

export interface RotateConstraint {
    axis?: 'x' | 'y' | 'z'
    snapToAngle: boolean
    snapAngle: number // in degrees
    showAngle: boolean
}

export class RotateTool extends BaseTool {
    private _isDragging = false
    private _dragStart?: Vector3
    private _dragStartAngle = 0
    private _gizmoData?: RotateGizmoData
    private _constraint: RotateConstraint = {
        snapToAngle: true,
        snapAngle: 15, // 15 degrees
        showAngle: true
    }
    private _initialRotations: Map<string, Euler> = new Map()
    private _rotationCenter?: Vector3
    private _rotationAxis?: Vector3
    private _currentAngle = 0

    constructor() {
        super('select') // RotateTool works within select tool context
    }

    getName(): string {
        return 'أداة الدوران'
    }

    getDescription(): string {
        return 'دوران العناصر المحددة بدقة مع محاور التحكم والمحاذاة للزوايا'
    }

    getIcon(): string {
        return 'rotate-3d'
    }

    getShortcut(): string {
        return 'R'
    }

    protected onActivate(): void {
        const store = useStore.getState()
        store.setTransformMode('rotate')
        this.updateGizmoVisibility()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'grab'
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
            return this.createErrorResult('لا توجد عناصر محددة للدوران')
        }

        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        // Check if clicking on gizmo
        const gizmoAxis = this.getGizmoAxisAtPoint(event)
        if (gizmoAxis) {
            return this.startGizmoRotation(gizmoAxis, event)
        }

        // Check if clicking on selected element
        const clickedElement = this.getElementAtPoint(intersectionPoint)
        if (clickedElement && selectedElements.includes(clickedElement.id)) {
            return this.startFreeRotation(event)
        }

        return null
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        if (this._isDragging) {
            return this.handleRotation(event)
        } else {
            return this.updateGizmoHover(event)
        }
    }

    protected onMouseUp(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        if (this._isDragging) {
            return this.finishRotation()
        }

        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        switch (event.key) {
            case 'x':
                this._constraint.axis = this._constraint.axis === 'x' ? undefined : 'x'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'x' ? 'تم تقييد الدوران للمحور X' : 'تم إلغاء تقييد المحور')

            case 'y':
                this._constraint.axis = this._constraint.axis === 'y' ? undefined : 'y'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'y' ? 'تم تقييد الدوران للمحور Y' : 'تم إلغاء تقييد المحور')

            case 'z':
                this._constraint.axis = this._constraint.axis === 'z' ? undefined : 'z'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'z' ? 'تم تقييد الدوران للمحور Z' : 'تم إلغاء تقييد المحور')

            case 'Shift':
                this._constraint.snapAngle = 5 // Fine rotation
                return null

            case 'Ctrl':
                this._constraint.snapToAngle = !this._constraint.snapToAngle
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._constraint.snapToAngle ? 'تفعيل' : 'إلغاء'} المحاذاة للزوايا`)

            case 'Escape':
                if (this._isDragging) {
                    this.cancelRotation()
                    return this.createSuccessResult(undefined, undefined, 'تم إلغاء الدوران')
                }
                break

            case 'Enter':
                if (this._isDragging) {
                    return this.finishRotation()
                }
                break

            // Quick rotation shortcuts
            case 'ArrowLeft':
                return this.quickRotate(-this._constraint.snapAngle)
            case 'ArrowRight':
                return this.quickRotate(this._constraint.snapAngle)
            case 'ArrowUp':
                return this.quickRotate(-this._constraint.snapAngle, 'x')
            case 'ArrowDown':
                return this.quickRotate(this._constraint.snapAngle, 'x')
        }

        return null
    }

    protected onKeyUp(event: ToolEvent): ToolResult | null {
        switch (event.key) {
            case 'Shift':
                this._constraint.snapAngle = 15 // Normal rotation
                return null
        }

        return null
    }

    // Public methods for external access
    public getGizmoData(): RotateGizmoData | undefined {
        return this._gizmoData
    }

    public getConstraint(): RotateConstraint {
        return this._constraint
    }

    public setConstraint(constraint: Partial<RotateConstraint>): void {
        this._constraint = { ...this._constraint, ...constraint }
    }

    public getCurrentAngle(): number {
        return this._currentAngle
    }

    // Private helper methods
    private updateGizmoVisibility(): void {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            this._gizmoData = undefined
            return
        }

        // Calculate center position and average rotation of selected elements
        const centerPosition = this.calculateSelectionCenter(selectedElements)
        const averageRotation = this.calculateAverageRotation(selectedElements)

        this._gizmoData = {
            visible: true,
            position: centerPosition,
            rotation: averageRotation,
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

    private calculateAverageRotation(elementIds: string[]): Euler {
        const store = useStore.getState()
        let totalX = 0, totalY = 0, totalZ = 0
        let count = 0

        elementIds.forEach(id => {
            const element = store.getElementById(id)
            if (element) {
                totalX += element.rotation.x
                totalY += element.rotation.y
                totalZ += element.rotation.z
                count++
            }
        })

        return new Euler(
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

        if (distance < 0.08) { // 8% of screen for rotation gizmo
            // Determine which axis based on relative position and distance from center
            const dx = event.position.x - gizmoScreenPos.x
            const dy = event.position.y - gizmoScreenPos.y
            const angle = Math.atan2(dy, dx)

            // Divide into quadrants for different axes
            const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2)

            if (distance < 0.03) {
                return 'screen' // Center sphere for screen-space rotation
            } else if (normalizedAngle < Math.PI / 4 || normalizedAngle > 7 * Math.PI / 4) {
                return 'x' // Right side - X axis
            } else if (normalizedAngle < 3 * Math.PI / 4) {
                return 'y' // Top side - Y axis
            } else if (normalizedAngle < 5 * Math.PI / 4) {
                return 'z' // Left side - Z axis
            } else {
                return 'y' // Bottom side - Y axis
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

    private startGizmoRotation(axis: string, event: ToolEvent): ToolResult {
        this._isDragging = true
        this._dragStartAngle = this.getScreenAngle(event)

        if (this._gizmoData) {
            this._gizmoData.activeAxis = axis as any
            this._rotationCenter = this._gizmoData.position.clone()
        }

        this.storeInitialRotations()
        this.setupRotationAxis(axis)

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'grabbing'
        }

        return this.createSuccessResult(undefined, undefined, `بدء الدوران حول المحور: ${axis}`)
    }

    private startFreeRotation(event: ToolEvent): ToolResult {
        this._isDragging = true
        this._dragStartAngle = this.getScreenAngle(event)

        if (this._gizmoData) {
            this._rotationCenter = this._gizmoData.position.clone()
        }

        this.storeInitialRotations()
        this.setupRotationAxis('y') // Default to Y axis for free rotation

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'grabbing'
        }

        return this.createSuccessResult(undefined, undefined, 'بدء الدوران الحر')
    }

    private storeInitialRotations(): void {
        const store = useStore.getState()
        this._initialRotations.clear()

        store.selectionState.selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element) {
                this._initialRotations.set(id, new Euler(
                    element.rotation.x,
                    element.rotation.y,
                    element.rotation.z
                ))
            }
        })
    }

    private setupRotationAxis(axis: string): void {
        switch (axis) {
            case 'x':
                this._rotationAxis = new Vector3(1, 0, 0)
                break
            case 'y':
                this._rotationAxis = new Vector3(0, 1, 0)
                break
            case 'z':
                this._rotationAxis = new Vector3(0, 0, 1)
                break
            case 'screen':
                // Screen-space rotation (camera-facing axis)
                if (this._context) {
                    const cameraDirection = new Vector3()
                    this._context.camera.getWorldDirection(cameraDirection)
                    this._rotationAxis = cameraDirection.normalize()
                } else {
                    this._rotationAxis = new Vector3(0, 0, 1)
                }
                break
            default:
                this._rotationAxis = new Vector3(0, 1, 0)
                break
        }
    }

    private getScreenAngle(event: ToolEvent): number {
        if (!this._gizmoData) return 0

        const gizmoScreenPos = this.worldToScreen(this._gizmoData.position)
        if (!gizmoScreenPos) return 0

        const dx = event.position.x - gizmoScreenPos.x
        const dy = event.position.y - gizmoScreenPos.y

        return Math.atan2(dy, dx)
    }

    private handleRotation(event: ToolEvent): ToolResult | null {
        if (!this._isDragging || !this._rotationCenter || !this._rotationAxis) return null

        const currentAngle = this.getScreenAngle(event)
        let deltaAngle = currentAngle - this._dragStartAngle

        // Convert to degrees
        deltaAngle = MathUtils.radToDeg(deltaAngle)

        // Apply axis constraints
        if (this._constraint.axis) {
            // Constraint is already applied via _rotationAxis
        }

        // Apply angle snapping
        if (this._constraint.snapToAngle) {
            deltaAngle = Math.round(deltaAngle / this._constraint.snapAngle) * this._constraint.snapAngle
        }

        this._currentAngle = deltaAngle

        // Apply rotation to all selected elements
        this.applyRotation(deltaAngle)

        return null
    }

    private applyRotation(deltaAngle: number): void {
        const store = useStore.getState()
        const deltaRadians = MathUtils.degToRad(deltaAngle)

        if (!this._rotationCenter || !this._rotationAxis) return

        this._initialRotations.forEach((initialRotation, elementId) => {
            const element = store.getElementById(elementId)
            if (element && !element.locked) {
                // Calculate new rotation
                const newRotation = initialRotation.clone()

                // Apply rotation around the specified axis
                if (this._rotationAxis) {
                    if (this._rotationAxis.x === 1) {
                        newRotation.x += deltaRadians
                    } else if (this._rotationAxis.y === 1) {
                        newRotation.y += deltaRadians
                    } else if (this._rotationAxis.z === 1) {
                        newRotation.z += deltaRadians
                    }
                }

                // If rotating around a center point (not element's own center)
                if (this._rotationCenter && store.selectionState.selectedElements.length > 1) {
                    // Calculate new position after rotation around center
                    const elementPos = new Vector3(element.position.x, element.position.y, element.position.z)
                    const relativePos = elementPos.clone().sub(this._rotationCenter)

                    // Rotate the relative position
                    const quaternion = new Quaternion()
                    quaternion.setFromAxisAngle(this._rotationAxis, deltaRadians)
                    relativePos.applyQuaternion(quaternion)

                    const newPosition = this._rotationCenter.clone().add(relativePos)

                    store.updateElement(elementId, {
                        position: {
                            x: newPosition.x,
                            y: newPosition.y,
                            z: newPosition.z
                        },
                        rotation: {
                            x: newRotation.x,
                            y: newRotation.y,
                            z: newRotation.z
                        }
                    })
                } else {
                    // Just rotate around element's own center
                    store.updateElement(elementId, {
                        rotation: {
                            x: newRotation.x,
                            y: newRotation.y,
                            z: newRotation.z
                        }
                    })
                }
            }
        })

        // Update gizmo rotation
        if (this._gizmoData) {
            this._gizmoData.rotation = this.calculateAverageRotation(
                store.selectionState.selectedElements
            )
        }
    }

    private quickRotate(angle: number, axis?: string): ToolResult {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للدوران')
        }

        const rotationAxis = axis || this._constraint.axis || 'y'
        const deltaRadians = MathUtils.degToRad(angle)

        selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element && !element.locked) {
                const newRotation = { ...element.rotation }

                switch (rotationAxis) {
                    case 'x':
                        newRotation.x += deltaRadians
                        break
                    case 'y':
                        newRotation.y += deltaRadians
                        break
                    case 'z':
                        newRotation.z += deltaRadians
                        break
                }

                store.updateElement(id, { rotation: newRotation })
            }
        })

        // Add to history
        store.addHistoryEntry(
            'rotate_elements',
            `دوران ${selectedElements.length} عنصر بزاوية ${angle}°`,
            {
                elementIds: selectedElements,
                angle,
                axis: rotationAxis
            }
        )

        this.updateGizmoVisibility()

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم دوران ${selectedElements.length} عنصر بزاوية ${angle}° حول المحور ${rotationAxis}`
        )
    }

    private finishRotation(): ToolResult {
        const store = useStore.getState()
        const selectedCount = store.selectionState.selectedElements.length

        this._isDragging = false
        this._dragStartAngle = 0
        this._rotationCenter = undefined
        this._rotationAxis = undefined

        if (this._gizmoData) {
            this._gizmoData.activeAxis = undefined
        }

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'grab'
        }

        // Add to history
        store.addHistoryEntry(
            'rotate_elements',
            `دوران ${selectedCount} عنصر بزاوية ${this._currentAngle.toFixed(1)}°`,
            {
                elementIds: store.selectionState.selectedElements,
                initialRotations: Array.from(this._initialRotations.entries()),
                finalAngle: this._currentAngle
            }
        )

        this._initialRotations.clear()
        this._currentAngle = 0

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم دوران ${selectedCount} عنصر بزاوية ${this._currentAngle.toFixed(1)}° بنجاح`
        )
    }

    private cancelRotation(): void {
        if (!this._isDragging) return

        const store = useStore.getState()

        // Restore initial rotations and positions
        this._initialRotations.forEach((initialRotation, elementId) => {
            const element = store.getElementById(elementId)
            if (element) {
                store.updateElement(elementId, {
                    rotation: {
                        x: initialRotation.x,
                        y: initialRotation.y,
                        z: initialRotation.z
                    }
                })
            }
        })

        this._isDragging = false
        this._dragStartAngle = 0
        this._rotationCenter = undefined
        this._rotationAxis = undefined
        this._currentAngle = 0

        if (this._gizmoData) {
            this._gizmoData.activeAxis = undefined
        }

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'grab'
        }

        this._initialRotations.clear()
    }

    private updateGizmoHover(event: ToolEvent): ToolResult | null {
        if (!this._gizmoData) return null

        const hoveredAxis = this.getGizmoAxisAtPoint(event)

        if (this._gizmoData.hoveredAxis !== hoveredAxis) {
            this._gizmoData.hoveredAxis = hoveredAxis as any

            if (this._context?.canvas) {
                this._context.canvas.style.cursor = hoveredAxis ? 'grab' : 'default'
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
        this._dragStartAngle = 0
        this._gizmoData = undefined
        this._rotationCenter = undefined
        this._rotationAxis = undefined
        this._currentAngle = 0
        this._initialRotations.clear()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}