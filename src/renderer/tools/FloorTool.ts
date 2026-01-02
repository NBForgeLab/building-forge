/**
 * أداة الأرضيات المتقدمة
 * Advanced floor creation tool with polygon creation and boolean operations
 */

import { ExtrudeGeometry, Path, Shape, Vector3 } from 'three'
import { useStore } from '../store'
import { BuildingElement } from '../store/types'
import { BaseTool, ToolEvent, ToolResult } from './BaseTool'

export interface FloorPreviewData {
    visible: boolean
    points: Vector3[]
    thickness: number
    material: string
    area: number
    holes: Vector3[][]
    snapPoints: Vector3[]
}

export interface FloorConstraints {
    minArea: number
    maxArea: number
    minThickness: number
    maxThickness: number
    minPoints: number
    maxPoints: number
    snapToWalls: boolean
    snapDistance: number
    allowHoles: boolean
}

export interface FloorHole {
    points: Vector3[]
    area: number
}

export class FloorTool extends BaseTool {
    private _points: Vector3[] = []
    private _holes: FloorHole[] = []
    private _isCreating = false
    private _isCreatingHole = false
    private _currentHolePoints: Vector3[] = []
    private _previewData?: FloorPreviewData
    private _constraints: FloorConstraints = {
        minArea: 0.1,
        maxArea: 10000,
        minThickness: 0.05,
        maxThickness: 1.0,
        minPoints: 3,
        maxPoints: 50,
        snapToWalls: true,
        snapDistance: 0.2,
        allowHoles: true
    }
    private _lastClickTime = 0
    private _doubleClickThreshold = 300 // ms

    constructor() {
        super('floor')
    }

    getName(): string {
        return 'أداة الأرضيات المتقدمة'
    }

    getDescription(): string {
        return 'إنشاء أرضيات معقدة مع دعم الثقوب والأشكال المتعددة النقاط'
    }

    getIcon(): string {
        return 'floor'
    }

    getShortcut(): string {
        return 'F'
    }

    protected onActivate(): void {
        const store = useStore.getState()
        store.setActiveToolProperties({
            floorThickness: 0.2,
            floorMaterial: 'concrete'
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
        const currentTime = Date.now()
        const isDoubleClick = currentTime - this._lastClickTime < this._doubleClickThreshold

        this._lastClickTime = currentTime

        if (this._isCreatingHole) {
            return this.handleHoleCreation(snappedPoint, isDoubleClick)
        } else {
            return this.handleFloorCreation(snappedPoint, isDoubleClick)
        }
    }

    protected onMouseMove(event: ToolEvent): ToolResult | null {
        const intersectionPoint = this.getIntersectionPoint(event)
        if (!intersectionPoint) return null

        const snappedPoint = this.getSnappedPoint(intersectionPoint)

        if (this._isCreatingHole && this._currentHolePoints.length > 0) {
            this.updateHolePreview(snappedPoint)
        } else if (this._isCreating && this._points.length > 0) {
            this.updateFloorPreview(snappedPoint)
        } else {
            this.updateSnapIndicators(snappedPoint)
        }

        return null
    }

    protected onKeyDown(event: ToolEvent): ToolResult | null {
        switch (event.key) {
            case 'Escape':
                if (this._isCreatingHole) {
                    return this.cancelHoleCreation()
                } else if (this._isCreating) {
                    return this.cancelFloorCreation()
                }
                break

            case 'Enter':
                if (this._isCreatingHole && this._currentHolePoints.length >= 3) {
                    return this.finishHole()
                } else if (this._isCreating && this._points.length >= 3) {
                    return this.finishFloor()
                }
                break

            case 'Backspace':
                if (this._isCreatingHole && this._currentHolePoints.length > 0) {
                    this._currentHolePoints.pop()
                    this.updateHolePreview()
                    return this.createSuccessResult(undefined, undefined,
                        `تم حذف النقطة. النقاط المتبقية: ${this._currentHolePoints.length}`)
                } else if (this._isCreating && this._points.length > 0) {
                    this._points.pop()
                    this.updateFloorPreview()
                    return this.createSuccessResult(undefined, undefined,
                        `تم حذف النقطة. النقاط المتبقية: ${this._points.length}`)
                }
                break

            case 'h':
            case 'H':
                if (this._isCreating && this._points.length >= 3 && this._constraints.allowHoles) {
                    return this.startHoleCreation()
                }
                break

            case 'Tab':
                return this.openFloorPropertiesPanel()

            // Thickness adjustment
            case 'ArrowUp':
                if (event.ctrlKey) {
                    return this.adjustFloorThickness(0.05)
                }
                break

            case 'ArrowDown':
                if (event.ctrlKey) {
                    return this.adjustFloorThickness(-0.05)
                }
                break

            // Quick thickness presets
            case '1':
                return this.setFloorThickness(0.1)
            case '2':
                return this.setFloorThickness(0.2)
            case '3':
                return this.setFloorThickness(0.3)

            // Toggle snap to walls
            case 's':
            case 'S':
                this._constraints.snapToWalls = !this._constraints.snapToWalls
                return this.createSuccessResult(undefined, undefined,
                    `تم ${this._constraints.snapToWalls ? 'تفعيل' : 'إلغاء'} المحاذاة للجدران`)

            // Create rectangular floor
            case 'r':
            case 'R':
                if (!this._isCreating) {
                    return this.startRectangularFloor()
                }
                break

            // Create circular floor
            case 'c':
            case 'C':
                if (!this._isCreating) {
                    return this.startCircularFloor()
                }
                break
        }

        return null
    }

    // Public methods for external access
    public getPreviewData(): FloorPreviewData | undefined {
        return this._previewData
    }

    public getConstraints(): FloorConstraints {
        return this._constraints
    }

    public setConstraints(constraints: Partial<FloorConstraints>): void {
        this._constraints = { ...this._constraints, ...constraints }
    }

    public getFloorPoints(): Vector3[] {
        return [...this._points]
    }

    public getHoles(): FloorHole[] {
        return [...this._holes]
    }

    // Private helper methods
    private handleFloorCreation(point: Vector3, isDoubleClick: boolean): ToolResult {
        if (!this._isCreating) {
            // Start creating floor
            this._points = [point]
            this._isCreating = true
            return this.createSuccessResult(undefined, undefined,
                'انقر لإضافة نقاط الأرضية، انقر مرتين أو اضغط Enter للإنهاء')
        }

        // Add point to floor
        if (this._points.length < this._constraints.maxPoints) {
            this._points.push(point)
        }

        if (isDoubleClick && this._points.length >= this._constraints.minPoints) {
            return this.finishFloor()
        }

        return this.createSuccessResult(undefined, undefined,
            `تم إضافة النقطة ${this._points.length}. انقر مرتين أو اضغط Enter للإنهاء`)
    }

    private handleHoleCreation(point: Vector3, isDoubleClick: boolean): ToolResult {
        // Add point to current hole
        if (this._currentHolePoints.length < this._constraints.maxPoints) {
            this._currentHolePoints.push(point)
        }

        if (isDoubleClick && this._currentHolePoints.length >= 3) {
            return this.finishHole()
        }

        return this.createSuccessResult(undefined, undefined,
            `نقطة الثقب ${this._currentHolePoints.length}. انقر مرتين أو اضغط Enter للإنهاء`)
    }

    private startHoleCreation(): ToolResult {
        this._isCreatingHole = true
        this._currentHolePoints = []
        return this.createSuccessResult(undefined, undefined,
            'بدء إنشاء ثقب. انقر لتحديد نقاط الثقب')
    }

    private finishHole(): ToolResult {
        if (this._currentHolePoints.length < 3) {
            return this.createErrorResult('يجب تحديد 3 نقاط على الأقل للثقب')
        }

        const holeArea = this.calculatePolygonArea(this._currentHolePoints)
        const hole: FloorHole = {
            points: [...this._currentHolePoints],
            area: holeArea
        }

        this._holes.push(hole)
        this._isCreatingHole = false
        this._currentHolePoints = []

        this.updateFloorPreview()

        return this.createSuccessResult(undefined, undefined,
            `تم إضافة ثقب بمساحة ${holeArea.toFixed(2)} متر مربع`)
    }

    private cancelHoleCreation(): ToolResult {
        this._isCreatingHole = false
        this._currentHolePoints = []
        this.updateFloorPreview()
        return this.createSuccessResult(undefined, undefined, 'تم إلغاء إنشاء الثقب')
    }

    private finishFloor(): ToolResult {
        if (this._points.length < this._constraints.minPoints) {
            return this.createErrorResult(`يجب تحديد ${this._constraints.minPoints} نقاط على الأقل`)
        }

        const area = this.calculatePolygonArea(this._points)
        const holesArea = this._holes.reduce((sum, hole) => sum + hole.area, 0)
        const netArea = area - holesArea

        if (netArea < this._constraints.minArea) {
            return this.createErrorResult(`المساحة صغيرة جداً. الحد الأدنى: ${this._constraints.minArea} متر مربع`)
        }

        if (netArea > this._constraints.maxArea) {
            return this.createErrorResult(`المساحة كبيرة جداً. الحد الأقصى: ${this._constraints.maxArea} متر مربع`)
        }

        const floor = this.createFloorElement(this._points, this._holes)
        const store = useStore.getState()

        // Add floor to scene
        store.addElement(floor)
        store.clearPreview()

        // Add to history
        store.addHistoryEntry(
            'create_floor',
            `إنشاء أرضية بمساحة ${netArea.toFixed(2)} متر مربع`,
            { floorId: floor.id, points: this._points, holes: this._holes }
        )

        // Reset for next floor
        this.cancelFloorCreation()

        return this.createSuccessResult(floor, undefined,
            `تم إنشاء أرضية بمساحة ${netArea.toFixed(2)} متر مربع`)
    }

    private createFloorElement(points: Vector3[], holes: FloorHole[]): BuildingElement {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        const thickness = toolProperties.floorThickness || 0.2
        const material = toolProperties.floorMaterial || 'concrete'

        // Calculate center point
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
        const centerZ = points.reduce((sum, p) => sum + p.z, 0) / points.length
        const centerY = points[0].y + thickness / 2

        const centerPoint = new Vector3(centerX, centerY, centerZ)

        // Calculate areas
        const totalArea = this.calculatePolygonArea(points)
        const holesArea = holes.reduce((sum, hole) => sum + hole.area, 0)
        const netArea = totalArea - holesArea

        // Generate floor geometry
        const geometry = this.generateFloorGeometry(points, holes, thickness)

        return {
            id: this.generateId(),
            type: 'floor',
            name: `أرضية ${netArea.toFixed(2)} متر مربع`,
            position: {
                x: centerPoint.x,
                y: centerPoint.y,
                z: centerPoint.z
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            },
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            properties: {
                thickness,
                material,
                area: netArea,
                totalArea,
                holesArea,
                points: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
                holes: holes.map(hole => ({
                    points: hole.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
                    area: hole.area
                })),
                pointCount: points.length,
                holeCount: holes.length,
                loadBearing: false,
                insulation: false,
                heating: false
            },
            geometry: {
                type: 'floor',
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
            tags: ['floor', 'structure'],
            metadata: {
                createdAt: Date.now(),
                createdBy: 'FloorTool',
                version: '1.0'
            }
        }
    }

    private generateFloorGeometry(points: Vector3[], holes: FloorHole[], thickness: number) {
        // Create shape from points
        const shape = new Shape()

        if (points.length > 0) {
            shape.moveTo(points[0].x, points[0].z)
            for (let i = 1; i < points.length; i++) {
                shape.lineTo(points[i].x, points[i].z)
            }
            shape.closePath()
        }

        // Add holes to shape
        holes.forEach(hole => {
            if (hole.points.length >= 3) {
                const holePath = new Path()
                holePath.moveTo(hole.points[0].x, hole.points[0].z)
                for (let i = 1; i < hole.points.length; i++) {
                    holePath.lineTo(hole.points[i].x, hole.points[i].z)
                }
                holePath.closePath()
                shape.holes.push(holePath)
            }
        })

        // Extrude the shape to create 3D geometry
        const extrudeSettings = {
            depth: thickness,
            bevelEnabled: false
        }

        const geometry = new ExtrudeGeometry(shape, extrudeSettings)

        // Convert Three.js geometry to our format
        const vertices: number[] = []
        const faces: number[] = []
        const uvs: number[] = []
        const normals: number[] = []

        const positionAttribute = geometry.getAttribute('position')
        const normalAttribute = geometry.getAttribute('normal')
        const uvAttribute = geometry.getAttribute('uv')
        const indexAttribute = geometry.getIndex()

        // Extract vertices
        for (let i = 0; i < positionAttribute.count; i++) {
            vertices.push(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            )
        }

        // Extract normals
        for (let i = 0; i < normalAttribute.count; i++) {
            normals.push(
                normalAttribute.getX(i),
                normalAttribute.getY(i),
                normalAttribute.getZ(i)
            )
        }

        // Extract UVs
        if (uvAttribute) {
            for (let i = 0; i < uvAttribute.count; i++) {
                uvs.push(
                    uvAttribute.getX(i),
                    uvAttribute.getY(i)
                )
            }
        }

        // Extract faces
        if (indexAttribute) {
            for (let i = 0; i < indexAttribute.count; i++) {
                faces.push(indexAttribute.getX(i))
            }
        }

        return { vertices, faces, uvs, normals }
    }

    private getSnappedPoint(point: Vector3): Vector3 {
        if (!this._constraints.snapToWalls) {
            return point
        }

        const store = useStore.getState()
        const snapDistance = this._constraints.snapDistance

        // Find nearby wall points
        const snapPoints = this.findWallSnapPoints(store.elements)

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

    private findWallSnapPoints(elements: BuildingElement[]): Vector3[] {
        const snapPoints: Vector3[] = []

        elements.forEach(element => {
            if (element.type === 'wall' && element.properties.startPoint && element.properties.endPoint) {
                // Add wall endpoints
                snapPoints.push(
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

                // Add wall corners (perpendicular points)
                const start = new Vector3(
                    element.properties.startPoint.x,
                    element.properties.startPoint.y,
                    element.properties.startPoint.z
                )
                const end = new Vector3(
                    element.properties.endPoint.x,
                    element.properties.endPoint.y,
                    element.properties.endPoint.z
                )
                const thickness = element.properties.thickness || 0.2

                const direction = new Vector3().subVectors(end, start).normalize()
                const perpendicular = new Vector3(-direction.z, 0, direction.x).multiplyScalar(thickness / 2)

                snapPoints.push(
                    start.clone().add(perpendicular),
                    start.clone().sub(perpendicular),
                    end.clone().add(perpendicular),
                    end.clone().sub(perpendicular)
                )
            }
        })

        return snapPoints
    }

    private updateFloorPreview(currentPoint?: Vector3): void {
        const store = useStore.getState()
        const toolProperties = store.toolState.toolProperties

        let previewPoints = [...this._points]
        if (currentPoint && this._isCreating) {
            previewPoints.push(currentPoint)
        }

        if (previewPoints.length >= 3) {
            this._previewData = {
                visible: true,
                points: previewPoints,
                thickness: toolProperties.floorThickness || 0.2,
                material: toolProperties.floorMaterial || 'concrete',
                area: this.calculatePolygonArea(previewPoints),
                holes: this._holes.map(hole => hole.points),
                snapPoints: this.findWallSnapPoints(store.elements)
            }

            // Create preview element
            const previewFloor = this.createFloorElement(previewPoints, this._holes)
            previewFloor.id = 'preview-floor'
            store.setPreviewElement(previewFloor)
        }
    }

    private updateHolePreview(currentPoint?: Vector3): void {
        let previewHolePoints = [...this._currentHolePoints]
        if (currentPoint) {
            previewHolePoints.push(currentPoint)
        }

        if (previewHolePoints.length >= 3) {
            const tempHoles = [...this._holes, { points: previewHolePoints, area: this.calculatePolygonArea(previewHolePoints) }]
            this.updateFloorPreview()
        }
    }

    private updateSnapIndicators(point: Vector3): void {
        const store = useStore.getState()
        const snapPoints = this.findWallSnapPoints(store.elements)

        store.setSnapIndicators(snapPoints.map(snapPoint => ({
            position: snapPoint,
            type: 'wall',
            visible: point.distanceTo(snapPoint) < this._constraints.snapDistance
        })))
    }

    private calculatePolygonArea(points: Vector3[]): number {
        if (points.length < 3) return 0

        let area = 0
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length
            area += points[i].x * points[j].z
            area -= points[j].x * points[i].z
        }

        return Math.abs(area) / 2
    }

    private adjustFloorThickness(delta: number): ToolResult {
        const store = useStore.getState()
        const currentThickness = store.toolState.toolProperties.floorThickness || 0.2
        const newThickness = Math.max(
            this._constraints.minThickness,
            Math.min(this._constraints.maxThickness, currentThickness + delta)
        )

        store.setActiveToolProperties({ floorThickness: newThickness })
        this.updateFloorPreview()

        return this.createSuccessResult(undefined, undefined,
            `سماكة الأرضية: ${newThickness.toFixed(2)}م`)
    }

    private setFloorThickness(thickness: number): ToolResult {
        const store = useStore.getState()
        const clampedThickness = Math.max(
            this._constraints.minThickness,
            Math.min(this._constraints.maxThickness, thickness)
        )

        store.setActiveToolProperties({ floorThickness: clampedThickness })
        this.updateFloorPreview()

        return this.createSuccessResult(undefined, undefined,
            `تم تعيين سماكة الأرضية إلى ${clampedThickness}م`)
    }

    private startRectangularFloor(): ToolResult {
        // This would start a rectangular floor creation mode
        return this.createSuccessResult(undefined, undefined,
            'وضع الأرضية المستطيلة - انقر واسحب لتحديد المستطيل')
    }

    private startCircularFloor(): ToolResult {
        // This would start a circular floor creation mode
        return this.createSuccessResult(undefined, undefined,
            'وضع الأرضية الدائرية - انقر لتحديد المركز ثم اسحب لتحديد نصف القطر')
    }

    private openFloorPropertiesPanel(): ToolResult {
        return this.createSuccessResult(undefined, undefined,
            'فتح لوحة خصائص الأرضية')
    }

    private getMaterialColor(material: string): string {
        const materialColors = {
            concrete: '#C0C0C0',
            wood: '#8B4513',
            tile: '#F5F5DC',
            marble: '#F8F8FF',
            carpet: '#8B0000',
            stone: '#696969'
        }
        return materialColors[material] || '#C0C0C0'
    }

    private getMaterialRoughness(material: string): number {
        const materialRoughness = {
            concrete: 0.8,
            wood: 0.7,
            tile: 0.2,
            marble: 0.1,
            carpet: 0.9,
            stone: 0.85
        }
        return materialRoughness[material] || 0.8
    }

    private cancelFloorCreation(): ToolResult {
        this._isCreating = false
        this._points = []
        this._holes = []
        this._previewData = undefined

        const store = useStore.getState()
        store.clearPreview()
        store.clearSnapIndicators()

        return this.createSuccessResult(undefined, undefined, 'تم إلغاء إنشاء الأرضية')
    }

    protected cleanup(): void {
        this._isCreating = false
        this._isCreatingHole = false
        this._points = []
        this._holes = []
        this._currentHolePoints = []
        this._previewData = undefined

        const store = useStore.getState()
        store.clearPreview()
        store.clearSnapIndicators()

        if (this._context?.canvas) {
            this._context.canvas.style.cursor = 'default'
        }
    }
}