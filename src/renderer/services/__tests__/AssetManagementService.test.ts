/**
 * اختبارات خدمة إدارة الأصول
 * Asset Management Service Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetManagementService } from '../AssetManagementService'

// Mock AssetDirectoryService
vi.mock('../AssetDirectoryService', () => ({
    getAssetDirectoryService: () => ({
        initialize: vi.fn(),
        saveAssetFile: vi.fn(),
        getCategoryPath: vi.fn(() => Promise.resolve('/mock/path')),
        dispose: vi.fn()
    })
}))

// Mock MaterialManager
vi.mock('../../materials/MaterialManager', () => ({
    getMaterialManager: () => ({
        // Mock methods
    })
}))

// Mock UVMapper
vi.mock('../../materials/UVMapper', () => ({
    getUVMapper: () => ({
        // Mock methods
    })
}))

// Mock TextureLoader
vi.mock('../../materials/TextureLoader', () => ({
    TextureLoader: class {
        dispose() { }
    }
}))

describe('AssetManagementService', () => {
    let assetService: AssetManagementService

    beforeEach(() => {
        assetService = new AssetManagementService()
    })

    describe('Asset Search', () => {
        it('should search assets with default parameters', () => {
            const result = assetService.searchAssets()

            expect(result).toBeDefined()
            expect(result.assets).toEqual([])
            expect(result.total).toBe(0)
            expect(result.hasMore).toBe(false)
            expect(result.facets).toBeDefined()
        })

        it('should search assets with query', () => {
            const result = assetService.searchAssets({ query: 'wood' })

            expect(result).toBeDefined()
            expect(result.assets).toEqual([])
        })

        it('should search assets by category', () => {
            const result = assetService.searchAssets({ category: 'wood' })

            expect(result).toBeDefined()
            expect(result.assets).toEqual([])
        })
    })

    describe('Asset Management', () => {
        it('should get asset by ID', () => {
            const asset = assetService.getAsset('non-existent')
            expect(asset).toBeUndefined()
        })

        it('should get asset data', () => {
            const data = assetService.getAssetData('non-existent')
            expect(data).toBeUndefined()
        })

        it('should get asset thumbnail', () => {
            const thumbnail = assetService.getAssetThumbnail('non-existent')
            expect(thumbnail).toBeUndefined()
        })
    })

    describe('Usage Statistics', () => {
        it('should return usage statistics', () => {
            const stats = assetService.getUsageStatistics()

            expect(stats).toBeDefined()
            expect(stats.totalAssets).toBe(0)
            expect(stats.totalSize).toBe(0)
            expect(stats.categoryDistribution).toBeDefined()
            expect(stats.formatDistribution).toBeDefined()
            expect(stats.mostUsed).toEqual([])
            expect(stats.leastUsed).toEqual([])
            expect(stats.duplicates).toBe(0)
        })
    })

    describe('Duplicate Detection', () => {
        it('should find duplicates', () => {
            const duplicates = assetService.findDuplicates()
            expect(duplicates).toEqual([])
        })
    })
})