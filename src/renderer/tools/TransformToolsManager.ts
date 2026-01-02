/**
 * مدير أدوات التحويل
 * Transform tools manager for coordinating move, rotate, and scale tools
 */

import { Vector3 } from 'three'
import { useStore } from '../store'
import { ToolContext, ToolEvent, ToolResult } from './BaseTool'
import { MoveGizmoData, MoveTool } from './MoveTool'
import { RotateGizmoData, RotateTool } from './RotateTool'
import { ScaleGizmoData, ScaleTool } from './ScaleTool'

export interface TransformGizmoState {
    moveData?: MoveGizmoData
    rotateData?: RotateGizmoData
    scaleData?: ScaleGizmoData
    numericPanelVisible: boolean
    numericPanelMode: 'translate' | 'rotate' | 'scale'
}

/**
 * مدير أدوات التحويل المسؤول عن تنسيق أدوات التحريك والدوران والتحجيم
 */
export class TransformToolsManager {
    private _moveTool: MoveTool
    private _rotateTool: RotateTool
    private _scaleTool: ScaleTool
    private _context?: ToolContext
    private _gizmoState: TransformGizmoState = {
        numericPanelVisible: false,
        numericPanelMode: 'translate'
    }
    private _activeTransformTool?: MoveTool | RotateTool | ScaleTool

    constructor() {
        this._moveTool = new MoveTool()
        this._rotateTool = new RotateTool()
        this._scaleTool = new ScaleTool()
    }

    // Set the 3D context for transform tools
    setContext(context: ToolContext): void {
        this._context = context
    }

    // Update transform tools based on current selection and transform mode
    updateTransformTools(): void {
        const store = useStore.getState()
        const { selectionState } = store

        if (selectionState.selectedElements.length === 0) {
            this.deactivateAllTransformTools()
            this._gizmoState = {
                numericPanelVisible: this._gizmoState.numericPanelVisible,
                numericPanelMode: this._gizmoState.numericPanelMode
            }
            return
        }

        // Activate appropriate tool based on transform mode
        switch (selectionState.transformMode) {
            case 'translate':
                this.activateMoveTool()
                break
            case 'rotate':
                this.activateRotateTool()
                break
            case 'scale':
                this.activateScaleTool()
                break
        }

        this.updateGizmoState()
    }

    // Activate move tool
    private activateMoveTool(): void {
        if (!this._context) return

        this.deactivateAllTransformTools()
        this._moveTool.activate(this._context)
        this._activeTransformTool = this._moveTool
    }

    // Activate rotate tool
    private activateRotateTool(): void {
        if (!this._context) return

        this.deactivateAllTransformTools()
        this._rotateTool.activate(this._context)
        this._activeTransformTool = this._rotateTool
    }

    // Activate scale tool
    private activateScaleTool(): void {
        if (!this._context) return

        this.deactivateAllTransformTools()
        this._scaleTool.activate(this._context)
        this._activeTransformTool = this._scaleTool
    }

    // Deactivate all transform tools
    private deactivateAllTransformTools(): void {
        if (this._moveTool.isActive) {
            this._moveTool.deactivate()
        }
        if (this._rotateTool.isActive) {
            this._rotateTool.deactivate()
        }
        if (this._scaleTool.isActive) {
            this._scaleTool.deactivate()
        }
        this._activeTransformTool = undefined
    }

    // Update gizmo state from active tools
    private updateGizmoState(): void {
        this._gizmoState = {
            moveData: this._moveTool.isActive ? this._moveTool.getGizmoData() : undefined,
            rotateData: this._rotateTool.isActive ? this._rotateTool.getGizmoData() : undefined,
            scaleData: this._scaleTool.isActive ? this._scaleTool.getGizmoData() : undefined,
            numericPanelVisible: this._gizmoState.numericPanelVisible,
            numericPanelMode: this._gizmoState.numericPanelMode
        }
    }

    // Handle events for active transform tool
    handleEvent(event: ToolEvent): ToolResult | null {
        if (!this._activeTransformTool) return null

        try {
            const result = this._activeTransformTool.handleEvent(event)

            // Update gizmo state after handling event
            this.updateGizmoState()

            return result
        } catch (error) {
            console.error('Error handling transform tool event:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    // Get current gizmo state
    getGizmoState(): TransformGizmoState {
        return { ...this._gizmoState }
    }

    // Toggle numeric input panel
    toggleNumericPanel(mode?: 'translate' | 'rotate' | 'scale'): void {
        const store = useStore.getState()

        if (store.selectionState.selectedElements.length === 0) {
            return
        }

        if (this._gizmoState.numericPanelVisible) {
            this._gizmoState.numericPanelVisible = false
        } else {
            this._gizmoState.numericPanelVisible = true
            this._gizmoState.numericPanelMode = mode || store.selectionState.transformMode
        }
    }

    // Close numeric panel
    closeNumericPanel(): void {
        this._gizmoState.numericPanelVisible = false
    }

    // Set transform constraints
    setMoveConstraint(constraint: Parameters<MoveTool['setConstraint']>[0]): void {
        this._moveTool.setConstraint(constraint)
    }

    setRotateConstraint(constraint: Parameters<RotateTool['setConstraint']>[0]): void {
        this._rotateTool.setConstraint(constraint)
    }

    setScaleConstraint(constraint: Parameters<ScaleTool['setConstraint']>[0]): void {
        this._scaleTool.setConstraint(constraint)
    }

    // Get transform constraints
    getMoveConstraint(): ReturnType<MoveTool['getConstraint']> {
        return this._moveTool.getConstraint()
    }

    getRotateConstraint(): ReturnType<RotateTool['getConstraint']> {
        return this._rotateTool.getConstraint()
    }

    getScaleConstraint(): ReturnType<ScaleTool['getConstraint']> {
        return this._scaleTool.getConstraint()
    }

    // Get current transform values
    getCurrentMoveValues(): { position: Vector3 } | null {
        if (!this._moveTool.isActive) return null
        return { position: new Vector3(0, 0, 0) } // Placeholder
    }

    getCurrentRotateValues(): { angle: number } | null {
        if (!this._rotateTool.isActive) return null
        return { angle: this._rotateTool.getCurrentAngle() }
    }

    getCurrentScaleValues(): { scale: Vector3 } | null {
        if (!this._scaleTool.isActive) return null
        return { scale: this._scaleTool.getCurrentScale() }
    }

    // Quick transform operations
    quickMove(delta: { x: number; y: number; z: number }): ToolResult | null {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return {
                success: false,
                error: 'لا توجد عناصر محددة للتحريك'
            }
        }

        selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element && !element.locked) {
                store.updateElement(id, {
                    position: {
                        x: element.position.x + delta.x,
                        y: element.position.y + delta.y,
                        z: element.position.z + delta.z
                    }
                })
            }
        })

        store.addHistoryEntry(
            'quick_move',
            `تحريك سريع ${selectedElements.length} عنصر`,
            { elementIds: selectedElements, delta }
        )

        return {
            success: true,
            message: `تم تحريك ${selectedElements.length} عنصر`
        }
    }

    quickRotate(angle: number, axis: 'x' | 'y' | 'z' = 'y'): ToolResult | null {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return {
                success: false,
                error: 'لا توجد عناصر محددة للدوران'
            }
        }

        const angleRad = (angle * Math.PI) / 180

        selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element && !element.locked) {
                const newRotation = { ...element.rotation }
                newRotation[axis] += angleRad

                store.updateElement(id, { rotation: newRotation })
            }
        })

        store.addHistoryEntry(
            'quick_rotate',
            `دوران سريع ${selectedElements.length} عنصر بزاوية ${angle}°`,
            { elementIds: selectedElements, angle, axis }
        )

        return {
            success: true,
            message: `تم دوران ${selectedElements.length} عنصر بزاوية ${angle}°`
        }
    }

    quickScale(factor: number | { x: number; y: number; z: number }): ToolResult | null {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return {
                success: false,
                error: 'لا توجد عناصر محددة للتحجيم'
            }
        }

        const scaleFactor = typeof factor === 'number'
            ? { x: factor, y: factor, z: factor }
            : factor

        selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element && !element.locked) {
                store.updateElement(id, {
                    scale: {
                        x: element.scale.x * scaleFactor.x,
                        y: element.scale.y * scaleFactor.y,
                        z: element.scale.z * scaleFactor.z
                    }
                })
            }
        })

        store.addHistoryEntry(
            'quick_scale',
            `تحجيم سريع ${selectedElements.length} عنصر`,
            { elementIds: selectedElements, scaleFactor }
        )

        return {
            success: true,
            message: `تم تحجيم ${selectedElements.length} عنصر`
        }
    }

    // Reset transforms
    resetPosition(): ToolResult | null {
        return this.quickMove({ x: 0, y: 0, z: 0 })
    }

    resetRotation(): ToolResult | null {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return {
                success: false,
                error: 'لا توجد عناصر محددة'
            }
        }

        selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element && !element.locked) {
                store.updateElement(id, {
                    rotation: { x: 0, y: 0, z: 0 }
                })
            }
        })

        store.addHistoryEntry(
            'reset_rotation',
            `إعادة تعيين دوران ${selectedElements.length} عنصر`,
            { elementIds: selectedElements }
        )

        return {
            success: true,
            message: `تم إعادة تعيين دوران ${selectedElements.length} عنصر`
        }
    }

    resetScale(): ToolResult | null {
        const store = useStore.getState()
        const selectedElements = store.selectionState.selectedElements

        if (selectedElements.length === 0) {
            return {
                success: false,
                error: 'لا توجد عناصر محددة'
            }
        }

        selectedElements.forEach(id => {
            const element = store.getElementById(id)
            if (element && !element.locked) {
                store.updateElement(id, {
                    scale: { x: 1, y: 1, z: 1 }
                })
            }
        })

        store.addHistoryEntry(
            'reset_scale',
            `إعادة تعيين تحجيم ${selectedElements.length} عنصر`,
            { elementIds: selectedElements }
        )

        return {
            success: true,
            message: `تم إعادة تعيين تحجيم ${selectedElements.length} عنصر`
        }
    }

    // Cleanup
    dispose(): void {
        this.deactivateAllTransformTools()
        this._context = undefined
        this._gizmoState = {
            numericPanelVisible: false,
            numericPanelMode: 'translate'
        }
    }
}

// Singleton instance
let transformToolsManagerInstance: TransformToolsManager | null = null

export function getTransformToolsManager(): TransformToolsManager {
    if (!transformToolsManagerInstance) {
        transformToolsManagerInstance = new TransformToolsManager()
    }
    return transformToolsManagerInstance
}

export function createTransformToolsManager(): TransformToolsManager {
    transformToolsManagerInstance = new TransformToolsManager()
    return transformToolsManagerInstance
}