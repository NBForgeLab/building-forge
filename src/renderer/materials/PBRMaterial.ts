/**
 * مادة PBR متقدمة
 * Advanced PBR Material with Albedo, Normal, Roughness, Metallic support
 */

export interface PBRMaterialProperties {
    albedo: string | HTMLImageElement | HTMLCanvasElement
    normal?: string | HTMLImageElement | HTMLCanvasElement
    roughness: number | string | HTMLImageElement | HTMLCanvasElement
    metallic: number | string | HTMLImageElement | HTMLCanvasElement
    emission?: string | HTMLImageElement | HTMLCanvasElement
    opacity?: number
    transparent?: boolean
    doubleSided?: boolean

    // Texture properties
    albedoTiling?: { x: number; y: number }
    normalTiling?: { x: number; y: number }
    roughnessTiling?: { x: number; y: number }
    metallicTiling?: { x: number; y: number }

    // Advanced properties
    clearcoat?: number
    clearcoatRoughness?: number
    sheen?: number
    sheenRoughness?: number
    transmission?: number
    thickness?: number
    ior?: number // Index of refraction
}

export interface MaterialValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

export class PBRMaterial {
    public id: string
    public name: string
    public properties: PBRMaterialProperties
    public metadata: {
        createdAt: number
        modifiedAt: number
        version: string
        tags: string[]
        category: string
        author?: string
    }

    constructor(
        name: string,
        properties: Partial<PBRMaterialProperties> = {},
        id?: string
    ) {
        this.id = id || this.generateId()
        this.name = name
        this.properties = this.mergeWithDefaults(properties)
        this.metadata = {
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            version: '1.0.0',
            tags: [],
            category: 'general',
            author: undefined
        }
    }

    private generateId(): string {
        return 'mat_' + Math.random().toString(36).substr(2, 9)
    }

    private mergeWithDefaults(properties: Partial<PBRMaterialProperties>): PBRMaterialProperties {
        return {
            albedo: '#FFFFFF',
            roughness: 0.5,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false,
            doubleSided: false,
            albedoTiling: { x: 1, y: 1 },
            normalTiling: { x: 1, y: 1 },
            roughnessTiling: { x: 1, y: 1 },
            metallicTiling: { x: 1, y: 1 },
            clearcoat: 0.0,
            clearcoatRoughness: 0.0,
            sheen: 0.0,
            sheenRoughness: 0.0,
            transmission: 0.0,
            thickness: 0.0,
            ior: 1.5,
            ...properties
        }
    }

    // Update material properties
    updateProperties(properties: Partial<PBRMaterialProperties>): void {
        this.properties = { ...this.properties, ...properties }
        this.metadata.modifiedAt = Date.now()
    }

    // Update metadata
    updateMetadata(metadata: Partial<typeof this.metadata>): void {
        this.metadata = { ...this.metadata, ...metadata }
        this.metadata.modifiedAt = Date.now()
    }

    // Validate material properties
    validate(): MaterialValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Validate numeric ranges
        if (typeof this.properties.roughness === 'number') {
            if (this.properties.roughness < 0 || this.properties.roughness > 1) {
                errors.push('Roughness must be between 0 and 1')
            }
        }

        if (typeof this.properties.metallic === 'number') {
            if (this.properties.metallic < 0 || this.properties.metallic > 1) {
                errors.push('Metallic must be between 0 and 1')
            }
        }

        if (this.properties.opacity !== undefined) {
            if (this.properties.opacity < 0 || this.properties.opacity > 1) {
                errors.push('Opacity must be between 0 and 1')
            }
        }

        if (this.properties.ior !== undefined) {
            if (this.properties.ior < 1 || this.properties.ior > 3) {
                warnings.push('IOR values outside 1-3 range may produce unrealistic results')
            }
        }

        // Validate color format
        if (typeof this.properties.albedo === 'string') {
            if (!this.isValidColor(this.properties.albedo)) {
                errors.push('Invalid albedo color format')
            }
        }

        // Check for common material setup issues
        if (typeof this.properties.metallic === 'number' &&
            typeof this.properties.roughness === 'number') {
            if (this.properties.metallic > 0.8 && this.properties.roughness < 0.1) {
                warnings.push('Very smooth metals may appear unrealistic')
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        }
    }

    private isValidColor(color: string): boolean {
        // Simple color validation (hex, rgb, hsl, named colors)
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/
        const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/
        const hslPattern = /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/
        const hslaPattern = /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/

        return hexPattern.test(color) ||
            rgbPattern.test(color) ||
            rgbaPattern.test(color) ||
            hslPattern.test(color) ||
            hslaPattern.test(color) ||
            this.isNamedColor(color)
    }

    private isNamedColor(color: string): boolean {
        const namedColors = [
            'red', 'green', 'blue', 'white', 'black', 'yellow', 'cyan', 'magenta',
            'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'transparent'
        ]
        return namedColors.includes(color.toLowerCase())
    }

    // Clone material
    clone(newName?: string): PBRMaterial {
        const cloned = new PBRMaterial(
            newName || `${this.name} Copy`,
            { ...this.properties }
        )
        cloned.metadata = {
            ...this.metadata,
            createdAt: Date.now(),
            modifiedAt: Date.now()
        }
        return cloned
    }

    // Export material to JSON
    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            properties: this.properties,
            metadata: this.metadata
        }
    }

    // Import material from JSON
    static fromJSON(data: any): PBRMaterial {
        const material = new PBRMaterial(data.name, data.properties, data.id)
        if (data.metadata) {
            material.metadata = { ...material.metadata, ...data.metadata }
        }
        return material
    }

    // Get material preview data for UI
    getPreviewData(): {
        albedoColor: string
        roughnessValue: number
        metallicValue: number
        hasNormalMap: boolean
        hasEmission: boolean
        isTransparent: boolean
    } {
        return {
            albedoColor: typeof this.properties.albedo === 'string'
                ? this.properties.albedo
                : '#FFFFFF',
            roughnessValue: typeof this.properties.roughness === 'number'
                ? this.properties.roughness
                : 0.5,
            metallicValue: typeof this.properties.metallic === 'number'
                ? this.properties.metallic
                : 0.0,
            hasNormalMap: !!this.properties.normal,
            hasEmission: !!this.properties.emission,
            isTransparent: this.properties.transparent || (this.properties.opacity || 1) < 1
        }
    }

    // Calculate approximate material cost (for game optimization)
    calculateComplexity(): {
        score: number
        factors: string[]
        recommendations: string[]
    } {
        let score = 1 // Base complexity
        const factors: string[] = []
        const recommendations: string[] = []

        // Texture complexity
        if (typeof this.properties.albedo !== 'string') {
            score += 1
            factors.push('Albedo texture')
        }

        if (this.properties.normal) {
            score += 2
            factors.push('Normal map')
        }

        if (typeof this.properties.roughness !== 'number') {
            score += 1
            factors.push('Roughness texture')
        }

        if (typeof this.properties.metallic !== 'number') {
            score += 1
            factors.push('Metallic texture')
        }

        if (this.properties.emission) {
            score += 1
            factors.push('Emission map')
        }

        // Advanced features
        if (this.properties.clearcoat && this.properties.clearcoat > 0) {
            score += 1
            factors.push('Clearcoat')
        }

        if (this.properties.transmission && this.properties.transmission > 0) {
            score += 2
            factors.push('Transmission')
        }

        if (this.properties.transparent) {
            score += 1
            factors.push('Transparency')
        }

        // Generate recommendations
        if (score > 5) {
            recommendations.push('Consider reducing texture count for better performance')
        }

        if (this.properties.transmission && this.properties.transmission > 0) {
            recommendations.push('Transmission materials are expensive - use sparingly')
        }

        if (typeof this.properties.roughness !== 'number' &&
            typeof this.properties.metallic !== 'number') {
            recommendations.push('Consider combining roughness and metallic into a single texture')
        }

        return { score, factors, recommendations }
    }
}