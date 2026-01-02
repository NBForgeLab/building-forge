/**
 * مدير المواد المركزي
 * Central material manager with caching and validation
 */

import { PBRMaterial, PBRMaterialProperties } from './PBRMaterial'
import { TextureLoader } from './TextureLoader'

export interface MaterialLibrary {
    id: string
    name: string
    description: string
    materials: PBRMaterial[]
    metadata: {
        version: string
        author: string
        createdAt: number
        tags: string[]
    }
}

export interface MaterialSearchOptions {
    query?: string
    category?: string
    tags?: string[]
    hasTextures?: boolean
    complexity?: 'low' | 'medium' | 'high'
    sortBy?: 'name' | 'created' | 'modified' | 'complexity'
    sortOrder?: 'asc' | 'desc'
}

export class MaterialManager {
    private _materials: Map<string, PBRMaterial> = new Map()
    private _libraries: Map<string, MaterialLibrary> = new Map()
    private _textureLoader: TextureLoader
    private _cache: Map<string, any> = new Map()
    private _defaultLibrary: MaterialLibrary

    constructor() {
        this._textureLoader = new TextureLoader()
        this._defaultLibrary = this.createDefaultLibrary()
        this._libraries.set(this._defaultLibrary.id, this._defaultLibrary)
        this.loadDefaultMaterials()
    }

    // Create default material library
    private createDefaultLibrary(): MaterialLibrary {
        return {
            id: 'default',
            name: 'Default Materials',
            description: 'Built-in material presets for common building materials',
            materials: [],
            metadata: {
                version: '1.0.0',
                author: 'Building Forge',
                createdAt: Date.now(),
                tags: ['default', 'building', 'architecture']
            }
        }
    }

    // Load default materials
    private loadDefaultMaterials(): void {
        const defaultMaterials = [
            // Concrete materials
            {
                name: 'Concrete - Smooth',
                properties: {
                    albedo: '#C0C0C0',
                    roughness: 0.8,
                    metallic: 0.0
                },
                category: 'concrete',
                tags: ['concrete', 'smooth', 'building']
            },
            {
                name: 'Concrete - Rough',
                properties: {
                    albedo: '#A0A0A0',
                    roughness: 0.9,
                    metallic: 0.0
                },
                category: 'concrete',
                tags: ['concrete', 'rough', 'building']
            },

            // Wood materials
            {
                name: 'Wood - Oak',
                properties: {
                    albedo: '#8B4513',
                    roughness: 0.7,
                    metallic: 0.0
                },
                category: 'wood',
                tags: ['wood', 'oak', 'natural']
            },
            {
                name: 'Wood - Pine',
                properties: {
                    albedo: '#DEB887',
                    roughness: 0.6,
                    metallic: 0.0
                },
                category: 'wood',
                tags: ['wood', 'pine', 'natural']
            },

            // Metal materials
            {
                name: 'Steel - Brushed',
                properties: {
                    albedo: '#708090',
                    roughness: 0.3,
                    metallic: 0.9
                },
                category: 'metal',
                tags: ['metal', 'steel', 'brushed']
            },
            {
                name: 'Aluminum - Polished',
                properties: {
                    albedo: '#C0C0C0',
                    roughness: 0.1,
                    metallic: 0.95
                },
                category: 'metal',
                tags: ['metal', 'aluminum', 'polished']
            },

            // Glass materials
            {
                name: 'Glass - Clear',
                properties: {
                    albedo: '#FFFFFF',
                    roughness: 0.0,
                    metallic: 0.0,
                    transmission: 0.9,
                    opacity: 0.1,
                    transparent: true,
                    ior: 1.52
                },
                category: 'glass',
                tags: ['glass', 'clear', 'transparent']
            },
            {
                name: 'Glass - Frosted',
                properties: {
                    albedo: '#F8F8FF',
                    roughness: 0.8,
                    metallic: 0.0,
                    transmission: 0.3,
                    opacity: 0.7,
                    transparent: true,
                    ior: 1.52
                },
                category: 'glass',
                tags: ['glass', 'frosted', 'translucent']
            },

            // Brick materials
            {
                name: 'Brick - Red',
                properties: {
                    albedo: '#B22222',
                    roughness: 0.9,
                    metallic: 0.0
                },
                category: 'brick',
                tags: ['brick', 'red', 'masonry']
            },

            // Stone materials
            {
                name: 'Stone - Granite',
                properties: {
                    albedo: '#696969',
                    roughness: 0.85,
                    metallic: 0.0
                },
                category: 'stone',
                tags: ['stone', 'granite', 'natural']
            },

            // Tile materials
            {
                name: 'Ceramic - White',
                properties: {
                    albedo: '#FFFFFF',
                    roughness: 0.2,
                    metallic: 0.0
                },
                category: 'ceramic',
                tags: ['ceramic', 'tile', 'white']
            }
        ]

        defaultMaterials.forEach(materialData => {
            const material = new PBRMaterial(materialData.name, materialData.properties)
            material.metadata.category = materialData.category
            material.metadata.tags = materialData.tags
            this.addMaterial(material, 'default')
        })
    }

    // Add material to manager
    addMaterial(material: PBRMaterial, libraryId: string = 'default'): void {
        // Validate material
        const validation = material.validate()
        if (!validation.valid) {
            throw new Error(`Material validation failed: ${validation.errors.join(', ')}`)
        }

        // Add to materials map
        this._materials.set(material.id, material)

        // Add to library
        const library = this._libraries.get(libraryId)
        if (library) {
            library.materials.push(material)
        }

        // Clear related cache
        this.clearCache(`library_${libraryId}`)
        this.clearCache('search_*')
    }

    // Remove material
    removeMaterial(materialId: string): boolean {
        const material = this._materials.get(materialId)
        if (!material) return false

        // Remove from materials map
        this._materials.delete(materialId)

        // Remove from all libraries
        this._libraries.forEach(library => {
            const index = library.materials.findIndex(m => m.id === materialId)
            if (index !== -1) {
                library.materials.splice(index, 1)
            }
        })

        // Clear cache
        this.clearCache('*')

        return true
    }

    // Get material by ID
    getMaterial(materialId: string): PBRMaterial | undefined {
        return this._materials.get(materialId)
    }

    // Get all materials
    getAllMaterials(): PBRMaterial[] {
        return Array.from(this._materials.values())
    }

    // Search materials
    searchMaterials(options: MaterialSearchOptions = {}): PBRMaterial[] {
        const cacheKey = `search_${JSON.stringify(options)}`

        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey)
        }

        let results = this.getAllMaterials()

        // Filter by query
        if (options.query) {
            const query = options.query.toLowerCase()
            results = results.filter(material =>
                material.name.toLowerCase().includes(query) ||
                material.metadata.tags.some(tag => tag.toLowerCase().includes(query)) ||
                material.metadata.category.toLowerCase().includes(query)
            )
        }

        // Filter by category
        if (options.category) {
            results = results.filter(material =>
                material.metadata.category === options.category
            )
        }

        // Filter by tags
        if (options.tags && options.tags.length > 0) {
            results = results.filter(material =>
                options.tags!.some(tag => material.metadata.tags.includes(tag))
            )
        }

        // Filter by texture presence
        if (options.hasTextures !== undefined) {
            results = results.filter(material => {
                const hasTextures = typeof material.properties.albedo !== 'string' ||
                    !!material.properties.normal ||
                    typeof material.properties.roughness !== 'number' ||
                    typeof material.properties.metallic !== 'number'
                return hasTextures === options.hasTextures
            })
        }

        // Filter by complexity
        if (options.complexity) {
            results = results.filter(material => {
                const complexity = material.calculateComplexity()
                switch (options.complexity) {
                    case 'low': return complexity.score <= 2
                    case 'medium': return complexity.score > 2 && complexity.score <= 5
                    case 'high': return complexity.score > 5
                    default: return true
                }
            })
        }

        // Sort results
        if (options.sortBy) {
            results.sort((a, b) => {
                let aValue: any, bValue: any

                switch (options.sortBy) {
                    case 'name':
                        aValue = a.name.toLowerCase()
                        bValue = b.name.toLowerCase()
                        break
                    case 'created':
                        aValue = a.metadata.createdAt
                        bValue = b.metadata.createdAt
                        break
                    case 'modified':
                        aValue = a.metadata.modifiedAt
                        bValue = b.metadata.modifiedAt
                        break
                    case 'complexity':
                        aValue = a.calculateComplexity().score
                        bValue = b.calculateComplexity().score
                        break
                    default:
                        return 0
                }

                if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1
                if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1
                return 0
            })
        }

        // Cache results
        this._cache.set(cacheKey, results)

        return results
    }

    // Create new material
    createMaterial(
        name: string,
        properties: Partial<PBRMaterialProperties> = {},
        libraryId: string = 'default'
    ): PBRMaterial {
        const material = new PBRMaterial(name, properties)
        this.addMaterial(material, libraryId)
        return material
    }

    // Clone material
    cloneMaterial(materialId: string, newName?: string, libraryId?: string): PBRMaterial | null {
        const original = this.getMaterial(materialId)
        if (!original) return null

        const cloned = original.clone(newName)
        this.addMaterial(cloned, libraryId || 'default')
        return cloned
    }

    // Update material
    updateMaterial(materialId: string, properties: Partial<PBRMaterialProperties>): boolean {
        const material = this.getMaterial(materialId)
        if (!material) return false

        material.updateProperties(properties)

        // Validate updated material
        const validation = material.validate()
        if (!validation.valid) {
            console.warn('Material validation warnings:', validation.warnings)
        }

        // Clear cache
        this.clearCache('*')

        return true
    }

    // Get materials by category
    getMaterialsByCategory(category: string): PBRMaterial[] {
        return this.searchMaterials({ category })
    }

    // Get material categories
    getCategories(): string[] {
        const categories = new Set<string>()
        this._materials.forEach(material => {
            categories.add(material.metadata.category)
        })
        return Array.from(categories).sort()
    }

    // Get all tags
    getAllTags(): string[] {
        const tags = new Set<string>()
        this._materials.forEach(material => {
            material.metadata.tags.forEach(tag => tags.add(tag))
        })
        return Array.from(tags).sort()
    }

    // Library management
    createLibrary(name: string, description: string = ''): MaterialLibrary {
        const library: MaterialLibrary = {
            id: this.generateId(),
            name,
            description,
            materials: [],
            metadata: {
                version: '1.0.0',
                author: 'User',
                createdAt: Date.now(),
                tags: []
            }
        }

        this._libraries.set(library.id, library)
        return library
    }

    getLibrary(libraryId: string): MaterialLibrary | undefined {
        return this._libraries.get(libraryId)
    }

    getAllLibraries(): MaterialLibrary[] {
        return Array.from(this._libraries.values())
    }

    // Import/Export
    exportLibrary(libraryId: string): object | null {
        const library = this.getLibrary(libraryId)
        if (!library) return null

        return {
            ...library,
            materials: library.materials.map(material => material.toJSON())
        }
    }

    importLibrary(data: any): MaterialLibrary | null {
        try {
            const library: MaterialLibrary = {
                id: data.id || this.generateId(),
                name: data.name,
                description: data.description || '',
                materials: [],
                metadata: data.metadata || {
                    version: '1.0.0',
                    author: 'Imported',
                    createdAt: Date.now(),
                    tags: []
                }
            }

            // Import materials
            if (data.materials && Array.isArray(data.materials)) {
                data.materials.forEach((materialData: any) => {
                    try {
                        const material = PBRMaterial.fromJSON(materialData)
                        library.materials.push(material)
                        this._materials.set(material.id, material)
                    } catch (error) {
                        console.warn('Failed to import material:', materialData.name, error)
                    }
                })
            }

            this._libraries.set(library.id, library)
            this.clearCache('*')

            return library
        } catch (error) {
            console.error('Failed to import library:', error)
            return null
        }
    }

    // Texture management
    async loadTexture(url: string): Promise<HTMLImageElement | null> {
        return this._textureLoader.load(url)
    }

    getTextureLoader(): TextureLoader {
        return this._textureLoader
    }

    // Cache management
    private clearCache(pattern: string): void {
        if (pattern === '*') {
            this._cache.clear()
        } else {
            const keys = Array.from(this._cache.keys())
            keys.forEach(key => {
                if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) {
                    this._cache.delete(key)
                } else if (key === pattern) {
                    this._cache.delete(key)
                }
            })
        }
    }

    // Utility methods
    private generateId(): string {
        return 'lib_' + Math.random().toString(36).substr(2, 9)
    }

    // Get material statistics
    getStatistics(): {
        totalMaterials: number
        totalLibraries: number
        categoryCounts: Record<string, number>
        complexityDistribution: Record<string, number>
        textureUsage: {
            withTextures: number
            withoutTextures: number
        }
    } {
        const materials = this.getAllMaterials()
        const categoryCounts: Record<string, number> = {}
        const complexityDistribution = { low: 0, medium: 0, high: 0 }
        let withTextures = 0
        let withoutTextures = 0

        materials.forEach(material => {
            // Count categories
            const category = material.metadata.category
            categoryCounts[category] = (categoryCounts[category] || 0) + 1

            // Count complexity
            const complexity = material.calculateComplexity()
            if (complexity.score <= 2) complexityDistribution.low++
            else if (complexity.score <= 5) complexityDistribution.medium++
            else complexityDistribution.high++

            // Count texture usage
            const hasTextures = typeof material.properties.albedo !== 'string' ||
                !!material.properties.normal ||
                typeof material.properties.roughness !== 'number' ||
                typeof material.properties.metallic !== 'number'

            if (hasTextures) withTextures++
            else withoutTextures++
        })

        return {
            totalMaterials: materials.length,
            totalLibraries: this._libraries.size,
            categoryCounts,
            complexityDistribution,
            textureUsage: { withTextures, withoutTextures }
        }
    }

    // Cleanup
    dispose(): void {
        this._materials.clear()
        this._libraries.clear()
        this._cache.clear()
        this._textureLoader.dispose()
    }
}

// Singleton instance
let materialManagerInstance: MaterialManager | null = null

export function getMaterialManager(): MaterialManager {
    if (!materialManagerInstance) {
        materialManagerInstance = new MaterialManager()
    }
    return materialManagerInstance
}

export function createMaterialManager(): MaterialManager {
    materialManagerInstance = new MaterialManager()
    return materialManagerInstance
}