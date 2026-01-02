/**
 * خدمة تكامل الأصول مع المشهد
 * Asset Integration Service for scene integration with Three.js
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { getMaterialManager } from '../materials/MaterialManager'
import { getAssetDirectoryService } from './AssetDirectoryService'
import { AssetMetadata, getAssetManagementService } from './AssetManagementService'

export interface AssetPlacementOptions {
    position?: THREE.Vector3
    rotation?: THREE.Euler
    scale?: THREE.Vector3
    snapToGrid?: boolean
    snapToObjects?: boolean
    previewMode?: boolean
}

export interface AssetPlacementResult {
    success: boolean
    object?: THREE.Object3D
    error?: string
    warnings: string[]
    boundingBox?: THREE.Box3
    materials?: THREE.Material[]
}

export interface AssetPreviewOptions {
    size?: number
    showBounds?: boolean
    showAxes?: boolean
    backgroundColor?: string
    lightingSetup?: 'studio' | 'outdoor' | 'indoor'
}

export interface SceneAsset {
    id: string
    assetId: string
    object: THREE.Object3D
    metadata: AssetMetadata
    position: THREE.Vector3
    rotation: THREE.Euler
    scale: THREE.Vector3
    boundingBox: THREE.Box3
    materials: THREE.Material[]
    createdAt: number
    modifiedAt: number
}

export class AssetIntegrationService {
    private _scene: THREE.Scene | null = null
    private _camera: THREE.Camera | null = null
    private _renderer: THREE.WebGLRenderer | null = null
    private _gltfLoader: GLTFLoader
    private _objLoader: OBJLoader
    private _assetService = getAssetManagementService()
    private _directoryService = getAssetDirectoryService()
    private _materialManager = getMaterialManager()
    private _sceneAssets: Map<string, SceneAsset> = new Map()
    private _previewObjects: Map<string, THREE.Object3D> = new Map()
    private _gridHelper: THREE.GridHelper | null = null
    private _snapDistance = 0.5

    constructor() {
        this._gltfLoader = new GLTFLoader()
        this._objLoader = new OBJLoader()
        this.setupLoaders()
    }

    // Initialize with scene references
    initialize(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
        this._scene = scene
        this._camera = camera
        this._renderer = renderer
        this.setupGridHelper()
    }

    // Setup loaders with progress callbacks
    private setupLoaders(): void {
        // GLTF Loader setup
        this._gltfLoader.setPath('')

        // OBJ Loader setup
        this._objLoader.setPath('')
    }

    // Setup grid helper for snapping
    private setupGridHelper(): void {
        if (!this._scene) return

        this._gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222)
        this._gridHelper.visible = false
        this._scene.add(this._gridHelper)
    }

    // Load asset from file system
    async loadAsset(assetId: string): Promise<THREE.Object3D | null> {
        try {
            const asset = this._assetService.getAsset(assetId)
            if (!asset) {
                throw new Error(`Asset not found: ${assetId}`)
            }

            // Determine file path based on asset type
            let filePath: string
            let loader: GLTFLoader | OBJLoader

            if (asset.format === 'glb' || asset.format === 'gltf') {
                filePath = await this._directoryService.getModelDirectoryPath(asset.category)
                filePath = `${filePath}/${assetId}.${asset.format}`
                loader = this._gltfLoader
            } else if (asset.format === 'obj') {
                filePath = await this._directoryService.getModelDirectoryPath(asset.category)
                filePath = `${filePath}/${assetId}.obj`
                loader = this._objLoader
            } else {
                // For texture assets, create a plane with the texture
                return await this.createTextureAsset(asset)
            }

            // Load the 3D model
            return new Promise((resolve, reject) => {
                if (loader instanceof GLTFLoader) {
                    loader.load(
                        filePath,
                        (gltf) => {
                            const object = gltf.scene.clone()
                            this.processLoadedObject(object, asset)
                            resolve(object)
                        },
                        undefined,
                        (error) => reject(error)
                    )
                } else {
                    loader.load(
                        filePath,
                        (object) => {
                            this.processLoadedObject(object, asset)
                            resolve(object)
                        },
                        undefined,
                        (error) => reject(error)
                    )
                }
            })

        } catch (error) {
            console.error('Failed to load asset:', error)
            return null
        }
    }

    // Create texture asset as a plane
    private async createTextureAsset(asset: AssetMetadata): Promise<THREE.Object3D> {
        const geometry = new THREE.PlaneGeometry(1, 1)

        // Load texture
        const texturePath = await this._directoryService.getTextureDirectoryPath(asset.category)
        const textureFile = `${texturePath}/${asset.id}.${asset.format}`

        const textureLoader = new THREE.TextureLoader()
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(textureFile, resolve, undefined, reject)
        })

        // Create material
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        })

        const mesh = new THREE.Mesh(geometry, material)
        mesh.name = asset.name
        mesh.userData = { assetId: asset.id, assetType: 'texture' }

        // Scale based on texture dimensions
        const aspectRatio = asset.dimensions.width / asset.dimensions.height
        if (aspectRatio > 1) {
            mesh.scale.set(aspectRatio, 1, 1)
        } else {
            mesh.scale.set(1, 1 / aspectRatio, 1)
        }

        return mesh
    }

    // Process loaded object (apply materials, scaling, etc.)
    private processLoadedObject(object: THREE.Object3D, asset: AssetMetadata): void {
        // Set name and user data
        object.name = asset.name
        object.userData = { assetId: asset.id, assetType: 'model' }

        // Apply materials if available
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Apply PBR materials if available
                const materialName = child.material.name
                if (materialName) {
                    const pbrMaterial = this._materialManager.getMaterial(materialName)
                    if (pbrMaterial) {
                        child.material = pbrMaterial
                    }
                }

                // Enable shadows
                child.castShadow = true
                child.receiveShadow = true
            }
        })

        // Normalize scale (optional)
        const box = new THREE.Box3().setFromObject(object)
        const size = box.getSize(new THREE.Vector3())
        const maxDimension = Math.max(size.x, size.y, size.z)

        if (maxDimension > 10) {
            const scale = 10 / maxDimension
            object.scale.multiplyScalar(scale)
        }
    }

    // Place asset in scene with options
    async placeAsset(
        assetId: string,
        options: AssetPlacementOptions = {}
    ): Promise<AssetPlacementResult> {
        try {
            if (!this._scene) {
                throw new Error('Scene not initialized')
            }

            const warnings: string[] = []

            // Load the asset
            const object = await this.loadAsset(assetId)
            if (!object) {
                throw new Error('Failed to load asset')
            }

            // Apply placement options
            if (options.position) {
                object.position.copy(options.position)
            }

            if (options.rotation) {
                object.rotation.copy(options.rotation)
            }

            if (options.scale) {
                object.scale.copy(options.scale)
            }

            // Apply snapping
            if (options.snapToGrid) {
                this.snapToGrid(object)
            }

            if (options.snapToObjects) {
                this.snapToObjects(object)
            }

            // Calculate bounding box
            const boundingBox = new THREE.Box3().setFromObject(object)

            // Collect materials
            const materials: THREE.Material[] = []
            object.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                    if (Array.isArray(child.material)) {
                        materials.push(...child.material)
                    } else {
                        materials.push(child.material)
                    }
                }
            })

            // Add to scene if not in preview mode
            if (!options.previewMode) {
                this._scene.add(object)

                // Create scene asset record
                const sceneAssetId = this.generateSceneAssetId()
                const asset = this._assetService.getAsset(assetId)!

                const sceneAsset: SceneAsset = {
                    id: sceneAssetId,
                    assetId,
                    object,
                    metadata: asset,
                    position: object.position.clone(),
                    rotation: object.rotation.clone(),
                    scale: object.scale.clone(),
                    boundingBox,
                    materials,
                    createdAt: Date.now(),
                    modifiedAt: Date.now()
                }

                this._sceneAssets.set(sceneAssetId, sceneAsset)

                // Update asset usage
                this._assetService.updateAsset(assetId, {
                    usage: {
                        ...asset.usage,
                        lastUsed: Date.now(),
                        useCount: asset.usage.useCount + 1
                    }
                })
            }

            return {
                success: true,
                object,
                warnings,
                boundingBox,
                materials
            }

        } catch (error) {
            return {
                success: false,
                error: `Failed to place asset: ${error}`,
                warnings: []
            }
        }
    }

    // Create preview of asset
    async createAssetPreview(
        assetId: string,
        options: AssetPreviewOptions = {}
    ): Promise<string | null> {
        try {
            const object = await this.loadAsset(assetId)
            if (!object) return null

            // Create preview scene
            const previewScene = new THREE.Scene()
            const size = options.size || 256

            // Setup camera
            const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)

            // Calculate optimal camera position
            const box = new THREE.Box3().setFromObject(object)
            const center = box.getCenter(new THREE.Vector3())
            const boxSize = box.getSize(new THREE.Vector3())
            const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z)

            camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5)
            camera.lookAt(center)

            // Setup lighting based on options
            this.setupPreviewLighting(previewScene, options.lightingSetup || 'studio')

            // Add object to preview scene
            previewScene.add(object)

            // Add optional helpers
            if (options.showBounds) {
                const boxHelper = new THREE.Box3Helper(box, 0xffff00)
                previewScene.add(boxHelper)
            }

            if (options.showAxes) {
                const axesHelper = new THREE.AxesHelper(maxDim * 0.5)
                previewScene.add(axesHelper)
            }

            // Setup background
            if (options.backgroundColor) {
                previewScene.background = new THREE.Color(options.backgroundColor)
            }

            // Create renderer for preview
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size

            const renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true
            })
            renderer.setSize(size, size)
            renderer.shadowMap.enabled = true
            renderer.shadowMap.type = THREE.PCFSoftShadowMap

            // Render preview
            renderer.render(previewScene, camera)

            // Convert to data URL
            const dataURL = canvas.toDataURL('image/png')

            // Cleanup
            renderer.dispose()
            previewScene.clear()

            return dataURL

        } catch (error) {
            console.error('Failed to create asset preview:', error)
            return null
        }
    }

    // Setup preview lighting
    private setupPreviewLighting(scene: THREE.Scene, setup: 'studio' | 'outdoor' | 'indoor'): void {
        switch (setup) {
            case 'studio':
                // Studio lighting setup
                const keyLight = new THREE.DirectionalLight(0xffffff, 1)
                keyLight.position.set(5, 10, 5)
                keyLight.castShadow = true
                scene.add(keyLight)

                const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
                fillLight.position.set(-5, 5, -5)
                scene.add(fillLight)

                const ambientLight = new THREE.AmbientLight(0x404040, 0.2)
                scene.add(ambientLight)
                break

            case 'outdoor':
                // Outdoor lighting setup
                const sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
                sunLight.position.set(10, 20, 10)
                sunLight.castShadow = true
                scene.add(sunLight)

                const skyLight = new THREE.AmbientLight(0x87CEEB, 0.4)
                scene.add(skyLight)
                break

            case 'indoor':
                // Indoor lighting setup
                const roomLight = new THREE.DirectionalLight(0xffffff, 0.6)
                roomLight.position.set(0, 10, 0)
                roomLight.castShadow = true
                scene.add(roomLight)

                const ambientIndoor = new THREE.AmbientLight(0x404040, 0.4)
                scene.add(ambientIndoor)
                break
        }
    }

    // Snap object to grid
    private snapToGrid(object: THREE.Object3D): void {
        const gridSize = this._snapDistance

        object.position.x = Math.round(object.position.x / gridSize) * gridSize
        object.position.y = Math.round(object.position.y / gridSize) * gridSize
        object.position.z = Math.round(object.position.z / gridSize) * gridSize
    }

    // Snap object to other objects
    private snapToObjects(object: THREE.Object3D): void {
        if (!this._scene) return

        const objectBox = new THREE.Box3().setFromObject(object)
        const snapDistance = this._snapDistance

        this._scene.traverse((child) => {
            if (child === object || !child.visible) return
            if (!(child instanceof THREE.Mesh)) return

            const childBox = new THREE.Box3().setFromObject(child)

            // Check for proximity and snap
            const distance = objectBox.distanceToBox(childBox)
            if (distance < snapDistance) {
                // Snap to nearest face
                const objectCenter = objectBox.getCenter(new THREE.Vector3())
                const childCenter = childBox.getCenter(new THREE.Vector3())

                const diff = objectCenter.clone().sub(childCenter)
                const absDiff = new THREE.Vector3(Math.abs(diff.x), Math.abs(diff.y), Math.abs(diff.z))

                // Snap to the closest axis
                if (absDiff.x < absDiff.y && absDiff.x < absDiff.z) {
                    // Snap to X face
                    object.position.x = child.position.x + (diff.x > 0 ? childBox.max.x : childBox.min.x)
                } else if (absDiff.y < absDiff.z) {
                    // Snap to Y face
                    object.position.y = child.position.y + (diff.y > 0 ? childBox.max.y : childBox.min.y)
                } else {
                    // Snap to Z face
                    object.position.z = child.position.z + (diff.z > 0 ? childBox.max.z : childBox.min.z)
                }
            }
        })
    }

    // Get all scene assets
    getSceneAssets(): SceneAsset[] {
        return Array.from(this._sceneAssets.values())
    }

    // Get scene asset by ID
    getSceneAsset(sceneAssetId: string): SceneAsset | undefined {
        return this._sceneAssets.get(sceneAssetId)
    }

    // Remove asset from scene
    removeSceneAsset(sceneAssetId: string): boolean {
        const sceneAsset = this._sceneAssets.get(sceneAssetId)
        if (!sceneAsset || !this._scene) return false

        this._scene.remove(sceneAsset.object)
        this._sceneAssets.delete(sceneAssetId)

        return true
    }

    // Update scene asset transform
    updateSceneAsset(
        sceneAssetId: string,
        transform: {
            position?: THREE.Vector3
            rotation?: THREE.Euler
            scale?: THREE.Vector3
        }
    ): boolean {
        const sceneAsset = this._sceneAssets.get(sceneAssetId)
        if (!sceneAsset) return false

        if (transform.position) {
            sceneAsset.object.position.copy(transform.position)
            sceneAsset.position.copy(transform.position)
        }

        if (transform.rotation) {
            sceneAsset.object.rotation.copy(transform.rotation)
            sceneAsset.rotation.copy(transform.rotation)
        }

        if (transform.scale) {
            sceneAsset.object.scale.copy(transform.scale)
            sceneAsset.scale.copy(transform.scale)
        }

        sceneAsset.modifiedAt = Date.now()
        return true
    }

    // Set grid visibility
    setGridVisible(visible: boolean): void {
        if (this._gridHelper) {
            this._gridHelper.visible = visible
        }
    }

    // Set snap distance
    setSnapDistance(distance: number): void {
        this._snapDistance = Math.max(0.1, distance)
    }

    // Generate unique scene asset ID
    private generateSceneAssetId(): string {
        return 'scene_asset_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
    }

    // Cleanup
    dispose(): void {
        this._sceneAssets.clear()
        this._previewObjects.clear()

        if (this._gridHelper && this._scene) {
            this._scene.remove(this._gridHelper)
        }

        this._scene = null
        this._camera = null
        this._renderer = null
    }
}

// Singleton instance
let assetIntegrationServiceInstance: AssetIntegrationService | null = null

export function getAssetIntegrationService(): AssetIntegrationService {
    if (!assetIntegrationServiceInstance) {
        assetIntegrationServiceInstance = new AssetIntegrationService()
    }
    return assetIntegrationServiceInstance
}

export function createAssetIntegrationService(): AssetIntegrationService {
    assetIntegrationServiceInstance = new AssetIntegrationService()
    return assetIntegrationServiceInstance
}