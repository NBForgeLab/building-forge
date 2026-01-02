/**
 * نظام تحسين التصدير للألعاب مع خوارزميات متقدمة
 */

import * as THREE from 'three'

export interface OptimizationOptions {
    quality: 'high' | 'medium' | 'low'
    polyReduction: number // نسبة تقليل المضلعات (0-1)
    textureAtlasing: boolean
    meshMerging: boolean
    vertexWelding: boolean
    normalOptimization: boolean
    uvOptimization: boolean
    removeUnusedVertices: boolean
    generateTangents: boolean
}

export interface OptimizationResult {
    success: boolean
    originalStats: MeshStats
    optimizedStats: MeshStats
    optimizations: OptimizationReport[]
    error?: string
}

export interface MeshStats {
    vertices: number
    triangles: number
    materials: number
    textures: number
    drawCalls: number
    memoryUsage: number // بالبايت
}

export interface OptimizationReport {
    type: string
    description: string
    before: number
    after: number
    improvement: number // نسبة التحسن
}

export interface TextureAtlas {
    canvas: HTMLCanvasElement
    mapping: Map<string, TextureRegion>
    size: number
}

export interface TextureRegion {
    x: number
    y: number
    width: number
    height: number
    originalTexture: THREE.Texture
}

export interface LODConfiguration {
    levels: LODLevel[]
    autoGenerate: boolean
    distanceMultiplier: number
}

export interface LODLevel {
    distance: number
    polyReduction: number
    textureScale: number
}

export class ExportOptimizer {
    private scene: THREE.Scene
    private originalMeshes: THREE.Mesh[]
    private optimizedMeshes: THREE.Mesh[]
    private textureAtlases: Map<string, TextureAtlas>

    constructor() {
        this.scene = new THREE.Scene()
        this.originalMeshes = []
        this.optimizedMeshes = []
        this.textureAtlases = new Map()
    }

    /**
     * تحسين مشهد للتصدير
     */
    async optimizeScene(
        scene: THREE.Scene,
        options: Partial<OptimizationOptions> = {}
    ): Promise<OptimizationResult> {
        try {
            const optimizationOptions: OptimizationOptions = {
                quality: 'medium',
                polyReduction: 0.3,
                textureAtlasing: true,
                meshMerging: true,
                vertexWelding: true,
                normalOptimization: true,
                uvOptimization: true,
                removeUnusedVertices: true,
                generateTangents: false,
                ...options
            }

            // حفظ المشهد الأصلي
            this.scene = scene.clone()
            this.collectMeshes()

            // حساب الإحصائيات الأصلية
            const originalStats = this.calculateMeshStats(this.originalMeshes)

            const optimizations: OptimizationReport[] = []

            // تطبيق التحسينات المختلفة
            if (optimizationOptions.removeUnusedVertices) {
                const report = await this.removeUnusedVertices()
                optimizations.push(report)
            }

            if (optimizationOptions.vertexWelding) {
                const report = await this.weldVertices()
                optimizations.push(report)
            }

            if (optimizationOptions.polyReduction > 0) {
                const report = await this.reducePolygons(optimizationOptions.polyReduction)
                optimizations.push(report)
            }

            if (optimizationOptions.normalOptimization) {
                const report = await this.optimizeNormals()
                optimizations.push(report)
            }

            if (optimizationOptions.uvOptimization) {
                const report = await this.optimizeUVs()
                optimizations.push(report)
            }

            if (optimizationOptions.textureAtlasing) {
                const report = await this.createTextureAtlases(optimizationOptions)
                optimizations.push(report)
            }

            if (optimizationOptions.meshMerging) {
                const report = await this.mergeMeshes()
                optimizations.push(report)
            }

            if (optimizationOptions.generateTangents) {
                const report = await this.generateTangents()
                optimizations.push(report)
            }

            // حساب الإحصائيات المحسنة
            const optimizedStats = this.calculateMeshStats(this.optimizedMeshes)

            return {
                success: true,
                originalStats,
                optimizedStats,
                optimizations
            }

        } catch (error) {
            return {
                success: false,
                originalStats: this.createEmptyStats(),
                optimizedStats: this.createEmptyStats(),
                optimizations: [],
                error: `خطأ في التحسين: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
            }
        }
    }

    /**
     * جمع جميع الشبكات من المشهد
     */
    private collectMeshes(): void {
        this.originalMeshes = []
        this.optimizedMeshes = []

        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                this.originalMeshes.push(object)
                this.optimizedMeshes.push(object.clone())
            }
        })
    }

    /**
     * إزالة الرؤوس غير المستخدمة
     */
    private async removeUnusedVertices(): Promise<OptimizationReport> {
        let totalVerticesRemoved = 0
        let totalVerticesBefore = 0

        for (const mesh of this.optimizedMeshes) {
            const geometry = mesh.geometry as THREE.BufferGeometry
            const verticesBefore = geometry.attributes.position.count
            totalVerticesBefore += verticesBefore

            // إنشاء مصفوفة لتتبع الرؤوس المستخدمة
            const usedVertices = new Set<number>()

            if (geometry.index) {
                // هندسة مفهرسة
                const indices = geometry.index.array
                for (let i = 0; i < indices.length; i++) {
                    usedVertices.add(indices[i])
                }

                // إنشاء مصفوفات جديدة للرؤوس المستخدمة فقط
                const newPositions = []
                const newNormals = []
                const newUVs = []
                const vertexMap = new Map<number, number>()

                let newIndex = 0
                for (const oldIndex of Array.from(usedVertices).sort((a, b) => a - b)) {
                    vertexMap.set(oldIndex, newIndex)

                    // نسخ الموضع
                    const pos = geometry.attributes.position
                    newPositions.push(pos.getX(oldIndex), pos.getY(oldIndex), pos.getZ(oldIndex))

                    // نسخ النورمال إذا كان موجوداً
                    if (geometry.attributes.normal) {
                        const norm = geometry.attributes.normal
                        newNormals.push(norm.getX(oldIndex), norm.getY(oldIndex), norm.getZ(oldIndex))
                    }

                    // نسخ UV إذا كان موجوداً
                    if (geometry.attributes.uv) {
                        const uv = geometry.attributes.uv
                        newUVs.push(uv.getX(oldIndex), uv.getY(oldIndex))
                    }

                    newIndex++
                }

                // تحديث الفهارس
                const newIndices = []
                for (let i = 0; i < indices.length; i++) {
                    newIndices.push(vertexMap.get(indices[i])!)
                }

                // تطبيق البيانات الجديدة
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3))
                if (newNormals.length > 0) {
                    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3))
                }
                if (newUVs.length > 0) {
                    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2))
                }
                geometry.setIndex(newIndices)
            }

            const verticesAfter = geometry.attributes.position.count
            totalVerticesRemoved += verticesBefore - verticesAfter
        }

        return {
            type: 'removeUnusedVertices',
            description: 'إزالة الرؤوس غير المستخدمة',
            before: totalVerticesBefore,
            after: totalVerticesBefore - totalVerticesRemoved,
            improvement: totalVerticesRemoved / totalVerticesBefore * 100
        }
    }

    /**
     * دمج الرؤوس المتطابقة
     */
    private async weldVertices(): Promise<OptimizationReport> {
        let totalVerticesWelded = 0
        let totalVerticesBefore = 0

        for (const mesh of this.optimizedMeshes) {
            const geometry = mesh.geometry as THREE.BufferGeometry
            const verticesBefore = geometry.attributes.position.count
            totalVerticesBefore += verticesBefore

            // دمج الرؤوس المتطابقة
            geometry.mergeVertices()

            const verticesAfter = geometry.attributes.position.count
            totalVerticesWelded += verticesBefore - verticesAfter
        }

        return {
            type: 'weldVertices',
            description: 'دمج الرؤوس المتطابقة',
            before: totalVerticesBefore,
            after: totalVerticesBefore - totalVerticesWelded,
            improvement: totalVerticesWelded / totalVerticesBefore * 100
        }
    }

    /**
     * تقليل عدد المضلعات
     */
    private async reducePolygons(reductionRatio: number): Promise<OptimizationReport> {
        let totalTrianglesBefore = 0
        let totalTrianglesAfter = 0

        for (const mesh of this.optimizedMeshes) {
            const geometry = mesh.geometry as THREE.BufferGeometry

            const trianglesBefore = geometry.index ?
                geometry.index.count / 3 :
                geometry.attributes.position.count / 3

            totalTrianglesBefore += trianglesBefore

            // تطبيق تبسيط الهندسة
            const simplifiedGeometry = this.simplifyGeometry(geometry, reductionRatio)
            mesh.geometry = simplifiedGeometry

            const trianglesAfter = simplifiedGeometry.index ?
                simplifiedGeometry.index.count / 3 :
                simplifiedGeometry.attributes.position.count / 3

            totalTrianglesAfter += trianglesAfter
        }

        return {
            type: 'reducePolygons',
            description: 'تقليل عدد المضلعات',
            before: totalTrianglesBefore,
            after: totalTrianglesAfter,
            improvement: (totalTrianglesBefore - totalTrianglesAfter) / totalTrianglesBefore * 100
        }
    }

    /**
     * تبسيط الهندسة (تنفيذ بسيط)
     */
    private simplifyGeometry(geometry: THREE.BufferGeometry, reductionRatio: number): THREE.BufferGeometry {
        // تنفيذ بسيط - يمكن تحسينه باستخدام خوارزميات متقدمة مثل Quadric Error Metrics
        const simplified = geometry.clone()

        if (simplified.index && reductionRatio > 0) {
            const originalCount = simplified.index.count
            const targetCount = Math.floor(originalCount * (1 - reductionRatio))

            // تبسيط بسيط عن طريق إزالة مثلثات عشوائية
            // في التطبيق الحقيقي، يجب استخدام خوارزمية أكثر تطوراً
            const newIndices = []
            const step = Math.floor(originalCount / targetCount)

            for (let i = 0; i < originalCount; i += step * 3) {
                if (i + 2 < originalCount) {
                    newIndices.push(
                        simplified.index.getX(i),
                        simplified.index.getX(i + 1),
                        simplified.index.getX(i + 2)
                    )
                }
            }

            simplified.setIndex(newIndices)
        }

        return simplified
    }

    /**
     * تحسين النورمال
     */
    private async optimizeNormals(): Promise<OptimizationReport> {
        let optimizedCount = 0

        for (const mesh of this.optimizedMeshes) {
            const geometry = mesh.geometry as THREE.BufferGeometry

            // إعادة حساب النورمال للحصول على نتائج أفضل
            geometry.deleteAttribute('normal')
            geometry.computeVertexNormals()

            optimizedCount++
        }

        return {
            type: 'optimizeNormals',
            description: 'تحسين النورمال',
            before: this.optimizedMeshes.length,
            after: optimizedCount,
            improvement: 100
        }
    }

    /**
     * تحسين إحداثيات UV
     */
    private async optimizeUVs(): Promise<OptimizationReport> {
        let optimizedCount = 0

        for (const mesh of this.optimizedMeshes) {
            const geometry = mesh.geometry as THREE.BufferGeometry

            if (geometry.attributes.uv) {
                // تحسين UV mapping - تنفيذ بسيط
                const uvs = geometry.attributes.uv.array

                // تطبيع قيم UV للتأكد من أنها في النطاق الصحيح
                for (let i = 0; i < uvs.length; i += 2) {
                    uvs[i] = Math.max(0, Math.min(1, uvs[i]))     // U
                    uvs[i + 1] = Math.max(0, Math.min(1, uvs[i + 1])) // V
                }

                geometry.attributes.uv.needsUpdate = true
                optimizedCount++
            }
        }

        return {
            type: 'optimizeUVs',
            description: 'تحسين إحداثيات UV',
            before: this.optimizedMeshes.length,
            after: optimizedCount,
            improvement: optimizedCount / this.optimizedMeshes.length * 100
        }
    }

    /**
     * إنشاء texture atlases
     */
    private async createTextureAtlases(options: OptimizationOptions): Promise<OptimizationReport> {
        const texturesBefore = this.countUniqueTextures()

        // جمع جميع النسيج المستخدمة
        const textures = this.collectTextures()

        if (textures.length <= 1) {
            return {
                type: 'textureAtlasing',
                description: 'إنشاء texture atlases',
                before: texturesBefore,
                after: texturesBefore,
                improvement: 0
            }
        }

        // إنشاء atlas
        const atlas = await this.createAtlas(textures, options)

        if (atlas) {
            // تطبيق الـ atlas على الشبكات
            await this.applyAtlasToMeshes(atlas)

            return {
                type: 'textureAtlasing',
                description: 'إنشاء texture atlases',
                before: texturesBefore,
                after: 1,
                improvement: (texturesBefore - 1) / texturesBefore * 100
            }
        }

        return {
            type: 'textureAtlasing',
            description: 'إنشاء texture atlases',
            before: texturesBefore,
            after: texturesBefore,
            improvement: 0
        }
    }

    /**
     * عد النسيج الفريدة
     */
    private countUniqueTextures(): number {
        const uniqueTextures = new Set<string>()

        for (const mesh of this.optimizedMeshes) {
            if (mesh.material instanceof THREE.Material) {
                this.extractTexturesFromMaterial(mesh.material, uniqueTextures)
            }
        }

        return uniqueTextures.size
    }

    /**
     * استخراج النسيج من المادة
     */
    private extractTexturesFromMaterial(material: THREE.Material, textureSet: Set<string>): void {
        if (material instanceof THREE.MeshStandardMaterial) {
            if (material.map) textureSet.add(material.map.uuid)
            if (material.normalMap) textureSet.add(material.normalMap.uuid)
            if (material.roughnessMap) textureSet.add(material.roughnessMap.uuid)
            if (material.metalnessMap) textureSet.add(material.metalnessMap.uuid)
        } else if (material instanceof THREE.MeshBasicMaterial) {
            if (material.map) textureSet.add(material.map.uuid)
        }
    }

    /**
     * جمع جميع النسيج
     */
    private collectTextures(): THREE.Texture[] {
        const textures: THREE.Texture[] = []
        const textureSet = new Set<string>()

        for (const mesh of this.optimizedMeshes) {
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
                if (mesh.material.map && !textureSet.has(mesh.material.map.uuid)) {
                    textures.push(mesh.material.map)
                    textureSet.add(mesh.material.map.uuid)
                }
            }
        }

        return textures
    }

    /**
     * إنشاء texture atlas
     */
    private async createAtlas(textures: THREE.Texture[], options: OptimizationOptions): Promise<TextureAtlas | null> {
        if (textures.length === 0) return null

        // حساب حجم الـ atlas المطلوب
        const atlasSize = this.calculateAtlasSize(textures)

        // إنشاء canvas للـ atlas
        const canvas = document.createElement('canvas')
        canvas.width = atlasSize
        canvas.height = atlasSize
        const ctx = canvas.getContext('2d')

        if (!ctx) return null

        const mapping = new Map<string, TextureRegion>()
        let currentX = 0
        let currentY = 0
        let rowHeight = 0

        // ترتيب النسيج في الـ atlas
        for (const texture of textures) {
            if (!texture.image) continue

            const width = texture.image.width
            const height = texture.image.height

            // التحقق من المساحة المتاحة
            if (currentX + width > atlasSize) {
                currentX = 0
                currentY += rowHeight
                rowHeight = 0
            }

            if (currentY + height > atlasSize) {
                console.warn('النسيج لا يمكن أن تتسع في الـ atlas')
                break
            }

            // رسم النسيج في الـ atlas
            ctx.drawImage(texture.image, currentX, currentY, width, height)

            // حفظ معلومات المنطقة
            mapping.set(texture.uuid, {
                x: currentX,
                y: currentY,
                width,
                height,
                originalTexture: texture
            })

            currentX += width
            rowHeight = Math.max(rowHeight, height)
        }

        return {
            canvas,
            mapping,
            size: atlasSize
        }
    }

    /**
     * حساب حجم الـ atlas المطلوب
     */
    private calculateAtlasSize(textures: THREE.Texture[]): number {
        let totalArea = 0

        for (const texture of textures) {
            if (texture.image) {
                totalArea += texture.image.width * texture.image.height
            }
        }

        // حساب الحجم المربع المطلوب مع هامش أمان
        const sideLength = Math.ceil(Math.sqrt(totalArea * 1.2))

        // تقريب إلى أقرب قوة للعدد 2
        return Math.pow(2, Math.ceil(Math.log2(sideLength)))
    }

    /**
     * تطبيق الـ atlas على الشبكات
     */
    private async applyAtlasToMeshes(atlas: TextureAtlas): Promise<void> {
        // إنشاء نسيج جديد من الـ atlas
        const atlasTexture = new THREE.CanvasTexture(atlas.canvas)
        atlasTexture.flipY = false

        for (const mesh of this.optimizedMeshes) {
            if (mesh.material instanceof THREE.MeshStandardMaterial && mesh.material.map) {
                const region = atlas.mapping.get(mesh.material.map.uuid)

                if (region) {
                    // تحديث UV coordinates للإشارة إلى المنطقة الصحيحة في الـ atlas
                    this.updateUVsForAtlas(mesh.geometry as THREE.BufferGeometry, region, atlas.size)

                    // استبدال النسيج بالـ atlas
                    mesh.material.map = atlasTexture
                }
            }
        }
    }

    /**
     * تحديث UV coordinates للـ atlas
     */
    private updateUVsForAtlas(geometry: THREE.BufferGeometry, region: TextureRegion, atlasSize: number): void {
        if (!geometry.attributes.uv) return

        const uvs = geometry.attributes.uv.array
        const scaleX = region.width / atlasSize
        const scaleY = region.height / atlasSize
        const offsetX = region.x / atlasSize
        const offsetY = region.y / atlasSize

        for (let i = 0; i < uvs.length; i += 2) {
            uvs[i] = uvs[i] * scaleX + offsetX         // U
            uvs[i + 1] = uvs[i + 1] * scaleY + offsetY // V
        }

        geometry.attributes.uv.needsUpdate = true
    }

    /**
     * دمج الشبكات المتوافقة
     */
    private async mergeMeshes(): Promise<OptimizationReport> {
        const meshesBefore = this.optimizedMeshes.length
        const mergedMeshes: THREE.Mesh[] = []
        const processedMeshes = new Set<THREE.Mesh>()

        // تجميع الشبكات حسب المادة
        const materialGroups = new Map<string, THREE.Mesh[]>()

        for (const mesh of this.optimizedMeshes) {
            if (processedMeshes.has(mesh)) continue

            const materialKey = mesh.material instanceof THREE.Material ?
                mesh.material.uuid : 'default'

            if (!materialGroups.has(materialKey)) {
                materialGroups.set(materialKey, [])
            }
            materialGroups.get(materialKey)!.push(mesh)
        }

        // دمج الشبكات في كل مجموعة
        materialGroups.forEach((meshes, materialKey) => {
            if (meshes.length > 1) {
                const mergedMesh = this.mergeMeshGroup(meshes)
                if (mergedMesh) {
                    mergedMeshes.push(mergedMesh)
                    meshes.forEach(mesh => processedMeshes.add(mesh))
                }
            } else {
                mergedMeshes.push(meshes[0])
                processedMeshes.add(meshes[0])
            }
        })

        this.optimizedMeshes = mergedMeshes

        return {
            type: 'mergeMeshes',
            description: 'دمج الشبكات المتوافقة',
            before: meshesBefore,
            after: mergedMeshes.length,
            improvement: (meshesBefore - mergedMeshes.length) / meshesBefore * 100
        }
    }

    /**
     * دمج مجموعة من الشبكات
     */
    private mergeMeshGroup(meshes: THREE.Mesh[]): THREE.Mesh | null {
        if (meshes.length === 0) return null
        if (meshes.length === 1) return meshes[0]

        const geometries: THREE.BufferGeometry[] = []

        for (const mesh of meshes) {
            const geometry = mesh.geometry.clone() as THREE.BufferGeometry

            // تطبيق تحويلات الشبكة على الهندسة
            geometry.applyMatrix4(mesh.matrixWorld)

            geometries.push(geometry)
        }

        // دمج الهندسات
        const mergedGeometry = this.mergeGeometries(geometries)

        if (!mergedGeometry) return null

        // إنشاء شبكة جديدة مدمجة
        const mergedMesh = new THREE.Mesh(mergedGeometry, meshes[0].material)
        mergedMesh.name = `merged_${meshes.map(m => m.name).join('_')}`

        return mergedMesh
    }

    /**
     * دمج عدة هندسات
     */
    private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
        if (geometries.length === 0) return null
        if (geometries.length === 1) return geometries[0]

        // استخدام BufferGeometryUtils إذا كان متاحاً
        // في الوقت الحالي، تنفيذ بسيط
        const mergedGeometry = new THREE.BufferGeometry()

        let totalVertices = 0
        let totalIndices = 0

        // حساب الأحجام المطلوبة
        for (const geometry of geometries) {
            totalVertices += geometry.attributes.position.count
            if (geometry.index) {
                totalIndices += geometry.index.count
            } else {
                totalIndices += geometry.attributes.position.count
            }
        }

        // إنشاء مصفوفات مدمجة
        const positions = new Float32Array(totalVertices * 3)
        const normals = new Float32Array(totalVertices * 3)
        const uvs = new Float32Array(totalVertices * 2)
        const indices = new Uint32Array(totalIndices)

        let vertexOffset = 0
        let indexOffset = 0
        let currentVertexIndex = 0

        for (const geometry of geometries) {
            const positionAttr = geometry.attributes.position
            const normalAttr = geometry.attributes.normal
            const uvAttr = geometry.attributes.uv

            // نسخ المواضع
            positions.set(positionAttr.array, vertexOffset * 3)

            // نسخ النورمال إذا كان موجوداً
            if (normalAttr) {
                normals.set(normalAttr.array, vertexOffset * 3)
            }

            // نسخ UV إذا كان موجوداً
            if (uvAttr) {
                uvs.set(uvAttr.array, vertexOffset * 2)
            }

            // نسخ الفهارس
            if (geometry.index) {
                const geometryIndices = geometry.index.array
                for (let i = 0; i < geometryIndices.length; i++) {
                    indices[indexOffset + i] = geometryIndices[i] + currentVertexIndex
                }
                indexOffset += geometryIndices.length
            } else {
                // إنشاء فهارس للهندسة غير المفهرسة
                for (let i = 0; i < positionAttr.count; i++) {
                    indices[indexOffset + i] = currentVertexIndex + i
                }
                indexOffset += positionAttr.count
            }

            vertexOffset += positionAttr.count
            currentVertexIndex += positionAttr.count
        }

        // تطبيق البيانات المدمجة
        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
        mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1))

        return mergedGeometry
    }

    /**
     * إنتاج tangents للـ normal mapping
     */
    private async generateTangents(): Promise<OptimizationReport> {
        let generatedCount = 0

        for (const mesh of this.optimizedMeshes) {
            const geometry = mesh.geometry as THREE.BufferGeometry

            if (geometry.attributes.position && geometry.attributes.normal && geometry.attributes.uv) {
                // إنتاج tangents
                geometry.computeTangents()
                generatedCount++
            }
        }

        return {
            type: 'generateTangents',
            description: 'إنتاج tangents للـ normal mapping',
            before: this.optimizedMeshes.length,
            after: generatedCount,
            improvement: generatedCount / this.optimizedMeshes.length * 100
        }
    }

    /**
     * حساب إحصائيات الشبكات
     */
    private calculateMeshStats(meshes: THREE.Mesh[]): MeshStats {
        let vertices = 0
        let triangles = 0
        let materials = 0
        let textures = 0
        let drawCalls = meshes.length
        let memoryUsage = 0

        const uniqueMaterials = new Set<string>()
        const uniqueTextures = new Set<string>()

        for (const mesh of meshes) {
            const geometry = mesh.geometry as THREE.BufferGeometry

            // عد الرؤوس
            if (geometry.attributes.position) {
                vertices += geometry.attributes.position.count
            }

            // عد المثلثات
            if (geometry.index) {
                triangles += geometry.index.count / 3
            } else if (geometry.attributes.position) {
                triangles += geometry.attributes.position.count / 3
            }

            // عد المواد الفريدة
            if (mesh.material instanceof THREE.Material) {
                uniqueMaterials.add(mesh.material.uuid)
                this.extractTexturesFromMaterial(mesh.material, uniqueTextures)
            }

            // حساب استخدام الذاكرة التقريبي
            memoryUsage += this.estimateGeometryMemoryUsage(geometry)
        }

        materials = uniqueMaterials.size
        textures = uniqueTextures.size

        return {
            vertices,
            triangles,
            materials,
            textures,
            drawCalls,
            memoryUsage
        }
    }

    /**
     * تقدير استخدام الذاكرة للهندسة
     */
    private estimateGeometryMemoryUsage(geometry: THREE.BufferGeometry): number {
        let usage = 0

        // حساب حجم attributes
        Object.values(geometry.attributes).forEach(attribute => {
            usage += attribute.array.byteLength
        })

        // حساب حجم الفهارس
        if (geometry.index) {
            usage += geometry.index.array.byteLength
        }

        return usage
    }

    /**
     * إنشاء إحصائيات فارغة
     */
    private createEmptyStats(): MeshStats {
        return {
            vertices: 0,
            triangles: 0,
            materials: 0,
            textures: 0,
            drawCalls: 0,
            memoryUsage: 0
        }
    }

    /**
     * الحصول على المشهد المحسن
     */
    getOptimizedScene(): THREE.Scene {
        const optimizedScene = new THREE.Scene()

        for (const mesh of this.optimizedMeshes) {
            optimizedScene.add(mesh)
        }

        return optimizedScene
    }
}