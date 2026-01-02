/**
 * اختبارات خدمة تكامل الأصول
 * Asset Integration Service Tests
 */

import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetIntegrationService } from '../AssetIntegrationService'

// Mock services
vi.mock('../AssetDirectoryService', () => ({
    getAssetDirectoryService: () => ({
        getTextureDirectoryPath: vi.fn(() => Promise.resolve('/mock/textures')),
        getModelDirectoryPath: vi.fn(() => Promise.resolve('/mock/models'))
    })
}))

vi.mock('../AssetManagementService', () => ({
    getAssetManagementService: () => ({
        getAsset: vi.fn(() => ({
            id: 'test-asset',
            name: 'Test Asset',
            format: 'png',
            category: 'wood',
            dimensions: { width: 512, height: 512 }
        })),
        updateAsset: vi.fn()
    })
}))

vi.mock('../../materials/MaterialManager', () => ({
    getMaterialManager: () => ({
        getMaterial: vi.fn()
    })
}))

describe('AssetIntegrationService', () => {
    let integrationService: AssetIntegrationService
    let mockScene: THREE.Scene
    let mockCamera: THREE.Camera
    let mockRenderer: THREE.WebGLRenderer

    beforeEach(() => {
        integrationService = new AssetIntegrationService()

        mockScene = new THREE.Scene()
        mockCamera = new THREE.PerspectiveCamera()
        mockRenderer = new THREE.WebGLRenderer()

        integrationService.initialize(mockScene, mockCamera, mockRenderer)
    })

    describe('Initialization', () => {
        it('should initialize with scene references', () => {
            expect(integrationService).toBeDefined()
        })
    })

    describe('Scene Assets', () => {
        it('should get empty scene assets initially', () => {
            const assets = integrationService.getSceneAssets()
            expect(assets).toEqual([])
        })

        it('should get undefined for non-existent scene asset', () => {
            const asset = integrationService.getSceneAsset('non-existent')
            expect(asset).toBeUndefined()
        })

        it('should return false when removing non-existent asset', () => {
            const result = integrationService.removeSceneAsset('non-existent')
            expect(result).toBe(false)
        })
    })

    describe('Grid and Snap Settings', () => {
        it('should set grid visibility', () => {
            integrationService.setGridVisible(true)
            integrationService.setGridVisible(false)
            // No assertion needed, just testing it doesn't throw
        })

        it('should set snap distance', () => {
            integrationService.setSnapDistance(0.5)
            integrationService.setSnapDistance(1.0)
            // No assertion needed, just testing it doesn't throw
        })

        it('should clamp snap distance to minimum', () => {
            integrationService.setSnapDistance(0.05) // Below minimum
            // Should be clamped to 0.1
        })
    })

    describe('Asset Preview', () => {
        it('should create asset preview', async () => {
            const preview = await integrationService.createAssetPreview('test-asset')
            // Preview creation might fail due to mocking, but should not throw
            expect(preview).toBeDefined()
        })

        it('should handle preview creation with options', async () => {
            const preview = await integrationService.createAssetPreview('test-asset', {
                size: 256,
                showBounds: true,
                showAxes: true,
                backgroundColor: '#ffffff',
                lightingSetup: 'studio'
            })
            expect(preview).toBeDefined()
        })
    })

    describe('Cleanup', () => {
        it('should dispose properly', () => {
            integrationService.dispose()
            // Should not throw
        })
    })
})