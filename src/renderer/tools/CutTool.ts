/**
 * أداة القطع المتقدمة
 * Advanced cutting tool
 */

import { Vector3 } from 'three'
import { useStore } from '../store'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export class CutTool extends BaseTool {
    private _targetElement?: string
    private _cutPoints: Vector3[] = []
    private _isCreating = false

    constructor() {
        super('cut')
    }

    getName(): string {
        return 'أداة القطع'
    }

    getDescription(): string {
        return 'إنشاء فتحات دقيقة في الجدران والأرضيات'
    }

    getIcon(): string {
        return 'cut'
    }

    getShortcut(): string {
        return 'C'
    }

    protected onActivate(): void {
        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'crosshair'
        }
    }

    protected onMouseDown(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const store = useStore.getState()

        if (!this._isCreating) {
            // Find target element to cut
            const targetElement = this.findElementAtPoint(intersectionPoint)

            if (!targetElement) {
                return this.createErrorResult('يجب تحديد عنصر للقطع (جدار أو أرضية)')
            }

            if (!this.canCutElement(targetElement)) {
                return this.createErrorResult('لا يمكن قطع هذا النوع من العناصر')
            }

            this._targetElement = targetElement.id
            this._cutPoints = [intersectionPoint]
            this._isCreating = true

            return this.createSuccessResult(
                undefined,
                undefined,
                `بدء قطع العنصر: ${targetElement.name}. حدد نقاط القطع`
            )
        } else {
            // Add cut point
            this._cutPoints.push(intersectionPoint)

            const store = useStore.getState()
            const toolProperties = store.toolState.toolProperties
            const cutShape = toolProperties.cutShape || 'rectangle'

            // Check if we have enough points for the shape
            const requiredPoints = this.getRequiredPointsForShape(cutShape)

            if (this._cutPoints.length >= requiredPoints) {
                return this.createCut()
            }

            return this.createSuccessResult(
                undefined,
                undefined,
                `تم إضافة النقطة ${this._cutPoints.length}/${requiredPoints}`
            )
        }
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const store = useStore.getState()

        if (!this._isCreating) {
            // Show which element can be cut
            const targetElement = this.findElementAtPoint(intersectionPoint)

            if (targetElement && this.canCutElement(targetElement)) {
                if (this._context?.canvas) {
                    this._context.canvas.style.cursor = 'pointer'
                }
            } else {
                if (this._context?.canvas) {
                    this._context.canvas.style.cursor = 'not-allowed'
                }
            }
        } else if (this._targetElement) {
            // Show preview cut
            const previewPoints = [...this._cutPoints, intersectionPoint]
            const previewCut = this.createCutElement(this._targetElement, previewPoints)
            store.setPreviewElement(previewCut)
        }

        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        if (event.key === 'Escape') {
            this.cancelCut()
            return this.createSuccessResult(
                undefined,
                undefined,
                'تم إلغاء عملية القطع'
            )
        }

        if (event.key === 'Enter' && this._isCreating && this._cutPoints.length >= 2) {
            return this.createCut()
        }

        if (event.key === 'Backspace' && this._cutPoints.length > 0) {
            this._cutPoints.pop()

            if (this._cutPoints.length === 0) {
                this.cancelCut()
            }

            return this.createSuccessResult(
                undefined,
                undefined,
                `تم حذف النقطة الأخيرة. النقاط المتبقية: ${this._cutPoints.length}`
            )
        }

        // Shape switching
        const store = useStore.getState()
        switch (event.key) {
            case '1':
                store.updateToolProperties({ cutShape: 'rectangle' })
                return this.createSuccessResult(undefined, undefined, 'تم تغيير شكل القطع إلى مستطيل')

            case '2':
                store.updateToolProperties({ cutShape: 'circle' })
                return this.createSuccessResult(undefined, undefined, 'تم تغيير شكل القطع إلى دائرة')

            case '3':
                store.updateToolProperties({ cutShape: 'custom' })
                return this.createSuccessResult(undefined, undefined, 'تم تغيير شكل القطع إلى مخصص')
        }

        return null
    }

    private findElementAtPoint(point: Vector3) {
        const store = useStore.getState()

        // Find elements that can be cut at this point
        const cuttableElements = store.elements.filter(e =>
            this.canCutElement(e) && e.visible && this.isPointOnElement(point, e)
        )

        // Return closest element
        if (cuttableElements.length > 0) {
            return cuttableElements[0] // Simplified - could improve with distance calculation
        }

        return null
    }

    private canCutElement(element: any): boolean {
        // Only walls and floors can be cut
        return element.type === 'wall' || element.type === 'floor'
    }

    private isPointOnElement(point: Vector3, element: any): boolean {
        // Simplified point-in-element test
        const distance = point.distanceTo(new Vector3(
            element.position.x,
            element.position.y,
            element.position.z
        ))

        // Use element-specific thresholds
        let threshold = 1.0

        if (element.type === 'wall') {
            threshold = Math.max(element.properties.thickness || 0.2, 0.5)
        } else if (element.type === 'floor') {
            threshold = Math.sqrt(element.properties.area || 1)
        }

        return distance <= threshold
    }

    private getRequiredPointsForShape(shape: string): number {
        switch (shape) {
            case 'rectangle':
                return 2 // Two opposite corners
            case 'circle':
                return 2 // Center and edge point
            case 'custom':
                return 3 // Minimum for custom polygon
            default:
                return 2
        }
    }

    private createCut(): ToolResult {
        if (!this._targetElement || this._cutPoints.length < 2) {
            return this.createErrorResult('نقاط قطع غير كافية')
        }

        const store = useStore.getState()
        const targetElement = store.getElementById(this._targetElement)

        if (!targetElement) {
            return this.createErrorResult('العنصر المستهدف غير موجود')
        }

        // Validate cut geometry
        const validation = this.validateCutGeometry(targetElement, this._cutPoints)
        if (!validation.valid) {
            return this.createErrorResult(validation.reason || 'هندسة القطع غير صالحة')
        }

        // Create cut element
        const cut = this.createCutElement(this._targetElement, this._cutPoints)

        // Reset for next cut
        this.cancelCut()

        return this.createSuccessResult(
            cut,
            undefined,
            `تم إنشاء قطع في العنصر: ${targetElement.name}`
        )
    }

    private validateCutGeometry(element: any, points: Vector3[]): { valid: boolean; reason?: string } {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties
        const cutShape = toolProperties.cutShape || 'rectangle'

        // Basic validation
        if (points.length < this.getRequiredPointsForShape(cutShape)) {
            return { valid: false, reason: 'نقاط غير كافية للشكل المحدد' }
        }

        // Shape-specific validation
        switch (cutShape) {
            case 'rectangle':
                return this.validateRectangleCut(element, points)
            case 'circle':
                return this.validateCircleCut(element, points)
            case 'custom':
                return this.validateCustomCut(element, points)
            default:
                return { valid: true }
        }
    }

    private validateRectangleCut(element: any, points: Vector3[]): { valid: boolean; reason?: string } {
        if (points.length < 2) {
            return { valid: false, reason: 'يجب تحديد نقطتين للمستطيل' }
        }

        const width = Math.abs(points[1].x - points[0].x)
        const height = Math.abs(points[1].z - points[0].z)

        if (width < 0.1 || height < 0.1) {
            return { valid: false, reason: 'المستطيل صغير جداً' }
        }

        // Check if cut fits within element bounds (simplified)
        if (element.type === 'wall') {
            const wallLength = element.properties.length || 1
            const wallHeight = element.properties.height || 3

            if (width > wallLength * 0.8 || height > wallHeight * 0.8) {
                return { valid: false, reason: 'القطع كبير جداً بالنسبة للجدار' }
            }
        }

        return { valid: true }
    }

    private validateCircleCut(element: any, points: Vector3[]): { valid: boolean; reason?: string } {
        if (points.length < 2) {
            return { valid: false, reason: 'يجب تحديد المركز ونقطة على المحيط' }
        }

        const radius = points[0].distanceTo(points[1])

        if (radius < 0.05) {
            return { valid: false, reason: 'الدائرة صغيرة جداً' }
        }

        // Check if circle fits within element bounds
        if (element.type === 'wall') {
            const wallLength = element.properties.length || 1
            const wallHeight = element.properties.height || 3

            if (radius * 2 > Math.min(wallLength, wallHeight) * 0.8) {
                return { valid: false, reason: 'الدائرة كبيرة جداً بالنسبة للجدار' }
            }
        }

        return { valid: true }
    }

    private validateCustomCut(element: any, points: Vector3[]): { valid: boolean; reason?: string } {
        if (points.length < 3) {
            return { valid: false, reason: 'يجب تحديد 3 نقاط على الأقل للشكل المخصص' }
        }

        // Check for self-intersecting polygon (simplified)
        // This is a complex geometric operation, simplified here

        return { valid: true }
    }

    private createCutElement(targetElementId: string, points: Vector3[]) {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        // Calculate center point
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length
        const centerZ = points.reduce((sum, p) => sum + p.z, 0) / points.length

        const centerPoint = new Vector3(centerX, centerY, centerZ)

        return this.createBaseElement(centerPoint, {
            shape: toolProperties.cutShape || 'rectangle',
            depth: toolProperties.cutDepth || 0.1,
            points: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
            targetElementId,
            cutType: 'boolean_subtract' // For CSG operations
        })
    }

    private cancelCut(): void {
        this._isCreating = false
        this._targetElement = undefined
        this._cutPoints = []

        const store = useStore.getState()
        store.clearPreview()
    }

    protected cleanup(): void {
        this.cancelCut()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}