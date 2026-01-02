/**
 * خدمة إدارة الأصول المتقدمة
 * Advanced Asset Management Service with drag & drop, search, and optimization
 */

import { getMaterialManager } from '../materials/MaterialManager'
import { TextureLoader } from '../materials/TextureLoader'
import { getUVMapper } from '../materials/UVMapper'
import { getAssetDirectoryService } from './AssetDirectoryService'

export interface AssetMetadata {
    id: string
    name: string
    description: string
    category: string
    tags: string[]
    fileSize: number
    dimensions: { width: number; height: number }
    format: string
    createdAt: number
    modifiedAt: number
    author?: string
    version: string
    thumbnail?: string
    hash: string
    usage: {
        projects: string[]
        lastUsed: number
        useCount: number
    }
}

export interface AssetImportOptions {
    generateThumbnail?: boolean
    optimizeForGame?: boolean
    maxSize?: number
    quality?: 'low' | 'medium' | 'high'
    category?: string
    tags?: string[]
    detectDuplicates?: boolean
}

export interface AssetImportResult {
    success: boolean
    asset?: AssetMetadata
    error?: string
    warnings: string[]
    duplicateOf?: string
    optimizations: string[]
}

export interface AssetSearchOptions {
    query?: string
    category?: string
    tags?: string[]
    format?: string[]
    sizeRange?: { min: number; max: number }
    dateRange?: { start: number; end: number }
    sortBy?: 'name' | 'date' | 'size' | 'usage'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
}

export interface AssetSearchResult {
    assets: AssetMetadata[]
    total: number
    hasMore: boolean
    facets: {
        categories: Record<string, number>
        tags: Record<string, number>
        formats: Record<string, number>
    }
}

export interface AssetOptimizationOptions {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
    removeMetadata?: boolean
    progressive?: boolean
}

export interface AssetOptimizationResult {
    originalSize: number
    optimizedSize: number
    compressionRatio: number
    optimizedData: Blob
    warnings: string[]
}

export class AssetManagementService {
    private _assets: Map<string, AssetMetadata> = new Map()
    private _assetData: Map<string, Blob> = new Map()
    private _thumbnails: Map<string, string> = new Map()
    private _hashIndex: Map<string, string> = new Map() // hash -> assetId
    private _categoryIndex: Map<string, Set<string>> = new Map()
    private _tagIndex: Map<string, Set<string>> = new Map()
    private _textureLoader: TextureLoader
    private _materialManager = getMaterialManager()
    private _uvMapper = getUVMapper()
    private _directoryService = getAssetDirectoryService()

    constructor() {
        this._textureLoader = new TextureLoader()
        this.initializeIndexes()
        this.loadExistingAssets()
    }

    private initializeIndexes(): void {
        // Initialize category and tag indexes
        this._categoryIndex.set('all', new Set())
        this._tagIndex.set('all', new Set())
    }

    // Load existing assets from directory structure
    private async loadExistingAssets(): Promise<void> {
        try {
            await this._directoryService.initialize()
            // TODO: Scan existing files and rebuild asset metadata
            // This would involve reading metadata files or scanning directories
        } catch (error) {
            console.error('Failed to load existing assets:', error)
        }
    }

    // Import single asset
    async importAsset(
        file: File,
        options: AssetImportOptions = {}
    ): Promise<AssetImportResult> {
        try {
            const warnings: string[] = []
            const optimizations: string[] = []

            // Validate file
            const validation = this.validateAssetFile(file)
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error,
                    warnings: [],
                    optimizations: []
                }
            }

            // Calculate file hash for duplicate detection
            const hash = await this.calculateFileHash(file)

            if (options.detectDuplicates !== false) {
                const existingAssetId = this._hashIndex.get(hash)
                if (existingAssetId) {
                    return {
                        success: false,
                        error: 'Asset already exists',
                        warnings: [],
                        optimizations: [],
                        duplicateOf: existingAssetId
                    }
                }
            }

            // Get image dimensions
            const dimensions = await this.getImageDimensions(file)

            // Optimize if requested
            let finalFile = file
            if (options.optimizeForGame) {
                const optimizationResult = await this.optimizeAsset(file, {
                    maxWidth: options.maxSize || 2048,
                    maxHeight: options.maxSize || 2048,
                    quality: options.quality === 'high' ? 0.9 : options.quality === 'low' ? 0.6 : 0.8,
                    format: 'webp',
                    removeMetadata: true
                })

                if (optimizationResult.compressionRatio > 0.1) {
                    finalFile = new File([optimizationResult.optimizedData], file.name, {
                        type: optimizationResult.optimizedData.type
                    })
                    optimizations.push(`Compressed by ${(optimizationResult.compressionRatio * 100).toFixed(1)}%`)
                }

                warnings.push(...optimizationResult.warnings)
            }

            // Create asset metadata
            const assetId = this.generateAssetId()
            const now = Date.now()

            const asset: AssetMetadata = {
                id: assetId,
                name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                description: '',
                category: options.category || this.detectCategory(file.name),
                tags: options.tags || this.generateTags(file.name),
                fileSize: finalFile.size,
                dimensions,
                format: this.getFileFormat(finalFile),
                createdAt: now,
                modifiedAt: now,
                version: '1.0.0',
                hash,
                usage: {
                    projects: [],
                    lastUsed: 0,
                    useCount: 0
                }
            }

            // Generate thumbnail if requested
            if (options.generateThumbnail !== false) {
                try {
                    const thumbnail = await this.generateThumbnail(finalFile)
                    asset.thumbnail = thumbnail
                    this._thumbnails.set(assetId, thumbnail)
                } catch (error) {
                    warnings.push('Failed to generate thumbnail')
                }
            }

            // Store asset data to file system
            const texturePath = await this._directoryService.saveAssetFile(
                asset.category,
                `${assetId}.${this.getFileExtension(finalFile)}`,
                finalFile,
                'texture'
            )

            // Store thumbnail if generated
            if (asset.thumbnail) {
                const thumbnailBlob = this.dataURLToBlob(asset.thumbnail)
                await this._directoryService.saveAssetFile(
                    asset.category,
                    `${assetId}_thumb.jpg`,
                    thumbnailBlob,
                    'thumbnail'
                )
            }

            // Store asset metadata
            this._assets.set(assetId, asset)
            this._assetData.set(assetId, finalFile)
            this._hashIndex.set(hash, assetId)

            // Update indexes
            this.updateIndexes(asset)

            // Save metadata to file system
            await this.saveAssetMetadata(asset)

            return {
                success: true,
                asset,
                warnings,
                optimizations
            }

        } catch (error) {
            return {
                success: false,
                error: `Import failed: ${error}`,
                warnings: [],
                optimizations: []
            }
        }
    }

    // Import multiple assets
    async importAssets(
        files: FileList | File[],
        options: AssetImportOptions = {},
        onProgress?: (progress: { completed: number; total: number; current: string }) => void
    ): Promise<AssetImportResult[]> {
        const results: AssetImportResult[] = []
        const fileArray = Array.from(files)

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i]

            if (onProgress) {
                onProgress({
                    completed: i,
                    total: fileArray.length,
                    current: file.name
                })
            }

            const result = await this.importAsset(file, options)
            results.push(result)
        }

        if (onProgress) {
            onProgress({
                completed: fileArray.length,
                total: fileArray.length,
                current: ''
            })
        }

        return results
    }

    // Search assets
    searchAssets(options: AssetSearchOptions = {}): AssetSearchResult {
        let assets = Array.from(this._assets.values())

        // Apply filters
        if (options.query) {
            const query = options.query.toLowerCase()
            assets = assets.filter(asset =>
                asset.name.toLowerCase().includes(query) ||
                asset.description.toLowerCase().includes(query) ||
                asset.tags.some(tag => tag.toLowerCase().includes(query))
            )
        }

        if (options.category && options.category !== 'all') {
            assets = assets.filter(asset => asset.category === options.category)
        }

        if (options.tags && options.tags.length > 0) {
            assets = assets.filter(asset =>
                options.tags!.some(tag => asset.tags.includes(tag))
            )
        }

        if (options.format && options.format.length > 0) {
            assets = assets.filter(asset =>
                options.format!.includes(asset.format)
            )
        }

        if (options.sizeRange) {
            assets = assets.filter(asset =>
                asset.fileSize >= options.sizeRange!.min &&
                asset.fileSize <= options.sizeRange!.max
            )
        }

        if (options.dateRange) {
            assets = assets.filter(asset =>
                asset.createdAt >= options.dateRange!.start &&
                asset.createdAt <= options.dateRange!.end
            )
        }

        // Sort results
        if (options.sortBy) {
            assets.sort((a, b) => {
                let aValue: any, bValue: any

                switch (options.sortBy) {
                    case 'name':
                        aValue = a.name.toLowerCase()
                        bValue = b.name.toLowerCase()
                        break
                    case 'date':
                        aValue = a.createdAt
                        bValue = b.createdAt
                        break
                    case 'size':
                        aValue = a.fileSize
                        bValue = b.fileSize
                        break
                    case 'usage':
                        aValue = a.usage.useCount
                        bValue = b.usage.useCount
                        break
                    default:
                        return 0
                }

                if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1
                if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1
                return 0
            })
        }

        // Calculate facets
        const facets = this.calculateFacets(assets)

        // Apply pagination
        const total = assets.length
        const offset = options.offset || 0
        const limit = options.limit || 50

        assets = assets.slice(offset, offset + limit)

        return {
            assets,
            total,
            hasMore: offset + limit < total,
            facets
        }
    }

    // Get asset by ID
    getAsset(assetId: string): AssetMetadata | undefined {
        return this._assets.get(assetId)
    }

    // Get asset data
    getAssetData(assetId: string): Blob | undefined {
        return this._assetData.get(assetId)
    }

    // Get asset thumbnail
    getAssetThumbnail(assetId: string): string | undefined {
        return this._thumbnails.get(assetId)
    }

    // Update asset metadata
    updateAsset(assetId: string, updates: Partial<AssetMetadata>): boolean {
        const asset = this._assets.get(assetId)
        if (!asset) return false

        // Remove from old indexes
        this.removeFromIndexes(asset)

        // Apply updates
        const updatedAsset = {
            ...asset,
            ...updates,
            modifiedAt: Date.now()
        }

        this._assets.set(assetId, updatedAsset)

        // Update indexes
        this.updateIndexes(updatedAsset)

        return true
    }

    // Delete asset
    deleteAsset(assetId: string): boolean {
        const asset = this._assets.get(assetId)
        if (!asset) return false

        // Remove from all indexes
        this.removeFromIndexes(asset)
        this._hashIndex.delete(asset.hash)

        // Remove data
        this._assets.delete(assetId)
        this._assetData.delete(assetId)
        this._thumbnails.delete(assetId)

        return true
    }

    // Optimize asset
    async optimizeAsset(
        file: File,
        options: AssetOptimizationOptions = {}
    ): Promise<AssetOptimizationResult> {
        const warnings: string[] = []
        const originalSize = file.size

        try {
            // Create canvas for image processing
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                throw new Error('Could not create canvas context')
            }

            // Load image
            const img = await this.loadImageFromFile(file)

            // Calculate new dimensions
            let { width, height } = img
            const maxWidth = options.maxWidth || 2048
            const maxHeight = options.maxHeight || 2048

            if (width > maxWidth || height > maxHeight) {
                const aspectRatio = width / height
                if (width > height) {
                    width = maxWidth
                    height = maxWidth / aspectRatio
                } else {
                    height = maxHeight
                    width = maxHeight * aspectRatio
                }
                warnings.push(`Resized from ${img.width}x${img.height} to ${Math.round(width)}x${Math.round(height)}`)
            }

            // Set canvas size
            canvas.width = width
            canvas.height = height

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height)

            // Convert to blob
            const quality = options.quality || 0.8
            const format = options.format || 'webp'
            const mimeType = `image/${format}`

            const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error('Failed to create optimized blob'))
                    }
                }, mimeType, quality)
            })

            const optimizedSize = optimizedBlob.size
            const compressionRatio = (originalSize - optimizedSize) / originalSize

            return {
                originalSize,
                optimizedSize,
                compressionRatio,
                optimizedData: optimizedBlob,
                warnings
            }

        } catch (error) {
            warnings.push(`Optimization failed: ${error}`)

            // Return original file as fallback
            return {
                originalSize,
                optimizedSize: originalSize,
                compressionRatio: 0,
                optimizedData: file,
                warnings
            }
        }
    }

    // Generate thumbnail
    async generateThumbnail(file: File, size = 128): Promise<string> {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('Could not create canvas context')
        }

        const img = await this.loadImageFromFile(file)

        // Calculate thumbnail dimensions (square)
        canvas.width = size
        canvas.height = size

        // Draw image centered and cropped
        const aspectRatio = img.width / img.height
        let drawWidth = size
        let drawHeight = size
        let offsetX = 0
        let offsetY = 0

        if (aspectRatio > 1) {
            // Landscape
            drawHeight = size / aspectRatio
            offsetY = (size - drawHeight) / 2
        } else {
            // Portrait
            drawWidth = size * aspectRatio
            offsetX = (size - drawWidth) / 2
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

        return canvas.toDataURL('image/jpeg', 0.8)
    }

    // Detect duplicates
    findDuplicates(): Array<{ original: AssetMetadata; duplicates: AssetMetadata[] }> {
        const hashGroups = new Map<string, AssetMetadata[]>()

        // Group assets by hash
        this._assets.forEach(asset => {
            const group = hashGroups.get(asset.hash) || []
            group.push(asset)
            hashGroups.set(asset.hash, group)
        })

        // Find groups with multiple assets
        const duplicates: Array<{ original: AssetMetadata; duplicates: AssetMetadata[] }> = []

        hashGroups.forEach(group => {
            if (group.length > 1) {
                // Sort by creation date to find original
                group.sort((a, b) => a.createdAt - b.createdAt)
                const [original, ...dups] = group

                duplicates.push({
                    original,
                    duplicates: dups
                })
            }
        })

        return duplicates
    }

    // Get usage statistics
    getUsageStatistics(): {
        totalAssets: number
        totalSize: number
        categoryDistribution: Record<string, number>
        formatDistribution: Record<string, number>
        sizeDistribution: Record<string, number>
        mostUsed: AssetMetadata[]
        leastUsed: AssetMetadata[]
        duplicates: number
    } {
        const assets = Array.from(this._assets.values())
        const totalAssets = assets.length
        const totalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0)

        const categoryDistribution: Record<string, number> = {}
        const formatDistribution: Record<string, number> = {}
        const sizeDistribution = { small: 0, medium: 0, large: 0 }

        assets.forEach(asset => {
            // Category distribution
            categoryDistribution[asset.category] = (categoryDistribution[asset.category] || 0) + 1

            // Format distribution
            formatDistribution[asset.format] = (formatDistribution[asset.format] || 0) + 1

            // Size distribution
            if (asset.fileSize < 100 * 1024) { // < 100KB
                sizeDistribution.small++
            } else if (asset.fileSize < 1024 * 1024) { // < 1MB
                sizeDistribution.medium++
            } else {
                sizeDistribution.large++
            }
        })

        // Most and least used
        const sortedByUsage = [...assets].sort((a, b) => b.usage.useCount - a.usage.useCount)
        const mostUsed = sortedByUsage.slice(0, 10)
        const leastUsed = sortedByUsage.slice(-10).reverse()

        // Count duplicates
        const duplicates = this.findDuplicates().reduce((sum, group) => sum + group.duplicates.length, 0)

        return {
            totalAssets,
            totalSize,
            categoryDistribution,
            formatDistribution,
            sizeDistribution,
            mostUsed,
            leastUsed,
            duplicates
        }
    }

    // Utility methods
    private validateAssetFile(file: File): { valid: boolean; error?: string } {
        // Check file type
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'Only image files are supported' }
        }

        // Check file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            return { valid: false, error: 'File size exceeds 50MB limit' }
        }

        // Check supported formats
        const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
        if (!supportedFormats.includes(file.type)) {
            return { valid: false, error: `Unsupported format: ${file.type}` }
        }

        return { valid: true }
    }

    private async calculateFileHash(file: File): Promise<string> {
        const buffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        const img = await this.loadImageFromFile(file)
        return { width: img.width, height: img.height }
    }

    private loadImageFromFile(file: File): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = URL.createObjectURL(file)
        })
    }

    private detectCategory(filename: string): string {
        const name = filename.toLowerCase()

        if (name.includes('wood') || name.includes('timber')) return 'wood'
        if (name.includes('metal') || name.includes('steel') || name.includes('iron')) return 'metal'
        if (name.includes('concrete') || name.includes('cement')) return 'concrete'
        if (name.includes('brick')) return 'brick'
        if (name.includes('stone') || name.includes('rock')) return 'stone'
        if (name.includes('glass')) return 'glass'
        if (name.includes('fabric') || name.includes('cloth')) return 'fabric'
        if (name.includes('plastic')) return 'plastic'
        if (name.includes('ceramic') || name.includes('tile')) return 'ceramic'
        if (name.includes('paint')) return 'paint'

        return 'general'
    }

    private generateTags(filename: string): string[] {
        const tags: string[] = []
        const name = filename.toLowerCase()

        // Material tags
        const materials = ['wood', 'metal', 'concrete', 'brick', 'stone', 'glass', 'fabric', 'plastic', 'ceramic']
        materials.forEach(material => {
            if (name.includes(material)) tags.push(material)
        })

        // Finish tags
        if (name.includes('rough')) tags.push('rough')
        if (name.includes('smooth')) tags.push('smooth')
        if (name.includes('polished')) tags.push('polished')
        if (name.includes('matte')) tags.push('matte')
        if (name.includes('glossy')) tags.push('glossy')

        // Color tags
        const colors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'brown', 'gray', 'grey']
        colors.forEach(color => {
            if (name.includes(color)) tags.push(color)
        })

        return tags
    }

    private getFileFormat(file: File): string {
        return file.type.split('/')[1] || 'unknown'
    }

    private generateAssetId(): string {
        return 'asset_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
    }

    private updateIndexes(asset: AssetMetadata): void {
        // Update category index
        if (!this._categoryIndex.has(asset.category)) {
            this._categoryIndex.set(asset.category, new Set())
        }
        this._categoryIndex.get(asset.category)!.add(asset.id)
        this._categoryIndex.get('all')!.add(asset.id)

        // Update tag index
        asset.tags.forEach(tag => {
            if (!this._tagIndex.has(tag)) {
                this._tagIndex.set(tag, new Set())
            }
            this._tagIndex.get(tag)!.add(asset.id)
        })
        this._tagIndex.get('all')!.add(asset.id)
    }

    private removeFromIndexes(asset: AssetMetadata): void {
        // Remove from category index
        this._categoryIndex.get(asset.category)?.delete(asset.id)
        this._categoryIndex.get('all')?.delete(asset.id)

        // Remove from tag index
        asset.tags.forEach(tag => {
            this._tagIndex.get(tag)?.delete(asset.id)
        })
        this._tagIndex.get('all')?.delete(asset.id)
    }

    private calculateFacets(assets: AssetMetadata[]): AssetSearchResult['facets'] {
        const categories: Record<string, number> = {}
        const tags: Record<string, number> = {}
        const formats: Record<string, number> = {}

        assets.forEach(asset => {
            // Count categories
            categories[asset.category] = (categories[asset.category] || 0) + 1

            // Count tags
            asset.tags.forEach(tag => {
                tags[tag] = (tags[tag] || 0) + 1
            })

            // Count formats
            formats[asset.format] = (formats[asset.format] || 0) + 1
        })

        return { categories, tags, formats }
    }

    // Save asset metadata to file system
    private async saveAssetMetadata(asset: AssetMetadata): Promise<void> {
        try {
            const metadataPath = await this._directoryService.getCategoryPath(asset.category)
            const metadataFile = `${metadataPath}/${asset.id}_metadata.json`
            const metadataBlob = new Blob([JSON.stringify(asset, null, 2)], {
                type: 'application/json'
            })
            await this._directoryService.saveAssetFile(
                asset.category,
                `${asset.id}_metadata.json`,
                metadataBlob,
                'texture' // Store in textures directory for now
            )
        } catch (error) {
            console.error('Failed to save asset metadata:', error)
        }
    }

    // Load asset metadata from file system
    private async loadAssetMetadata(assetId: string, category: string): Promise<AssetMetadata | null> {
        try {
            const metadataPath = await this._directoryService.getCategoryPath(category)
            const metadataFile = `${metadataPath}/textures/${assetId}_metadata.json`
            const metadataBlob = await this._directoryService.loadAssetFile(metadataFile)
            const metadataText = await metadataBlob.text()
            return JSON.parse(metadataText) as AssetMetadata
        } catch (error) {
            console.error('Failed to load asset metadata:', error)
            return null
        }
    }

    // Convert data URL to Blob
    private dataURLToBlob(dataURL: string): Blob {
        const arr = dataURL.split(',')
        const mime = arr[0].match(/:(.*?);/)![1]
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
        }
        return new Blob([u8arr], { type: mime })
    }

    // Get file extension from file
    private getFileExtension(file: File): string {
        const name = file.name
        const lastDot = name.lastIndexOf('.')
        return lastDot > 0 ? name.substring(lastDot + 1) : 'bin'
    }

    // Cleanup
    dispose(): void {
        this._assets.clear()
        this._assetData.clear()
        this._thumbnails.clear()
        this._hashIndex.clear()
        this._categoryIndex.clear()
        this._tagIndex.clear()
        this._textureLoader.dispose()
        this._directoryService.dispose()
    }
}

// Singleton instance
let assetManagementServiceInstance: AssetManagementService | null = null

export function getAssetManagementService(): AssetManagementService {
    if (!assetManagementServiceInstance) {
        assetManagementServiceInstance = new AssetManagementService()
    }
    return assetManagementServiceInstance
}

export function createAssetManagementService(): AssetManagementService {
    assetManagementServiceInstance = new AssetManagementService()
    return assetManagementServiceInstance
}