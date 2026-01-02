/**
 * خدمة تضمين مواد PBR محسنة للألعاب مع دعم محركات مختلفة
 */

import * as THREE from 'three'
import { Material } from '../../shared/types'

export interface PBRExportOptions {
    targetEngine: 'unity' | 'unreal' | 'godot' | 'generic'
    workflow: 'metallic-roughness' | 'specular-glossiness'
    textureFormat: 'png' | 'jpg' | 'webp'
    textureCompression: boolean
    maxTextureSize: 512 | 1024 | 2048 | 4096
    generateMipMaps: boolean
    optimizeForMobile: boolean
    includeEmission: boolean
    includeNormalMaps: boolean
    includeOcclusionMaps: boolean
}

export interface PBRMaterialData {
    name: string
    baseColor: THREE.Color
    baseColorTexture?: string
    metallicFactor: number
    roughnessFactor: number
    metallicRoughnessTexture?: string
    normalTexture?: string
    normalScale: number
    occlusionTexture?: string
    occlusionStrength: number
    emissiveTexture?: string
    emissiveFactor: THREE.Color
    alphaCutoff: number
    alphaMode: 'OPAQUE' | 'MASK' | 'BLEND'
    doubleSided: boolean
    engineSpecific: EngineSpecificData
}

export interface EngineSpecificData {
    unity?: UnityMaterialData
    unreal?: UnrealMaterialData
    godot?: GodotMaterialData
}

export interface UnityMaterialData {
    shader: 'Standard' | 'URP/Lit' | 'HDRP/Lit'
    renderQueue: number
    enableInstancing: boolean
    enableGPUInstancing: boolean
    keywords: string[]
    properties: { [key: string]: any }
}

export interface UnrealMaterialData {
    materialDomain: 'Surface' | 'DeferredDecal' | 'LightFunction'
    blendMode: 'Opaque' | 'Masked' | 'Translucent' | 'Additive'
    shadingModel: 'DefaultLit' | 'Unlit' | 'Subsurface' | 'TwoSidedFoliage'
    twoSided: boolean
    parameters: { [key: string]: any }
}

export interface GodotMaterialData {
    resourceType: 'StandardMaterial3D' | 'ShaderMaterial'
    flags: string[]
    features: string[]
    parameters: { [key: string]: any }
}

export interface PBRExportResult {
    success: boolean
    materials: PBRMaterialData[]
    textures: { [filename: string]: Blob }
    engineFiles?: { [filename: string]: string }
    error?: string
    stats: {
        materialsProcessed: number
        texturesGenerated: number
        totalFileSize: number
        compressionRatio: number
    }
}

export class GamePBRMaterialExporter {
    private textureCache: Map<string, HTMLCanvasElement>
    private materialCache: Map<string, PBRMaterialData>

    constructor() {
        this.textureCache = new Map()
        this.materialCache = new Map()
    }

    /**
     * تصدير مواد PBR محسنة للألعاب
     */
    async exportMaterials(
        materials: Material[],
        options: Partial<PBRExportOptions> = {}
    ): Promise<PBRExportResult> {
        try {
            const exportOptions: PBRExportOptions = {
                targetEngine: 'generic',
                workflow: 'metallic-roughness',
                textureFormat: 'png',
                textureCompression: true,
                maxTextureSize: 1024,
                generateMipMaps: true,
                optimizeForMobile: false,
                includeEmission: true,
                includeNormalMaps: true,
                includeOcclusionMaps: false,
                ...options
            }

            // مسح الكاش
            this.textureCache.clear()
            this.materialCache.clear()

            const pbrMaterials: PBRMaterialData[] = []
            const textures: { [filename: string]: Blob } = {}
            let totalFileSize = 0
            let originalSize = 0

            // معالجة كل مادة
            for (const material of materials) {
                const pbrMaterial = await this.convertToPBRMaterial(material, exportOptions)
                if (pbrMaterial) {
                    pbrMaterials.push(pbrMaterial)

                    // إنتاج النسيج للمادة
                    const materialTextures = await this.generateMaterialTextures(material, pbrMaterial, exportOptions)

                    // إضافة النسيج إلى النتيجة
                    Object.entries(materialTextures).forEach(([filename, blob]) => {
                        textures[filename] = blob
                        totalFileSize += blob.size
                    })
                }
            }

            // إنتاج ملفات خاصة بالمحرك
            const engineFiles = await this.generateEngineSpecificFiles(pbrMaterials, exportOptions)

            // حساب نسبة الضغط
            const compressionRatio = originalSize > 0 ? (1 - totalFileSize / originalSize) * 100 : 0

            return {
                success: true,
                materials: pbrMaterials,
                textures,
                engineFiles,
                stats: {
                    materialsProcessed: pbrMaterials.length,
                    texturesGenerated: Object.keys(textures).length,
                    totalFileSize,
                    compressionRatio
                }
            }

        } catch (error) {
            return {
                success: false,
                materials: [],
                textures: {},
                error: `خطأ في تصدير مواد PBR: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                stats: {
                    materialsProcessed: 0,
                    texturesGenerated: 0,
                    totalFileSize: 0,
                    compressionRatio: 0
                }
            }
        }
    }

    /**
     * تحويل مادة إلى PBR material
     */
    private async convertToPBRMaterial(
        material: Material,
        options: PBRExportOptions
    ): Promise<PBRMaterialData | null> {
        try {
            const pbrMaterial: PBRMaterialData = {
                name: this.sanitizeName(material.name),
                baseColor: new THREE.Color(material.albedo.startsWith('#') ? material.albedo : '#ffffff'),
                metallicFactor: material.metallic,
                roughnessFactor: material.roughness,
                normalScale: 1.0,
                occlusionStrength: 1.0,
                emissiveFactor: new THREE.Color(0, 0, 0),
                alphaCutoff: 0.5,
                alphaMode: material.opacity < 1.0 ? 'BLEND' : 'OPAQUE',
                doubleSided: false,
                engineSpecific: {}
            }

            // معالجة النسيج
            if (material.albedo && !material.albedo.startsWith('#')) {
                pbrMaterial.baseColorTexture = `${pbrMaterial.name}_baseColor.${options.textureFormat}`
            }

            if (material.normal && options.includeNormalMaps) {
                pbrMaterial.normalTexture = `${pbrMaterial.name}_normal.${options.textureFormat}`
            }

            if (material.emissive && options.includeEmission) {
                pbrMaterial.emissiveTexture = `${pbrMaterial.name}_emissive.${options.textureFormat}`
                pbrMaterial.emissiveFactor = new THREE.Color(1, 1, 1)
            }

            // إنتاج metallic-roughness texture مدمجة
            if (options.workflow === 'metallic-roughness') {
                pbrMaterial.metallicRoughnessTexture = `${pbrMaterial.name}_metallicRoughness.${options.textureFormat}`
            }

            // إضافة بيانات خاصة بالمحرك
            pbrMaterial.engineSpecific = await this.generateEngineSpecificData(material, options)

            return pbrMaterial

        } catch (error) {
            console.error(`فشل في تحويل المادة ${material.name}:`, error)
            return null
        }
    }

    /**
     * إنتاج بيانات خاصة بالمحرك
     */
    private async generateEngineSpecificData(
        material: Material,
        options: PBRExportOptions
    ): Promise<EngineSpecificData> {
        const engineData: EngineSpecificData = {}

        switch (options.targetEngine) {
            case 'unity':
                engineData.unity = await this.generateUnityData(material, options)
                break
            case 'unreal':
                engineData.unreal = await this.generateUnrealData(material, options)
                break
            case 'godot':
                engineData.godot = await this.generateGodotData(material, options)
                break
        }

        return engineData
    }

    /**
     * إنتاج بيانات Unity
     */
    private async generateUnityData(
        material: Material,
        options: PBRExportOptions
    ): Promise<UnityMaterialData> {
        const shader = options.optimizeForMobile ? 'URP/Lit' : 'Standard'

        return {
            shader,
            renderQueue: material.opacity < 1.0 ? 3000 : 2000,
            enableInstancing: true,
            enableGPUInstancing: true,
            keywords: this.generateUnityKeywords(material, options),
            properties: {
                _Color: [material.albedo.startsWith('#') ? material.albedo : '#ffffff'],
                _Metallic: material.metallic,
                _Glossiness: 1.0 - material.roughness,
                _BumpScale: 1.0,
                _OcclusionStrength: 1.0,
                _EmissionColor: material.emissive ? '#ffffff' : '#000000'
            }
        }
    }

    /**
     * إنتاج keywords لـ Unity
     */
    private generateUnityKeywords(material: Material, options: PBRExportOptions): string[] {
        const keywords: string[] = []

        if (material.normal && options.includeNormalMaps) {
            keywords.push('_NORMALMAP')
        }

        if (material.emissive && options.includeEmission) {
            keywords.push('_EMISSION')
        }

        if (material.opacity < 1.0) {
            keywords.push('_ALPHABLEND_ON')
        }

        if (options.optimizeForMobile) {
            keywords.push('_MOBILE_OPTIMIZED')
        }

        return keywords
    }

    /**
     * إنتاج بيانات Unreal Engine
     */
    private async generateUnrealData(
        material: Material,
        options: PBRExportOptions
    ): Promise<UnrealMaterialData> {
        return {
            materialDomain: 'Surface',
            blendMode: material.opacity < 1.0 ? 'Translucent' : 'Opaque',
            shadingModel: 'DefaultLit',
            twoSided: false,
            parameters: {
                BaseColor: material.albedo.startsWith('#') ? material.albedo : '#ffffff',
                Metallic: material.metallic,
                Roughness: material.roughness,
                Normal: material.normal ? 1.0 : 0.0,
                Emissive: material.emissive ? 1.0 : 0.0,
                Opacity: material.opacity
            }
        }
    }

    /**
     * إنتاج بيانات Godot
     */
    private async generateGodotData(
        material: Material,
        options: PBRExportOptions
    ): Promise<GodotMaterialData> {
        const flags: string[] = []
        const features: string[] = []

        if (material.opacity < 1.0) {
            flags.push('FLAG_TRANSPARENT')
            features.push('FEATURE_TRANSPARENT')
        }

        if (material.normal && options.includeNormalMaps) {
            features.push('FEATURE_NORMAL_MAPPING')
        }

        if (material.emissive && options.includeEmission) {
            features.push('FEATURE_EMISSION')
        }

        return {
            resourceType: 'StandardMaterial3D',
            flags,
            features,
            parameters: {
                albedo: material.albedo.startsWith('#') ? material.albedo : '#ffffff',
                metallic: material.metallic,
                roughness: material.roughness,
                normal_scale: 1.0,
                emission_energy: material.emissive ? 1.0 : 0.0
            }
        }
    }

    /**
     * إنتاج نسيج المادة
     */
    private async generateMaterialTextures(
        material: Material,
        pbrMaterial: PBRMaterialData,
        options: PBRExportOptions
    ): Promise<{ [filename: string]: Blob }> {
        const textures: { [filename: string]: Blob } = {}

        // Base Color Texture
        if (material.albedo && !material.albedo.startsWith('#') && pbrMaterial.baseColorTexture) {
            const texture = await this.processTexture(material.albedo, options)
            if (texture) {
                textures[pbrMaterial.baseColorTexture] = texture
            }
        }

        // Normal Texture
        if (material.normal && pbrMaterial.normalTexture && options.includeNormalMaps) {
            const texture = await this.processTexture(material.normal, options)
            if (texture) {
                textures[pbrMaterial.normalTexture] = texture
            }
        }

        // Emissive Texture
        if (material.emissive && pbrMaterial.emissiveTexture && options.includeEmission) {
            const texture = await this.processTexture(material.emissive, options)
            if (texture) {
                textures[pbrMaterial.emissiveTexture] = texture
            }
        }

        // Metallic-Roughness Texture (مدمجة)
        if (pbrMaterial.metallicRoughnessTexture && options.workflow === 'metallic-roughness') {
            const metallicRoughnessTexture = await this.generateMetallicRoughnessTexture(
                material,
                options
            )
            if (metallicRoughnessTexture) {
                textures[pbrMaterial.metallicRoughnessTexture] = metallicRoughnessTexture
            }
        }

        return textures
    }

    /**
     * معالجة نسيج واحد
     */
    private async processTexture(
        textureUrl: string,
        options: PBRExportOptions
    ): Promise<Blob | null> {
        try {
            // التحقق من الكاش أولاً
            const cacheKey = `${textureUrl}_${options.textureFormat}_${options.maxTextureSize}`
            if (this.textureCache.has(cacheKey)) {
                return this.canvasToBlob(this.textureCache.get(cacheKey)!, options.textureFormat)
            }

            // تحميل النسيج
            const image = await this.loadImage(textureUrl)
            if (!image) return null

            // إنشاء canvas للمعالجة
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return null

            // تحديد الحجم المناسب
            const size = this.calculateOptimalSize(image, options)
            canvas.width = size.width
            canvas.height = size.height

            // رسم الصورة مع التحسين
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

            // تطبيق تحسينات إضافية
            if (options.textureCompression) {
                this.applyTextureOptimizations(ctx, canvas, options)
            }

            // حفظ في الكاش
            this.textureCache.set(cacheKey, canvas)

            // تحويل إلى blob
            return this.canvasToBlob(canvas, options.textureFormat)

        } catch (error) {
            console.error(`فشل في معالجة النسيج ${textureUrl}:`, error)
            return null
        }
    }

    /**
     * تحميل صورة من URL
     */
    private async loadImage(url: string): Promise<HTMLImageElement | null> {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)
            img.src = url
        })
    }

    /**
     * حساب الحجم الأمثل للنسيج
     */
    private calculateOptimalSize(
        image: HTMLImageElement,
        options: PBRExportOptions
    ): { width: number; height: number } {
        let width = image.width
        let height = image.height

        // تطبيق الحد الأقصى للحجم
        const maxSize = options.maxTextureSize
        if (width > maxSize || height > maxSize) {
            const scale = Math.min(maxSize / width, maxSize / height)
            width = Math.floor(width * scale)
            height = Math.floor(height * scale)
        }

        // التأكد من أن الأبعاد قوى للعدد 2 (مهم للألعاب)
        width = this.nearestPowerOfTwo(width)
        height = this.nearestPowerOfTwo(height)

        // تحسينات للموبايل
        if (options.optimizeForMobile) {
            width = Math.min(width, 512)
            height = Math.min(height, 512)
        }

        return { width, height }
    }

    /**
     * إيجاد أقرب قوة للعدد 2
     */
    private nearestPowerOfTwo(value: number): number {
        return Math.pow(2, Math.round(Math.log2(value)))
    }

    /**
     * تطبيق تحسينات النسيج
     */
    private applyTextureOptimizations(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        options: PBRExportOptions
    ): void {
        // تحسين الألوان للموبايل
        if (options.optimizeForMobile) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data

            // تقليل عمق الألوان قليلاً لتوفير الذاكرة
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.floor(data[i] / 4) * 4         // Red
                data[i + 1] = Math.floor(data[i + 1] / 4) * 4 // Green
                data[i + 2] = Math.floor(data[i + 2] / 4) * 4 // Blue
                // Alpha يبقى كما هو
            }

            ctx.putImageData(imageData, 0, 0)
        }
    }

    /**
     * إنتاج نسيج metallic-roughness مدمج
     */
    private async generateMetallicRoughnessTexture(
        material: Material,
        options: PBRExportOptions
    ): Promise<Blob | null> {
        try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return null

            // حجم افتراضي للنسيج المدمج
            const size = Math.min(options.maxTextureSize, 512)
            canvas.width = size
            canvas.height = size

            // إنشاء نسيج metallic-roughness
            // القناة الحمراء: غير مستخدمة (0)
            // القناة الخضراء: Roughness
            // القناة الزرقاء: Metallic
            // القناة الألفا: غير مستخدمة (255)

            const imageData = ctx.createImageData(size, size)
            const data = imageData.data

            const roughness = Math.floor(material.roughness * 255)
            const metallic = Math.floor(material.metallic * 255)

            for (let i = 0; i < data.length; i += 4) {
                data[i] = 0           // Red (غير مستخدم)
                data[i + 1] = roughness // Green (Roughness)
                data[i + 2] = metallic  // Blue (Metallic)
                data[i + 3] = 255       // Alpha
            }

            ctx.putImageData(imageData, 0, 0)

            return this.canvasToBlob(canvas, options.textureFormat)

        } catch (error) {
            console.error('فشل في إنتاج نسيج metallic-roughness:', error)
            return null
        }
    }

    /**
     * تحويل canvas إلى blob
     */
    private async canvasToBlob(canvas: HTMLCanvasElement, format: string): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const mimeType = `image/${format}`
            const quality = format === 'jpg' ? 0.9 : undefined

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob)
                } else {
                    reject(new Error('فشل في تحويل canvas إلى blob'))
                }
            }, mimeType, quality)
        })
    }

    /**
     * إنتاج ملفات خاصة بالمحرك
     */
    private async generateEngineSpecificFiles(
        materials: PBRMaterialData[],
        options: PBRExportOptions
    ): Promise<{ [filename: string]: string }> {
        const files: { [filename: string]: string } = {}

        switch (options.targetEngine) {
            case 'unity':
                files['materials.unitypackage'] = await this.generateUnityPackage(materials)
                break
            case 'unreal':
                files['materials.uasset'] = await this.generateUnrealAsset(materials)
                break
            case 'godot':
                files['materials.tres'] = await this.generateGodotResource(materials)
                break
        }

        return files
    }

    /**
     * إنتاج Unity package
     */
    private async generateUnityPackage(materials: PBRMaterialData[]): Promise<string> {
        // تنفيذ بسيط - في التطبيق الحقيقي يجب إنتاج ملف Unity package صحيح
        const packageData = {
            version: '1.0.0',
            materials: materials.map(material => ({
                name: material.name,
                shader: material.engineSpecific.unity?.shader || 'Standard',
                properties: material.engineSpecific.unity?.properties || {}
            }))
        }

        return JSON.stringify(packageData, null, 2)
    }

    /**
     * إنتاج Unreal asset
     */
    private async generateUnrealAsset(materials: PBRMaterialData[]): Promise<string> {
        // تنفيذ بسيط - في التطبيق الحقيقي يجب إنتاج ملف Unreal asset صحيح
        const assetData = {
            version: '4.27',
            materials: materials.map(material => ({
                name: material.name,
                materialDomain: material.engineSpecific.unreal?.materialDomain || 'Surface',
                parameters: material.engineSpecific.unreal?.parameters || {}
            }))
        }

        return JSON.stringify(assetData, null, 2)
    }

    /**
     * إنتاج Godot resource
     */
    private async generateGodotResource(materials: PBRMaterialData[]): Promise<string> {
        let resourceContent = '[gd_resource type="Resource" format=2]\n\n'

        materials.forEach((material, index) => {
            resourceContent += `[sub_resource type="StandardMaterial3D" id=${index + 1}]\n`
            resourceContent += `resource_name = "${material.name}"\n`

            const godotData = material.engineSpecific.godot
            if (godotData) {
                Object.entries(godotData.parameters).forEach(([key, value]) => {
                    resourceContent += `${key} = ${JSON.stringify(value)}\n`
                })
            }

            resourceContent += '\n'
        })

        return resourceContent
    }

    /**
     * تنظيف اسم المادة
     */
    private sanitizeName(name: string): string {
        return name.replace(/[^a-zA-Z0-9_]/g, '_')
    }
}