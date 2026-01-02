/**
 * خدمة إدارة هيكل مجلدات الأصول في userData
 * Asset Directory Service for managing asset folder structure in userData
 */

import { getElectronService } from './ElectronService'

export interface AssetDirectory {
    path: string
    name: string
    category: string
    created: number
    modified: number
    size: number
    fileCount: number
}

export interface AssetDirectoryStructure {
    root: string
    categories: Record<string, AssetDirectory>
    totalSize: number
    totalFiles: number
}

export class AssetDirectoryService {
    private _electronService = getElectronService()
    private _initialized = false
    private _structure: AssetDirectoryStructure | null = null

    constructor() {
        this.initialize()
    }

    // Initialize asset directory structure
    async initialize(): Promise<void> {
        if (this._initialized) return

        try {
            // Get userData path from main process
            const userDataPath = await this._electronService.getUserDataPath()
            const assetsRootPath = `${userDataPath}/assets`

            // Create root assets directory if it doesn't exist
            await this._electronService.ensureDirectory(assetsRootPath)

            // Create category directories
            const categories = [
                'doors',      // الأبواب
                'windows',    // النوافذ
                'furniture',  // الأثاث
                'lighting',   // الإضاءة
                'wood',       // خشب
                'metal',      // معدن
                'concrete',   // خرسانة
                'brick',      // طوب
                'stone',      // حجر
                'glass',      // زجاج
                'fabric',     // قماش
                'plastic',    // بلاستيك
                'ceramic',    // سيراميك
                'paint',      // دهان
                'general'     // عام
            ]

            const categoryDirs: Record<string, AssetDirectory> = {}

            for (const category of categories) {
                const categoryPath = `${assetsRootPath}/${category}`
                await this._electronService.ensureDirectory(categoryPath)

                // Create subdirectories for organization
                await this._electronService.ensureDirectory(`${categoryPath}/textures`)
                await this._electronService.ensureDirectory(`${categoryPath}/models`)
                await this._electronService.ensureDirectory(`${categoryPath}/thumbnails`)

                // Get directory stats
                const stats = await this._electronService.getDirectoryStats(categoryPath)

                categoryDirs[category] = {
                    path: categoryPath,
                    name: this.getCategoryDisplayName(category),
                    category,
                    created: stats.created,
                    modified: stats.modified,
                    size: stats.size,
                    fileCount: stats.fileCount
                }
            }

            // Calculate total stats
            const totalSize = Object.values(categoryDirs).reduce((sum, dir) => sum + dir.size, 0)
            const totalFiles = Object.values(categoryDirs).reduce((sum, dir) => sum + dir.fileCount, 0)

            this._structure = {
                root: assetsRootPath,
                categories: categoryDirs,
                totalSize,
                totalFiles
            }

            this._initialized = true

        } catch (error) {
            console.error('Failed to initialize asset directory structure:', error)
            throw error
        }
    }

    // Get asset directory structure
    async getStructure(): Promise<AssetDirectoryStructure> {
        if (!this._initialized) {
            await this.initialize()
        }

        if (!this._structure) {
            throw new Error('Asset directory structure not initialized')
        }

        return this._structure
    }

    // Get category directory path
    async getCategoryPath(category: string): Promise<string> {
        const structure = await this.getStructure()
        const categoryDir = structure.categories[category]

        if (!categoryDir) {
            throw new Error(`Category directory not found: ${category}`)
        }

        return categoryDir.path
    }

    // Get texture directory path for category
    async getTextureDirectoryPath(category: string): Promise<string> {
        const categoryPath = await this.getCategoryPath(category)
        return `${categoryPath}/textures`
    }

    // Get model directory path for category
    async getModelDirectoryPath(category: string): Promise<string> {
        const categoryPath = await this.getCategoryPath(category)
        return `${categoryPath}/models`
    }

    // Get thumbnail directory path for category
    async getThumbnailDirectoryPath(category: string): Promise<string> {
        const categoryPath = await this.getCategoryPath(category)
        return `${categoryPath}/thumbnails`
    }

    // Save asset file to appropriate directory
    async saveAssetFile(
        category: string,
        filename: string,
        data: Blob,
        type: 'texture' | 'model' | 'thumbnail' = 'texture'
    ): Promise<string> {
        let directoryPath: string

        switch (type) {
            case 'texture':
                directoryPath = await this.getTextureDirectoryPath(category)
                break
            case 'model':
                directoryPath = await this.getModelDirectoryPath(category)
                break
            case 'thumbnail':
                directoryPath = await this.getThumbnailDirectoryPath(category)
                break
            default:
                throw new Error(`Unknown asset type: ${type}`)
        }

        // Ensure filename is safe
        const safeFilename = this.sanitizeFilename(filename)
        const filePath = `${directoryPath}/${safeFilename}`

        // Convert blob to buffer
        const buffer = await data.arrayBuffer()

        // Save file through electron service
        await this._electronService.saveFile(filePath, buffer)

        // Update directory stats
        await this.updateDirectoryStats(category)

        return filePath
    }

    // Load asset file from directory
    async loadAssetFile(filePath: string): Promise<Blob> {
        const buffer = await this._electronService.loadFile(filePath)
        return new Blob([buffer])
    }

    // Delete asset file
    async deleteAssetFile(filePath: string): Promise<void> {
        await this._electronService.deleteFile(filePath)

        // Update directory stats for the category
        const category = this.extractCategoryFromPath(filePath)
        if (category) {
            await this.updateDirectoryStats(category)
        }
    }

    // List files in category directory
    async listCategoryFiles(
        category: string,
        type: 'texture' | 'model' | 'thumbnail' = 'texture'
    ): Promise<string[]> {
        let directoryPath: string

        switch (type) {
            case 'texture':
                directoryPath = await this.getTextureDirectoryPath(category)
                break
            case 'model':
                directoryPath = await this.getModelDirectoryPath(category)
                break
            case 'thumbnail':
                directoryPath = await this.getThumbnailDirectoryPath(category)
                break
            default:
                throw new Error(`Unknown asset type: ${type}`)
        }

        return await this._electronService.listDirectory(directoryPath)
    }

    // Clean up empty directories
    async cleanupEmptyDirectories(): Promise<void> {
        if (!this._structure) return

        for (const category of Object.keys(this._structure.categories)) {
            const categoryPath = await this.getCategoryPath(category)

            // Check subdirectories
            const subdirs = ['textures', 'models', 'thumbnails']
            for (const subdir of subdirs) {
                const subdirPath = `${categoryPath}/${subdir}`
                const files = await this._electronService.listDirectory(subdirPath)

                if (files.length === 0) {
                    // Directory is empty, but we keep it for organization
                    // Could add logic here to remove if desired
                }
            }
        }
    }

    // Get storage usage statistics
    async getStorageStats(): Promise<{
        totalSize: number
        totalFiles: number
        categoryBreakdown: Record<string, { size: number; files: number }>
        largestFiles: Array<{ path: string; size: number; category: string }>
    }> {
        const structure = await this.getStructure()
        const categoryBreakdown: Record<string, { size: number; files: number }> = {}
        const largestFiles: Array<{ path: string; size: number; category: string }> = []

        for (const [category, dir] of Object.entries(structure.categories)) {
            categoryBreakdown[category] = {
                size: dir.size,
                files: dir.fileCount
            }

            // Get largest files in this category
            const files = await this.listCategoryFiles(category, 'texture')
            for (const file of files) {
                const filePath = `${await this.getTextureDirectoryPath(category)}/${file}`
                const stats = await this._electronService.getFileStats(filePath)
                largestFiles.push({
                    path: filePath,
                    size: stats.size,
                    category
                })
            }
        }

        // Sort largest files
        largestFiles.sort((a, b) => b.size - a.size)

        return {
            totalSize: structure.totalSize,
            totalFiles: structure.totalFiles,
            categoryBreakdown,
            largestFiles: largestFiles.slice(0, 20) // Top 20 largest files
        }
    }

    // Update directory statistics
    private async updateDirectoryStats(category: string): Promise<void> {
        if (!this._structure) return

        const categoryPath = await this.getCategoryPath(category)
        const stats = await this._electronService.getDirectoryStats(categoryPath)

        this._structure.categories[category] = {
            ...this._structure.categories[category],
            modified: stats.modified,
            size: stats.size,
            fileCount: stats.fileCount
        }

        // Recalculate totals
        this._structure.totalSize = Object.values(this._structure.categories)
            .reduce((sum, dir) => sum + dir.size, 0)
        this._structure.totalFiles = Object.values(this._structure.categories)
            .reduce((sum, dir) => sum + dir.fileCount, 0)
    }

    // Get category display name in Arabic
    private getCategoryDisplayName(category: string): string {
        const displayNames: Record<string, string> = {
            doors: 'الأبواب',
            windows: 'النوافذ',
            furniture: 'الأثاث',
            lighting: 'الإضاءة',
            wood: 'خشب',
            metal: 'معدن',
            concrete: 'خرسانة',
            brick: 'طوب',
            stone: 'حجر',
            glass: 'زجاج',
            fabric: 'قماش',
            plastic: 'بلاستيك',
            ceramic: 'سيراميك',
            paint: 'دهان',
            general: 'عام'
        }

        return displayNames[category] || category
    }

    // Sanitize filename for safe storage
    private sanitizeFilename(filename: string): string {
        // Remove or replace unsafe characters
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .toLowerCase()
    }

    // Extract category from file path
    private extractCategoryFromPath(filePath: string): string | null {
        if (!this._structure) return null

        for (const [category, dir] of Object.entries(this._structure.categories)) {
            if (filePath.startsWith(dir.path)) {
                return category
            }
        }

        return null
    }

    // Cleanup
    dispose(): void {
        this._structure = null
        this._initialized = false
    }
}

// Singleton instance
let assetDirectoryServiceInstance: AssetDirectoryService | null = null

export function getAssetDirectoryService(): AssetDirectoryService {
    if (!assetDirectoryServiceInstance) {
        assetDirectoryServiceInstance = new AssetDirectoryService()
    }
    return assetDirectoryServiceInstance
}

export function createAssetDirectoryService(): AssetDirectoryService {
    assetDirectoryServiceInstance = new AssetDirectoryService()
    return assetDirectoryServiceInstance
}