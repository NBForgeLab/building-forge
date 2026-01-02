/**
 * أداة الأبواب المتقدمة
 * Advanced door creation tool with 3D models and customizable dimensions
 */

import { Euler, Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface DoorPreviewData {
    visible: boolean
    position: Vector3
    rotation: Euler
    width: number
    height: number
    doorType: string
    openDirection: 'inward' | 'outward'
    wallId: string
    animationPreview: boolean
}

export interface DoorConstraints {
    minWidth: number
    maxWidth: number
    minHeight: number
    maxHeight: number
    minWallThickness: number
    maxWallThickness: number
    minClearance: number
}

export type DoorType = 'single' | 'double' | 'sliding' | 'folding' | 'revolving' | 'french'
export type OpenDirection = 'inward' | 'outward' | 'left' | 'right'

export class DoorTool extends BaseTool {
    private _targetWall?: BuildingElement
    private _placementPoint?: Vector3
    private _previewData?: DoorPreviewData
    private _constraints: DoorConstraints = {
        minWidth: 0.6,
        maxWidth: 3.0,
        minHeight: 1.8,
        maxHeight: 3.5,
        minWallThickness: 0.1,
        maxWallThickness: 0.5,
        minClearance: 0.1
    }
    private _animationPreview = false

    constructor() {
        super('door')
    }

    getName(): string {
        return 'أداة الأبواب المتقدمة'
    }

    getDescription(): string {
        return 'وضع أبواب متقدمة مع أبعاد قابلة للتخصيص ومعاينة الحركة'
    }

    getIcon(): string {
        return 'door'
    }

    getShortcut(): string {
        return 'D'
    }

    protected onActivate(): void {
        const store = useStore.getState()
        store.setActiveToolProperties({
            doorWidth: 0.9,
            doorHeight: 2.1,
            doorType: 'single' as DoorType,
            openDirection: 'inward' as OpenDirection,
            doorMaterial: 'wood',
            handleType: 'lever'
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
            return this.createErrorResult('يجب وضع الباب على جدار موجود')
        }

        // Check if door can be placed on this wall
        const validation = this.validateDoorPlacement(targetWall, intersectionPoint)
        if (!validation.success) {
            return this.createErrorResult(validation.reason || 'لا يمكن وضع الباب في هذا الموقع')
        }

        // Create door with automatic wall cutting
        const door = this.createDoorElement(targetWall, intersectionPoint)

        // Cut opening in wall
        this.cutWallOpening(targetWall, door)

        // Add door to scene
        store.addElement(door)

        // Add to history
        store.addHistoryEntry(
            'create_door',
            `إنشاء باب ${door.properties.doorType} على الجدار`,
            { doorId: door.id, wallId: targetWall.id }
        )

        return this.createSuccessResult(door, undefined,
            `تم إنشاء باب ${door.properties.doorType} بنجاح`)
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const store = useStore.getState()

        // Find wall at intersection point
        const targetWall = this.findWallAtPoint(intersectionPoint)

        if (targetWall) {
            const validation = this.validateDoorPlacement(targetWall, intersectionPoint)

            if (validation.success) {
                this.updateDoorPreview(targetWall, intersectionPoint)

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
                return this.createSuccessResult(undefined, undefined, 'تم إلغاء وضع الباب')

            case 'Tab':
                return this.openDoorPropertiesPanel()

            case 'r':
            case 'R':
                return this.toggleOpenDirection()

            case 'a':
            case 'A':
                this._animationPreview = !this._animationPreview
                this.updatePreview()
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._animationPreview ? 'تفعيل' : 'إلغاء'} معاينة الحركة`)

            // Door type shortcuts
            case '1':
                return this.setDoorType('single')
            case '2':
                return this.setDoorType('double')
            case '3':
                return this.setDoorType('sliding')
            case '4':
                return this.setDoorType('folding')

            // Size adjustments
            case 'ArrowUp':
                if (event.ctrlKey) {
                    return this.adjustDoorHeight(0.1)
                } else if (event.shiftKey) {
                    return this.adjustDoorWidth(0.1)
                }
                break

            case 'ArrowDown':
                if (event.ctrlKey) {
                    return this.adjustDoorHeight(-0.1)
                } else if (event.shiftKey) {
                    return this.adjustDoorWidth(-0.1)
                }
                break
        }

        return null
    }

    // Public methods for external access
    public getPreviewData(): DoorPreviewData | undefined {
        return this._previewData
    }

    public getConstraints(): DoorConstraints {
        return this._constraints
    }

    public setConstraints(constraints: Partial<DoorConstraints>): void {
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

    private validateDoorPlacement(wall: BuildingElement, point: Vector3): { success: boolean; reason?: string } {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const doorWidth = toolProperties.doorWidth || 0.9
        const doorHeight = toolProperties.doorHeight || 2.1

        // Check door dimensions
        if (doorWidth < this._constraints.minWidth || doorWidth > this._constraints.maxWidth) {
            return { success: false, reason: `عرض الباب يجب أن يكون بين ${this._constraints.minWidth}م و ${this._constraints.maxWidth}م` }
        }

        if (doorHeight < this._constraints.minHeight || doorHeight > this._constraints.maxHeight) {
            return { success: false, reason: `ارتفاع الباب يجب أن يكون بين ${this._constraints.minHeight}م و ${this._constraints.maxHeight}م` }
        }

        // Check wall dimensions
        const wallLength = wall.properties.length || 0
        const wallHeight = wall.properties.height || 0

        if (wallLength < doorWidth + 2 * this._constraints.minClearance) {
            return { success: false, reason: 'الجدار قصير جداً للباب مع المسافة المطلوبة' }
        }

        if (wallHeight < doorHeight + this._constraints.minClearance) {
            return { success: false, reason: 'الجدار منخفض جداً للباب' }
        }

        // Check wall thickness
        const wallThickness = wall.properties.thickness || 0.2
        if (wallThickness < this._constraints.minWallThickness || wallThickness > this._constraints.maxWallThickness) {
            return { success: false, reason: 'سماكة الجدار غير مناسبة للباب' }
        }

        // Check for existing openings
        const existingOpenings = store.elements.filter(e =>
            (e.type === 'door' || e.type === 'window') &&
            e.properties.wallId === wall.id
        )

        const doorPosition = this.calculateDoorPosition(wall, point)

        for (const opening of existingOpenings) {
            const distance = doorPosition.distanceTo(new Vector3(
                opening.position.x,
                opening.position.y,
                opening.position.z
            ))

            const minDistance = (doorWidth + (opening.properties.width || 1)) / 2 + this._constraints.minClearance

            if (distance < minDistance) {
                return { success: false, reason: 'يتداخل مع فتحة أخرى موجودة' }
            }
        }

        // Check position on wall
        const positionOnWall = this.getPositionOnWall(wall, point)
        const halfDoorWidth = doorWidth / 2

        if (positionOnWall < halfDoorWidth + this._constraints.minClearance ||
            positionOnWall > wallLength - halfDoorWidth - this._constraints.minClearance) {
            return { success: false, reason: 'الباب قريب جداً من نهاية الجدار' }
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

    private calculateDoorPosition(wall: BuildingElement, clickPoint: Vector3): Vector3 {
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

        // Set Y position to door center height
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties
        const doorHeight = toolProperties.doorHeight || 2.1

        positionOnWall.y = wall.position.y - (wall.properties.height || 3) / 2 + doorHeight / 2

        return positionOnWall
    }

    private createDoorElement(wall: BuildingElement, point: Vector3): BuildingElement {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const doorPosition = this.calculateDoorPosition(wall, point)
        const doorRotation = this.calculateDoorRotation(wall)

        const width = toolProperties.doorWidth || 0.9
        const height = toolProperties.doorHeight || 2.1
        const doorType = toolProperties.doorType || 'single'
        const openDirection = toolProperties.openDirection || 'inward'
        const material = toolProperties.doorMaterial || 'wood'

        // Generate door geometry
        const geometry = this.generateDoorGeometry(width, height, doorType)

        return {
            id: this.generateId(),
            type: 'door',
            name: `باب ${doorType} ${width}×${height}م`,
            position: {
                x: doorPosition.x,
                y: doorPosition.y,
                z: doorPosition.z
            },
            rotation: {
                x: doorRotation.x,
                y: doorRotation.y,
                z: doorRotation.z
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            properties: {
                width,
                height,
                doorType,
                openDirection,
                material,
                wallId: wall.id,
                handleType: toolProperties.handleType || 'lever',
                lockType: 'standard',
                threshold: true,
                weatherStripping: true,
                openAngle: 90, // degrees
                swingRadius: width * 0.8, // approximate swing radius
                clearanceRequired: width + 0.5 // space needed when open
            },
            geometry: {
                type: 'door',
                vertices: geometry.vertices,
                faces: geometry.faces,
                uvs: geometry.uvs,
                normals: geometry.normals
            },
            material: {
                type: 'pbr',
                albedo: this.getMaterialColor(material),
                roughness: this.getMaterialRoughness(material),
                metallic: material === 'metal' ? 0.8 : 0.0,
                normal: undefined,
                emission: undefined
            },
            visible: true,
            locked: false,
            tags: ['door', 'opening', 'furniture'],
            metadata: {
                createdAt: Date.now(),
                createdBy: 'DoorTool',
                version: '1.0'
            }
        }
    }

    private calculateDoorRotation(wall: BuildingElement): Euler {
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

    private generateDoorGeometry(width: number, height: number, doorType: string) {
        // Generate basic door frame geometry
        const frameThickness = 0.05
        const doorThickness = 0.04

        const vertices: number[] = []
        const faces: number[] = []
        const uvs: number[] = []
        const normals: number[] = []

        // Door frame vertices
        const halfWidth = width / 2
        const halfHeight = height / 2

        // Frame geometry (simplified box)
        const frameVertices = [
            // Front face
            -halfWidth, -halfHeight, frameThickness / 2,
            halfWidth, -halfHeight, frameThickness / 2,
            halfWidth, halfHeight, frameThickness / 2,
            -halfWidth, halfHeight, frameThickness / 2,

            // Back face
            -halfWidth, -halfHeight, -frameThickness / 2,
            -halfWidth, halfHeight, -frameThickness / 2,
            halfWidth, halfHeight, -frameThickness / 2,
            halfWidth, -halfHeight, -frameThickness / 2
        ]

        vertices.push(...frameVertices)

        // Door panel geometry (depends on door type)
        if (doorType === 'double') {
            // Add second door panel
            // Implementation would add vertices for second panel
        }

        // Generate faces for box geometry
        const frameFaces = [
            0, 1, 2, 0, 2, 3, // Front
            4, 5, 6, 4, 6, 7, // Back
            0, 4, 7, 0, 7, 1, // Bottom
            2, 6, 5, 2, 5, 3, // Top
            0, 3, 5, 0, 5, 4, // Left
            1, 7, 6, 1, 6, 2  // Right
        ]

        faces.push(...frameFaces)

        // Generate UVs
        for (let i = 0; i < 6; i++) {
            uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
        }

        // Generate normals
        const faceNormals = [
            [0, 0, 1], [0, 0, -1], [0, -1, 0],
            [0, 1, 0], [-1, 0, 0], [1, 0, 0]
        ]

        faceNormals.forEach(normal => {
            for (let i = 0; i < 4; i++) {
                normals.push(...normal)
            }
        })

        return { vertices, faces, uvs, normals }
    }

    private cutWallOpening(wall: BuildingElement, door: BuildingElement): void {
        // Add opening information to wall
        const opening = {
            id: door.id,
            type: 'door',
            position: door.position,
            width: door.properties.width,
            height: door.properties.height,
            sillHeight: 0 // Doors go to floor
        }

        if (!wall.properties.openings) {
            wall.properties.openings = []
        }

        wall.properties.openings.push(opening)

        // Update wall geometry to include opening
        // This would involve CSG operations in a real implementation
    }

    private updateDoorPreview(wall: BuildingElement, point: Vector3): void {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const doorPosition = this.calculateDoorPosition(wall, point)
        const doorRotation = this.calculateDoorRotation(wall)

        this._previewData = {
            visible: true,
            position: doorPosition,
            rotation: doorRotation,
            width: toolProperties.doorWidth || 0.9,
            height: toolProperties.doorHeight || 2.1,
            doorType: toolProperties.doorType || 'single',
            openDirection: toolProperties.openDirection || 'inward',
            wallId: wall.id,
            animationPreview: this._animationPreview
        }

        // Create preview element
        const previewDoor = this.createDoorElement(wall, point)
        previewDoor.id = 'preview-door'
        store.setPreviewElement(previewDoor)
    }

    private updatePreview(): void {
        if (this._previewData && this._targetWall && this._placementPoint) {
            this.updateDoorPreview(this._targetWall, this._placementPoint)
        }
    }

    private toggleOpenDirection(): ToolResult {
        const store = useStore.getState()
        const currentDirection = store.toolState.toolProperties.openDirection || 'inward'
        const newDirection = currentDirection === 'inward' ? 'outward' : 'inward'

        store.setActiveToolProperties({ openDirection: newDirection })
        this.updatePreview()

        return this.createSuccessResult(undefined, undefined,
            `تم تغيير اتجاه الفتح إلى: ${newDirection === 'inward' ? 'للداخل' : 'للخارج'}`)
    }

    private setDoorType(doorType: DoorType): ToolResult {
        const store = useStore.getState()
        store.setActiveToolProperties({ doorType })
        this.updatePreview()

        const typeNames = {
            single: 'مفرد',
            double: 'مزدوج',
            sliding: 'منزلق',
            folding: 'قابل للطي'
        }

        return this.createSuccessResult(undefined, undefined,
            `تم تغيير نوع الباب إلى: ${typeNames[doorType] || doorType}`)
    }

    private adjustDoorWidth(delta: number): ToolResult {
        const store = useStore.getState()
        const currentWidth = store.toolState.toolProperties.doorWidth || 0.9
        const newWidth = Math.max(
            this._constraints.minWidth,
            Math.min(this._constraints.maxWidth, currentWidth + delta)
        )

        store.setActiveToolProperties({ doorWidth: newWidth })
        this.updatePreview()

        return this.createSuccessResult(undefined, undefined,
            `عرض الباب: ${newWidth.toFixed(2)}م`)
    }

    private adjustDoorHeight(delta: number): ToolResult {
        const store = useStore.getState()
        const currentHeight = store.toolState.toolProperties.doorHeight || 2.1
        const newHeight = Math.max(
            this._constraints.minHeight,
            Math.min(this._constraints.maxHeight, currentHeight + delta)
        )

        store.setActiveToolProperties({ doorHeight: newHeight })
        this.updatePreview()

        return this.createSuccessResult(undefined, undefined,
            `ارتفاع الباب: ${newHeight.toFixed(2)}م`)
    }

    private openDoorPropertiesPanel(): ToolResult {
        return this.createSuccessResult(undefined, undefined,
            'فتح لوحة خصائص الباب')
    }

    private getMaterialColor(material: string): string {
        const materialColors = {
            wood: '#8B4513',
            metal: '#708090',
            glass: '#87CEEB',
            composite: '#A0522D'
        }
        return materialColors[material] || '#8B4513'
    }

    private getMaterialRoughness(material: string): number {
        const materialRoughness = {
            wood: 0.7,
            metal: 0.2,
            glass: 0.1,
            composite: 0.6
        }
        return materialRoughness[material] || 0.7
    }

    protected cleanup(): void {
        this._targetWall = undefined
        this._placementPoint = undefined
        this._previewData = undefined
        this._animationPreview = false

        const store = useStore.getState()
        store.clearPreview()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}