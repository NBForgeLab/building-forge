/**
 * مصدر OBJ للتوافق مع الأدوات القديمة مع دعم MTL
 */

import * as THREE from 'three'
import { BaseElement, Material, Project } from '../../shared/types'

export interface OBJExportOptions {
    includeMTL: boolean
    exportTextures: boolean
    textureFormat: 'original' | 'png' | 'jpg'
    meshOptimization: boolean
    groupByMaterial: boolean
    includeNormals: boolean
    includeUVs: boolean
    precision: number // عدد الأرقام العشرية
}

export interface OBJExportResult {
    success: boolean
    objData?: string
    mtlData?: string
    textures?: { [filename: string]: Blob }
    error?: string
    stats: {
        vertices: number
        faces: number
        materials: number
        textures: number
        groups: number
    }
}

export interface MTLMaterial {
    name: string
    ambient: THREE.Color
    diffuse: THREE.Color
    specular: THREE.Color
    emissive: THREE.Color
    shininess: number
    opacity: number
    illum: number
    mapKd?: string // diffuse texture
    mapKs?: string // specular texture
    mapKa?: string // ambient texture
    mapBump?: string // normal/bump texture
    mapD?: string // alpha texture
}

export class OBJExporter {
    private scene: THREE.Scene
    private materials: Map<string, MTLMaterial>
    private textures: Map<string, Blob>
    private vertexIndex: number
    private normalIndex: number
    private uvIndex: number

    constructor() {
        this.scene = new THREE.Scene()
        this.materials = new Map()
        this.textures = new Map()
        this.vertexIndex = 1
        this.normalIndex = 1
        this.uvIndex = 1
    }

    /**
     * تصدير مشروع إلى تنسيق OBJ مع MTL
     */
    async exportProject(
        project: Project,
        options: Partial<OBJExportOptions> = {}
    ): Promise<OBJExportResult> {
        try {
            const exportOptions: OBJExportOptions = {
                includeMTL: true,
                exportTextures: true,
                textureFormat: 'png',
                meshOptimization: true,
                groupByMaterial: true,
                includeNormals: true,
                includeUVs: true,
                precision: 6,
                ...options
            }

            // إعادة تعيين الفهارس
            this.resetIndices()

            // إعداد المشهد
            this.setupScene(project)

            // تحويل المواد
            await this.convertMaterials(project.materials, exportOptions)

            // تحويل العناصر إلى شبكات
            const stats = await this.convertElementsToMeshes(project, exportOptions)

            // إنتاج بيانات OBJ
            const objData = this.generateOBJData(exportOptions)

            // إنتاج بيانات MTL إذا كان مطلوباً
            let mtlData: string | undefined
            if (exportOptions.includeMTL) {
                mtlData = this.generateMTLData(exportOptions)
            }

            // تصدير النسيج إذا كان مطلوباً
            let textureBlobs: { [filename: string]: Blob } | undefined
            if (exportOptions.exportTextures) {
                textureBlobs = await this.exportTextures(exportOptions)
            }

            return {
                success: true,
                objData,
                mtlData,
                textures: textureBlobs,
                stats
            }

        } catch (error) {
            return {
                success: false,
                error: `خطأ في تصدير OBJ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                stats: this.createEmptyStats()
            }
        }
    }

    /**
     * إعادة تعيين فهارس الرؤوس
     */
    private resetIndices(): void {
        this.vertexIndex = 1
        this.normalIndex = 1
        this.uvIndex = 1
        this.materials.clear()
        this.textures.clear()
    }

    /**
     * إعداد المشهد
     */
    private setupScene(project: Project): void {
        this.scene.clear()
    }

    /**
     * تحويل مواد المشروع إلى مواد MTL
     */
    private async convertMaterials(
        materials: Material[],
        options: OBJExportOptions
    ): Promise<void> {
        for (const material of materials) {
            const mtlMaterial = await this.convertToMTLMaterial(material, options)
            this.materials.set(material.id, mtlMaterial)
        }
    }

    /**
     * تحويل مادة واحدة إلى تنسيق MTL
     */
    private async convertToMTLMaterial(
        material: Material,
        options: OBJExportOptions
    ): Promise<MTLMaterial> {
        const mtlMaterial: MTLMaterial = {
            name: this.sanitizeName(material.name),
            ambient: new THREE.Color(0.2, 0.2, 0.2),
            diffuse: new THREE.Color(material.albedo.startsWith('#') ? material.albedo : '#ffffff'),
            specular: new THREE.Color(material.metallic, material.metallic, material.metallic),
            emissive: new THREE.Color(0, 0, 0),
            shininess: (1 - material.roughness) * 128,
            opacity: material.opacity,
            illum: material.type === 'pbr' ? 2 : 1
        }

        // معالجة النسيج
        if (material.albedo && !material.albedo.startsWith('#')) {
            const textureFilename = await this.processTexture(
                material.albedo,
                `${mtlMaterial.name}_diffuse`,
                options
            )
            if (textureFilename) {
                mtlMaterial.mapKd = textureFilename
            }
        }

        if (material.normal) {
            const normalFilename = await this.processTexture(
                material.normal,
                `${mtlMaterial.name}_normal`,
                options
            )
            if (normalFilename) {
                mtlMaterial.mapBump = normalFilename
            }
        }

        if (material.emissive) {
            const emissiveFilename = await this.processTexture(
                material.emissive,
                `${mtlMaterial.name}_emissive`,
                options
            )
            if (emissiveFilename) {
                // في OBJ/MTL، نستخدم diffuse للـ emissive
                mtlMaterial.mapKd = emissiveFilename
                mtlMaterial.emissive = new THREE.Color(1, 1, 1)
            }
        }

        return mtlMaterial
    }

    /**
     * معالجة نسيج وإضافته إلى قائمة التصدير
     */
    private async processTexture(
        textureUrl: string,
        baseName: string,
        options: OBJExportOptions
    ): Promise<string | null> {
        try {
            const response = await fetch(textureUrl)
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            let blob = await response.blob()
            let filename = `${baseName}.${options.textureFormat}`

            // تحويل النسيج إلى التنسيق المطلوب إذا لزم الأمر
            if (options.textureFormat !== 'original') {
                blob = await this.convertTextureFormat(blob, options.textureFormat)
            }

            this.textures.set(filename, blob)
            return filename

        } catch (error) {
            console.warn(`فشل في معالجة النسيج ${textureUrl}:`, error)
            return null
        }
    }

    /**
     * تحويل تنسيق النسيج
     */
    private async convertTextureFormat(blob: Blob, format: 'png' | 'jpg'): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                if (!ctx) {
                    reject(new Error('فشل في إنشاء canvas context'))
                    return
                }

                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)

                canvas.toBlob((convertedBlob) => {
                    if (convertedBlob) {
                        resolve(convertedBlob)
                    } else {
                        reject(new Error('فشل في تحويل النسيج'))
                    }
                }, `image/${format}`, format === 'jpg' ? 0.9 : undefined)
            }

            img.onerror = () => reject(new Error('فشل في تحميل الصورة'))
            img.src = URL.createObjectURL(blob)
        })
    }

    /**
     * تحويل عناصر المشروع إلى شبكات
     */
    private async convertElementsToMeshes(
        project: Project,
        options: OBJExportOptions
    ): Promise<OBJExportResult['stats']> {
        const stats = this.createEmptyStats()

        for (const element of project.elements) {
            const mesh = await this.createElement(element, project.materials)
            if (mesh) {
                this.scene.add(mesh)

                // تحديث الإحصائيات
                if (mesh.geometry) {
                    const geometry = mesh.geometry as THREE.BufferGeometry
                    if (geometry.attributes.position) {
                        stats.vertices += geometry.attributes.position.count
                    }
                    if (geometry.index) {
                        stats.faces += geometry.index.count / 3
                    } else {
                        stats.faces += geometry.attributes.position.count / 3
                    }
                }
            }
        }

        stats.materials = this.materials.size
        stats.textures = this.textures.size

        return stats
    }

    /**
     * إنشاء عنصر Three.js من عنصر المشروع
     */
    private async createElement(
        element: BaseElement,
        materials: Material[]
    ): Promise<THREE.Mesh | null> {
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

        // إضافة UV coordinates إذا لم تكن موجودة
        if (!geometry.attributes.uv) {
            this.generateUVCoordinates(geometry)
        }

        // إضافة normals إذا لم تكن موجودة
        if (!geometry.attributes.normal) {
            geometry.computeVertexNormals()
        }

        // إنشاء مادة بسيطة للعرض
        const material = new THREE.MeshBasicMaterial({ color: 0x888888 })

        // إنشاء الشبكة
        const mesh = new THREE.Mesh(geometry, material)

        // تطبيق التحويلات
        mesh.position.set(element.position.x, element.position.y, element.position.z)
        mesh.rotation.set(element.rotation.x, element.rotation.y, element.rotation.z)
        mesh.scale.set(element.scale.x, element.scale.y, element.scale.z)

        mesh.name = `${element.type}_${element.id}`

        // إضافة معرف المادة كـ userData
        if (element.materialId) {
            mesh.userData.materialId = element.materialId
        }

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
    private async loadAssetGeometry(element: BaseElement): Promise<THREE.Mesh | null> {
        // تنفيذ بسيط - يمكن تحسينه لاحقاً
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.name = `asset_${element.id}`
        return mesh
    }

    /**
     * إنتاج UV coordinates للهندسة
     */
    private generateUVCoordinates(geometry: THREE.BufferGeometry): void {
        const positions = geometry.attributes.position
        const uvs = []

        // إنتاج UV بسيط - يمكن تحسينه لاحقاً
        for (let i = 0; i < positions.count; i++) {
            uvs.push(0, 0)
        }

        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    }

    /**
     * إنتاج بيانات OBJ
     */
    private generateOBJData(options: OBJExportOptions): string {
        let objData = '# Building Forge OBJ Export\n'
        objData += `# Generated on ${new Date().toISOString()}\n\n`

        // إضافة مرجع MTL إذا كان مطلوباً
        if (options.includeMTL) {
            objData += 'mtllib materials.mtl\n\n'
        }

        const vertices: string[] = []
        const normals: string[] = []
        const uvs: string[] = []
        const faces: string[] = []

        let currentVertexIndex = 1
        let currentNormalIndex = 1
        let currentUVIndex = 1

        // معالجة كل شبكة في المشهد
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const geometry = object.geometry as THREE.BufferGeometry
                const materialId = object.userData.materialId

                // إضافة تعليق للكائن
                objData += `# Object: ${object.name}\n`

                // إضافة مجموعة إذا كان مطلوباً
                if (options.groupByMaterial && materialId) {
                    const material = this.materials.get(materialId)
                    if (material) {
                        objData += `g ${object.name}\n`
                        objData += `usemtl ${material.name}\n`
                    }
                }

                // استخراج الرؤوس
                const positions = geometry.attributes.position
                const worldMatrix = object.matrixWorld

                for (let i = 0; i < positions.count; i++) {
                    const vertex = new THREE.Vector3(
                        positions.getX(i),
                        positions.getY(i),
                        positions.getZ(i)
                    )
                    vertex.applyMatrix4(worldMatrix)

                    vertices.push(`v ${this.formatNumber(vertex.x, options.precision)} ${this.formatNumber(vertex.y, options.precision)} ${this.formatNumber(vertex.z, options.precision)}`)
                }

                // استخراج النورمال إذا كان مطلوباً
                if (options.includeNormals && geometry.attributes.normal) {
                    const normalAttribute = geometry.attributes.normal
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(worldMatrix)

                    for (let i = 0; i < normalAttribute.count; i++) {
                        const normal = new THREE.Vector3(
                            normalAttribute.getX(i),
                            normalAttribute.getY(i),
                            normalAttribute.getZ(i)
                        )
                        normal.applyMatrix3(normalMatrix).normalize()

                        normals.push(`vn ${this.formatNumber(normal.x, options.precision)} ${this.formatNumber(normal.y, options.precision)} ${this.formatNumber(normal.z, options.precision)}`)
                    }
                }

                // استخراج UV إذا كان مطلوباً
                if (options.includeUVs && geometry.attributes.uv) {
                    const uvAttribute = geometry.attributes.uv

                    for (let i = 0; i < uvAttribute.count; i++) {
                        const u = uvAttribute.getX(i)
                        const v = uvAttribute.getY(i)

                        uvs.push(`vt ${this.formatNumber(u, options.precision)} ${this.formatNumber(v, options.precision)}`)
                    }
                }

                // استخراج الوجوه
                if (geometry.index) {
                    // هندسة مفهرسة
                    const indices = geometry.index

                    for (let i = 0; i < indices.count; i += 3) {
                        const a = indices.getX(i) + currentVertexIndex
                        const b = indices.getX(i + 1) + currentVertexIndex
                        const c = indices.getX(i + 2) + currentVertexIndex

                        let faceString = `f ${a}`
                        if (options.includeUVs) faceString += `/${a}`
                        if (options.includeNormals) faceString += `/${a}`

                        faceString += ` ${b}`
                        if (options.includeUVs) faceString += `/${b}`
                        if (options.includeNormals) faceString += `/${b}`

                        faceString += ` ${c}`
                        if (options.includeUVs) faceString += `/${c}`
                        if (options.includeNormals) faceString += `/${c}`

                        faces.push(faceString)
                    }
                } else {
                    // هندسة غير مفهرسة
                    for (let i = 0; i < positions.count; i += 3) {
                        const a = i + currentVertexIndex
                        const b = i + 1 + currentVertexIndex
                        const c = i + 2 + currentVertexIndex

                        let faceString = `f ${a}`
                        if (options.includeUVs) faceString += `/${a}`
                        if (options.includeNormals) faceString += `/${a}`

                        faceString += ` ${b}`
                        if (options.includeUVs) faceString += `/${b}`
                        if (options.includeNormals) faceString += `/${b}`

                        faceString += ` ${c}`
                        if (options.includeUVs) faceString += `/${c}`
                        if (options.includeNormals) faceString += `/${c}`

                        faces.push(faceString)
                    }
                }

                // تحديث الفهارس
                currentVertexIndex += positions.count
                if (options.includeNormals && geometry.attributes.normal) {
                    currentNormalIndex += geometry.attributes.normal.count
                }
                if (options.includeUVs && geometry.attributes.uv) {
                    currentUVIndex += geometry.attributes.uv.count
                }

                objData += '\n'
            }
        })

        // إضافة جميع البيانات إلى الملف
        objData += vertices.join('\n') + '\n\n'

        if (options.includeNormals && normals.length > 0) {
            objData += normals.join('\n') + '\n\n'
        }

        if (options.includeUVs && uvs.length > 0) {
            objData += uvs.join('\n') + '\n\n'
        }

        objData += faces.join('\n') + '\n'

        return objData
    }

    /**
     * إنتاج بيانات MTL
     */
    private generateMTLData(options: OBJExportOptions): string {
        let mtlData = '# Building Forge MTL Export\n'
        mtlData += `# Generated on ${new Date().toISOString()}\n\n`

        this.materials.forEach((material) => {
            mtlData += `newmtl ${material.name}\n`
            mtlData += `Ka ${this.formatColor(material.ambient)}\n`
            mtlData += `Kd ${this.formatColor(material.diffuse)}\n`
            mtlData += `Ks ${this.formatColor(material.specular)}\n`
            mtlData += `Ke ${this.formatColor(material.emissive)}\n`
            mtlData += `Ns ${this.formatNumber(material.shininess, 2)}\n`
            mtlData += `d ${this.formatNumber(material.opacity, 3)}\n`
            mtlData += `illum ${material.illum}\n`

            if (material.mapKd) {
                mtlData += `map_Kd ${material.mapKd}\n`
            }
            if (material.mapKs) {
                mtlData += `map_Ks ${material.mapKs}\n`
            }
            if (material.mapKa) {
                mtlData += `map_Ka ${material.mapKa}\n`
            }
            if (material.mapBump) {
                mtlData += `map_Bump ${material.mapBump}\n`
            }
            if (material.mapD) {
                mtlData += `map_d ${material.mapD}\n`
            }

            mtlData += '\n'
        })

        return mtlData
    }

    /**
     * تصدير النسيج
     */
    private async exportTextures(options: OBJExportOptions): Promise<{ [filename: string]: Blob }> {
        return Object.fromEntries(this.textures)
    }

    /**
     * تنسيق رقم بدقة محددة
     */
    private formatNumber(value: number, precision: number): string {
        return value.toFixed(precision)
    }

    /**
     * تنسيق لون للـ MTL
     */
    private formatColor(color: THREE.Color): string {
        return `${this.formatNumber(color.r, 3)} ${this.formatNumber(color.g, 3)} ${this.formatNumber(color.b, 3)}`
    }

    /**
     * تنظيف اسم المادة للتوافق مع MTL
     */
    private sanitizeName(name: string): string {
        return name.replace(/[^a-zA-Z0-9_]/g, '_')
    }

    /**
     * إنشاء إحصائيات فارغة
     */
    private createEmptyStats(): OBJExportResult['stats'] {
        return {
            vertices: 0,
            faces: 0,
            materials: 0,
            textures: 0,
            groups: 0
        }
    }
}