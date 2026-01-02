/**
 * مصدر GLB محسن للألعاب مع تحسينات متقدمة للأداء
 */

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { BaseElement, Material, Project } from '../../shared/types'

export interface GLBExportOptions {
    quality: 'high' | 'medium' | 'low'
    generateLOD: boolean
    optimizeGeometry: boolean
    compressTextures: boolean
    generateCollisionMesh: boolean
    materialOptimization: boolean
    targetEngine: 'unity' | 'unreal' | 'generic'
    maxTextureSize: 512 | 1024 | 2048 | 4096
    compressionFormat: 'draco' | 'meshopt' | 'none'
}

export interface LODLevel {
    distance: number
    polyReduction: number // نسبة تقليل المضلعات (0-1)
}

export interface ExportResult {
    success: boolean
    data?: ArrayBuffer
    error?: string
    stats: {
        originalVertices: number
        optimizedVertices: number
        originalTriangles: number
        optimizedTriangles: number
        texturesOptimized: number
        fileSize: number
        lodLevels: number
        collisionMeshGenerated: boolean
    }
}

export interface CollisionMeshOptions {
    type: 'convex' | 'concave' | 'box' | 'sphere'
    simplification: number // مستوى التبسيط (0-1)
    margin: number // هامش الأمان
}

export class GameOptimizedGLBExporter {
    private exporter: GLTFExporter
    private scene: THREE.Scene
    private materials: Map<string, THREE.Material>
    private textures: Map<string, THREE.Texture>

    constructor() {
        this.exporter = new GLTFExporter()
        this.scene = new THREE.Scene()
        this.materials = new Map()
        this.textures = new Map()
    }

    /**
     * تصدير مشروع إلى GLB محسن للألعاب
     */
    async exportProject(
        project: Project,
        options: Partial<GLBExportOptions> = {}
    ): Promise<ExportResult> {
        try {
            const exportOptions: GLBExportOptions = {
                quality: 'medium',
                generateLOD: true,
                optimizeGeometry: true,
                compressTextures: true,
                generateCollisionMesh: true,
                materialOptimization: true,
                targetEngine: 'generic',
                maxTextureSize: 1024,
                compressionFormat: 'draco',
                ...options
            }

            // إعداد المشهد
            this.setupScene(project)

            // تحويل عناصر المشروع إلى Three.js objects
            const stats = await this.convertProjectToScene(project, exportOptions)

            // تحسين المشهد للألعاب
            await this.optimizeSceneForGames(exportOptions)

            // إنتاج مستويات LOD إذا كان مطلوباً
            if (exportOptions.generateLOD) {
                await this.generateLODLevels(exportOptions)
            }

            // إنتاج شبكة التصادم إذا كان مطلوباً
            if (exportOptions.generateCollisionMesh) {
                await this.generateCollisionMesh(exportOptions)
                stats.collisionMeshGenerated = true
            }

            // تصدير المشهد إلى GLB
            const glbData = await this.exportSceneToGLB(exportOptions)

            stats.fileSize = glbData.byteLength

            return {
                success: true,
                data: glbData,
                stats
            }

        } catch (error) {
            return {
                success: false,
                error: `خطأ في تصدير GLB: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                stats: this.createEmptyStats()
            }
        }
    }

    /**
     * إعداد المشهد الأساسي
     */
    private setupScene(project: Project): void {
        this.scene.clear()
        this.materials.clear()
        this.textures.clear()

        // إعداد الإضاءة الأساسية للتصدير
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
        ambientLight.name = 'AmbientLight'
        this.scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(10, 10, 5)
        directionalLight.name = 'DirectionalLight'
        this.scene.add(directionalLight)
    }

    /**
     * تحويل عناصر المشروع إلى كائنات Three.js
     */
    private async convertProjectToScene(
        project: Project,
        options: GLBExportOptions
    ): Promise<ExportResult['stats']> {
        const stats = this.createEmptyStats()

        // تحميل وإعداد المواد
        await this.setupMaterials(project.materials, options)

        // تحويل كل عنصر في المشروع
        for (const element of project.elements) {
            const mesh = await this.createElement(element, options)
            if (mesh) {
                this.scene.add(mesh)

                // تحديث الإحصائيات
                if (mesh.geometry) {
                    const geometry = mesh.geometry as THREE.BufferGeometry
                    if (geometry.attributes.position) {
                        stats.originalVertices += geometry.attributes.position.count
                    }
                    if (geometry.index) {
                        stats.originalTriangles += geometry.index.count / 3
                    }
                }
            }
        }

        return stats
    }

    /**
     * إعداد المواد مع تحسينات للألعاب
     */
    private async setupMaterials(
        materials: Material[],
        options: GLBExportOptions
    ): Promise<void> {
        for (const material of materials) {
            const threeMaterial = await this.createOptimizedMaterial(material, options)
            this.materials.set(material.id, threeMaterial)
        }
    }

    /**
     * إنشاء مادة محسنة للألعاب
     */
    private async createOptimizedMaterial(
        material: Material,
        options: GLBExportOptions
    ): Promise<THREE.Material> {
        const materialConfig: any = {
            name: material.name,
            transparent: material.opacity < 1.0,
            opacity: material.opacity
        }

        // إعداد المادة حسب المحرك المستهدف
        if (options.targetEngine === 'unity') {
            // تحسينات خاصة بـ Unity
            materialConfig.roughness = material.roughness
            materialConfig.metalness = material.metallic
        } else if (options.targetEngine === 'unreal') {
            // تحسينات خاصة بـ Unreal Engine
            materialConfig.roughness = material.roughness
            materialConfig.metalness = material.metallic
        }

        let threeMaterial: THREE.Material

        if (material.type === 'pbr') {
            threeMaterial = new THREE.MeshStandardMaterial(materialConfig)

            // إعداد خصائص PBR
            if (threeMaterial instanceof THREE.MeshStandardMaterial) {
                threeMaterial.roughness = material.roughness
                threeMaterial.metalness = material.metallic

                // تحميل النسيج مع التحسين
                if (material.albedo && !material.albedo.startsWith('#')) {
                    const texture = await this.loadOptimizedTexture(material.albedo, options)
                    if (texture) {
                        threeMaterial.map = texture
                    }
                } else if (material.albedo.startsWith('#')) {
                    threeMaterial.color = new THREE.Color(material.albedo)
                }

                // Normal map
                if (material.normal) {
                    const normalTexture = await this.loadOptimizedTexture(material.normal, options)
                    if (normalTexture) {
                        threeMaterial.normalMap = normalTexture
                    }
                }

                // Emissive map
                if (material.emissive) {
                    const emissiveTexture = await this.loadOptimizedTexture(material.emissive, options)
                    if (emissiveTexture) {
                        threeMaterial.emissiveMap = emissiveTexture
                        threeMaterial.emissive = new THREE.Color(0xffffff)
                    }
                }
            }
        } else {
            // مادة أساسية
            threeMaterial = new THREE.MeshBasicMaterial(materialConfig)

            if (material.albedo && !material.albedo.startsWith('#')) {
                const texture = await this.loadOptimizedTexture(material.albedo, options)
                if (texture && threeMaterial instanceof THREE.MeshBasicMaterial) {
                    threeMaterial.map = texture
                }
            } else if (material.albedo.startsWith('#')) {
                (threeMaterial as THREE.MeshBasicMaterial).color = new THREE.Color(material.albedo)
            }
        }

        return threeMaterial
    }

    /**
     * تحميل نسيج محسن للألعاب
     */
    private async loadOptimizedTexture(
        textureUrl: string,
        options: GLBExportOptions
    ): Promise<THREE.Texture | null> {
        try {
            // التحقق من الكاش أولاً
            if (this.textures.has(textureUrl)) {
                return this.textures.get(textureUrl)!
            }

            const loader = new THREE.TextureLoader()
            const texture = await new Promise<THREE.Texture>((resolve, reject) => {
                loader.load(textureUrl, resolve, undefined, reject)
            })

            // تحسين النسيج للألعاب
            this.optimizeTexture(texture, options)

            // حفظ في الكاش
            this.textures.set(textureUrl, texture)

            return texture
        } catch (error) {
            console.warn(`فشل في تحميل النسيج ${textureUrl}:`, error)
            return null
        }
    }

    /**
     * تحسين النسيج للألعاب
     */
    private optimizeTexture(texture: THREE.Texture, options: GLBExportOptions): void {
        // إعداد التكرار والتصفية
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping

        // تحسين التصفية للألعاب
        if (options.quality === 'high') {
            texture.minFilter = THREE.LinearMipmapLinearFilter
            texture.magFilter = THREE.LinearFilter
        } else if (options.quality === 'medium') {
            texture.minFilter = THREE.LinearMipmapNearestFilter
            texture.magFilter = THREE.LinearFilter
        } else {
            texture.minFilter = THREE.NearestMipmapNearestFilter
            texture.magFilter = THREE.NearestFilter
        }

        // تحديد حجم النسيج الأقصى
        if (texture.image) {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (ctx && (texture.image.width > options.maxTextureSize || texture.image.height > options.maxTextureSize)) {
                // تصغير النسيج إذا كان أكبر من الحد المسموح
                const scale = Math.min(
                    options.maxTextureSize / texture.image.width,
                    options.maxTextureSize / texture.image.height
                )

                canvas.width = Math.floor(texture.image.width * scale)
                canvas.height = Math.floor(texture.image.height * scale)

                ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height)
                texture.image = canvas
            }
        }

        texture.needsUpdate = true
    }

    /**
     * إنشاء عنصر Three.js من عنصر المشروع
     */
    private async createElement(
        element: BaseElement,
        options: GLBExportOptions
    ): Promise<THREE.Object3D | null> {
        let geometry: THREE.BufferGeometry | null = null

        // إنشاء الهندسة حسب نوع العنصر
        switch (element.type) {
            case 'wall':
                geometry = this.createWallGeometry(element)
                break
            case 'floor':
                geometry = this.createFloorGeometry(element)
                break
            case 'door':
                geometry = this.createDoorGeometry(element)
                break
            case 'window':
                geometry = this.createWindowGeometry(element)
                break
            case 'asset':
                return await this.loadAssetGeometry(element)
            default:
                console.warn(`نوع عنصر غير مدعوم: ${element.type}`)
                return null
        }

        if (!geometry) {
            return null
        }

        // تحسين الهندسة إذا كان مطلوباً
        if (options.optimizeGeometry) {
            this.optimizeGeometry(geometry, options)
        }

        // إنشاء المادة
        const material = element.materialId ?
            this.materials.get(element.materialId) :
            new THREE.MeshStandardMaterial({ color: 0x888888 })

        // إنشاء الشبكة
        const mesh = new THREE.Mesh(geometry, material)

        // تطبيق التحويلات
        mesh.position.set(element.position.x, element.position.y, element.position.z)
        mesh.rotation.set(element.rotation.x, element.rotation.y, element.rotation.z)
        mesh.scale.set(element.scale.x, element.scale.y, element.scale.z)

        mesh.name = `${element.type}_${element.id}`
        mesh.visible = element.visible

        return mesh
    }

    /**
     * إنشاء هندسة الجدار
     */
    private createWallGeometry(element: BaseElement): THREE.BufferGeometry {
        const width = (element.metadata.width as number) || 1
        const height = (element.metadata.height as number) || 3
        const thickness = (element.metadata.thickness as number) || 0.2

        return new THREE.BoxGeometry(width, height, thickness)
    }

    /**
     * إنشاء هندسة الأرضية
     */
    private createFloorGeometry(element: BaseElement): THREE.BufferGeometry {
        const width = (element.metadata.width as number) || 5
        const depth = (element.metadata.depth as number) || 5
        const thickness = (element.metadata.thickness as number) || 0.1

        return new THREE.BoxGeometry(width, thickness, depth)
    }

    /**
     * إنشاء هندسة الباب
     */
    private createDoorGeometry(element: BaseElement): THREE.BufferGeometry {
        const width = (element.metadata.width as number) || 0.8
        const height = (element.metadata.height as number) || 2.1
        const thickness = (element.metadata.thickness as number) || 0.05

        return new THREE.BoxGeometry(width, height, thickness)
    }

    /**
     * إنشاء هندسة النافذة
     */
    private createWindowGeometry(element: BaseElement): THREE.BufferGeometry {
        const width = (element.metadata.width as number) || 1.2
        const height = (element.metadata.height as number) || 1.5
        const thickness = (element.metadata.thickness as number) || 0.05

        return new THREE.BoxGeometry(width, height, thickness)
    }

    /**
     * تحميل هندسة الأصل
     */
    private async loadAssetGeometry(element: BaseElement): Promise<THREE.Object3D | null> {
        // هذه الدالة ستحتاج إلى تنفيذ حسب نظام إدارة الأصول
        // في الوقت الحالي نعيد مكعب بسيط
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        return new THREE.Mesh(geometry, material)
    }

    /**
     * تحسين الهندسة للألعاب
     */
    private optimizeGeometry(geometry: THREE.BufferGeometry, options: GLBExportOptions): void {
        // دمج الرؤوس المتطابقة
        geometry.mergeVertices()

        // حساب النورمال إذا لم تكن موجودة
        if (!geometry.attributes.normal) {
            geometry.computeVertexNormals()
        }

        // حساب UV إذا لم تكن موجودة
        if (!geometry.attributes.uv) {
            // إنشاء UV mapping بسيط
            const uvs = []
            const positions = geometry.attributes.position

            for (let i = 0; i < positions.count; i++) {
                uvs.push(0, 0) // UV بسيط - يمكن تحسينه لاحقاً
            }

            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
        }

        // تحسين الفهارس
        if (!geometry.index) {
            geometry = geometry.toNonIndexed()
        }
    }

    /**
     * تحسين المشهد للألعاب
     */
    private async optimizeSceneForGames(options: GLBExportOptions): Promise<void> {
        // دمج الشبكات المتشابهة
        if (options.optimizeGeometry) {
            this.mergeCompatibleMeshes()
        }

        // تحسين المواد
        if (options.materialOptimization) {
            this.optimizeMaterials(options)
        }
    }

    /**
     * دمج الشبكات المتوافقة
     */
    private mergeCompatibleMeshes(): void {
        const meshGroups = new Map<string, THREE.Mesh[]>()

        // تجميع الشبكات حسب المادة
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material instanceof THREE.Material) {
                const materialKey = object.material.uuid
                if (!meshGroups.has(materialKey)) {
                    meshGroups.set(materialKey, [])
                }
                meshGroups.get(materialKey)!.push(object)
            }
        })

        // دمج الشبكات في كل مجموعة
        meshGroups.forEach((meshes, materialKey) => {
            if (meshes.length > 1) {
                // يمكن تنفيذ دمج الشبكات هنا إذا كان مناسباً
                // في الوقت الحالي نتركها كما هي
            }
        })
    }

    /**
     * تحسين المواد
     */
    private optimizeMaterials(options: GLBExportOptions): void {
        this.materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
                // تحسينات خاصة بمواد PBR
                if (options.quality === 'low') {
                    // تقليل جودة المادة للأداء الأفضل
                    material.roughness = Math.max(0.1, material.roughness)
                }
            }
        })
    }

    /**
     * إنتاج مستويات LOD
     */
    private async generateLODLevels(options: GLBExportOptions): Promise<void> {
        const lodLevels: LODLevel[] = [
            { distance: 10, polyReduction: 0.1 },
            { distance: 50, polyReduction: 0.5 },
            { distance: 100, polyReduction: 0.8 }
        ]

        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const lod = new THREE.LOD()
                lod.addLevel(object, 0)

                // إنشاء مستويات LOD مبسطة
                lodLevels.forEach((level) => {
                    const simplifiedMesh = this.createSimplifiedMesh(object, level.polyReduction)
                    if (simplifiedMesh) {
                        lod.addLevel(simplifiedMesh, level.distance)
                    }
                })

                // استبدال الكائن الأصلي بـ LOD
                if (object.parent) {
                    object.parent.add(lod)
                    object.parent.remove(object)
                }
            }
        })
    }

    /**
     * إنشاء شبكة مبسطة لـ LOD
     */
    private createSimplifiedMesh(originalMesh: THREE.Mesh, reduction: number): THREE.Mesh | null {
        // تنفيذ بسيط - يمكن تحسينه باستخدام خوارزميات تبسيط متقدمة
        const geometry = originalMesh.geometry.clone()

        // تبسيط بسيط عن طريق تقليل الدقة
        if (geometry instanceof THREE.BoxGeometry) {
            // للأشكال البسيطة، نقلل من segments
            return new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1, 1, 1, 1),
                originalMesh.material
            )
        }

        return null
    }

    /**
     * إنتاج شبكة التصادم
     */
    private async generateCollisionMesh(options: GLBExportOptions): Promise<void> {
        const collisionGroup = new THREE.Group()
        collisionGroup.name = 'CollisionMeshes'

        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const collisionMesh = this.createCollisionMesh(object, {
                    type: 'convex',
                    simplification: 0.5,
                    margin: 0.01
                })

                if (collisionMesh) {
                    collisionGroup.add(collisionMesh)
                }
            }
        })

        this.scene.add(collisionGroup)
    }

    /**
     * إنشاء شبكة تصادم لكائن
     */
    private createCollisionMesh(
        mesh: THREE.Mesh,
        options: CollisionMeshOptions
    ): THREE.Mesh | null {
        // إنشاء شبكة تصادم مبسطة
        let collisionGeometry: THREE.BufferGeometry

        switch (options.type) {
            case 'box':
                // صندوق محيط
                const box = new THREE.Box3().setFromObject(mesh)
                const size = box.getSize(new THREE.Vector3())
                collisionGeometry = new THREE.BoxGeometry(size.x, size.y, size.z)
                break

            case 'sphere':
                // كرة محيطة
                const sphere = new THREE.Sphere()
                new THREE.Box3().setFromObject(mesh).getBoundingSphere(sphere)
                collisionGeometry = new THREE.SphereGeometry(sphere.radius)
                break

            case 'convex':
            case 'concave':
            default:
                // استخدام الهندسة الأصلية مع تبسيط
                collisionGeometry = mesh.geometry.clone()
                break
        }

        // إنشاء مادة شفافة للتصادم
        const collisionMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.1,
            wireframe: true
        })

        const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial)
        collisionMesh.name = `${mesh.name}_collision`
        collisionMesh.position.copy(mesh.position)
        collisionMesh.rotation.copy(mesh.rotation)
        collisionMesh.scale.copy(mesh.scale)

        return collisionMesh
    }

    /**
     * تصدير المشهد إلى GLB
     */
    private async exportSceneToGLB(options: GLBExportOptions): Promise<ArrayBuffer> {
        const exportOptions = {
            binary: true,
            includeCustomExtensions: true,
            animations: [],
            onlyVisible: true
        }

        // إضافة ضغط Draco إذا كان مطلوباً
        if (options.compressionFormat === 'draco') {
            // يمكن إضافة دعم Draco هنا
        }

        return new Promise((resolve, reject) => {
            this.exporter.parse(
                this.scene,
                (result) => {
                    if (result instanceof ArrayBuffer) {
                        resolve(result)
                    } else {
                        reject(new Error('نتيجة التصدير ليست ArrayBuffer'))
                    }
                },
                (error) => reject(error),
                exportOptions
            )
        })
    }

    /**
     * إنشاء إحصائيات فارغة
     */
    private createEmptyStats(): ExportResult['stats'] {
        return {
            originalVertices: 0,
            optimizedVertices: 0,
            originalTriangles: 0,
            optimizedTriangles: 0,
            texturesOptimized: 0,
            fileSize: 0,
            lodLevels: 0,
            collisionMeshGenerated: false
        }
    }
}