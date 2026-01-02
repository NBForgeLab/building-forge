/**
 * خدمة تحسين الأداء المتقدمة
 * تتضمن Occlusion Culling وتحسينات العرض
 */

import * as THREE from 'three';

export interface PerformanceMetrics {
    fps: number;
    drawCalls: number;
    vertices: number;
    triangles: number;
    memoryUsage: number;
    renderTime: number;
}

export interface OptimizationSettings {
    enableOcclusionCulling: boolean;
    enableFrustumCulling: boolean;
    enableDistanceCulling: boolean;
    maxDrawDistance: number;
    lodLevels: number;
    enableInstancing: boolean;
    enableBatching: boolean;
}

export class PerformanceOptimizer {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private settings: OptimizationSettings;
    private metrics: PerformanceMetrics;
    private frustum: THREE.Frustum;
    private cameraMatrix: THREE.Matrix4;
    private visibleObjects: Set<THREE.Object3D>;
    private culledObjects: Set<THREE.Object3D>;
    private frameStartTime: number = 0;
    private frameCount: number = 0;
    private lastFPSUpdate: number = 0;

    constructor(
        scene: THREE.Scene,
        camera: THREE.Camera,
        renderer: THREE.WebGLRenderer
    ) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
        this.visibleObjects = new Set();
        this.culledObjects = new Set();

        this.settings = {
            enableOcclusionCulling: true,
            enableFrustumCulling: true,
            enableDistanceCulling: true,
            maxDrawDistance: 1000,
            lodLevels: 3,
            enableInstancing: true,
            enableBatching: true
        };

        this.metrics = {
            fps: 60,
            drawCalls: 0,
            vertices: 0,
            triangles: 0,
            memoryUsage: 0,
            renderTime: 0
        };

        this.initializeOptimizations();
    }

    private initializeOptimizations(): void {
        // إعداد renderer للأداء الأمثل
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;

        // تحسين الذاكرة
        this.renderer.info.autoReset = false;
    }

    /**
     * تطبيق Frustum Culling
     */
    private performFrustumCulling(): void {
        if (!this.settings.enableFrustumCulling) return;

        this.cameraMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);

        this.scene.traverse((object) => {
            if (object.type === 'Mesh' || object.type === 'InstancedMesh') {
                const mesh = object as THREE.Mesh;

                // تحديث bounding box
                if (!mesh.geometry.boundingBox) {
                    mesh.geometry.computeBoundingBox();
                }

                if (mesh.geometry.boundingBox) {
                    const box = mesh.geometry.boundingBox.clone();
                    box.applyMatrix4(mesh.matrixWorld);

                    if (this.frustum.intersectsBox(box)) {
                        this.visibleObjects.add(object);
                        object.visible = true;
                    } else {
                        this.culledObjects.add(object);
                        object.visible = false;
                    }
                }
            }
        });
    }

    /**
     * تطبيق Distance Culling
     */
    private performDistanceCulling(): void {
        if (!this.settings.enableDistanceCulling) return;

        const cameraPosition = this.camera.position;

        this.scene.traverse((object) => {
            if (object.type === 'Mesh' || object.type === 'InstancedMesh') {
                const distance = cameraPosition.distanceTo(object.position);

                if (distance > this.settings.maxDrawDistance) {
                    object.visible = false;
                    this.culledObjects.add(object);
                } else {
                    // تطبيق LOD بناءً على المسافة
                    this.applyLOD(object, distance);
                }
            }
        });
    }

    /**
     * تطبيق Level of Detail (LOD)
     */
    private applyLOD(object: THREE.Object3D, distance: number): void {
        const mesh = object as THREE.Mesh;
        if (!mesh.geometry) return;

        const maxDistance = this.settings.maxDrawDistance;
        const lodLevel = Math.floor((distance / maxDistance) * this.settings.lodLevels);

        // تطبيق تبسيط الهندسة بناءً على مستوى LOD
        if (lodLevel > 0) {
            // يمكن تطبيق تبسيط الشبكة هنا
            // هذا مثال بسيط - في التطبيق الحقيقي نحتاج مكتبة تبسيط
            const originalGeometry = mesh.geometry;

            // تقليل دقة الظلال للعناصر البعيدة
            mesh.castShadow = lodLevel < 2;
            mesh.receiveShadow = lodLevel < 2;
        }
    }

    /**
     * تطبيق Occlusion Culling المبسط
     */
    private performOcclusionCulling(): void {
        if (!this.settings.enableOcclusionCulling) return;

        // Occlusion culling مبسط باستخدام raycasting
        const raycaster = new THREE.Raycaster();
        const cameraPosition = this.camera.position;
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        this.scene.traverse((object) => {
            if (object.type === 'Mesh' && object.visible) {
                const mesh = object as THREE.Mesh;
                const objectPosition = mesh.position.clone();

                // حساب الاتجاه من الكاميرا إلى العنصر
                const direction = objectPosition.sub(cameraPosition).normalize();

                raycaster.set(cameraPosition, direction);
                const intersects = raycaster.intersectObjects(this.scene.children, true);

                // إذا كان هناك عنصر آخر أقرب، فالعنصر مخفي
                if (intersects.length > 0 && intersects[0].object !== mesh) {
                    const firstIntersect = intersects[0];
                    const distanceToObject = cameraPosition.distanceTo(objectPosition);

                    if (firstIntersect.distance < distanceToObject - 1) { // هامش خطأ
                        mesh.visible = false;
                        this.culledObjects.add(mesh);
                    }
                }
            }
        });
    }

    /**
     * تحديث مقاييس الأداء
     */
    private updateMetrics(): void {
        const now = performance.now();

        // حساب FPS
        this.frameCount++;
        if (now - this.lastFPSUpdate >= 1000) {
            this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }

        // حساب وقت العرض
        if (this.frameStartTime > 0) {
            this.metrics.renderTime = now - this.frameStartTime;
        }

        // معلومات الرسم من renderer
        const info = this.renderer.info;
        this.metrics.drawCalls = info.render.calls;
        this.metrics.triangles = info.render.triangles;
        this.metrics.vertices = info.render.points;

        // تقدير استخدام الذاكرة
        this.metrics.memoryUsage = info.memory.geometries + info.memory.textures;
    }

    /**
     * تطبيق جميع التحسينات
     */
    public optimize(): void {
        this.frameStartTime = performance.now();

        // مسح المجموعات السابقة
        this.visibleObjects.clear();
        this.culledObjects.clear();

        // تطبيق تقنيات Culling المختلفة
        this.performFrustumCulling();
        this.performDistanceCulling();
        this.performOcclusionCulling();

        // تحديث المقاييس
        this.updateMetrics();

        // إعادة تعيين معلومات renderer
        this.renderer.info.reset();
    }

    /**
     * الحصول على مقاييس الأداء الحالية
     */
    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * تحديث إعدادات التحسين
     */
    public updateSettings(newSettings: Partial<OptimizationSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * الحصول على إعدادات التحسين الحالية
     */
    public getSettings(): OptimizationSettings {
        return { ...this.settings };
    }

    /**
     * الحصول على العناصر المرئية
     */
    public getVisibleObjects(): THREE.Object3D[] {
        return Array.from(this.visibleObjects);
    }

    /**
     * الحصول على العناصر المخفية
     */
    public getCulledObjects(): THREE.Object3D[] {
        return Array.from(this.culledObjects);
    }

    /**
     * إعادة تعيين جميع العناصر لتكون مرئية
     */
    public resetVisibility(): void {
        this.scene.traverse((object) => {
            if (object.type === 'Mesh' || object.type === 'InstancedMesh') {
                object.visible = true;
            }
        });

        this.visibleObjects.clear();
        this.culledObjects.clear();
    }

    /**
     * تنظيف الموارد
     */
    public dispose(): void {
        this.visibleObjects.clear();
        this.culledObjects.clear();
    }
}