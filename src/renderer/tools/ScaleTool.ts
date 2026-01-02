/**
 * أداة التحجيم المتقدمة
 * Advanced scale tool with gizmos and uniform scaling
 */

import { MathUtils, Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface ScaleGizmoData {
    visible: boolean
    position: Vector3
    activeAxis?: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz'
    hoveredAxis?: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz'
    scale: Vector3
}

export interface ScaleConstraint {
    axis?: 'x' | 'y' | 'z'
    uniform: boolean
    preserveAspectRatio: boolean
    minScale: number
    maxScale: number
    snapToScale: boolean
    snapValue: number
}

export class ScaleTool extends BaseTool {
    private _isDragging = false
    private _dragStart?: Vector3
    private _dragStartScreen?: { x: number; y: number }
    private _gizmoData?: ScaleGizmoData
    private _constraint: ScaleConstraint = {
        uniform: false,
        preserveAspectRatio: true,
        minScale: 0.1,
        maxScale: 10.0,
        snapToScale: false,
        snapValue: 0.1
    }
    private _initialScales: Map<string, Vector3> = new Map()
    private _initialSizes: Map<string, Vector3> = new Map()
    private _scaleCenter?: Vector3
    private _currentScale = new Vector3(1, 1, 1)

    constructor() {
        super('select') // ScaleTool works within select tool context
    }

    getName(): string {
        return 'أداة التحجيم'
    }

    getDescription(): string {
        return 'تحجيم العناصر المحددة بدقة مع الحفاظ على النسب والمحاذاة'
    }

    getIcon(): string {
        return 'resize'
    }

    getShortcut(): string {
        return 'S'
    }

    protected onActivate(): void {
        const store = useStore.getState()
        store.setTransformMode('scale')
        this.updateGizmoVisibility()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'nw-resize'
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
            return this.createErrorResult('لا توجد عناصر محددة للتحجيم')
        }

        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        // Check if clicking on gizmo
        const gizmoAxis = this.getGizmoAxisAtPoint(event)
        if (gizmoAxis) {
            return this.startGizmoScale(gizmoAxis, event)
        }

        // Check if clicking on selected element
        const clickedElement = this.getElementAtPoint(intersectionPoint)
        if (clickedElement && selectedElements.includes(clickedElement.id)) {
            return this.startFreeScale(event)
        }

        return null
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        if (this._isDragging) {
            return this.handleScale(event)
        } else {
            return this.updateGizmoHover(event)
        }
    }

    protected onMouseUp(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        if (this._isDragging) {
            return this.finishScale()
        }

        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        switch (event.key) {
            case 'x':
                this._constraint.axis = this._constraint.axis === 'x' ? undefined : 'x'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'x' ? 'تم تقييد التحجيم للمحور X' : 'تم إلغاء تقييد المحور')

            case 'y':
                this._constraint.axis = this._constraint.axis === 'y' ? undefined : 'y'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'y' ? 'تم تقييد التحجيم للمحور Y' : 'تم إلغاء تقييد المحور')

            case 'z':
                this._constraint.axis = this._constraint.axis === 'z' ? undefined : 'z'
                return this.createSuccessResult(undefined, undefined,
                    this._constraint.axis === 'z' ? 'تم تقييد التحجيم للمحور Z' : 'تم إلغاء تقييد المحور')

            case 'Shift':
                this._constraint.uniform = true
                return this.createSuccessResult(undefined, undefined, 'تم تفعيل التحجيم المتناسق')

            case 'Ctrl':
                this._constraint.preserveAspectRatio = !this._constraint.preserveAspectRatio
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._constraint.preserveAspectRatio ? 'تفعيل' : 'إلغاء'} الحفاظ على النسب`)

            case 'Alt':
                this._constraint.snapToScale = !this._constraint.snapToScale
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._constraint.snapToScale ? 'تفعيل' : 'إلغاء'} المحاذاة للقيم`)

            case 'Escape':
                if (this._isDragging) {
                    this.cancelScale()
                    return this.createSuccessResult(undefined, undefined, 'تم إلغاء التحجيم')
                }
                break

            case 'Enter':
                if (this._isDragging) {
                    return this.finishScale()
                }
                break

            // Quick scale shortcuts
            case '1':
                return this.quickScale(new Vector3(1, 1, 1))
            case '2':
                return this.quickScale(new Vector3(2, 2, 2))
            case '0':
                return this.quickScale(new Vector3(0.5, 0.5, 0.5))

            // Numeric input for precise scaling
            case 'Tab':
                if (event.shiftKey) {
                    return this.openNumericInput()
                }
                break
        }

        return null
    }

    protected onKeyUp(event: ToolEvent): ToolResult | null {
        switch (event.key) {
            case 'Shift':
                this._constraint.uniform = false
                return this.createSuccessResult(undefined, undefined, 'تم إلغاء التحجيم المتناسق')
        }

        return null
    }

    protected onWheel(event: ToolEvent): ToolResult | null {
        if (!event.ctrlKey) return null

        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) return null

        const scaleFactor = event.delta! > 0 ? 0.9 : 1.1
        const scaleVector = new Vector3(scaleFactor, scaleFactor, scaleFactor)

        return this.quickScale(scaleVector)
    }

    // Public methods for external access
    public getGizmoData(): ScaleGizmoData | undefined {
        return this._gizmoData
    }

    public getConstraint(): ScaleConstraint {
        return this._constraint
    }

    public setConstraint(constraint: Partial<ScaleConstraint>): void {
        this._constraint = { ...this._constraint, ...constraint }
    }

    public getCurrentScale(): Vector3 {
        return this._currentScale.clone()
    }

    // Private helper methods
    private updateGizmoVisibility(): void {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            this._gizmoData = undefined
            return
        }

        // Calculate center position and average scale of selected elements
        const centerPosition = this.calculateSelectionCenter(selectedElements)
        const averageScale = this.calculateAverageScale(selectedElements)

        this._gizmoData = {
            visible: true,
            position: centerPosition,
            scale: averageScale,
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

    private calculateAverageScale(elementIds: string[]): Vector3 {
        const store = useStore.getState()
        let totalX = 0, totalY = 0, totalZ = 0
        let count = 0

        elementIds.forEach(id => {
            const element = store.getElementById(id)
            if (element) {
                totalX += element.scale.x
                totalY += element.scale.y
                totalZ += element.scale.z
                count++
            }
        })

        return new Vector3(
            count > 0 ? totalX / count : 1,
            count > 0 ? totalY / count : 1,
            count > 0 ? totalZ / count : 1
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

        if (distance < 0.06) { // 6% of screen for scale gizmo
            const dx = event.position.x - gizmoScreenPos.x
            const dy = event.position.y - gizmoScreenPos.y

            // Determine axis based on position relative to gizmo center
            if (distance < 0.02) {
                return 'xyz' // Center cube for uniform scaling
            } else if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dy) < 0.01) {
                    return dx > 0 ? 'x' : 'x' // X axis
                } else {
                    return dx > 0 ? (dy > 0 ? 'xy' : 'xy') : (dy > 0 ? 'xy' : 'xy')
                }
            } else {
                if (Math.abs(dx) < 0.01) {
                    return dy > 0 ? 'y' : 'y' // Y axis
                } else {
                    return dy > 0 ? 'yz' : 'yz'
                }
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

    private startGizmoScale(axis: string, event: ToolEvent): ToolResult {
        this._isDragging = true
        this._dragStartScreen = { x: event.position.x, y: event.position.y }

        if (this._gizmoData) {
            this._gizmoData.activeAxis = axis as any
            this._scaleCenter = this._gizmoData.position.clone()
        }

        this.storeInitialScales()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'nw-resize'
        }

        return this.createSuccessResult(undefined, undefined, `بدء التحجيم على المحور: ${axis}`)
    }

    private startFreeScale(event: ToolEvent): ToolResult {
        this._isDragging = true
        this._dragStartScreen = { x: event.position.x, y: event.position.y }

        if (this._gizmoData) {
            this._scaleCenter = this._gizmoData.position.clone()
        }

        this.storeInitialScales()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'nw-resize'
        }

        return this.createSuccessResult(undefined, undefined, 'بدء التحجيم الحر')
    }

    private storeInitialScales(): void {
        const store = useStore.getState()
        this._initialScales.clear()
        this._initialSizes.clear()

        store.selectionState.selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element) {
                this._initialScales.set(id, new Vector3(
                    element.scale.x,
                    element.scale.y,
                    element.scale.z
                ))

                // Store initial sizes for elements with size properties
                const size = this.getElementSize(element)
                this._initialSizes.set(id, size)
            }
        })
    }

    private getElementSize(element: BuildingElement): Vector3 {
        switch (element.type) {
            case 'wall':
                return new Vector3(
                    1, // Length will be calculated from geometry
                    element.properties.height || 3,
                    element.properties.thickness || 0.2
                )
            case 'door':
            case 'window':
                return new Vector3(
                    element.properties.width || 1,
                    element.properties.height || 2,
                    0.1
                )
            case 'floor':
                return new Vector3(1, element.properties.thickness || 0.1, 1)
            default:
                return new Vector3(1, 1, 1)
        }
    }

    private handleScale(event: ToolEvent): ToolResult | null {
        if (!this._isDragging || !this._dragStartScreen) return null

        // Calculate scale factor based on mouse movement
        const deltaX = event.position.x - this._dragStartScreen.x
        const deltaY = event.position.y - this._dragStartScreen.y

        // Use the larger movement for scale calculation
        const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY))
        const direction = deltaX + deltaY > 0 ? 1 : -1

        let scaleFactor = 1 + (delta * direction * 2) // 2x sensitivity

        // Clamp scale factor
        scaleFactor = MathUtils.clamp(scaleFactor, this._constraint.minScale, this._constraint.maxScale)

        // Determine scale vector based on active axis and constraints
        let scaleVector = new Vector3(1, 1, 1)

        if (this._constraint.uniform || this._gizmoData?.activeAxis === 'xyz') {
            scaleVector.setScalar(scaleFactor)
        } else {
            const activeAxis = this._gizmoData?.activeAxis || 'xyz'

            switch (activeAxis) {
                case 'x':
                    scaleVector.x = scaleFactor
                    break
                case 'y':
                    scaleVector.y = scaleFactor
                    break
                case 'z':
                    scaleVector.z = scaleFactor
                    break
                case 'xy':
                    scaleVector.x = scaleFactor
                    scaleVector.y = scaleFactor
                    break
                case 'xz':
                    scaleVector.x = scaleFactor
                    scaleVector.z = scaleFactor
                    break
                case 'yz':
                    scaleVector.y = scaleFactor
                    scaleVector.z = scaleFactor
                    break
                default:
                    scaleVector.setScalar(scaleFactor)
                    break
            }
        }

        // Apply axis constraints
        if (this._constraint.axis) {
            const tempScale = scaleVector.clone()
            scaleVector.set(1, 1, 1)

            switch (this._constraint.axis) {
                case 'x':
                    scaleVector.x = tempScale.x
                    break
                case 'y':
                    scaleVector.y = tempScale.y
                    break
                case 'z':
                    scaleVector.z = tempScale.z
                    break
            }
        }

        // Apply snapping
        if (this._constraint.snapToScale) {
            scaleVector.x = Math.round(scaleVector.x / this._constraint.snapValue) * this._constraint.snapValue
            scaleVector.y = Math.round(scaleVector.y / this._constraint.snapValue) * this._constraint.snapValue
            scaleVector.z = Math.round(scaleVector.z / this._constraint.snapValue) * this._constraint.snapValue
        }

        this._currentScale = scaleVector

        // Apply scaling to all selected elements
        this.applyScale(scaleVector)

        return null
    }

    private applyScale(scaleVector: Vector3): void {
        const store = useStore.getState()

        this._initialScales.forEach((initialScale, elementId) => {
            const element = store.getElementById(elementId)
            if (element && !element.locked) {
                const newScale = {
                    x: initialScale.x * scaleVector.x,
                    y: initialScale.y * scaleVector.y,
                    z: initialScale.z * scaleVector.z
                }

                // Clamp individual scale values
                newScale.x = MathUtils.clamp(newScale.x, this._constraint.minScale, this._constraint.maxScale)
                newScale.y = MathUtils.clamp(newScale.y, this._constraint.minScale, this._constraint.maxScale)
                newScale.z = MathUtils.clamp(newScale.z, this._constraint.minScale, this._constraint.maxScale)

                // Update element properties based on scale
                const updates: Partial<BuildingElement> = { scale: newScale }

                // Update size-related properties for certain element types
                const initialSize = this._initialSizes.get(elementId)
                if (initialSize) {
                    const newProperties = { ...element.properties }

                    switch (element.type) {
                        case 'wall':
                            if (newProperties.height !== undefined) {
                                newProperties.height = initialSize.y * scaleVector.y
                            }
                            if (newProperties.thickness !== undefined) {
                                newProperties.thickness = initialSize.z * scaleVector.z
                            }
                            break
                        case 'door':
                        case 'window':
                            if (newProperties.width !== undefined) {
                                newProperties.width = initialSize.x * scaleVector.x
                            }
                            if (newProperties.height !== undefined) {
                                newProperties.height = initialSize.y * scaleVector.y
                            }
                            break
                        case 'floor':
                            if (newProperties.thickness !== undefined) {
                                newProperties.thickness = initialSize.y * scaleVector.y
                            }
                            break
                    }

                    updates.properties = newProperties
                }

                store.updateElement(elementId, updates)
            }
        })

        // Update gizmo scale
        if (this._gizmoData) {
            this._gizmoData.scale = this.calculateAverageScale(
                store.selectionState.selectedElements
            )
        }
    }

    private quickScale(scaleVector: Vector3): ToolResult {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للتحجيم')
        }

        selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element && !element.locked) {
                const newScale = {
                    x: element.scale.x * scaleVector.x,
                    y: element.scale.y * scaleVector.y,
                    z: element.scale.z * scaleVector.z
                }

                // Clamp scale values
                newScale.x = MathUtils.clamp(newScale.x, this._constraint.minScale, this._constraint.maxScale)
                newScale.y = MathUtils.clamp(newScale.y, this._constraint.minScale, this._constraint.maxScale)
                newScale.z = MathUtils.clamp(newScale.z, this._constraint.minScale, this._constraint.maxScale)

                store.updateElement(id, { scale: newScale })
            }
        })

        // Add to history
        store.addHistoryEntry(
            'scale_elements',
            `تحجيم ${selectedElements.length} عنصر`,
            {
                elementIds: selectedElements,
                scaleVector: scaleVector
            }
        )

        this.updateGizmoVisibility()

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم تحجيم ${selectedElements.length} عنصر بمعامل (${scaleVector.x.toFixed(2)}, ${scaleVector.y.toFixed(2)}, ${scaleVector.z.toFixed(2)})`
        )
    }

    private openNumericInput(): ToolResult {
        // This would open a numeric input dialog for precise scaling
        // For now, we'll return a message indicating the feature
        return this.createSuccessResult(
            undefined,
            undefined,
            'فتح نافذة الإدخال الرقمي للتحجيم الدقيق'
        )
    }

    private finishScale(): ToolResult {
        const store = useStore.getState()
        const selectedCount = store.selectionState.selectedElements.length

        this._isDragging = false
        this._dragStartScreen = undefined
        this._scaleCenter = undefined

        if (this._gizmoData) {
            this._gizmoData.activeAxis = undefined
        }

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'nw-resize'
        }

        // Add to history
        store.addHistoryEntry(
            'scale_elements',
            `تحجيم ${selectedCount} عنصر`,
            {
                elementIds: store.selectionState.selectedElements,
                initialScales: Array.from(this._initialScales.entries()),
                finalScale: this._currentScale
            }
        )

        this._initialScales.clear()
        this._initialSizes.clear()
        this._currentScale.set(1, 1, 1)

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم تحجيم ${selectedCount} عنصر بنجاح`
        )
    }

    private cancelScale(): void {
        if (!this._isDragging) return

        const store = useStore.getState()

        // Restore initial scales
        this._initialScales.forEach((initialScale, elementId) => {
            const element = store.getElementById(elementId)
            if (element) {
                store.updateElement(elementId, {
                    scale: {
                        x: initialScale.x,
                        y: initialScale.y,
                        z: initialScale.z
                    }
                })
            }
        })

        this._isDragging = false
        this._dragStartScreen = undefined
        this._scaleCenter = undefined
        this._currentScale.set(1, 1, 1)

        if (this._gizmoData) {
            this._gizmoData.activeAxis = undefined
        }

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'nw-resize'
        }

        this._initialScales.clear()
        this._initialSizes.clear()
    }

    private updateGizmoHover(event: ToolEvent): ToolResult | null {
        if (!this._gizmoData) return null

        const hoveredAxis = this.getGizmoAxisAtPoint(event)

        if (this._gizmoData.hoveredAxis !== hoveredAxis) {
            this._gizmoData.hoveredAxis = hoveredAxis as any

            if (this._context?.canvas) {
                const cursors = {
                    'x': 'ew-resize',
                    'y': 'ns-resize',
                    'z': 'nw-resize',
                    'xy': 'nw-resize',
                    'xz': 'nw-resize',
                    'yz': 'nw-resize',
                    'xyz': 'nw-resize'
                }
                this._context.canvas.style.cursor = hoveredAxis ? cursors[hoveredAxis] || 'nw-resize' : 'default'
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
        this._dragStartScreen = undefined
        this._gizmoData = undefined
        this._scaleCenter = undefined
        this._currentScale.set(1, 1, 1)
        this._initialScales.clear()
        this._initialSizes.clear()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}