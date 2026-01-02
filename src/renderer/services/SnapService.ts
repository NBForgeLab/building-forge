/**
 * خدمة نظام Snap-to-Grid المتقدم مع محاذاة دقيقة
 */

import * as THREE from 'three';
import { GameUnitsService } from './GameUnitsService';

export enum SnapType {
    GRID = 'grid',
    VERTEX = 'vertex',
    EDGE = 'edge',
    FACE = 'face',
    OBJECT = 'object',
    ANGLE = 'angle'
}

export interface SnapSettings {
    enabled: boolean;
    gridSnap: boolean;
    vertexSnap: boolean;
    edgeSnap: boolean;
    faceSnap: boolean;
    objectSnap: boolean;
    angleSnap: boolean;
    snapTolerance: number;
    gridSize: number;
    angleIncrement: number; // بالدرجات
}

export interface SnapResult {
    snapped: boolean;
    position: THREE.Vector3;
    snapType: SnapType;
    snapTarget?: THREE.Object3D | THREE.Vector3;
    distance: number;
}

export interface SnapIndicator {
    type: SnapType;
    position: THREE.Vector3;
    visual: THREE.Object3D;
}

export class SnapService {
    private static instance: SnapService;
    private unitsService: GameUnitsService;
    private settings: SnapSettings;
    private scene: THREE.Scene;
    private snapIndicators: Map<string, SnapIndicator> = new Map();
    private gridHelper: THREE.GridHelper | null = null;
    private snapTargets: THREE.Object3D[] = [];

    private constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.unitsService = GameUnitsService.getInstance();
        this.settings = this.getDefaultSettings();
        this.initializeGrid();
    }

    public static getInstance(scene?: THREE.Scene): SnapService {
        if (!SnapService.instance && scene) {
            SnapService.instance = new SnapService(scene);
        }
        return SnapService.instance;
    }

    private getDefaultSettings(): SnapSettings {
        return {
            enabled: true,
            gridSnap: true,
            vertexSnap: true,
            edgeSnap: true,
            faceSnap: false,
            objectSnap: true,
            angleSnap: true,
            snapTolerance: 0.1,
            gridSize: 1.0,
            angleIncrement: 15
        };
    }

    /**
     * تحديث إعدادات الـ snap
     */
    public updateSettings(newSettings: Partial<SnapSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.updateGrid();
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    public getSettings(): SnapSettings {
        return { ...this.settings };
    }

    /**
     * تهيئة الشبكة المرئية
     */
    private initializeGrid(): void {
        this.updateGrid();
    }

    /**
     * تحديث الشبكة المرئية
     */
    private updateGrid(): void {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose();
        }

        if (this.settings.gridSnap && this.settings.enabled) {
            const gridSize = this.unitsService.getOptimalGridSize();
            const divisions = 50;

            this.gridHelper = new THREE.GridHelper(
                gridSize * divisions,
                divisions,
                0x444444,
                0x222222
            );

            this.gridHelper.name = 'snapGrid';
            this.gridHelper.renderOrder = -1;
            this.scene.add(this.gridHelper);
        }
    }

    /**
     * إضافة كائن كهدف للـ snap
     */
    public addSnapTarget(object: THREE.Object3D): void {
        if (!this.snapTargets.includes(object)) {
            this.snapTargets.push(object);
        }
    }

    /**
     * إزالة كائن من أهداف الـ snap
     */
    public removeSnapTarget(object: THREE.Object3D): void {
        const index = this.snapTargets.indexOf(object);
        if (index !== -1) {
            this.snapTargets.splice(index, 1);
        }
    }

    /**
     * مسح جميع أهداف الـ snap
     */
    public clearSnapTargets(): void {
        this.snapTargets = [];
    }

    /**
     * تطبيق الـ snap على موضع
     */
    public snapPosition(position: THREE.Vector3, excludeObjects?: THREE.Object3D[]): SnapResult {
        if (!this.settings.enabled) {
            return {
                snapped: false,
                position: position.clone(),
                snapType: SnapType.GRID,
                distance: 0
            };
        }

        const snapResults: SnapResult[] = [];

        // Grid snap
        if (this.settings.gridSnap) {
            const gridResult = this.snapToGrid(position);
            if (gridResult.snapped) {
                snapResults.push(gridResult);
            }
        }

        // Object snaps
        const filteredTargets = this.snapTargets.filter(obj =>
            !excludeObjects?.includes(obj)
        );

        for (const target of filteredTargets) {
            // Vertex snap
            if (this.settings.vertexSnap) {
                const vertexResult = this.snapToVertices(position, target);
                if (vertexResult.snapped) {
                    snapResults.push(vertexResult);
                }
            }

            // Edge snap
            if (this.settings.edgeSnap) {
                const edgeResult = this.snapToEdges(position, target);
                if (edgeResult.snapped) {
                    snapResults.push(edgeResult);
                }
            }

            // Face snap
            if (this.settings.faceSnap) {
                const faceResult = this.snapToFaces(position, target);
                if (faceResult.snapped) {
                    snapResults.push(faceResult);
                }
            }

            // Object center snap
            if (this.settings.objectSnap) {
                const objectResult = this.snapToObjectCenter(position, target);
                if (objectResult.snapped) {
                    snapResults.push(objectResult);
                }
            }
        }

        // اختيار أقرب snap
        if (snapResults.length === 0) {
            return {
                snapped: false,
                position: position.clone(),
                snapType: SnapType.GRID,
                distance: 0
            };
        }

        const closestSnap = snapResults.reduce((closest, current) =>
            current.distance < closest.distance ? current : closest
        );

        // عرض مؤشر الـ snap
        this.showSnapIndicator(closestSnap);

        return closestSnap;
    }

    /**
     * Snap إلى الشبكة
     */
    private snapToGrid(position: THREE.Vector3): SnapResult {
        const gridSize = this.unitsService.getOptimalGridSize();
        const tolerance = this.unitsService.getSnapTolerance();

        const snappedX = Math.round(position.x / gridSize) * gridSize;
        const snappedY = position.y; // عادة لا نقوم بـ snap للـ Y
        const snappedZ = Math.round(position.z / gridSize) * gridSize;

        const snappedPosition = new THREE.Vector3(snappedX, snappedY, snappedZ);
        const distance = position.distanceTo(snappedPosition);

        return {
            snapped: distance <= tolerance,
            position: snappedPosition,
            snapType: SnapType.GRID,
            distance
        };
    }

    /**
     * Snap إلى vertices
     */
    private snapToVertices(position: THREE.Vector3, target: THREE.Object3D): SnapResult {
        const tolerance = this.unitsService.getSnapTolerance();
        let closestVertex: THREE.Vector3 | null = null;
        let minDistance = Infinity;

        target.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                const positionAttribute = geometry.attributes.position;

                if (positionAttribute) {
                    const worldMatrix = child.matrixWorld;

                    for (let i = 0; i < positionAttribute.count; i++) {
                        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
                        vertex.applyMatrix4(worldMatrix);

                        const distance = position.distanceTo(vertex);
                        if (distance < minDistance && distance <= tolerance) {
                            minDistance = distance;
                            closestVertex = vertex;
                        }
                    }
                }
            }
        });

        return {
            snapped: closestVertex !== null,
            position: closestVertex || position.clone(),
            snapType: SnapType.VERTEX,
            snapTarget: target,
            distance: minDistance
        };
    }

    /**
     * Snap إلى edges
     */
    private snapToEdges(position: THREE.Vector3, target: THREE.Object3D): SnapResult {
        const tolerance = this.unitsService.getSnapTolerance();
        let closestPoint: THREE.Vector3 | null = null;
        let minDistance = Infinity;

        target.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                const positionAttribute = geometry.attributes.position;
                const indexAttribute = geometry.index;

                if (positionAttribute && indexAttribute) {
                    const worldMatrix = child.matrixWorld;

                    for (let i = 0; i < indexAttribute.count; i += 3) {
                        // الحصول على vertices المثلث
                        const a = new THREE.Vector3().fromBufferAttribute(positionAttribute, indexAttribute.getX(i));
                        const b = new THREE.Vector3().fromBufferAttribute(positionAttribute, indexAttribute.getX(i + 1));
                        const c = new THREE.Vector3().fromBufferAttribute(positionAttribute, indexAttribute.getX(i + 2));

                        a.applyMatrix4(worldMatrix);
                        b.applyMatrix4(worldMatrix);
                        c.applyMatrix4(worldMatrix);

                        // فحص الحواف الثلاث
                        const edges = [[a, b], [b, c], [c, a]];

                        for (const [start, end] of edges) {
                            const closestPointOnEdge = this.getClosestPointOnLine(position, start, end);
                            const distance = position.distanceTo(closestPointOnEdge);

                            if (distance < minDistance && distance <= tolerance) {
                                minDistance = distance;
                                closestPoint = closestPointOnEdge;
                            }
                        }
                    }
                }
            }
        });

        return {
            snapped: closestPoint !== null,
            position: closestPoint || position.clone(),
            snapType: SnapType.EDGE,
            snapTarget: target,
            distance: minDistance
        };
    }

    /**
     * Snap إلى faces
     */
    private snapToFaces(position: THREE.Vector3, target: THREE.Object3D): SnapResult {
        const tolerance = this.unitsService.getSnapTolerance();
        const raycaster = new THREE.Raycaster();

        // إنشاء ray من الموضع نحو الأسفل
        raycaster.set(position, new THREE.Vector3(0, -1, 0));

        const intersections = raycaster.intersectObject(target, true);

        if (intersections.length > 0) {
            const intersection = intersections[0];
            const distance = position.distanceTo(intersection.point);

            if (distance <= tolerance) {
                return {
                    snapped: true,
                    position: intersection.point,
                    snapType: SnapType.FACE,
                    snapTarget: target,
                    distance
                };
            }
        }

        return {
            snapped: false,
            position: position.clone(),
            snapType: SnapType.FACE,
            distance: Infinity
        };
    }

    /**
     * Snap إلى مركز الكائن
     */
    private snapToObjectCenter(position: THREE.Vector3, target: THREE.Object3D): SnapResult {
        const tolerance = this.unitsService.getSnapTolerance();
        const center = new THREE.Vector3();

        // حساب مركز الكائن
        const box = new THREE.Box3().setFromObject(target);
        box.getCenter(center);

        const distance = position.distanceTo(center);

        return {
            snapped: distance <= tolerance,
            position: center,
            snapType: SnapType.OBJECT,
            snapTarget: target,
            distance
        };
    }

    /**
     * الحصول على أقرب نقطة على خط
     */
    private getClosestPointOnLine(point: THREE.Vector3, lineStart: THREE.Vector3, lineEnd: THREE.Vector3): THREE.Vector3 {
        const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
        const lineLength = line.length();

        if (lineLength === 0) {
            return lineStart.clone();
        }

        const pointToStart = new THREE.Vector3().subVectors(point, lineStart);
        const t = Math.max(0, Math.min(1, pointToStart.dot(line) / (lineLength * lineLength)));

        return new THREE.Vector3().addVectors(lineStart, line.multiplyScalar(t));
    }

    /**
     * عرض مؤشر الـ snap
     */
    private showSnapIndicator(snapResult: SnapResult): void {
        this.clearSnapIndicators();

        if (!snapResult.snapped) return;

        const indicator = this.createSnapIndicator(snapResult.snapType, snapResult.position);
        const id = `snap_${Date.now()}`;

        this.snapIndicators.set(id, {
            type: snapResult.snapType,
            position: snapResult.position.clone(),
            visual: indicator
        });

        this.scene.add(indicator);

        // إزالة المؤشر بعد فترة قصيرة
        setTimeout(() => {
            this.removeSnapIndicator(id);
        }, 100);
    }

    /**
     * إنشاء مؤشر بصري للـ snap
     */
    private createSnapIndicator(type: SnapType, position: THREE.Vector3): THREE.Object3D {
        let geometry: THREE.BufferGeometry;
        let material: THREE.Material;

        switch (type) {
            case SnapType.GRID:
                geometry = new THREE.RingGeometry(0.05, 0.1, 8);
                material = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.8,
                    depthTest: false
                });
                break;

            case SnapType.VERTEX:
                geometry = new THREE.SphereGeometry(0.08, 8, 8);
                material = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    transparent: true,
                    opacity: 0.8,
                    depthTest: false
                });
                break;

            case SnapType.EDGE:
                geometry = new THREE.BoxGeometry(0.15, 0.02, 0.02);
                material = new THREE.MeshBasicMaterial({
                    color: 0x0000ff,
                    transparent: true,
                    opacity: 0.8,
                    depthTest: false
                });
                break;

            case SnapType.FACE:
                geometry = new THREE.PlaneGeometry(0.2, 0.2);
                material = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 0.5,
                    depthTest: false,
                    side: THREE.DoubleSide
                });
                break;

            default:
                geometry = new THREE.RingGeometry(0.08, 0.12, 6);
                material = new THREE.MeshBasicMaterial({
                    color: 0xff00ff,
                    transparent: true,
                    opacity: 0.8,
                    depthTest: false
                });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.renderOrder = 1000;

        return mesh;
    }

    /**
     * إزالة مؤشر snap محدد
     */
    private removeSnapIndicator(id: string): void {
        const indicator = this.snapIndicators.get(id);
        if (indicator) {
            this.scene.remove(indicator.visual);

            if (indicator.visual instanceof THREE.Mesh) {
                indicator.visual.geometry.dispose();
                (indicator.visual.material as THREE.Material).dispose();
            }

            this.snapIndicators.delete(id);
        }
    }

    /**
     * مسح جميع مؤشرات الـ snap
     */
    private clearSnapIndicators(): void {
        for (const id of this.snapIndicators.keys()) {
            this.removeSnapIndicator(id);
        }
    }

    /**
     * Snap زاوية إلى زيادات محددة
     */
    public snapAngle(angle: number): number {
        if (!this.settings.angleSnap || !this.settings.enabled) {
            return angle;
        }

        const increment = this.settings.angleIncrement * (Math.PI / 180); // تحويل إلى راديان
        return Math.round(angle / increment) * increment;
    }

    /**
     * تفعيل/إلغاء تفعيل الشبكة المرئية
     */
    public setGridVisible(visible: boolean): void {
        if (this.gridHelper) {
            this.gridHelper.visible = visible;
        }
    }

    /**
     * تنظيف الموارد
     */
    public dispose(): void {
        this.clearSnapIndicators();

        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose();
            this.gridHelper = null;
        }

        this.snapTargets = [];
    }
}