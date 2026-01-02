/**
 * أداة التحديد المتقدمة
 * Advanced selection tool
 */

import { Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface SelectionBoxData {
    start: Vector3
    end: Vector3
    active: boolean
}

export interface ContextMenuData {
    visible: boolean
    position: { x: number; y: number }
    elements: BuildingElement[]
}

export class SelectTool extends BaseTool {
    private _isDragging = false
    private _dragStart?: Vector3
    private _dragStartScreen?: { x: number; y: number }
    private _selectionBox?: SelectionBoxData
    private _lastClickTime = 0
    private _doubleClickThreshold = 300 // ms
    private _dragThreshold = 5 // pixels
    private _contextMenu?: ContextMenuData
    private _hoveredElement?: string

    constructor() {
        super('select')
    }

    getName(): string {
        return 'أداة التحديد'
    }

    getDescription(): string {
        return 'تحديد وتحريك العناصر في المشهد مع دعم التحديد المتعدد والسحب'
    }

    getIcon(): string {
        return 'cursor-arrow'
    }

    getShortcut(): string {
        return 'V'
    }

    protected onActivate(): void {
        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
        this._contextMenu = undefined
    }

    protected onDeactivate(): void {
        this.cleanup()
    }

    protected onMouseDown(event: ToolEvent): ToolResult | null {
        if (event.button === 2) {
            return this.handleRightClick(event)
        }

        if (event.button !== 0) return null

        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const store = useStore.getState()
        const intersectedElement = this.getElementAtPoint(intersectionPoint)

        this._dragStart = intersectionPoint
        this._dragStartScreen = { x: event.position.x, y: event.position.y }

        const currentTime = Date.now()
        const isDoubleClick = currentTime - this._lastClickTime < this._doubleClickThreshold
        this._lastClickTime = currentTime

        if (isDoubleClick && intersectedElement) {
            return this.handleDoubleClick(intersectedElement)
        }

        if (this._contextMenu) {
            this._contextMenu = undefined
        }

        if (intersectedElement) {
            return this.handleElementSelection(intersectedElement, event)
        } else {
            return this.handleEmptySpaceClick(event, intersectionPoint)
        }
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        this.updateHoverState(intersectionPoint)

        if (this._isDragging && this._dragStart && this._dragStartScreen) {
            const screenDistance = Math.sqrt(
                Math.pow(event.position.x - this._dragStartScreen.x, 2) +
                Math.pow(event.position.y - this._dragStartScreen.y, 2)
            )

            if (screenDistance > this._dragThreshold) {
                return this.handleElementDrag(intersectionPoint)
            }
        } else if (this._selectionBox) {
            this._selectionBox.end = intersectionPoint
            return this.updateSelectionBox()
        }

        return null
    }

    protected onMouseUp(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        const store = useStore.getState()

        if (this._isDragging) {
            this._isDragging = false
            this._dragStart = undefined
            this._dragStartScreen = undefined

            return this.createSuccessResult(
                undefined,
                undefined,
                'تم الانتهاء من تحريك العناصر'
            )
        } else if (this._selectionBox) {
            const selectedElements = this.getElementsInSelectionBox()

            if (selectedElements.length > 0) {
                const selectedIds = selectedElements.map(e => e.id)
                if (event.ctrlKey) {
                    selectedIds.forEach(id => store.selectElement(id, true))
                } else {
                    store.selectElements(selectedIds)
                }
            }

            this._selectionBox = undefined

            return this.createSuccessResult(
                undefined,
                selectedElements,
                `تم تحديد ${selectedElements.length} عنصر`
            )
        }

        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        const store = useStore.getState()

        switch (event.key) {
            case 'Delete':
            case 'Backspace':
                return this.deleteSelectedElements()

            case 'Escape':
                store.clearSelection()
                this._contextMenu = undefined
                this.cleanup()
                return this.createSuccessResult(undefined, undefined, 'تم إلغاء التحديد')

            case 'a':
                if (event.ctrlKey) {
                    const allIds = store.elements.map(e => e.id)
                    store.selectElements(allIds)
                    return this.createSuccessResult(undefined, store.elements, `تم تحديد جميع العناصر (${allIds.length})`)
                }
                break

            case 'd':
                if (event.ctrlKey) {
                    return this.duplicateSelectedElements()
                }
                break

            case 'g':
                return this.toggleGridSnap()

            case 't':
                return this.toggleTransformMode()

            case 'r':
                store.setTransformMode('rotate')
                return this.createSuccessResult(undefined, undefined, 'تم تفعيل وضع الدوران')

            case 's':
                if (!event.ctrlKey) {
                    store.setTransformMode('scale')
                    return this.createSuccessResult(undefined, undefined, 'تم تفعيل وضع التحجيم')
                }
                break

            case 'l':
                return this.lockSelectedElements()

            case 'h':
                return this.hideSelectedElements()

            case 'f':
                if (event.ctrlKey) {
                    return this.focusOnSelectedElements()
                }
                break
        }

        return null
    }

    // Public methods for external access
    public getSelectionBox(): SelectionBoxData | undefined {
        return this._selectionBox
    }

    public getContextMenu(): ContextMenuData | undefined {
        return this._contextMenu
    }

    public closeContextMenu(): void {
        this._contextMenu = undefined
    }

    // Private helper methods
    private handleRightClick(event: ToolEvent): ToolResult | null {
        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const store = useStore.getState()
        const intersectedElement = this.getElementAtPoint(intersectionPoint)

        let elementsForMenu: BuildingElement[] = []

        if (intersectedElement) {
            if (!store.selectionState.selectedElements.includes(intersectedElement.id)) {
                store.selectElement(intersectedElement.id, false)
            }

            elementsForMenu = store.selectionState.selectedElements
                .map(id => store.getElementById(id))
                .filter(Boolean) as BuildingElement[]
        }

        if (elementsForMenu.length > 0) {
            const canvas = this._context?.canvas
            if (canvas) {
                const rect = canvas.getBoundingClientRect()
                const screenX = ((event.position.x + 1) / 2) * rect.width + rect.left
                const screenY = ((-event.position.y + 1) / 2) * rect.height + rect.top

                this._contextMenu = {
                    visible: true,
                    position: { x: screenX, y: screenY },
                    elements: elementsForMenu
                }

                return this.createSuccessResult(undefined, undefined, 'تم فتح قائمة السياق')
            }
        }

        return null
    }

    private handleElementSelection(element: BuildingElement, event: ToolEvent): ToolResult | null {
        const store = useStore.getState()

        if (event.ctrlKey) {
            const isSelected = store.selectionState.selectedElements.includes(element.id)
            if (isSelected) {
                store.deselectElement(element.id)
            } else {
                store.selectElement(element.id, true)
            }
        } else if (event.shiftKey) {
            store.selectElement(element.id, true)
        } else {
            store.selectElement(element.id, false)
        }

        if (store.selectionState.selectedElements.includes(element.id)) {
            this._isDragging = true
        }

        return this.createSuccessResult(undefined, undefined, `تم تحديد العنصر: ${element.name}`)
    }

    private handleEmptySpaceClick(event: ToolEvent, point: Vector3): ToolResult | null {
        const store = useStore.getState()

        if (!event.ctrlKey) {
            store.clearSelection()
        }

        this._selectionBox = {
            start: point,
            end: point,
            active: true
        }

        return this.createSuccessResult(undefined, undefined, 'بدء تحديد المنطقة')
    }

    private updateHoverState(point: Vector3): void {
        const store = useStore.getState()
        const hoveredElement = this.getElementAtPoint(point)

        const newHoveredId = hoveredElement?.id

        if (this._hoveredElement !== newHoveredId) {
            this._hoveredElement = newHoveredId
            store.setHoveredElement(newHoveredId)

            if (this._context?.canvas) {
                this._context.canvas.style.cursor = hoveredElement ? 'pointer' : 'default'
            }
        }
    }

    private handleElementDrag(currentPoint: Vector3): ToolResult | null {
        if (!this._dragStart) return null

        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) return null

        const deltaX = currentPoint.x - this._dragStart.x
        const deltaY = currentPoint.y - this._dragStart.y
        const deltaZ = currentPoint.z - this._dragStart.z

        const gridSize = store.project?.settings.gridSize || 1
        const snapToGrid = store.project?.settings.snapToGrid || false

        let finalDelta = { x: deltaX, y: deltaY, z: deltaZ }

        if (snapToGrid) {
            finalDelta = {
                x: Math.round(deltaX / gridSize) * gridSize,
                y: Math.round(deltaY / gridSize) * gridSize,
                z: Math.round(deltaZ / gridSize) * gridSize
            }
        }

        selectedElements.forEach(elementId => {
            const element = store.getElementById(elementId)
            if (element && !element.locked) {
                store.updateElement(elementId, {
                    position: {
                        x: element.position.x + finalDelta.x,
                        y: element.position.y + finalDelta.y,
                        z: element.position.z + finalDelta.z
                    }
                })
            }
        })

        this._dragStart = currentPoint
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

    private handleDoubleClick(element: BuildingElement): ToolResult {
        const store = useStore.getState()
        store.selectElement(element.id, false)

        return this.createSuccessResult(element, undefined, `فتح خصائص العنصر: ${element.name}`)
    }

    private updateSelectionBox(): ToolResult | null {
        return null
    }

    private getElementsInSelectionBox(): BuildingElement[] {
        if (!this._selectionBox) return []

        const store = useStore.getState()
        const { start, end } = this._selectionBox

        const minX = Math.min(start.x, end.x)
        const maxX = Math.max(start.x, end.x)
        const minZ = Math.min(start.z, end.z)
        const maxZ = Math.max(start.z, end.z)

        return store.elements.filter(element => {
            if (!element.visible) return false

            const pos = element.position
            return pos.x >= minX && pos.x <= maxX &&
                pos.z >= minZ && pos.z <= maxZ
        })
    }

    private deleteSelectedElements(): ToolResult {
        const store = useStore.getState()
        const selectedIds = store.selectionState.selectedElements

        if (selectedIds.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للحذف')
        }

        const lockedElements = selectedIds.filter(id => {
            const element = store.getElementById(id)
            return element?.locked
        })

        if (lockedElements.length > 0) {
            return this.createErrorResult(`لا يمكن حذف ${lockedElements.length} عنصر مقفل`)
        }

        store.removeElements(selectedIds)
        store.clearSelection()

        return this.createSuccessResult(undefined, undefined, `تم حذف ${selectedIds.length} عنصر`)
    }

    private duplicateSelectedElements(): ToolResult {
        const store = useStore.getState()
        const selectedIds = store.selectionState.selectedElements

        if (selectedIds.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للنسخ')
        }

        const newIds: string[] = []
        selectedIds.forEach(id => {
            const newElement = store.duplicateElement(id)
            if (newElement) {
                newIds.push(newElement.id)
            }
        })

        store.selectElements(newIds)

        return this.createSuccessResult(
            undefined,
            newIds.map(id => store.getElementById(id)!),
            `تم نسخ ${newIds.length} عنصر`
        )
    }

    private toggleGridSnap(): ToolResult {
        const store = useStore.getState()
        const currentSnap = store.project?.settings.snapToGrid || false

        if (store.project) {
            store.updateProject({
                settings: {
                    ...store.project.settings,
                    snapToGrid: !currentSnap
                }
            })
        }

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم ${!currentSnap ? 'تفعيل' : 'إلغاء'} المحاذاة للشبكة`
        )
    }

    private toggleTransformMode(): ToolResult {
        const store = useStore.getState()
        const currentMode = store.selectionState.transformMode

        const modes: Array<typeof currentMode> = ['translate', 'rotate', 'scale']
        const currentIndex = modes.indexOf(currentMode)
        const nextMode = modes[(currentIndex + 1) % modes.length]

        store.setTransformMode(nextMode)

        const modeNames = {
            translate: 'التحريك',
            rotate: 'الدوران',
            scale: 'التحجيم'
        }

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم تغيير وضع التحويل إلى: ${modeNames[nextMode]}`
        )
    }

    private lockSelectedElements(): ToolResult {
        const store = useStore.getState()
        const selectedIds = store.selectionState.selectedElements

        if (selectedIds.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للقفل')
        }

        selectedIds.forEach(id => {
            store.updateElement(id, { locked: true })
        })

        return this.createSuccessResult(undefined, undefined, `تم قفل ${selectedIds.length} عنصر`)
    }

    private hideSelectedElements(): ToolResult {
        const store = useStore.getState()
        const selectedIds = store.selectionState.selectedElements

        if (selectedIds.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للإخفاء')
        }

        selectedIds.forEach(id => {
            store.updateElement(id, { visible: false })
        })

        store.clearSelection()

        return this.createSuccessResult(undefined, undefined, `تم إخفاء ${selectedIds.length} عنصر`)
    }

    private focusOnSelectedElements(): ToolResult {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements
            .map(id => store.getElementById(id))
            .filter(Boolean) as BuildingElement[]

        if (selectedElements.length === 0) {
            return this.createErrorResult('لا توجد عناصر محددة للتركيز عليها')
        }

        return this.createSuccessResult(undefined, undefined, `تم التركيز على ${selectedElements.length} عنصر`)
    }

    protected cleanup(): void {
        this._isDragging = false
        this._dragStart = undefined
        this._dragStartScreen = undefined
        this._selectionBox = undefined
        this._contextMenu = undefined
        this._hoveredElement = undefined

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}