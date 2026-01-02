/**
 * خدمة تحسين الشبكات والنسيج
 * تتضمن Texture Atlasing وMesh Batching وInstancing
 */

import * as THREE from 'three';

export interface TextureAtlas {
    texture: THREE.Texture;
    uvMappings: Map<string, THREE.Vector4>; // x, y, width, height في الأطلس
    size: number;
}

export interface BatchedMesh {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    instances: THREE.Object3D[];
    count: number;
}

export interface OptimizationStats {
    originalDrawCalls: number;
    optimizedDrawCalls: number;
    originalVertices: number;
    optimizedVertices: number;
    textureMemorySaved: number;
    batchedMeshes: number;
    instancedObjects: number;
}

export class MeshOptimizer {
    private scene: THREE.Scene;
    private textureAtlases: Map<string, TextureAtlas>;
    private batchedMeshes: Map<string, BatchedMesh>;
    private instancedMeshes: Map<string, THREE.InstancedMesh>;
    private originalObjects: Map<string, THREE.Object3D>;
    private stats: OptimizationStats;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.textureAtlases = new Map();
        this.batchedMeshes = new Map();
        this.instancedMeshes = new Map();
        this.originalObjects = new Map();

        this.stats = {
            originalDrawCalls: 0,
            optimizedDrawCalls: 0,
            originalVertices: 0,
            optimizedVertices: 0,
            textureMemorySaved: 0,
            batchedMeshes: 0,
            instancedObjects: 0
        };
    }

    /**
     * إنشاء Texture Atlas من مجموعة من النسيج
     */
    public createTextureAtlas(
        textures: THREE.Texture[],
        atlasSize: number = 2048
    ): TextureAtlas {
        const canvas = document.createElement('canvas');
        canvas.width = atlasSize;
        canvas.height = atlasSize;
        const ctx = canvas.getContext('2d')!;

        const uvMappings = new Map<string, THREE.Vector4>();
        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;

        // ترتيب النسيج حسب الحجم (الأكبر أولاً)
        const sortedTextures = textures.sort((a, b) => {
            const aSize = (a.image?.width || 0) * (a.image?.height || 0);
            const bSize = (b.image?.width || 0) * (b.image?.height || 0);
            return bSize - aSize;
        });

        for (const texture of sortedTextures) {
            if (!texture.image) continue;

            const width = texture.image.width;
            const height = texture.image.height;

            // التحقق من وجود مساحة في الصف الحالي
            if (currentX + width > atlasSize) {
                currentX = 0;
                currentY += rowHeight;
                rowHeight = 0;
            }

            // التحقق من وجود مساحة في الأطلس
            if (currentY + height > atlasSize) {
                console.warn('Texture atlas is full, some textures may not be included');
                break;
            }

            // رسم النسيج في الأطلس
            ctx.drawImage(texture.image, currentX, currentY, width, height);

            // حفظ UV mapping
            const u = currentX / atlasSize;
            const v = currentY / atlasSize;
            const w = width / atlasSize;
            const h = height / atlasSize;

            uvMappings.set(texture.uuid, new THREE.Vector4(u, v, w, h));

            currentX += width;
            rowHeight = Math.max(rowHeight, height);
        }

        // إنشاء نسيج الأطلس
        const atlasTexture = new THREE.CanvasTexture(canvas);
        atlasTexture.flipY = false;
        atlasTexture.generateMipmaps = true;
        atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
        atlasTexture.magFilter = THREE.LinearFilter;

        return {
            texture: atlasTexture,
            uvMappings,
            size: atlasSize
        };
    }

    /**
     * تطبيق UV mapping الجديد للهندسة
     */
    private updateGeometryUVs(
        geometry: THREE.BufferGeometry,
        uvMapping: THREE.Vector4
    ): THREE.BufferGeometry {
        const newGeometry = geometry.clone();
        const uvAttribute = newGeometry.getAttribute('uv') as THREE.BufferAttribute;

        if (uvAttribute) {
            const uvArray = uvAttribute.array as Float32Array;

            for (let i = 0; i < uvArray.length; i += 2) {
                // تحويل UV coordinates إلى مساحة الأطلس
                uvArray[i] = uvMapping.x + uvArray[i] * uvMapping.z;
                uvArray[i + 1] = uvMapping.y + uvArray[i + 1] * uvMapping.w;
            }

            uvAttribute.needsUpdate = true;
        }

        return newGeometry;
    }

    /**
     * دمج الشبكات المتشابهة (Mesh Batching)
     */
    public batchSimilarMeshes(): void {
        const meshGroups = new Map<string, THREE.Mesh[]>();

        // تجميع الشبكات حسب الهندسة والمادة
        this.scene.traverse((object) => {
            if (object.type === 'Mesh') {
                const mesh = object as THREE.Mesh;
                const geometryId = mesh.geometry.uuid;
                const materialId = mesh.material instanceof Array
                    ? mesh.material.map(m => m.uuid).join(',')
                    : (mesh.material as THREE.Material).uuid;

                const groupKey = `${geometryId}_${materialId}`;

                if (!meshGroups.has(groupKey)) {
                    meshGroups.set(groupKey, []);
                }
                meshGroups.get(groupKey)!.push(mesh);
            }
        });

        // دمج المجموعات التي تحتوي على أكثر من شبكة واحدة
        for (const [groupKey, meshes] of meshGroups) {
            if (meshes.length > 1) {
                this.createBatchedMesh(groupKey, meshes);
            }
        }
    }

    /**
     * إنشاء شبكة مدمجة من مجموعة شبكات
     */
    private createBatchedMesh(groupKey: string, meshes: THREE.Mesh[]): void {
        const firstMesh = meshes[0];
        const geometries: THREE.BufferGeometry[] = [];
        const matrices: THREE.Matrix4[] = [];

        // جمع الهندسات والمصفوفات
        for (const mesh of meshes) {
            const geometry = mesh.geometry.clone();
            geometry.applyMatrix4(mesh.matrixWorld);
            geometries.push(geometry);
            matrices.push(mesh.matrixWorld.clone());

            // حفظ المرجع الأصلي
            this.originalObjects.set(mesh.uuid, mesh);

            // إخفاء الشبكة الأصلية
            mesh.visible = false;
        }

        // دمج الهندسات
        const mergedGeometry = this.mergeGeometries(geometries);

        // إنشاء الشبكة المدمجة
        const batchedMesh: BatchedMesh = {
            geometry: mergedGeometry,
            material: firstMesh.material,
            instances: meshes,
            count: meshes.length
        };

        // إنشاء mesh جديد
        const newMesh = new THREE.Mesh(mergedGeometry, firstMesh.material);
        newMesh.name = `Batched_${groupKey}`;

        this.scene.add(newMesh);
        this.batchedMeshes.set(groupKey, batchedMesh);

        this.stats.batchedMeshes++;
    }

    /**
     * دمج مجموعة من الهندسات
     */
    private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
        const mergedGeometry = new THREE.BufferGeometry();

        // حساب العدد الإجمالي للنقاط والمؤشرات
        let totalVertices = 0;
        let totalIndices = 0;

        for (const geometry of geometries) {
            const positionAttribute = geometry.getAttribute('position');
            totalVertices += positionAttribute.count;

            if (geometry.index) {
                totalIndices += geometry.index.count;
            } else {
                totalIndices += positionAttribute.count;
            }
        }

        // إنشاء مصفوفات مدمجة
        const positions = new Float32Array(totalVertices * 3);
        const normals = new Float32Array(totalVertices * 3);
        const uvs = new Float32Array(totalVertices * 2);
        const indices = new Uint32Array(totalIndices);

        let vertexOffset = 0;
        let indexOffset = 0;
        let currentVertexIndex = 0;

        // دمج البيانات
        for (const geometry of geometries) {
            const positionAttr = geometry.getAttribute('position');
            const normalAttr = geometry.getAttribute('normal');
            const uvAttr = geometry.getAttribute('uv');

            // نسخ المواضع
            positions.set(positionAttr.array as Float32Array, vertexOffset * 3);

            // نسخ النورمالز
            if (normalAttr) {
                normals.set(normalAttr.array as Float32Array, vertexOffset * 3);
            }

            // نسخ UV coordinates
            if (uvAttr) {
                uvs.set(uvAttr.array as Float32Array, vertexOffset * 2);
            }

            // نسخ المؤشرات
            if (geometry.index) {
                const indexArray = geometry.index.array;
                for (let i = 0; i < indexArray.length; i++) {
                    indices[indexOffset + i] = indexArray[i] + currentVertexIndex;
                }
                indexOffset += indexArray.length;
            } else {
                // إنشاء مؤشرات للهندسة غير المفهرسة
                for (let i = 0; i < positionAttr.count; i++) {
                    indices[indexOffset + i] = currentVertexIndex + i;
                }
                indexOffset += positionAttr.count;
            }

            currentVertexIndex += positionAttr.count;
            vertexOffset += positionAttr.count;
        }

        // تعيين الخصائص للهندسة المدمجة
        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1));

        return mergedGeometry;
    }

    /**
     * إنشاء Instanced Meshes للعناصر المتكررة
     */
    public createInstancedMeshes(): void {
        const instanceGroups = new Map<string, THREE.Mesh[]>();

        // تجميع الشبكات المتطابقة
        this.scene.traverse((object) => {
            if (object.type === 'Mesh') {
                const mesh = object as THREE.Mesh;
                const key = `${mesh.geometry.uuid}_${(mesh.material as THREE.Material).uuid}`;

                if (!instanceGroups.has(key)) {
                    instanceGroups.set(key, []);
                }
                instanceGroups.get(key)!.push(mesh);
            }
        });

        // إنشاء instanced meshes للمجموعات الكبيرة
        for (const [key, meshes] of instanceGroups) {
            if (meshes.length >= 3) { // الحد الأدنى للـ instancing
                this.createInstancedMesh(key, meshes);
            }
        }
    }

    /**
     * إنشاء InstancedMesh من مجموعة شبكات
     */
    private createInstancedMesh(key: string, meshes: THREE.Mesh[]): void {
        const firstMesh = meshes[0];
        const instancedMesh = new THREE.InstancedMesh(
            firstMesh.geometry,
            firstMesh.material,
            meshes.length
        );

        // تعيين مصفوفات التحويل لكل instance
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < meshes.length; i++) {
            matrix.copy(meshes[i].matrixWorld);
            instancedMesh.setMatrixAt(i, matrix);

            // حفظ المرجع الأصلي
            this.originalObjects.set(meshes[i].uuid, meshes[i]);

            // إخفاء الشبكة الأصلية
            meshes[i].visible = false;
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.name = `Instanced_${key}`;

        this.scene.add(instancedMesh);
        this.instancedMeshes.set(key, instancedMesh);

        this.stats.instancedObjects += meshes.length;
    }

    /**
     * تطبيق جميع التحسينات
     */
    public optimizeAll(): OptimizationStats {
        // حساب الإحصائيات الأصلية
        this.calculateOriginalStats();

        // تطبيق التحسينات
        this.batchSimilarMeshes();
        this.createInstancedMeshes();

        // حساب الإحصائيات المحسنة
        this.calculateOptimizedStats();

        return this.getStats();
    }

    /**
     * حساب الإحصائيات الأصلية
     */
    private calculateOriginalStats(): void {
        let drawCalls = 0;
        let vertices = 0;

        this.scene.traverse((object) => {
            if (object.type === 'Mesh' && object.visible) {
                const mesh = object as THREE.Mesh;
                drawCalls++;

                const positionAttribute = mesh.geometry.getAttribute('position');
                if (positionAttribute) {
                    vertices += positionAttribute.count;
                }
            }
        });

        this.stats.originalDrawCalls = drawCalls;
        this.stats.originalVertices = vertices;
    }

    /**
     * حساب الإحصائيات المحسنة
     */
    private calculateOptimizedStats(): void {
        let drawCalls = 0;
        let vertices = 0;

        this.scene.traverse((object) => {
            if ((object.type === 'Mesh' || object.type === 'InstancedMesh') && object.visible) {
                drawCalls++;

                const mesh = object as THREE.Mesh;
                const positionAttribute = mesh.geometry.getAttribute('position');
                if (positionAttribute) {
                    vertices += positionAttribute.count;
                }
            }
        });

        this.stats.optimizedDrawCalls = drawCalls;
        this.stats.optimizedVertices = vertices;
    }

    /**
     * استعادة الشبكات الأصلية
     */
    public restoreOriginalMeshes(): void {
        // إزالة الشبكات المحسنة
        for (const [key, batchedMesh] of this.batchedMeshes) {
            const meshToRemove = this.scene.getObjectByName(`Batched_${key}`);
            if (meshToRemove) {
                this.scene.remove(meshToRemove);
            }

            // استعادة الشبكات الأصلية
            for (const originalMesh of batchedMesh.instances) {
                originalMesh.visible = true;
            }
        }

        // إزالة الـ instanced meshes
        for (const [key, instancedMesh] of this.instancedMeshes) {
            this.scene.remove(instancedMesh);
        }

        // استعادة جميع العناصر الأصلية
        for (const [uuid, originalObject] of this.originalObjects) {
            originalObject.visible = true;
        }

        // مسح البيانات
        this.batchedMeshes.clear();
        this.instancedMeshes.clear();
        this.originalObjects.clear();

        // إعادة تعيين الإحصائيات
        this.stats = {
            originalDrawCalls: 0,
            optimizedDrawCalls: 0,
            originalVertices: 0,
            optimizedVertices: 0,
            textureMemorySaved: 0,
            batchedMeshes: 0,
            instancedObjects: 0
        };
    }

    /**
     * الحصول على إحصائيات التحسين
     */
    public getStats(): OptimizationStats {
        return { ...this.stats };
    }

    /**
     * تنظيف الموارد
     */
    public dispose(): void {
        this.restoreOriginalMeshes();

        // تنظيف texture atlases
        for (const atlas of this.textureAtlases.values()) {
            atlas.texture.dispose();
        }
        this.textureAtlases.clear();
    }
}