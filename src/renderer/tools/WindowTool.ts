/**
 * أداة النوافذ المتقدمة
 * Advanced window creation tool with different glass types and customizable dimensions
 */

import { Euler, Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface WindowPreviewData {
    visible: boolean
    position: Vector3
    rotation: Euler
    width: number
    height: number
    windowType: string
    glassType: string
    wallId: string
    sillHeight: number
}

export interface WindowConstraints {
    minWidth: number
    maxWidth: number
    minHeight: number
    maxHeight: number
    minSillHeight: number
    maxSillHeight: number
    minWallThickness: number
    maxWallThickness: number
    minClearance: number
}

export type WindowType = 'single' | 'double' | 'casement' | 'sliding' | 'bay' | 'picture' | 'awning'
export type GlassType = 'clear' | 'frosted' | 'tinted' | 'reflective' | 'low-e' | 'laminated'

export class WindowTool extends BaseTool {
    private _targetWall?: BuildingElement
    private _placementPoint?: Vector3
    private _previewData?: WindowPreviewData
    private _constraints: WindowConstraints = {
        minWidth: 0.4,
        maxWidth: 4.0,
        minHeight: 0.6,
        maxHeight: 3.0,
        minSillHeight: 0.3,
        maxSillHeight: 1.5,
        minWallThickness: 0.1,
        maxWallThickness: 0.5,
        minClearance: 0.1
    }

    constructor() {
        super('window')
    }

    getName(): string {
        return 'أداة النوافذ المتقدمة'
    }

    getDescription(): string {
        return 'وضع نوافذ متقدمة مع أنواع زجاج مختلفة وأبعاد قابلة للتخصيص'
    }

    getIcon(): string {
        return 'window'
    }

    getShortcut(): string {
        return 'N'
    }

    protected onActivate(): void {
        const store = useStore.getState()
        store.setActiveToolProperties({
            windowWidth: 1.2,
            windowHeight: 1.5,
            windowType: 'single' as WindowType,
            glassType: 'clear' as GlassType,
            sillHeight: 0.9,
            frameType: 'aluminum',
            frameMaterial: 'aluminum'
        })

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'crosshair'
        }
    }

    protected onDeactivate(): void {
        this.cleanup()
    }

    protected onMouseDown(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const store = useStore.getState()

        // Find wall at intersection point
        const targetWall = this.findWallAtPoint(intersectionPoint)

        if (!targetWall) {
            return this.createErrorResult('يجب وضع النافذة على جدار موجود')
        }

        // Check if window can be placed on this wall
        const validation = this.validateWindowPlacement(targetWall, intersectionPoint)
        if (!validation.success) {
            return this.createErrorResult(validation.reason || 'لا يمكن وضع النافذة في هذا الموقع')
        }

        // Create window with automatic wall cutting
        const window = this.createWindowElement(targetWall, intersectionPoint)

        // Cut opening in wall
        this.cutWallOpening(targetWall, window)

        // Add window to scene
        store.addElement(window)

        // Add to history
        store.addHistoryEntry(
            'create_window',
            `إنشاء نافذة ${window.properties.windowType} على الجدار`,
            { windowId: window.id, wallId: targetWall.id }
        )

        return this.createSuccessResult(window, undefined,
            `تم إنشاء نافذة ${window.properties.windowType} بنجاح`)
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const store = useStore.getState()

        // Find wall at intersection point
        const targetWall = this.findWallAtPoint(intersectionPoint)

        if (targetWall) {
            const validation = this.validateWindowPlacement(targetWall, intersectionPoint)

            if (validation.success) {
                this.updateWindowPreview(targetWall, intersectionPoint)

                if (this._context?.canvas) {
                    this._context.canvas.style.cursor = 'pointer'
                }
            } else {
                store.clearPreview()
                this._previewData = undefined

                if (this._context?.canvas) {
                    this._context.canvas.style.cursor = 'not-allowed'
                }
            }
        } else {
            store.clearPreview()
            this._previewData = undefined

            if (this._context?.canvas) {
                this._context.canvas.style.cursor = 'crosshair'
            }
        }

        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        const store = useStore.getState()

        switch (event.key) {
            case 'Escape':
                store.clearPreview()
                this._previewData = undefined
                return this.createSuccessResult(undefined, undefined, 'تم إلغاء وضع النافذة')

            case 'Tab':
                return this.openWindowPropertiesPanel()

            case 'g':
            case 'G':
                return this.cycleGlassType()

            // Window type shortcuts
            case '1':
                return this.setWindowType('single')
            case '2':
                return this.setWindowType('double')
            case '3':
                return this.setWindowType('casement')
            case '4':
                return this.setWindowType('sliding')
            case '5':
                return this.setWindowType('bay')

            // Size adjustments
            case 'ArrowUp':
                if (event.ctrlKey) {
                    return this.adjustWindowHeight(0.1)
                } else if (event.shiftKey) {
                    return this.adjustSillHeight(0.1)
                } else {
                    return this.adjustWindowWidth(0.1)
                }

            case 'ArrowDown':
                if (event.ctrlKey) {
                    return this.adjustWindowHeight(-0.1)
                } else if (event.shiftKey) {
                    return this.adjustSillHeight(-0.1)
                } else {
                    return this.adjustWindowWidth(-0.1)
                }

            case 'ArrowLeft':
                return this.adjustWindowWidth(-0.1)

            case 'ArrowRight':
                return this.adjustWindowWidth(0.1)
        }

        return null
    }

    // Public methods for external access
    public getPreviewData(): WindowPreviewData | undefined {
        return this._previewData
    }

    public getConstraints(): WindowConstraints {
        return this._constraints
    }

    public setConstraints(constraints: Partial<WindowConstraints>): void {
        this._constraints = { ...this._constraints, ...constraints }
    }

    // Private helper methods
    private findWallAtPoint(point: Vector3): BuildingElement | undefined {
        const store = useStore.getState()
        const walls = store.elements.filter(e => e.type === 'wall' && e.visible)

        let closestWall: BuildingElement | undefined
        let closestDistance = Infinity

        for (const wall of walls) {
            const distance = this.getDistanceToWall(point, wall)
            if (distance < closestDistance && distance < 0.5) { // 0.5m tolerance
                closestDistance = distance
                closestWall = wall
            }
        }

        return closestWall
    }

    private getDistanceToWall(point: Vector3, wall: BuildingElement): number {
        if (!wall.properties.startPoint || !wall.properties.endPoint) {
            return Infinity
        }

        const start = new Vector3(
            wall.properties.startPoint.x,
            wall.properties.startPoint.y,
            wall.properties.startPoint.z
        )

        const end = new Vector3(
            wall.properties.endPoint.x,
            wall.properties.endPoint.y,
            wall.properties.endPoint.z
        )

        // Calculate distance from point to wall line segment
        const wallVector = end.clone().sub(start)
        const pointVector = point.clone().sub(start)

        const wallLength = wallVector.length()
        if (wallLength === 0) return point.distanceTo(start)

        const t = Math.max(0, Math.min(1, pointVector.dot(wallVector) / (wallLength * wallLength)))
        const projection = start.clone().add(wallVector.multiplyScalar(t))

        return point.distanceTo(projection)
    }

    private validateWindowPlacement(wall: BuildingElement, point: Vector3): { success: boolean; reason?: string } {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const windowWidth = toolProperties.windowWidth || 1.2
        const windowHeight = toolProperties.windowHeight || 1.5
        const sillHeight = toolProperties.sillHeight || 0.9

        // Check window dimensions
        if (windowWidth < this._constraints.minWidth || windowWidth > this._constraints.maxWidth) {
            return { success: false, reason: `عرض النافذة يجب أن يكون بين ${this._constraints.minWidth}م و ${this._constraints.maxWidth}م` }
        }

        if (windowHeight < this._constraints.minHeight || windowHeight > this._constraints.maxHeight) {
            return { success: false, reason: `ارتفاع النافذة يجب أن يكون بين ${this._constraints.minHeight}م و ${this._constraints.maxHeight}م` }
        }

        if (sillHeight < this._constraints.minSillHeight || sillHeight > this._constraints.maxSillHeight) {
            return { success: false, reason: `ارتفاع العتبة يجب أن يكون بين ${this._constraints.minSillHeight}م و ${this._constraints.maxSillHeight}م` }
        }

        // Check wall dimensions
        const wallLength = wall.properties.length || 0
        const wallHeight = wall.properties.height || 0

        if (wallLength < windowWidth + 2 * this._constraints.minClearance) {
            return { success: false, reason: 'الجدار قصير جداً للنافذة مع المسافة المطلوبة' }
        }

        if (wallHeight < sillHeight + windowHeight + this._constraints.minClearance) {
            return { success: false, reason: 'الجدار منخفض جداً للنافذة مع ارتفاع العتبة' }
        }

        // Check wall thickness
        const wallThickness = wall.properties.thickness || 0.2
        if (wallThickness < this._constraints.minWallThickness || wallThickness > this._constraints.maxWallThickness) {
            return { success: false, reason: 'سماكة الجدار غير مناسبة للنافذة' }
        }

        // Check for existing openings
        const existingOpenings = store.elements.filter(e =>
            (e.type === 'door' || e.type === 'window') &&
            e.properties.wallId === wall.id
        )

        const windowPosition = this.calculateWindowPosition(wall, point)

        for (const opening of existingOpenings) {
            const distance = windowPosition.distanceTo(new Vector3(
                opening.position.x,
                opening.position.y,
                opening.position.z
            ))

            const minDistance = (windowWidth + (opening.properties.width || 1)) / 2 + this._constraints.minClearance

            if (distance < minDistance) {
                return { success: false, reason: 'يتداخل مع فتحة أخرى موجودة' }
            }
        }

        // Check position on wall
        const positionOnWall = this.getPositionOnWall(wall, point)
        const halfWindowWidth = windowWidth / 2

        if (positionOnWall < halfWindowWidth + this._constraints.minClearance ||
            positionOnWall > wallLength - halfWindowWidth - this._constraints.minClearance) {
            return { success: false, reason: 'النافذة قريبة جداً من نهاية الجدار' }
        }

        return { success: true }
    }

    private getPositionOnWall(wall: BuildingElement, point: Vector3): number {
        if (!wall.properties.startPoint || !wall.properties.endPoint) {
            return 0
        }

        const start = new Vector3(
            wall.properties.startPoint.x,
            wall.properties.startPoint.y,
            wall.properties.startPoint.z
        )

        const end = new Vector3(
            wall.properties.endPoint.x,
            wall.properties.endPoint.y,
            wall.properties.endPoint.z
        )

        const wallDirection = end.clone().sub(start).normalize()
        const pointDirection = point.clone().sub(start)

        return pointDirection.dot(wallDirection)
    }

    private calculateWindowPosition(wall: BuildingElement, clickPoint: Vector3): Vector3 {
        if (!wall.properties.startPoint || !wall.properties.endPoint) {
            return clickPoint
        }

        const start = new Vector3(
            wall.properties.startPoint.x,
            wall.properties.startPoint.y,
            wall.properties.startPoint.z
        )

        const end = new Vector3(
            wall.properties.endPoint.x,
            wall.properties.endPoint.y,
            wall.properties.endPoint.z
        )

        // Project click point onto wall line
        const wallDirection = end.clone().sub(start).normalize()
        const pointDirection = clickPoint.clone().sub(start)
        const projection = pointDirection.dot(wallDirection)

        // Calculate position on wall
        const positionOnWall = start.clone().add(wallDirection.multiplyScalar(projection))

        // Set Y position to window center height
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties
        const windowHeight = toolProperties.windowHeight || 1.5
        const sillHeight = toolProperties.sillHeight || 0.9

        positionOnWall.y = wall.position.y - (wall.properties.height || 3) / 2 + sillHeight + windowHeight / 2

        return positionOnWall
    }

    private createWindowElement(wall: BuildingElement, point: Vector3): BuildingElement {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const windowPosition = this.calculateWindowPosition(wall, point)
        const windowRotation = this.calculateWindowRotation(wall)

        const width = toolProperties.windowWidth || 1.2
        const height = toolProperties.windowHeight || 1.5
        const windowType = toolProperties.windowType || 'single'
        const glassType = toolProperties.glassType || 'clear'
        const sillHeight = toolProperties.sillHeight || 0.9
        const frameType = toolProperties.frameType || 'aluminum'

        // Generate window geometry
        const geometry = this.generateWindowGeometry(width, height, windowType)

        return {
            id: this.generateId(),
            type: 'window',
            name: `نافذة ${windowType} ${width}×${height}م`,
            position: {
                x: windowPosition.x,
                y: windowPosition.y,
                z: windowPosition.z
            },
            rotation: {
                x: windowRotation.x,
                y: windowRotation.y,
                z: windowRotation.z
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            properties: {
                width,
                height,
                windowType,
                glassType,
                sillHeight,
                frameType,
                wallId: wall.id,
                glazingLayers: glassType === 'double' ? 2 : 1,
                uValue: this.getGlassUValue(glassType), // Thermal performance
                shgc: this.getGlassSHGC(glassType), // Solar heat gain coefficient
                vlt: this.getGlassVLT(glassType), // Visible light transmission
                operableArea: windowType === 'casement' ? 0.5 : 0, // Portion that opens
                screenType: 'none',
                blindsType: 'none'
            },
            geometry: {
                type: 'window',
                vertices: geometry.vertices,
                faces: geometry.faces,
                uvs: geometry.uvs,
                normals: geometry.normals
            },
            material: {
                type: 'pbr',
                albedo: this.getFrameColor(frameType),
                roughness: this.getFrameRoughness(frameType),
                metallic: frameType === 'aluminum' ? 0.8 : 0.0,
                normal: undefined,
                emission: undefined
            },
            visible: true,
            locked: false,
            tags: ['window', 'opening', 'glazing'],
            metadata: {
                createdAt: Date.now(),
                createdBy: 'WindowTool',
                version: '1.0'
            }
        }
    }

    private calculateWindowRotation(wall: BuildingElement): Euler {
        if (!wall.properties.startPoint || !wall.properties.endPoint) {
            return new Euler(0, 0, 0)
        }

        const start = new Vector3(
            wall.properties.startPoint.x,
            wall.properties.startPoint.y,
            wall.properties.startPoint.z
        )

        const end = new Vector3(
            wall.properties.endPoint.x,
            wall.properties.endPoint.y,
            wall.properties.endPoint.z
        )

        const wallDirection = end.clone().sub(start).normalize()
        const angle = Math.atan2(wallDirection.z, wallDirection.x)

        return new Euler(0, angle, 0)
    }

    private generateWindowGeometry(width: number, height: number, windowType: string) {
        // Generate window frame and glass geometry
        const frameThickness = 0.05
        const glassThickness = 0.006

        const vertices: number[] = []
        const faces: number[] = []
        const uvs: number[] = []
        const normals: number[] = []

        // Window frame vertices
        const halfWidth = width / 2
        const halfHeight = height / 2

        // Frame geometry (simplified box for frame)
        const frameVertices = [
            // Outer frame
            -halfWidth, -halfHeight, frameThickness / 2,
            halfWidth, -halfHeight, frameThickness / 2,
            halfWidth, halfHeight, frameThickness / 2,
            -halfWidth, halfHeight, frameThickness / 2,

            // Inner frame (for glass)
            -halfWidth + 0.05, -halfHeight + 0.05, frameThickness / 2,
            halfWidth - 0.05, -halfHeight + 0.05, frameThickness / 2,
            halfWidth - 0.05, halfHeight - 0.05, frameThickness / 2,
            -halfWidth + 0.05, halfHeight - 0.05, frameThickness / 2
        ]

        vertices.push(...frameVertices)

        // Glass geometry
        const glassVertices = [
            -halfWidth + 0.05, -halfHeight + 0.05, glassThickness / 2,
            halfWidth - 0.05, -halfHeight + 0.05, glassThickness / 2,
            halfWidth - 0.05, halfHeight - 0.05, glassThickness / 2,
            -halfWidth + 0.05, halfHeight - 0.05, glassThickness / 2
        ]

        vertices.push(...glassVertices)

        // Generate faces for frame and glass
        const frameFaces = [
            0, 1, 2, 0, 2, 3, // Outer frame
            4, 5, 6, 4, 6, 7, // Inner frame
            8, 9, 10, 8, 10, 11 // Glass
        ]

        faces.push(...frameFaces)

        // Generate UVs
        for (let i = 0; i < 3; i++) {
            uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
        }

        // Generate normals
        for (let i = 0; i < 12; i++) {
            normals.push(0, 0, 1) // All facing forward for simplicity
        }

        return { vertices, faces, uvs, normals }
    }

    private cutWallOpening(wall: BuildingElement, window: BuildingElement): void {
        // Add opening information to wall
        const opening = {
            id: window.id,
            type: 'window',
            position: window.position,
            width: window.properties.width,
            height: window.properties.height,
            sillHeight: window.properties.sillHeight
        }

        if (!wall.properties.openings) {
            wall.properties.openings = []
        }

        wall.properties.openings.push(opening)

        // Update wall geometry to include opening
        // This would involve CSG operations in a real implementation
    }

    private updateWindowPreview(wall: BuildingElement, point: Vector3): void {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const windowPosition = this.calculateWindowPosition(wall, point)
        const windowRotation = this.calculateWindowRotation(wall)

        this._previewData = {
            visible: true,
            position: windowPosition,
            rotation: windowRotation,
            width: toolProperties.windowWidth || 1.2,
            height: toolProperties.windowHeight || 1.5,
            windowType: toolProperties.windowType || 'single',
            glassType: toolProperties.glassType || 'clear',
            wallId: wall.id,
            sillHeight: toolProperties.sillHeight || 0.9
        }

        // Create preview element
        const previewWindow = this.createWindowElement(wall, point)
        previewWindow.id = 'preview-window'
        store.setPreviewElement(previewWindow)
    }

    private updatePreview(): void {
        if (this._previewData && this._targetWall && this._placementPoint) {
            this.updateWindowPreview(this._targetWall, this._placementPoint)
        }
    }

    private cycleGlassType(): ToolResult {
        const store = useStore.getState()
        const glassTypes: GlassType[] = ['clear', 'frosted', 'tinted', 'reflective', 'low-e', 'laminated']
        const currentType = store.toolState.toolProperties.glassType || 'clear'
        const currentIndex = glassTypes.indexOf(currentType as GlassType)
        const nextIndex = (currentIndex + 1) % glassTypes.length
        const newType = glassTypes[nextIndex]

        store.setActiveToolProperties({ glassType: newType })
        this.updatePreview()

        const typeNames = {
            clear: 'شفاف',
            frosted: 'مصنفر',
            tinted: 'ملون',
            reflective: 'عاكس',
            'low-e': 'منخفض الانبعاث',
            laminated: 'مقوى'
        }

        return this.createSuccessResult(undefined, undefined,
            `نوع الزجاج: ${typeNames[newType] || newType}`)
    }

    private setWindowType(windowType: WindowType): ToolResult {
        const store = useStore.getState()
        store.setActiveToolProperties({ windowType })
        this.updatePreview()

        const typeNames = {
            single: 'مفرد',
            double: 'مزدوج',
            casement: 'جانبي',
            sliding: 'منزلق',
            bay: 'خليجي',
            picture: 'بانورامي',
            awning: 'مظلة'
        }

        return this.createSuccessResult(undefined, undefined,
            `نوع النافذة: ${typeNames[windowType] || windowType}`)
    }

    private adjustWindowWidth(delta: number): ToolResult {
        const store = useStore.getState()
        const currentWidth = store.toolState.toolProperties.windowWidth || 1.2
        const newWidth = Math.max(
            this._constraints.minWidth,
            Math.min(this._constraints.maxWidth, currentWidth + delta)
        )

        store.setActiveToolProperties({ windowWidth: newWidth })
        this.updatePreview()

        return this.createSuccessResult(undefined, undefined,
            `عرض النافذة: ${newWidth.toFixed(2)}م`)
    }

    private adjustWindowHeight(delta: number): ToolResult {
        const store = useStore.getState()
        const currentHeight = store.toolState.toolProperties.windowHeight || 1.5
        const newHeight = Math.max(
            this._constraints.minHeight,
            Math.min(this._constraints.maxHeight, currentHeight + delta)
        )

        store.setActiveToolProperties({ windowHeight: newHeight })
        this.updatePreview()

        return this.createSuccessResult(undefined, undefined,
            `ارتفاع النافذة: ${newHeight.toFixed(2)}م`)
    }

    private adjustSillHeight(delta: number): ToolResult {
        const store = useStore.getState()
        const currentSillHeight = store.toolState.toolProperties.sillHeight || 0.9
        const newSillHeight = Math.max(
            this._constraints.minSillHeight,
            Math.min(this._constraints.maxSillHeight, currentSillHeight + delta)
        )

        store.setActiveToolProperties({ sillHeight: newSillHeight })
        this.updatePreview()

        return this.createSuccessResult(undefined, undefined,
            `ارتفاع العتبة: ${newSillHeight.toFixed(2)}م`)
    }

    private openWindowPropertiesPanel(): ToolResult {
        return this.createSuccessResult(undefined, undefined,
            'فتح لوحة خصائص النافذة')
    }

    private getGlassUValue(glassType: string): number {
        const uValues = {
            clear: 5.8,
            frosted: 5.8,
            tinted: 5.5,
            reflective: 5.0,
            'low-e': 3.2,
            laminated: 5.6
        }
        return uValues[glassType] || 5.8
    }

    private getGlassSHGC(glassType: string): number {
        const shgcValues = {
            clear: 0.86,
            frosted: 0.80,
            tinted: 0.60,
            reflective: 0.30,
            'low-e': 0.70,
            laminated: 0.80
        }
        return shgcValues[glassType] || 0.86
    }

    private getGlassVLT(glassType: string): number {
        const vltValues = {
            clear: 0.90,
            frosted: 0.20,
            tinted: 0.50,
            reflective: 0.15,
            'low-e': 0.80,
            laminated: 0.85
        }
        return vltValues[glassType] || 0.90
    }

    private getFrameColor(frameType: string): string {
        const frameColors = {
            aluminum: '#C0C0C0',
            wood: '#8B4513',
            vinyl: '#F5F5F5',
            steel: '#708090'
        }
        return frameColors[frameType] || '#C0C0C0'
    }

    private getFrameRoughness(frameType: string): number {
        const frameRoughness = {
            aluminum: 0.2,
            wood: 0.7,
            vinyl: 0.4,
            steel: 0.3
        }
        return frameRoughness[frameType] || 0.2
    }

    protected cleanup(): void {
        this._targetWall = undefined
        this._placementPoint = undefined
        this._previewData = undefined

        const store = useStore.getState()
        store.clearPreview()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}