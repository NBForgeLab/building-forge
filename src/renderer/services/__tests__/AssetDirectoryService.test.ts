/**
 * اختبارات خدمة دليل الأصول
 * Asset Directory Service Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetDirectoryService } from '../AssetDirectoryService'

// Mock ElectronService
vi.mock('../ElectronService', () => ({
    getElectronService: () => ({
        getUserDataPath: vi.fn(() => Promise.resolve('/mock/userdata')),
        ensureDirectory: vi.fn(() => Promise.resolve()),
        getDirectoryStats: vi.fn(() => Promise.resolve({
            size: 1024,
            fileCount: 5,
            created: Date.now(),
            modified: Date.now()
        })),
        saveFile: vi.fn(() => Promise.resolve()),
        loadFile: vi.fn(() => Promise.resolve(new ArrayBuffer(1024))),
        deleteFile: vi.fn(() => Promise.resolve()),
        listDirectory: vi.fn(() => Promise.resolve(['file1.png', 'file2.jpg'])),
        getFileStats: vi.fn(() => Promise.resolve({
            size: 512,
            created: Date.now(),
            modified: Date.now()
        }))
    })
}))

describe('AssetDirectoryService', () => {
    let directoryService: AssetDirectoryService

    beforeEach(() => {
        directoryService = new AssetDirectoryService()
    })

    describe('Initialization', () => {
        it('should initialize directory structure', async () => {
            await directoryService.initialize()
            const structure = await directoryService.getStructure()

            expect(structure).toBeDefined()
            expect(structure.root).toBe('/mock/userdata/assets')
            expect(structure.categories).toBeDefined()
            expect(structure.totalSize).toBeGreaterThanOrEqual(0)
            expect(structure.totalFiles).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Category Paths', () => {
        it('should get category path', async () => {
            await directoryService.initialize()
            const path = await directoryService.getCategoryPath('wood')
            expect(path).toContain('wood')
        })

        it('should get texture directory path', async () => {
            await directoryService.initialize()
            const path = await directoryService.getTextureDirectoryPath('wood')
            expect(path).toContain('wood/textures')
        })

        it('should get model directory path', async () => {
            await directoryService.initialize()
            const path = await directoryService.getModelDirectoryPath('wood')
            expect(path).toContain('wood/models')
        })

        it('should get thumbnail directory path', async () => {
            await directoryService.initialize()
            const path = await directoryService.getThumbnailDirectoryPath('wood')
            expect(path).toContain('wood/thumbnails')
        })
    })

    describe('File Operations', () => {
        it('should save asset file', async () => {
            await directoryService.initialize()
            const blob = new Blob(['test data'], { type: 'text/plain' })

            const path = await directoryService.saveAssetFile('wood', 'test.txt', blob, 'texture')
            expect(path).toContain('test.txt')
        })

        it('should load asset file', async () => {
            await directoryService.initialize()
            const blob = await directoryService.loadAssetFile('/mock/path/test.txt')
            expect(blob).toBeInstanceOf(Blob)
        })

        it('should delete asset file', async () => {
            await directoryService.initialize()
            await directoryService.deleteAssetFile('/mock/path/test.txt')
            // Should not throw
        })

        it('should list category files', async () => {
            await directoryService.initialize()
            const files = await directoryService.listCategoryFiles('wood', 'texture')
            expect(Array.isArray(files)).toBe(true)
        })
    })

    describe('Storage Statistics', () => {
        it('should get storage stats', async () => {
            await directoryService.initialize()
            const stats = await directoryService.getStorageStats()

            expect(stats).toBeDefined()
            expect(stats.totalSize).toBeGreaterThanOrEqual(0)
            expect(stats.totalFiles).toBeGreaterThanOrEqual(0)
            expect(stats.categoryBreakdown).toBeDefined()
            expect(Array.isArray(stats.largestFiles)).toBe(true)
        })
    })

    describe('Cleanup', () => {
        it('should cleanup empty directories', async () => {
            await directoryService.initialize()
            await directoryService.cleanupEmptyDirectories()
            // Should not throw
        })

        it('should dispose properly', () => {
            directoryService.dispose()
            // Should not throw
        })
    })
})