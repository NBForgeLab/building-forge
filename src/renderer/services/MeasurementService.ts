/**
 * خدمة حسابات المساحة والحجم مع دقة رياضية عالية
 */

import * as THREE from 'three';
import { MeasurementResult, UnitType } from '../../shared/types/units';
import { GameUnitsService } from './GameUnitsService';

export interface AreaMeasurement {
    area: number;
    perimeter: number;
    vertices: THREE.Vector3[];
    formattedArea: string;
    formattedPerimeter: string;
    unit: UnitType;
}

export interface VolumeMeasurement {
    volume: number;
    surfaceArea: number;
    formattedVolume: string;
    formattedSurfaceArea: string;
    unit: UnitType;
}

export interface DimensionMeasurement {
    width: number;
    height: number;
    depth: number;
    formattedWidth: string;
    formattedHeight: string;
    formattedDepth: string;
    unit: UnitType;
}

export class MeasurementService {
    private static instance: MeasurementService;
    private unitsService: GameUnitsService;

    private constructor() {
        this.unitsService = GameUnitsService.getInstance();
    }

    public static getInstance(): MeasurementService {
        if (!MeasurementService.instance) {
            MeasurementService.instance = new MeasurementService();
        }
        return MeasurementService.instance;
    }

    /**
     * حساب المسافة بين نقطتين
     */
    public calculateDistance(point1: THREE.Vector3, point2: THREE.Vector3): MeasurementResult {
        const distance = point1.distanceTo(point2);
        const settings = this.unitsService.getCurrentSettings();

        return {
            value: distance,
            unit: settings.primaryUnit,
            precision: settings.displayPrecision,
            formattedValue: this.unitsService.formatValue(distance)
        };
    }

    /**
     * حساب مساحة مضلع من النقاط
     */
    public calculatePolygonArea(vertices: THREE.Vector3[]): AreaMeasurement {
        if (vertices.length < 3) {
            throw new Error('يجب أن يحتوي المضلع على 3 نقاط على الأقل');
        }

        // حساب المساحة باستخدام Shoelace formula
        const area = this.calculatePolygonAreaShoelace(vertices);
        const perimeter = this.calculatePolygonPerimeter(vertices);
        const settings = this.unitsService.getCurrentSettings();

        return {
            area,
            perimeter,
            vertices: [...vertices],
            formattedArea: this.formatAreaValue(area),
            formattedPerimeter: this.unitsService.formatValue(perimeter),
            unit: settings.primaryUnit
        };
    }

    /**
     * حساب حجم ومساحة سطح mesh
     */
    public calculateMeshVolume(geometry: THREE.BufferGeometry): VolumeMeasurement {
        const volume = this.calculateGeometryVolume(geometry);
        const surfaceArea = this.calculateGeometrySurfaceArea(geometry);
        const settings = this.unitsService.getCurrentSettings();

        return {
            volume,
            surfaceArea,
            formattedVolume: this.formatVolumeValue(volume),
            formattedSurfaceArea: this.formatAreaValue(surfaceArea),
            unit: settings.primaryUnit
        };
    }

    /**
     * حساب أبعاد bounding box
     */
    public calculateBoundingBoxDimensions(geometry: THREE.BufferGeometry): DimensionMeasurement {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;

        const width = box.max.x - box.min.x;
        const height = box.max.y - box.min.y;
        const depth = box.max.z - box.min.z;
        const settings = this.unitsService.getCurrentSettings();

        return {
            width,
            height,
            depth,
            formattedWidth: this.unitsService.formatValue(width),
            formattedHeight: this.unitsService.formatValue(height),
            formattedDepth: this.unitsService.formatValue(depth),
            unit: settings.primaryUnit
        };
    }

    /**
     * حساب مساحة مضلع باستخدام Shoelace formula
     */
    private calculatePolygonAreaShoelace(vertices: THREE.Vector3[]): number {
        if (vertices.length < 3) return 0;

        // إسقاط النقاط على مستوى مناسب
        const projectedVertices = this.projectVerticesTo2D(vertices);

        let area = 0;
        const n = projectedVertices.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += projectedVertices[i].x * projectedVertices[j].y;
            area -= projectedVertices[j].x * projectedVertices[i].y;
        }

        return Math.abs(area) / 2;
    }

    /**
     * إسقاط النقاط ثلاثية الأبعاد على مستوى ثنائي الأبعاد
     */
    private projectVerticesTo2D(vertices: THREE.Vector3[]): THREE.Vector2[] {
        if (vertices.length < 3) return [];

        // حساب normal للمستوى
        const v1 = new THREE.Vector3().subVectors(vertices[1], vertices[0]);
        const v2 = new THREE.Vector3().subVectors(vertices[2], vertices[0]);
        const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

        // إنشاء نظام إحداثيات محلي
        const up = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const right = new THREE.Vector3().crossVectors(normal, up).normalize();
        const forward = new THREE.Vector3().crossVectors(right, normal).normalize();

        // إسقاط النقاط
        return vertices.map(vertex => {
            const localPos = new THREE.Vector3().subVectors(vertex, vertices[0]);
            return new THREE.Vector2(
                localPos.dot(right),
                localPos.dot(forward)
            );
        });
    }

    /**
     * حساب محيط مضلع
     */
    private calculatePolygonPerimeter(vertices: THREE.Vector3[]): number {
        if (vertices.length < 2) return 0;

        let perimeter = 0;
        for (let i = 0; i < vertices.length; i++) {
            const nextIndex = (i + 1) % vertices.length;
            perimeter += vertices[i].distanceTo(vertices[nextIndex]);
        }

        return perimeter;
    }

    /**
     * حساب حجم geometry باستخدام divergence theorem
     */
    private calculateGeometryVolume(geometry: THREE.BufferGeometry): number {
        const positions = geometry.attributes.position;
        if (!positions || !geometry.index) return 0;

        const indices = geometry.index.array;
        let volume = 0;

        // حساب الحجم لكل مثلث
        for (let i = 0; i < indices.length; i += 3) {
            const a = new THREE.Vector3().fromBufferAttribute(positions, indices[i]);
            const b = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 1]);
            const c = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 2]);

            // حساب مساهمة المثلث في الحجم الكلي
            volume += this.calculateTetrahedronVolume(a, b, c);
        }

        return Math.abs(volume);
    }

    /**
     * حساب حجم tetrahedron من الأصل إلى مثلث
     */
    private calculateTetrahedronVolume(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
        // V = (1/6) * |a · (b × c)|
        const cross = new THREE.Vector3().crossVectors(b, c);
        return a.dot(cross) / 6;
    }

    /**
     * حساب مساحة السطح لـ geometry
     */
    private calculateGeometrySurfaceArea(geometry: THREE.BufferGeometry): number {
        const positions = geometry.attributes.position;
        if (!positions || !geometry.index) return 0;

        const indices = geometry.index.array;
        let surfaceArea = 0;

        // حساب مساحة كل مثلث
        for (let i = 0; i < indices.length; i += 3) {
            const a = new THREE.Vector3().fromBufferAttribute(positions, indices[i]);
            const b = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 1]);
            const c = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 2]);

            surfaceArea += this.calculateTriangleArea(a, b, c);
        }

        return surfaceArea;
    }

    /**
     * حساب مساحة مثلث
     */
    private calculateTriangleArea(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
        const ab = new THREE.Vector3().subVectors(b, a);
        const ac = new THREE.Vector3().subVectors(c, a);
        const cross = new THREE.Vector3().crossVectors(ab, ac);
        return cross.length() / 2;
    }

    /**
     * تنسيق قيمة المساحة مع الوحدة المناسبة
     */
    private formatAreaValue(area: number): string {
        const settings = this.unitsService.getCurrentSettings();
        const unitDef = this.unitsService.getAvailableUnits()
            .find(u => u.name.toLowerCase().includes(settings.primaryUnit));

        const symbol = unitDef?.symbol || 'm';
        const formattedValue = area.toFixed(settings.displayPrecision);

        return `${formattedValue} ${symbol}²`;
    }

    /**
     * تنسيق قيمة الحجم مع الوحدة المناسبة
     */
    private formatVolumeValue(volume: number): string {
        const settings = this.unitsService.getCurrentSettings();
        const unitDef = this.unitsService.getAvailableUnits()
            .find(u => u.name.toLowerCase().includes(settings.primaryUnit));

        const symbol = unitDef?.symbol || 'm';
        const formattedValue = volume.toFixed(settings.displayPrecision);

        return `${formattedValue} ${symbol}³`;
    }

    /**
     * حساب المسافة بين نقطة وخط
     */
    public calculatePointToLineDistance(point: THREE.Vector3, lineStart: THREE.Vector3, lineEnd: THREE.Vector3): MeasurementResult {
        const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
        const pointToStart = new THREE.Vector3().subVectors(point, lineStart);

        const lineLength = line.length();
        if (lineLength === 0) {
            return this.calculateDistance(point, lineStart);
        }

        const t = Math.max(0, Math.min(1, pointToStart.dot(line) / (lineLength * lineLength)));
        const projection = new THREE.Vector3().addVectors(lineStart, line.multiplyScalar(t));

        return this.calculateDistance(point, projection);
    }

    /**
     * حساب الزاوية بين ثلاث نقاط
     */
    public calculateAngle(center: THREE.Vector3, point1: THREE.Vector3, point2: THREE.Vector3): number {
        const v1 = new THREE.Vector3().subVectors(point1, center).normalize();
        const v2 = new THREE.Vector3().subVectors(point2, center).normalize();

        const dot = v1.dot(v2);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

        return angle * (180 / Math.PI); // تحويل إلى درجات
    }

    /**
     * التحقق من صحة القياسات
     */
    public validateMeasurement(value: number): boolean {
        return this.unitsService.validateValue(value, this.unitsService.getCurrentSettings().primaryUnit);
    }
}