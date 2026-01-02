/**
 * أداة الجدران المتقدمة
 * Advanced wall creation tool with geometry generation and snap-to-endpoints
 */

import { Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface WallPreviewData {
    visible: boolean
    startPoint: Vector3
    endPoint: Vector3
    thickness: number
    height: number
    material: string
    snapPoints: Vector3[]
}

export interface WallConstraints {
    minLength: number
    maxLength: number
    minThickness: number
    maxThickness: number
    minHeight: number
    maxHeight: number
    snapToEndpoints: boolean
    snapDistance: number
    allowCurvedWalls: boolean
}

export class WallTool extends BaseTool {
    private _startPoint?: Vector3
    private _currentEndPoint?: Vector3
    private _isCreating = false
    private _isDragging = false
    private _previewData?: WallPreviewData
    private _constraints: WallConstraints = {
        minLength: 0.1,
        maxLength: 100,
        minThickness: 0.05,
        maxThickness: 2.0,
        minHeight: 0.5,
        maxHeight: 20,
        snapToEndpoints: true,
        snapDistance: 0.5,
        allowCurvedWalls: false
    }
    private _wallChain: Vector3[] = []
    private _chainMode = false

    constructor() {
        super('wall')
    }

    getName(): string {
        return 'أداة الجدران المتقدمة'
    }

    getDescription(): string {
        return 'إنشاء جدران متقدمة مع معاينة فورية ومحاذاة للنقاط النهائية'
    }

    getIcon(): string {
        return 'wall'
    }

    getShortcut(): string {
        return 'W'
    }

    protected onActivate(): void {
        const store = useStore.getState()
        store.setActiveToolProperties({
            wallThickness: 0.2,
            wallHeight: 3.0,
            wallMaterial: 'concrete'
        })

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'crosshair'
        }

        this.updatePreview()
    }

    protected onDeactivate(): void {
        this.cleanup()
    }

    protected onMouseDown(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const snappedPoint = this.getSnappedPoint(intersectionPoint)

        if (!this._isCreating) {
            return this.startWallCreation(snappedPoint)
        } else {
            return this.finishWallSegment(snappedPoint, event.shiftKey)
        }
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const snappedPoint = this.getSnappedPoint(intersectionPoint)

        if (this._isCreating && this._startPoint) {
            this._currentEndPoint = snappedPoint
            this.updateWallPreview(this._startPoint, snappedPoint)
        } else {
            // Show potential snap points
            this.updateSnapIndicators(snappedPoint)
        }

        return null
    }

    protected onMouseUp(event: ToolEvent): ToolResult | null {
        if (event.button !== 0) return null

        this._isDragging = false
        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        const store = useStore.getState()

        switch (event.key) {
            case 'Escape':
                if (this._chainMode) {
                    return this.finishWallChain()
                } else {
                    this.cancelCreation()
                    return this.createSuccessResult(undefined, undefined, 'تم إلغاء إنشاء الجدار')
                }

            case 'Enter':
                if (this._isCreating && this._currentEndPoint) {
                    return this.finishWallSegment(this._currentEndPoint, false)
                }
                break

            case 'c':
            case 'C':
                this._chainMode = !this._chainMode
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._chainMode ? 'تفعيل' : 'إلغاء'} وضع السلسلة`)

            case 'Tab':
                return this.openWallPropertiesPanel()

            // Thickness adjustment
            case 'ArrowUp':
                if (event.ctrlKey) {
                    return this.adjustWallThickness(0.05)
                }
                break

            case 'ArrowDown':
                if (event.ctrlKey) {
                    return this.adjustWallThickness(-0.05)
                }
                break

            // Height adjustment
            case 'ArrowUp':
                if (event.shiftKey) {
                    return this.adjustWallHeight(0.5)
                }
                break

            case 'ArrowDown':
                if (event.shiftKey) {
                    return this.adjustWallHeight(-0.5)
                }
                break

            // Quick thickness presets
            case '1':
                return this.setWallThickness(0.1)
            case '2':
                return this.setWallThickness(0.2)
            case '3':
                return this.setWallThickness(0.3)
            case '4':
                return this.setWallThickness(0.4)

            // Toggle snap to endpoints
            case 's':
            case 'S':
                this._constraints.snapToEndpoints = !this._constraints.snapToEndpoints
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._constraints.snapToEndpoints ? 'تفعيل' : 'إلغاء'} المحاذاة للنقاط النهائية`)
        }

        return null
    }

    // Public methods for external access
    public getPreviewData(): WallPreviewData | undefined {
        return this._previewData
    }

    public getConstraints(): WallConstraints {
        return this._constraints
    }

    public setConstraints(constraints: Partial<WallConstraints>): void {
        this._constraints = { ...this._constraints, ...constraints }
    }

    public isChainMode(): boolean {
        return this._chainMode
    }

    public getWallChain(): Vector3[] {
        return [...this._wallChain]
    }

    // Private helper methods
    private startWallCreation(point: Vector3): ToolResult {
        this._startPoint = point
        this._isCreating = true
        this._isDragging = true

        if (this._chainMode) {
            this._wallChain.push(point)
        }

        return this.createSuccessResult(
            undefined,
            undefined,
            'انقر لتحديد نقطة النهاية للجدار أو اسحب لإنشاء الجدار'
        )
    }

    private finishWallSegment(endPoint: Vector3, continueChain: boolean): ToolResult {
        if (!this._startPoint) {
            return this.createErrorResult('لا توجد نقطة بداية محددة')
        }

        const length = this.calculateDistance(this._startPoint, endPoint)

        if (length < this._constraints.minLength) {
            return this.createErrorResult(`الجدار قصير جداً. الحد الأدنى: ${this._constraints.minLength}م`)
        }

        if (length > this._constraints.maxLength) {
            return this.createErrorResult(`الجدار طويل جداً. الحد الأقصى: ${this._constraints.maxLength}م`)
        }

        const wall = this.createWallElement(this._startPoint, endPoint)
        const store = useStore.getState()

        // Add wall to scene
        store.addElement(wall)
        store.clearPreview()

        // Add to history
        store.addHistoryEntry(
            'create_wall',
            `إنشاء جدار بطول ${length.toFixed(2)}م`,
            { wallId: wall.id, startPoint: this._startPoint, endPoint }
        )

        let message = `تم إنشاء جدار بطول ${length.toFixed(2)} متر`

        if (this._chainMode && (continueChain || this._wallChain.length > 1)) {
            // Continue chain
            this._startPoint = endPoint
            this._wallChain.push(endPoint)
            message += ' - استمر في السلسلة'
        } else {
            // Reset for next wall
            this._isCreating = false
            this._startPoint = undefined
            this._currentEndPoint = undefined
            this._wallChain = []
            message += ' - انقر لبدء جدار جديد'
        }

        return this.createSuccessResult(wall, undefined, message)
    }

    private finishWallChain(): ToolResult {
        const wallCount = this._wallChain.length - 1

        this._isCreating = false
        this._startPoint = undefined
        this._currentEndPoint = undefined
        this._chainMode = false
        this._wallChain = []

        const store = useStore.getState()
        store.clearPreview()

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم إنهاء سلسلة الجدران (${wallCount} جدار)`
        )
    }

    private createWallElement(startPoint: Vector3, endPoint: Vector3): BuildingElement {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const thickness = toolProperties.wallThickness || 0.2
        const height = toolProperties.wallHeight || 3.0
        const material = toolProperties.wallMaterial || 'concrete'

        // Calculate wall properties
        const length = this.calculateDistance(startPoint, endPoint)
        const centerPoint = new Vector3(
            (startPoint.x + endPoint.x) / 2,
            startPoint.y + height / 2,
            (startPoint.z + endPoint.z) / 2
        )

        const direction = new Vector3().subVectors(endPoint, startPoint).normalize()
        const angle = Math.atan2(direction.z, direction.x)

        // Generate wall geometry
        const geometry = this.generateWallGeometry(length, height, thickness)

        return {
            id: this.generateId(),
            type: 'wall',
            name: `جدار ${length.toFixed(2)}م`,
            position: {
                x: centerPoint.x,
                y: centerPoint.y,
                z: centerPoint.z
            },
            rotation: {
                x: 0,
                y: angle,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            properties: {
                thickness,
                height,
                length,
                material,
                startPoint: { x: startPoint.x, y: startPoint.y, z: startPoint.z },
                endPoint: { x: endPoint.x, y: endPoint.y, z: endPoint.z },
                angle,
                openings: [], // For doors and windows
                insulation: false,
                loadBearing: false
            },
            geometry: {
                type: 'wall',
                vertices: geometry.vertices,
                faces: geometry.faces,
                uvs: geometry.uvs,
                normals: geometry.normals
            },
            material: {
                type: 'pbr',
                albedo: this.getMaterialColor(material),
                roughness: this.getMaterialRoughness(material),
                metallic: 0.0,
                normal: undefined,
                emission: undefined
            },
            visible: true,
            locked: false,
            tags: ['wall', 'structure'],
            metadata: {
                createdAt: Date.now(),
                createdBy: 'WallTool',
                version: '1.0'
            }
        }
    }

    private generateWallGeometry(length: number, height: number, thickness: number) {
        // Generate vertices for a box geometry representing the wall
        const halfLength = length / 2
        const halfHeight = height / 2
        const halfThickness = thickness / 2

        const vertices = [
            // Front face
            -halfLength, -halfHeight, halfThickness,
            halfLength, -halfHeight, halfThickness,
            halfLength, halfHeight, halfThickness,
            -halfLength, halfHeight, halfThickness,

            // Back face
            -halfLength, -halfHeight, -halfThickness,
            -halfLength, halfHeight, -halfThickness,
            halfLength, halfHeight, -halfThickness,
            halfLength, -halfHeight, -halfThickness,

            // Top face
            -halfLength, halfHeight, -halfThickness,
            -halfLength, halfHeight, halfThickness,
            halfLength, halfHeight, halfThickness,
            halfLength, halfHeight, -halfThickness,

            // Bottom face
            -halfLength, -halfHeight, -halfThickness,
            halfLength, -halfHeight, -halfThickness,
            halfLength, -halfHeight, halfThickness,
            -halfLength, -halfHeight, halfThickness,

            // Right face
            halfLength, -halfHeight, -halfThickness,
            halfLength, halfHeight, -halfThickness,
            halfLength, halfHeight, halfThickness,
            halfLength, -halfHeight, halfThickness,

            // Left face
            -halfLength, -halfHeight, -halfThickness,
            -halfLength, -halfHeight, halfThickness,
            -halfLength, halfHeight, halfThickness,
            -halfLength, halfHeight, -halfThickness
        ]

        const faces = [
            // Front face
            0, 1, 2, 0, 2, 3,
            // Back face
            4, 5, 6, 4, 6, 7,
            // Top face
            8, 9, 10, 8, 10, 11,
            // Bottom face
            12, 13, 14, 12, 14, 15,
            // Right face
            16, 17, 18, 16, 18, 19,
            // Left face
            20, 21, 22, 20, 22, 23
        ]

        // Generate UVs for proper texture mapping
        const uvs = []
        for (let i = 0; i < 6; i++) {
            uvs.push(
                0, 0,
                1, 0,
                1, 1,
                0, 1
            )
        }

        // Generate normals
        const normals = [
            // Front face
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // Back face
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            // Top face
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // Bottom face
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // Right face
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // Left face
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
        ]

        return { vertices, faces, uvs, normals }
    }

    private getSnappedPoint(point: Vector3): Vector3 {
        if (!this._constraints.snapToEndpoints) {
            return point
        }

        const store = useStore.getState()
        const snapDistance = this._constraints.snapDistance

        // Find nearby wall endpoints
        const snapPoints = this.findWallEndpoints(store.elements)

        for (const snapPoint of snapPoints) {
            const distance = point.distanceTo(snapPoint)
            if (distance < snapDistance) {
                return snapPoint.clone()
            }
        }

        // Snap to grid if enabled
        const gridSize = store.project?.settings.gridSize || 1
        const snapToGrid = store.project?.settings.snapToGrid || false

        return snapToGrid ? this.snapToGrid(point, gridSize) : point
    }

    private findWallEndpoints(elements: BuildingElement[]): Vector3[] {
        const endpoints: Vector3[] = []

        elements.forEach(element => {
            if (element.type === 'wall' && element.properties.startPoint && element.properties.endPoint) {
                endpoints.push(
                    new Vector3(
                        element.properties.startPoint.x,
                        element.properties.startPoint.y,
                        element.properties.startPoint.z
                    ),
                    new Vector3(
                        element.properties.endPoint.x,
                        element.properties.endPoint.y,
                        element.properties.endPoint.z
                    )
                )
            }
        })

        return endpoints
    }

    private updateWallPreview(startPoint: Vector3, endPoint: Vector3): void {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        this._previewData = {
            visible: true,
            startPoint: startPoint.clone(),
            endPoint: endPoint.clone(),
            thickness: toolProperties.wallThickness || 0.2,
            height: toolProperties.wallHeight || 3.0,
            material: toolProperties.wallMaterial || 'concrete',
            snapPoints: this.findWallEndpoints(store.elements)
        }

        // Create preview element
        const previewWall = this.createWallElement(startPoint, endPoint)
        previewWall.id = 'preview-wall'
        store.setPreviewElement(previewWall)
    }

    private updateSnapIndicators(point: Vector3): void {
        const store = useStore.getState()
        const snapPoints = this.findWallEndpoints(store.elements)

        // Update snap indicators in the store
        store.setSnapIndicators(snapPoints.map(snapPoint => ({
            position: snapPoint,
            type: 'endpoint',
            visible: point.distanceTo(snapPoint) < this._constraints.snapDistance
        })))
    }

    private updatePreview(): void {
        if (this._isCreating && this._startPoint && this._currentEndPoint) {
            this.updateWallPreview(this._startPoint, this._currentEndPoint)
        }
    }

    private adjustWallThickness(delta: number): ToolResult {
        const store = useStore.getState()
        const currentThickness = store.toolState.toolProperties.wallThickness || 0.2
        const newThickness = Math.max(
            this._constraints.minThickness,
            Math.min(this._constraints.maxThickness, currentThickness + delta)
        )

        store.setActiveToolProperties({ wallThickness: newThickness })
        this.updatePreview()

        return this.createSuccessResult(
            undefined,
            undefined,
            `سماكة الجدار: ${newThickness.toFixed(2)}م`
        )
    }

    private adjustWallHeight(delta: number): ToolResult {
        const store = useStore.getState()
        const currentHeight = store.toolState.toolProperties.wallHeight || 3.0
        const newHeight = Math.max(
            this._constraints.minHeight,
            Math.min(this._constraints.maxHeight, currentHeight + delta)
        )

        store.setActiveToolProperties({ wallHeight: newHeight })
        this.updatePreview()

        return this.createSuccessResult(
            undefined,
            undefined,
            `ارتفاع الجدار: ${newHeight.toFixed(2)}م`
        )
    }

    private setWallThickness(thickness: number): ToolResult {
        const store = useStore.getState()
        const clampedThickness = Math.max(
            this._constraints.minThickness,
            Math.min(this._constraints.maxThickness, thickness)
        )

        store.setActiveToolProperties({ wallThickness: clampedThickness })
        this.updatePreview()

        return this.createSuccessResult(
            undefined,
            undefined,
            `تم تعيين سماكة الجدار إلى ${clampedThickness}م`
        )
    }

    private openWallPropertiesPanel(): ToolResult {
        // This would open a properties panel for detailed wall configuration
        return this.createSuccessResult(
            undefined,
            undefined,
            'فتح لوحة خصائص الجدار'
        )
    }

    private getMaterialColor(material: string): string {
        const materialColors = {
            concrete: '#C0C0C0',
            brick: '#B22222',
            wood: '#8B4513',
            stone: '#696969',
            metal: '#708090',
            glass: '#87CEEB'
        }
        return materialColors[material] || '#C0C0C0'
    }

    private getMaterialRoughness(material: string): number {
        const materialRoughness = {
            concrete: 0.8,
            brick: 0.9,
            wood: 0.7,
            stone: 0.85,
            metal: 0.2,
            glass: 0.1
        }
        return materialRoughness[material] || 0.8
    }

    private cancelCreation(): void {
        this._isCreating = false
        this._isDragging = false
        this._startPoint = undefined
        this._currentEndPoint = undefined
        this._previewData = undefined
        this._wallChain = []
        this._chainMode = false

        const store = useStore.getState()
        store.clearPreview()
        store.clearSnapIndicators()
    }

    protected cleanup(): void {
        this.cancelCreation()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}