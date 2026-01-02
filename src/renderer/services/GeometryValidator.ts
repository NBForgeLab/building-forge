import * as THREE from 'three';
import { BuildingElement } from '../store/types';

/**
 * نتيجة التحقق من الهندسة
 */
export interface GeometryValidationResult {
    isValid: boolean;
    errors: GeometryError[];
    warnings: GeometryWarning[];
    suggestions: string[];
}

/**
 * خطأ هندسي
 */
export interface GeometryError {
    id: string;
    type: GeometryErrorType;
    message: string;
    elementId?: string;
    position?: THREE.Vector3;
    severity: 'critical' | 'major' | 'minor';
    fixable: boolean;
}

/**
 * تحذير هندسي
 */
export interface GeometryWarning {
    id: string;
    type: GeometryWarningType;
    message: string;
    elementId?: string;
    position?: THREE.Vector3;
    recommendation: string;
}

/**
 * أنواع الأخطاء الهندسية
 */
export enum GeometryErrorType {
    INVALID_DIMENSIONS = 'invalid_dimensions',
    SELF_INTERSECTION = 'self_intersection',
    OVERLAPPING_ELEMENTS = 'overlapping_elements',
    INVALID_GEOMETRY = 'invalid_geometry',
    MISSING_VERTICES = 'missing_vertices',
    DEGENERATE_FACES = 'degenerate_faces',
    NON_MANIFOLD = 'non_manifold',
    FLOATING_POINT_PRECISION = 'floating_point_precision'
}

/**
 * أنواع التحذيرات الهندسية
 */
export enum GeometryWarningType {
    SMALL_DIMENSIONS = 'small_dimensions',
    LARGE_DIMENSIONS = 'large_dimensions',
    HIGH_POLYGON_COUNT = 'high_polygon_count',
    POOR_ASPECT_RATIO = 'poor_aspect_ratio',
    UNNECESSARY_COMPLEXITY = 'unnecessary_complexity',
    PERFORMANCE_IMPACT = 'performance_impact'
}

/**
 * إعدادات التحقق من الهندسة
 */
export interface GeometryValidationSettings {
    tolerance: number;
    minDimension: number;
    maxDimension: number;
    maxPolygonCount: number;
    checkIntersections: boolean;
    checkManifold: boolean;
    checkDegenerateFaces: boolean;
    performanceMode: boolean;
}

/**
 * فهرس مكاني بسيط للتحسين
 */
class SpatialIndex {
    private elements: Map<string, { element: BuildingElement; bounds: THREE.Box3 }>;

    constructor() {
        this.elements = new Map();
    }

    addElement(element: BuildingElement): void {
        if (element.geometry) {
            const box = new THREE.Box3().setFromObject(element.geometry);
            this.elements.set(element.id, { element, bounds: box });
        }
    }

    findNearbyElements(position: THREE.Vector3, radius: number): BuildingElement[] {
        const searchSphere = new THREE.Sphere(position, radius);
        const nearby: BuildingElement[] = [];

        for (const { element, bounds } of this.elements.values()) {
            if (searchSphere.intersectsBox(bounds)) {
                nearby.push(element);
            }
        }

        return nearby;
    }

    clear(): void {
        this.elements.clear();
    }
}

/**
 * محقق الهندسة المتقدم
 */
export class GeometryValidator {
    private settings: GeometryValidationSettings;
    private spatialIndex: SpatialIndex;
    private readonly DEFAULT_TOLERANCE = 1e-6;

    constructor(settings?: Partial<GeometryValidationSettings>) {
        this.settings = {
            tolerance: this.DEFAULT_TOLERANCE,
            minDimension: 0.01, // 1cm
            maxDimension: 1000, // 1km
            maxPolygonCount: 100000,
            checkIntersections: true,
            checkManifold: true,
            checkDegenerateFaces: true,
            performanceMode: false,
            ...settings
        };
        this.spatialIndex = new SpatialIndex();
    }

    /**
     * التحقق من صحة مجموعة من العناصر
     */
    async validateElements(elements: BuildingElement[]): Promise<GeometryValidationResult> {
        const result: GeometryValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        // بناء الفهرس المكاني
        this.buildSpatialIndex(elements);

        // التحقق من كل عنصر
        for (const element of elements) {
            const elementResult = await this.validateElement(element, elements);
            result.errors.push(...elementResult.errors);
            result.warnings.push(...elementResult.warnings);
            result.suggestions.push(...elementResult.suggestions);
        }

        // التحقق من التداخلات العامة
        if (this.settings.checkIntersections) {
            const intersectionResult = await this.checkGlobalIntersections(elements);
            result.errors.push(...intersectionResult.errors);
            result.warnings.push(...intersectionResult.warnings);
        }

        result.isValid = result.errors.length === 0;
        return result;
    }

    /**
     * التحقق من صحة عنصر واحد
     */
    async validateElement(
        element: BuildingElement,
        allElements: BuildingElement[]
    ): Promise<GeometryValidationResult> {
        const result: GeometryValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        if (!element.geometry) {
            result.errors.push({
                id: `missing_geometry_${element.id}`,
                type: GeometryErrorType.INVALID_GEOMETRY,
                message: 'العنصر لا يحتوي على هندسة صالحة',
                elementId: element.id,
                severity: 'critical',
                fixable: false
            });
            result.isValid = false;
            return result;
        }

        // التحقق من الأبعاد
        this.validateDimensions(element, result);

        // التحقق من الهندسة
        this.validateGeometry(element, result);

        // التحقق من الوجوه المنحلة
        if (this.settings.checkDegenerateFaces) {
            this.validateDegenerateFaces(element, result);
        }

        // التحقق من التعدد الشعبي
        if (this.settings.checkManifold) {
            this.validateManifold(element, result);
        }

        // التحقق من الأداء
        this.validatePerformance(element, result);

        result.isValid = result.errors.length === 0;
        return result;
    }

    /**
     * بناء الفهرس المكاني
     */
    private buildSpatialIndex(elements: BuildingElement[]): void {
        this.spatialIndex.clear();
        for (const element of elements) {
            this.spatialIndex.addElement(element);
        }
    }

    /**
     * التحقق من الأبعاد
     */
    private validateDimensions(element: BuildingElement, result: GeometryValidationResult): void {
        if (!element.geometry) return;

        const box = new THREE.Box3().setFromObject(element.geometry);
        const size = box.getSize(new THREE.Vector3());

        // التحقق من الأبعاد الصغيرة جداً (أصغر من tolerance)
        if (size.x < this.settings.tolerance ||
            size.y < this.settings.tolerance ||
            size.z < this.settings.tolerance) {
            result.errors.push({
                id: `invalid_dimensions_${element.id}`,
                type: GeometryErrorType.INVALID_DIMENSIONS,
                message: `أبعاد العنصر صغيرة جداً: ${size.x.toFixed(6)} × ${size.y.toFixed(6)} × ${size.z.toFixed(6)}`,
                elementId: element.id,
                position: box.getCenter(new THREE.Vector3()),
                severity: 'major',
                fixable: true
            });
        }
        // التحقق من الأبعاد الصغيرة (أصغر من الحد الأدنى ولكن أكبر من tolerance)
        else if (size.x < this.settings.minDimension ||
            size.y < this.settings.minDimension ||
            size.z < this.settings.minDimension) {
            result.warnings.push({
                id: `small_dimensions_${element.id}`,
                type: GeometryWarningType.SMALL_DIMENSIONS,
                message: `أبعاد العنصر صغيرة: ${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)}`,
                elementId: element.id,
                position: box.getCenter(new THREE.Vector3()),
                recommendation: 'تأكد من أن الأبعاد صحيحة أو قم بزيادة الحجم'
            });
        }

        // التحقق من الحد الأقصى للأبعاد
        if (size.x > this.settings.maxDimension ||
            size.y > this.settings.maxDimension ||
            size.z > this.settings.maxDimension) {
            result.warnings.push({
                id: `large_dimensions_${element.id}`,
                type: GeometryWarningType.LARGE_DIMENSIONS,
                message: `أبعاد العنصر كبيرة جداً: ${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)}`,
                elementId: element.id,
                position: box.getCenter(new THREE.Vector3()),
                recommendation: 'قد يؤثر هذا على الأداء، فكر في تقسيم العنصر'
            });
        }

        // التحقق من نسبة العرض إلى الارتفاع
        const aspectRatio = Math.max(size.x, size.y, size.z) / Math.min(size.x, size.y, size.z);
        if (aspectRatio > 100) {
            result.warnings.push({
                id: `poor_aspect_ratio_${element.id}`,
                type: GeometryWarningType.POOR_ASPECT_RATIO,
                message: `نسبة العرض إلى الارتفاع سيئة: ${aspectRatio.toFixed(1)}:1`,
                elementId: element.id,
                position: box.getCenter(new THREE.Vector3()),
                recommendation: 'قد يسبب مشاكل في العرض والتصدير'
            });
        }
    }

    /**
     * التحقق من الهندسة الأساسية
     */
    private validateGeometry(element: BuildingElement, result: GeometryValidationResult): void {
        if (!element.geometry) return;

        element.geometry.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;

                // التحقق من وجود الرؤوس
                if (!geometry.attributes.position || geometry.attributes.position.count === 0) {
                    result.errors.push({
                        id: `missing_vertices_${element.id}_${child.id}`,
                        type: GeometryErrorType.MISSING_VERTICES,
                        message: 'الهندسة لا تحتوي على رؤوس',
                        elementId: element.id,
                        severity: 'critical',
                        fixable: false
                    });
                }

                // التحقق من صحة الفهارس
                if (geometry.index) {
                    const indexArray = geometry.index.array;
                    const vertexCount = geometry.attributes.position.count;

                    for (let i = 0; i < indexArray.length; i++) {
                        if (indexArray[i] >= vertexCount) {
                            result.errors.push({
                                id: `invalid_index_${element.id}_${child.id}`,
                                type: GeometryErrorType.INVALID_GEOMETRY,
                                message: `فهرس غير صالح: ${indexArray[i]} >= ${vertexCount}`,
                                elementId: element.id,
                                severity: 'critical',
                                fixable: true
                            });
                            break;
                        }
                    }
                }

                // التحقق من عدد المضلعات
                const triangleCount = geometry.index ?
                    geometry.index.count / 3 :
                    geometry.attributes.position.count / 3;

                if (triangleCount > this.settings.maxPolygonCount) {
                    result.warnings.push({
                        id: `high_polygon_count_${element.id}_${child.id}`,
                        type: GeometryWarningType.HIGH_POLYGON_COUNT,
                        message: `عدد مضلعات عالي: ${Math.floor(triangleCount)}`,
                        elementId: element.id,
                        recommendation: 'فكر في تبسيط الهندسة لتحسين الأداء'
                    });
                }
            }
        });
    }

    /**
     * التحقق من الوجوه المنحلة
     */
    private validateDegenerateFaces(element: BuildingElement, result: GeometryValidationResult): void {
        if (!element.geometry) return;

        element.geometry.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                const positions = geometry.attributes.position;

                if (!positions || !geometry.index) return;

                const indexArray = geometry.index.array;
                const positionArray = positions.array;

                for (let i = 0; i < indexArray.length; i += 3) {
                    const i1 = indexArray[i] * 3;
                    const i2 = indexArray[i + 1] * 3;
                    const i3 = indexArray[i + 2] * 3;

                    const v1 = new THREE.Vector3(
                        positionArray[i1], positionArray[i1 + 1], positionArray[i1 + 2]
                    );
                    const v2 = new THREE.Vector3(
                        positionArray[i2], positionArray[i2 + 1], positionArray[i2 + 2]
                    );
                    const v3 = new THREE.Vector3(
                        positionArray[i3], positionArray[i3 + 1], positionArray[i3 + 2]
                    );

                    // حساب المساحة
                    const edge1 = v2.clone().sub(v1);
                    const edge2 = v3.clone().sub(v1);
                    const cross = edge1.cross(edge2);
                    const area = cross.length() * 0.5;

                    if (area < this.settings.tolerance) {
                        result.errors.push({
                            id: `degenerate_face_${element.id}_${child.id}_${i / 3}`,
                            type: GeometryErrorType.DEGENERATE_FACES,
                            message: `وجه منحل بمساحة ${area.toExponential(2)}`,
                            elementId: element.id,
                            position: v1.clone().add(v2).add(v3).divideScalar(3),
                            severity: 'major',
                            fixable: true
                        });
                    }
                }
            }
        });
    }

    /**
     * التحقق من التعدد الشعبي (Manifold)
     */
    private validateManifold(element: BuildingElement, result: GeometryValidationResult): void {
        if (!element.geometry) return;

        element.geometry.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;

                if (!geometry.index) return;

                const edgeMap = new Map<string, number>();
                const indexArray = geometry.index.array;

                // عد الحواف
                for (let i = 0; i < indexArray.length; i += 3) {
                    const edges = [
                        [indexArray[i], indexArray[i + 1]],
                        [indexArray[i + 1], indexArray[i + 2]],
                        [indexArray[i + 2], indexArray[i]]
                    ];

                    for (const edge of edges) {
                        const key = edge[0] < edge[1] ? `${edge[0]}-${edge[1]}` : `${edge[1]}-${edge[0]}`;
                        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
                    }
                }

                // البحث عن حواف غير متعددة الشعب
                let nonManifoldEdges = 0;
                for (const [edge, count] of edgeMap) {
                    if (count !== 2) {
                        nonManifoldEdges++;
                        if (nonManifoldEdges === 1) { // تقرير واحد فقط لكل عنصر
                            result.errors.push({
                                id: `non_manifold_${element.id}_${child.id}`,
                                type: GeometryErrorType.NON_MANIFOLD,
                                message: `هندسة غير متعددة الشعب: ${nonManifoldEdges} حافة مشكلة`,
                                elementId: element.id,
                                severity: 'major',
                                fixable: true
                            });
                        }
                    }
                }
            }
        });
    }

    /**
     * التحقق من الأداء
     */
    private validatePerformance(element: BuildingElement, result: GeometryValidationResult): void {
        if (!element.geometry || this.settings.performanceMode) return;

        let totalVertices = 0;
        let totalTriangles = 0;
        let meshCount = 0;

        element.geometry.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                meshCount++;
                const geometry = child.geometry;
                totalVertices += geometry.attributes.position.count;
                totalTriangles += geometry.index ?
                    geometry.index.count / 3 :
                    geometry.attributes.position.count / 3;
            }
        });

        // التحقق من عدد المضلعات
        if (totalTriangles > this.settings.maxPolygonCount) {
            result.warnings.push({
                id: `high_polygon_count_${element.id}`,
                type: GeometryWarningType.HIGH_POLYGON_COUNT,
                message: `عدد مضلعات عالي: ${Math.floor(totalTriangles)}`,
                elementId: element.id,
                recommendation: 'فكر في تبسيط الهندسة لتحسين الأداء'
            });
        }

        // تحذير من التعقيد العالي
        if (meshCount > 50) {
            result.warnings.push({
                id: `high_mesh_count_${element.id}`,
                type: GeometryWarningType.UNNECESSARY_COMPLEXITY,
                message: `عدد شبكات عالي: ${meshCount}`,
                elementId: element.id,
                recommendation: 'فكر في دمج الشبكات لتحسين الأداء'
            });
        }

        if (totalVertices > 50000) {
            result.warnings.push({
                id: `performance_impact_${element.id}`,
                type: GeometryWarningType.PERFORMANCE_IMPACT,
                message: `عدد رؤوس عالي: ${totalVertices}`,
                elementId: element.id,
                recommendation: 'قد يؤثر على أداء العرض والتصدير'
            });
        }
    }

    /**
     * التحقق من التداخلات العامة
     */
    private async checkGlobalIntersections(elements: BuildingElement[]): Promise<GeometryValidationResult> {
        const result: GeometryValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const element1 = elements[i];
                const element2 = elements[j];

                if (this.checkElementsIntersection(element1, element2)) {
                    result.errors.push({
                        id: `intersection_${element1.id}_${element2.id}`,
                        type: GeometryErrorType.OVERLAPPING_ELEMENTS,
                        message: `تداخل بين العنصرين ${element1.id} و ${element2.id}`,
                        elementId: element1.id,
                        severity: 'major',
                        fixable: true
                    });
                }
            }
        }

        result.isValid = result.errors.length === 0;
        return result;
    }

    /**
     * التحقق من تداخل عنصرين
     */
    private checkElementsIntersection(element1: BuildingElement, element2: BuildingElement): boolean {
        if (!element1.geometry || !element2.geometry) return false;

        const box1 = new THREE.Box3().setFromObject(element1.geometry);
        const box2 = new THREE.Box3().setFromObject(element2.geometry);

        return box1.intersectsBox(box2);
    }

    /**
     * تحديث إعدادات التحقق
     */
    updateSettings(newSettings: Partial<GeometryValidationSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    getSettings(): GeometryValidationSettings {
        return { ...this.settings };
    }
}