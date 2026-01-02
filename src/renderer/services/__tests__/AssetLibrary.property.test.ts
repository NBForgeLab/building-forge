/**
 * اختبارات خاصية مكتبة الأصول
 * Asset Library Property Tests
 * 
 * الخصائص المختبرة:
 * - الخاصية 46: دعم صيغ النسيج المتعددة
 * - الخاصية 47: إنتاج المواد التلقائي  
 * - الخاصية 48: كشف وإعادة استخدام النسيج المكرر
 */

import * as fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    AssetDirectoryService,
    createAssetDirectoryService
} from '../AssetDirectoryService'
import {
    AssetManagementService,
    createAssetManagementService
} from '../AssetManagementService'

// Mock electron service
vi.mock('../ElectronService', () => ({
    getElectronService: () => ({
        getUserDataPath: () => Promise.resolve('/mock/userdata'),
        ensureDirectory: () => Promise.resolve(),
        getDirectoryStats: () => Promise.resolve({
            created: Date.now(),
            modified: Date.now(),
            size: 0,
            fileCount: 0
        }),
        saveFile: () => Promise.resolve(),
        loadFile: () => Promise.resolve(new ArrayBuffer(0)),
        deleteFile: () => Promise.resolve(),
        listDirectory: () => Promise.resolve([]),
        getFileStats: () => Promise.resolve({ size: 1024 })
    })
}))

// Mock material manager
vi.mock('../../materials/MaterialManager', () => ({
    getMaterialManager: () => ({
        createMaterial: vi.fn(),
        getMaterial: vi.fn(),
        updateMaterial: vi.fn()
    })
}))

// Mock texture loader
vi.mock('../../materials/TextureLoader', () => ({
    TextureLoader: class {
        dispose() { }
    }
}))

// Mock UV mapper
vi.mock('../../materials/UVMapper', () => ({
    getUVMapper: () => ({
        generateUVMapping: vi.fn()
    })
}))

describe('Asset Library Property Tests', () => {
    let assetService: AssetManagementService
    let directoryService: AssetDirectoryService

    beforeEach(async () => {
        // Create fresh instances for each test
        assetService = createAssetManagementService()
        directoryService = createAssetDirectoryService()

        // Initialize directory service
        await directoryService.initialize()
    })

    afterEach(() => {
        assetService.dispose()
        directoryService.dispose()
    })

    /**
     * الخاصية 46: دعم صيغ النسيج المتعددة
     * Property 46: Multiple Texture Format Support
     * 
     * تتحقق من: المتطلبات 12.2
     * Verifies: Requirements 12.2
     */
    describe('Property 46: Multiple Texture Format Support', () => {
        const supportedFormats = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']
        const unsupportedFormats = ['tiff', 'svg', 'pdf', 'txt', 'exe']

        it('should support all standard texture formats', () => {
            fc.assert(fc.property(
                fc.constantFrom(...supportedFormats),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.integer({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
                async (format, filename, fileSize) => {
                    // Create mock file with supported format
                    const mockFile = new File(
                        [new ArrayBuffer(fileSize)],
                        `${filename}.${format}`,
                        { type: `image/${format}` }
                    )

                    // Import should succeed for supported formats
                    const result = await assetService.importAsset(mockFile, {
                        generateThumbnail: false,
                        optimizeForGame: false,
                        detectDuplicates: false
                    })

                    expect(result.success).toBe(true)
                    expect(result.asset?.format).toBe(format)
                    expect(result.error).toBeUndefined()
                }
            ), { numRuns: 100 })
        })

        it('should reject unsupported formats', () => {
            fc.assert(fc.property(
                fc.constantFrom(...unsupportedFormats),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.integer({ min: 1024, max: 1024 * 1024 }),
                async (format, filename, fileSize) => {
                    // Create mock file with unsupported format
                    const mockFile = new File(
                        [new ArrayBuffer(fileSize)],
                        `${filename}.${format}`,
                        { type: `application/${format}` }
                    )

                    // Import should fail for unsupported formats
                    const result = await assetService.importAsset(mockFile)

                    expect(result.success).toBe(false)
                    expect(result.error).toContain('Unsupported format')
                }
            ), { numRuns: 100 })
        })

        it('should handle format conversion during optimization', () => {
            fc.assert(fc.property(
                fc.constantFrom('png', 'jpg', 'bmp'),
                fc.string({ minLength: 1, maxLength: 30 }),
                fc.integer({ min: 2048, max: 4096 }),
                async (inputFormat, filename, dimension) => {
                    // Create large mock file that needs optimization
                    const mockFile = new File(
                        [new ArrayBuffer(dimension * dimension * 4)], // RGBA
                        `${filename}.${inputFormat}`,
                        { type: `image/${inputFormat}` }
                    )

                    const result = await assetService.importAsset(mockFile, {
                        optimizeForGame: true,
                        quality: 'medium',
                        maxSize: 1024
                    })

                    expect(result.success).toBe(true)
                    expect(result.optimizations.length).toBeGreaterThan(0)

                    // Should indicate format conversion or compression
                    const hasOptimization = result.optimizations.some(opt =>
                        opt.includes('Compressed') || opt.includes('Resized')
                    )
                    expect(hasOptimization).toBe(true)
                }
            ), { numRuns: 100 })
        })
    })

    /**
     * الخاصية 47: إنتاج المواد التلقائي
     * Property 47: Automatic Material Generation
     * 
     * تتحقق من: المتطلبات 12.3
     * Verifies: Requirements 12.3
     */
    describe('Property 47: Automatic Material Generation', () => {
        it('should automatically detect and categorize materials', () => {
            fc.assert(fc.property(
                fc.constantFrom('wood', 'metal', 'concrete', 'glass', 'fabric'),
                fc.constantFrom('rough', 'smooth', 'polished', 'matte', 'glossy'),
                fc.constantFrom('red', 'blue', 'green', 'brown', 'white'),
                async (material, finish, color) => {
                    const filename = `${color}_${material}_${finish}_texture`
                    const mockFile = new File(
                        [new ArrayBuffer(1024 * 1024)],
                        `${filename}.png`,
                        { type: 'image/png' }
                    )

                    const result = await assetService.importAsset(mockFile)

                    expect(result.success).toBe(true)
                    expect(result.asset?.category).toBe(material)

                    // Should generate appropriate tags
                    expect(result.asset?.tags).toContain(material)
                    expect(result.asset?.tags).toContain(finish)
                    expect(result.asset?.tags).toContain(color)
                }
            ), { numRuns: 100 })
        })

        it('should generate thumbnails automatically', () => {
            fc.assert(fc.property(
                fc.string({ minLength: 1, maxLength: 30 }),
                fc.integer({ min: 512, max: 2048 }),
                async (filename, dimension) => {
                    const mockFile = new File(
                        [new ArrayBuffer(dimension * dimension * 3)],
                        `${filename}.jpg`,
                        { type: 'image/jpeg' }
                    )

                    const result = await assetService.importAsset(mockFile, {
                        generateThumbnail: true
                    })

                    expect(result.success).toBe(true)
                    expect(result.asset?.thumbnail).toBeDefined()
                    expect(result.asset?.thumbnail).toMatch(/^data:image\/jpeg;base64,/)
                }
            ), { numRuns: 100 })
        })

        it('should preserve original dimensions in metadata', () => {
            fc.assert(fc.property(
                fc.integer({ min: 64, max: 4096 }),
                fc.integer({ min: 64, max: 4096 }),
                async (width, height) => {
                    // Mock image dimensions
                    const mockFile = new File(
                        [new ArrayBuffer(width * height * 4)],
                        'test_texture.png',
                        { type: 'image/png' }
                    )

                    // Mock the image loading to return specific dimensions
                    const originalLoad = assetService['loadImageFromFile']
                    assetService['loadImageFromFile'] = vi.fn().mockResolvedValue({
                        width,
                        height
                    })

                    const result = await assetService.importAsset(mockFile)

                    expect(result.success).toBe(true)
                    expect(result.asset?.dimensions.width).toBe(width)
                    expect(result.asset?.dimensions.height).toBe(height)

                    // Restore original method
                    assetService['loadImageFromFile'] = originalLoad
                }
            ), { numRuns: 100 })
        })
    })

    /**
     * الخاصية 48: كشف وإعادة استخدام النسيج المكرر
     * Property 48: Duplicate Texture Detection and Reuse
     * 
     * تتحقق من: المتطلبات 12.4
     * Verifies: Requirements 12.4
     */
    describe('Property 48: Duplicate Texture Detection and Reuse', () => {
        it('should detect identical files by content hash', () => {
            fc.assert(fc.property(
                fc.uint8Array({ minLength: 1024, maxLength: 10240 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                async (fileContent, filename1, filename2) => {
                    // Create two files with identical content but different names
                    const file1 = new File([fileContent], `${filename1}.png`, { type: 'image/png' })
                    const file2 = new File([fileContent], `${filename2}.png`, { type: 'image/png' })

                    // Import first file
                    const result1 = await assetService.importAsset(file1, {
                        detectDuplicates: true
                    })

                    expect(result1.success).toBe(true)
                    const originalAssetId = result1.asset?.id

                    // Import second file (duplicate)
                    const result2 = await assetService.importAsset(file2, {
                        detectDuplicates: true
                    })

                    expect(result2.success).toBe(false)
                    expect(result2.error).toContain('already exists')
                    expect(result2.duplicateOf).toBe(originalAssetId)
                }
            ), { numRuns: 100 })
        })

        it('should allow duplicates when detection is disabled', () => {
            fc.assert(fc.property(
                fc.uint8Array({ minLength: 1024, maxLength: 10240 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                async (fileContent, filename1, filename2) => {
                    // Create two files with identical content
                    const file1 = new File([fileContent], `${filename1}.png`, { type: 'image/png' })
                    const file2 = new File([fileContent], `${filename2}.png`, { type: 'image/png' })

                    // Import both files with duplicate detection disabled
                    const result1 = await assetService.importAsset(file1, {
                        detectDuplicates: false
                    })

                    const result2 = await assetService.importAsset(file2, {
                        detectDuplicates: false
                    })

                    expect(result1.success).toBe(true)
                    expect(result2.success).toBe(true)
                    expect(result1.asset?.id).not.toBe(result2.asset?.id)
                }
            ), { numRuns: 100 })
        })

        it('should find and report all duplicates', () => {
            fc.assert(fc.property(
                fc.array(fc.uint8Array({ minLength: 512, maxLength: 2048 }), { minLength: 2, maxLength: 10 }),
                fc.integer({ min: 2, max: 5 }),
                async (uniqueContents, duplicateCount) => {
                    // Import unique files
                    const originalAssets = []
                    for (let i = 0; i < uniqueContents.length; i++) {
                        const file = new File([uniqueContents[i]], `original_${i}.png`, { type: 'image/png' })
                        const result = await assetService.importAsset(file, { detectDuplicates: false })
                        if (result.success) {
                            originalAssets.push(result.asset!)
                        }
                    }

                    // Import duplicates of the first file
                    const firstContent = uniqueContents[0]
                    for (let i = 0; i < duplicateCount; i++) {
                        const file = new File([firstContent], `duplicate_${i}.png`, { type: 'image/png' })
                        await assetService.importAsset(file, { detectDuplicates: false })
                    }

                    // Find duplicates
                    const duplicates = assetService.findDuplicates()

                    // Should find at least one group with duplicates
                    expect(duplicates.length).toBeGreaterThan(0)

                    // The first group should have the expected number of duplicates
                    const firstGroup = duplicates[0]
                    expect(firstGroup.duplicates.length).toBe(duplicateCount)
                }
            ), { numRuns: 100 })
        })

        it('should maintain usage statistics correctly', () => {
            fc.assert(fc.property(
                fc.array(fc.uint8Array({ minLength: 512, maxLength: 1024 }), { minLength: 3, maxLength: 8 }),
                fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 3, maxLength: 8 }),
                async (fileContents, usageCounts) => {
                    const assetIds = []

                    // Import assets
                    for (let i = 0; i < fileContents.length; i++) {
                        const file = new File([fileContents[i]], `asset_${i}.png`, { type: 'image/png' })
                        const result = await assetService.importAsset(file)
                        if (result.success) {
                            assetIds.push(result.asset!.id)
                        }
                    }

                    // Simulate usage
                    for (let i = 0; i < assetIds.length && i < usageCounts.length; i++) {
                        const assetId = assetIds[i]
                        const useCount = usageCounts[i]

                        for (let j = 0; j < useCount; j++) {
                            const asset = assetService.getAsset(assetId)!
                            assetService.updateAsset(assetId, {
                                usage: {
                                    ...asset.usage,
                                    lastUsed: Date.now(),
                                    useCount: asset.usage.useCount + 1
                                }
                            })
                        }
                    }

                    // Get usage statistics
                    const stats = assetService.getUsageStatistics()

                    expect(stats.totalAssets).toBe(assetIds.length)
                    expect(stats.mostUsed.length).toBeGreaterThan(0)
                    expect(stats.leastUsed.length).toBeGreaterThan(0)

                    // Most used should have higher or equal usage than least used
                    if (stats.mostUsed.length > 0 && stats.leastUsed.length > 0) {
                        expect(stats.mostUsed[0].usage.useCount).toBeGreaterThanOrEqual(
                            stats.leastUsed[stats.leastUsed.length - 1].usage.useCount
                        )
                    }
                }
            ), { numRuns: 100 })
        })
    })

    /**
     * اختبارات التكامل الشاملة
     * Comprehensive Integration Tests
     */
    describe('Asset Library Integration', () => {
        it('should handle complete asset workflow', () => {
            fc.assert(fc.property(
                fc.array(
                    fc.record({
                        content: fc.uint8Array({ minLength: 1024, maxLength: 5120 }),
                        name: fc.string({ minLength: 1, maxLength: 20 }),
                        format: fc.constantFrom('png', 'jpg', 'webp'),
                        category: fc.constantFrom('wood', 'metal', 'concrete', 'glass')
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                async (assetSpecs) => {
                    const importedAssets = []

                    // Import all assets
                    for (const spec of assetSpecs) {
                        const file = new File(
                            [spec.content],
                            `${spec.name}.${spec.format}`,
                            { type: `image/${spec.format}` }
                        )

                        const result = await assetService.importAsset(file, {
                            category: spec.category,
                            generateThumbnail: true,
                            optimizeForGame: true,
                            detectDuplicates: true
                        })

                        if (result.success) {
                            importedAssets.push(result.asset!)
                        }
                    }

                    // Search and filter
                    const searchResult = assetService.searchAssets({
                        sortBy: 'name',
                        sortOrder: 'asc'
                    })

                    expect(searchResult.assets.length).toBe(importedAssets.length)
                    expect(searchResult.total).toBe(importedAssets.length)

                    // Test category filtering
                    for (const category of ['wood', 'metal', 'concrete', 'glass']) {
                        const categoryResult = assetService.searchAssets({ category })
                        const expectedCount = importedAssets.filter(a => a.category === category).length
                        expect(categoryResult.assets.length).toBe(expectedCount)
                    }

                    // Test facets
                    expect(searchResult.facets.categories).toBeDefined()
                    expect(searchResult.facets.formats).toBeDefined()
                    expect(searchResult.facets.tags).toBeDefined()
                }
            ), { numRuns: 100 })
        })
    })
})