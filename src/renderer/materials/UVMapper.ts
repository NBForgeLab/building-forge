/**
 * نظام UV Mapping التلقائي
 * Automatic UV Mapping system for different building elements
 */

import * as THREE from 'three';

export interface UVMappingOptions {
    method: 'planar' | 'cylindrical' | 'spherical' | 'box' | 'auto'
    scale: { x: number; y: number }
    offset: { x: number; y: number }
    rotation: number
    flipU?: boolean
    flipV?: boolean
    seamless?: boolean
    preserveAspectRatio?: boolean
}

export interface UVMappingResult {
    uvAttribute: THREE.BufferAttribute
    boundingBox: THREE.Box3
    surfaceArea: number
    method: string
    quality: 'low' | 'medium' | 'high'
    warnings: string[]
}

export interface GeometryAnalysis {
    type: 'wall' | 'floor' | 'ceiling' | 'door' | 'window' | 'generic'
    dimensions: { width: number; height: number; depth: number }
    orientation: 'horizontal' | 'vertical' | 'mixed'
    complexity: number
    hasHoles: boolean
    surfaceArea: number
    recommendedMethod: UVMappingOptions['method']
}

export class UVMapper {
    private _debugMode = false
    private _qualityThreshold = {
        low: 0.3,
        medium: 0.7,
        high: 0.9
    }

    constructor(debugMode = false) {
        this._debugMode = debugMode
    }

    // Main UV mapping function
    generateUVMapping(
        geometry: THREE.BufferGeometry,
        options: Partial<UVMappingOptions> = {}
    ): UVMappingResult {
        // Analyze geometry first
        const analysis = this.analyzeGeometry(geometry)

        // Merge options with defaults and analysis recommendations
        const finalOptions: UVMappingOptions = {
            method: options.method || analysis.recommendedMethod,
            scale: options.scale || { x: 1, y: 1 },
            offset: options.offset || { x: 0, y: 0 },
            rotation: options.rotation || 0,
            flipU: options.flipU || false,
            flipV: options.flipV || false,
            seamless: options.seamless || true,
            preserveAspectRatio: options.preserveAspectRatio || true,
            ...options
        }

        // Generate UV coordinates based on method
        let uvAttribute: THREE.BufferAttribute
        let quality: 'low' | 'medium' | 'high' = 'medium'
        const warnings: string[] = []

        switch (finalOptions.method) {
            case 'planar':
                uvAttribute = this.generatePlanarUV(geometry, finalOptions, analysis)
                quality = this.calculatePlanarQuality(geometry, analysis)
                break
            case 'cylindrical':
                uvAttribute = this.generateCylindricalUV(geometry, finalOptions, analysis)
                quality = this.calculateCylindricalQuality(geometry, analysis)
                break
            case 'spherical':
                uvAttribute = this.generateSphericalUV(geometry, finalOptions, analysis)
                quality = this.calculateSphericalQuality(geometry, analysis)
                break
            case 'box':
                uvAttribute = this.generateBoxUV(geometry, finalOptions, analysis)
                quality = this.calculateBoxQuality(geometry, analysis)
                break
            case 'auto':
            default:
                const result = this.generateAutoUV(geometry, finalOptions, analysis)
                uvAttribute = result.uvAttribute
                quality = result.quality
                warnings.push(...result.warnings)
                break
        }

        // Apply transformations
        this.applyUVTransformations(uvAttribute, finalOptions)

        // Validate and optimize
        const validationResult = this.validateUVMapping(uvAttribute, geometry)
        warnings.push(...validationResult.warnings)

        if (finalOptions.seamless) {
            this.optimizeForSeamless(uvAttribute, geometry)
        }

        // Set UV attribute on geometry
        geometry.setAttribute('uv', uvAttribute)

        return {
            uvAttribute,
            boundingBox: analysis.dimensions as any,
            surfaceArea: analysis.surfaceArea,
            method: finalOptions.method,
            quality,
            warnings
        }
    }

    // Analyze geometry to determine best UV mapping approach
    private analyzeGeometry(geometry: THREE.BufferGeometry): GeometryAnalysis {
        const positionAttribute = geometry.getAttribute('position')
        if (!positionAttribute) {
            throw new Error('Geometry must have position attribute')
        }

        // Calculate bounding box
        geometry.computeBoundingBox()
        const boundingBox = geometry.boundingBox!
        const size = boundingBox.getSize(new THREE.Vector3())

        // Determine geometry type based on dimensions
        let type: GeometryAnalysis['type'] = 'generic'
        let orientation: GeometryAnalysis['orientation'] = 'mixed'

        const aspectRatios = {
            xy: size.x / size.y,
            xz: size.x / size.z,
            yz: size.y / size.z
        }

        // Classify based on aspect ratios
        if (size.z < size.x * 0.1 && size.z < size.y * 0.1) {
            // Thin in Z direction - likely floor or ceiling
            type = size.y > size.x ? 'wall' : 'floor'
            orientation = 'horizontal'
        } else if (size.y > size.x * 2 && size.y > size.z * 2) {
            // Tall - likely wall
            type = 'wall'
            orientation = 'vertical'
        } else if (aspectRatios.xy > 0.8 && aspectRatios.xy < 1.2 &&
            aspectRatios.xz > 0.8 && aspectRatios.xz < 1.2) {
            // Roughly cubic - could be door or window
            type = size.y > size.x ? 'door' : 'window'
            orientation = 'vertical'
        }

        // Calculate complexity
        const vertexCount = positionAttribute.count
        const complexity = Math.min(vertexCount / 1000, 1) // Normalize to 0-1

        // Calculate surface area (approximation)
        const surfaceArea = this.calculateSurfaceArea(geometry)

        // Detect holes (simplified - check for non-manifold edges)
        const hasHoles = this.detectHoles(geometry)

        // Recommend UV mapping method
        let recommendedMethod: UVMappingOptions['method'] = 'planar'

        if (type === 'floor' || type === 'ceiling') {
            recommendedMethod = 'planar'
        } else if (type === 'wall') {
            recommendedMethod = complexity > 0.5 ? 'box' : 'planar'
        } else if (hasHoles || complexity > 0.7) {
            recommendedMethod = 'box'
        } else if (orientation === 'mixed') {
            recommendedMethod = 'auto'
        }

        return {
            type,
            dimensions: {
                width: size.x,
                height: size.y,
                depth: size.z
            },
            orientation,
            complexity,
            hasHoles,
            surfaceArea,
            recommendedMethod
        }
    }

    // Generate planar UV mapping
    private generatePlanarUV(
        geometry: THREE.BufferGeometry,
        options: UVMappingOptions,
        analysis: GeometryAnalysis
    ): THREE.BufferAttribute {
        const positionAttribute = geometry.getAttribute('position')
        const vertexCount = positionAttribute.count
        const uvArray = new Float32Array(vertexCount * 2)

        // Determine projection plane based on geometry orientation
        let uAxis: 'x' | 'y' | 'z' = 'x'
        let vAxis: 'x' | 'y' | 'z' = 'y'

        if (analysis.type === 'floor' || analysis.type === 'ceiling') {
            uAxis = 'x'
            vAxis = 'z'
        } else if (analysis.orientation === 'vertical') {
            uAxis = 'x'
            vAxis = 'y'
        }

        // Get bounds for normalization
        const bounds = {
            minU: Infinity, maxU: -Infinity,
            minV: Infinity, maxV: -Infinity
        }

        // First pass: find bounds
        for (let i = 0; i < vertexCount; i++) {
            const u = positionAttribute.getX(i)
            const v = uAxis === 'x' ?
                (vAxis === 'y' ? positionAttribute.getY(i) : positionAttribute.getZ(i)) :
                (vAxis === 'y' ? positionAttribute.getY(i) : positionAttribute.getZ(i))

            bounds.minU = Math.min(bounds.minU, u)
            bounds.maxU = Math.max(bounds.maxU, u)
            bounds.minV = Math.min(bounds.minV, v)
            bounds.maxV = Math.max(bounds.maxV, v)
        }

        const uRange = bounds.maxU - bounds.minU
        const vRange = bounds.maxV - bounds.minV

        // Second pass: generate UV coordinates
        for (let i = 0; i < vertexCount; i++) {
            const pos = new THREE.Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            )

            let u = (pos[uAxis] - bounds.minU) / uRange
            let v = (pos[vAxis] - bounds.minV) / vRange

            // Apply aspect ratio preservation
            if (options.preserveAspectRatio) {
                const aspectRatio = uRange / vRange
                if (aspectRatio > 1) {
                    v *= aspectRatio
                } else {
                    u /= aspectRatio
                }
            }

            uvArray[i * 2] = u
            uvArray[i * 2 + 1] = v
        }

        return new THREE.BufferAttribute(uvArray, 2)
    }

    // Generate cylindrical UV mapping
    private generateCylindricalUV(
        geometry: THREE.BufferGeometry,
        options: UVMappingOptions,
        analysis: GeometryAnalysis
    ): THREE.BufferAttribute {
        const positionAttribute = geometry.getAttribute('position')
        const vertexCount = positionAttribute.count
        const uvArray = new Float32Array(vertexCount * 2)

        // Find cylinder axis (usually Y for vertical objects)
        const axis = analysis.orientation === 'horizontal' ? 'y' : 'z'

        geometry.computeBoundingBox()
        const boundingBox = geometry.boundingBox!
        const center = boundingBox.getCenter(new THREE.Vector3())
        const size = boundingBox.getSize(new THREE.Vector3())

        const height = axis === 'y' ? size.y : size.z
        const minHeight = axis === 'y' ? boundingBox.min.y : boundingBox.min.z

        for (let i = 0; i < vertexCount; i++) {
            const pos = new THREE.Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            )

            // Calculate cylindrical coordinates
            const dx = pos.x - center.x
            const dz = pos.z - center.z

            // U coordinate from angle
            let u = Math.atan2(dz, dx) / (2 * Math.PI) + 0.5

            // V coordinate from height
            let v = axis === 'y' ?
                (pos.y - minHeight) / height :
                (pos.z - boundingBox.min.z) / size.z

            uvArray[i * 2] = u
            uvArray[i * 2 + 1] = v
        }

        return new THREE.BufferAttribute(uvArray, 2)
    }

    // Generate spherical UV mapping
    private generateSphericalUV(
        geometry: THREE.BufferGeometry,
        options: UVMappingOptions,
        analysis: GeometryAnalysis
    ): THREE.BufferAttribute {
        const positionAttribute = geometry.getAttribute('position')
        const vertexCount = positionAttribute.count
        const uvArray = new Float32Array(vertexCount * 2)

        geometry.computeBoundingBox()
        const center = geometry.boundingBox!.getCenter(new THREE.Vector3())

        for (let i = 0; i < vertexCount; i++) {
            const pos = new THREE.Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            )

            // Convert to spherical coordinates
            const direction = pos.clone().sub(center).normalize()

            const u = Math.atan2(direction.x, direction.z) / (2 * Math.PI) + 0.5
            const v = Math.acos(direction.y) / Math.PI

            uvArray[i * 2] = u
            uvArray[i * 2 + 1] = v
        }

        return new THREE.BufferAttribute(uvArray, 2)
    }

    // Generate box UV mapping
    private generateBoxUV(
        geometry: THREE.BufferGeometry,
        options: UVMappingOptions,
        analysis: GeometryAnalysis
    ): THREE.BufferAttribute {
        const positionAttribute = geometry.getAttribute('position')
        const normalAttribute = geometry.getAttribute('normal')

        if (!normalAttribute) {
            geometry.computeVertexNormals()
        }

        const vertexCount = positionAttribute.count
        const uvArray = new Float32Array(vertexCount * 2)

        geometry.computeBoundingBox()
        const boundingBox = geometry.boundingBox!
        const size = boundingBox.getSize(new THREE.Vector3())

        for (let i = 0; i < vertexCount; i++) {
            const pos = new THREE.Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i)
            )

            const normal = new THREE.Vector3(
                normalAttribute.getX(i),
                normalAttribute.getY(i),
                normalAttribute.getZ(i)
            )

            // Determine dominant axis
            const absNormal = normal.clone().abs()
            let u: number, v: number

            if (absNormal.x >= absNormal.y && absNormal.x >= absNormal.z) {
                // X-dominant face
                u = (pos.z - boundingBox.min.z) / size.z
                v = (pos.y - boundingBox.min.y) / size.y
                if (normal.x < 0) u = 1 - u // Flip for negative X
            } else if (absNormal.y >= absNormal.x && absNormal.y >= absNormal.z) {
                // Y-dominant face
                u = (pos.x - boundingBox.min.x) / size.x
                v = (pos.z - boundingBox.min.z) / size.z
                if (normal.y < 0) v = 1 - v // Flip for negative Y
            } else {
                // Z-dominant face
                u = (pos.x - boundingBox.min.x) / size.x
                v = (pos.y - boundingBox.min.y) / size.y
                if (normal.z < 0) u = 1 - u // Flip for negative Z
            }

            uvArray[i * 2] = u
            uvArray[i * 2 + 1] = v
        }

        return new THREE.BufferAttribute(uvArray, 2)
    }

    // Generate automatic UV mapping (chooses best method)
    private generateAutoUV(
        geometry: THREE.BufferGeometry,
        options: UVMappingOptions,
        analysis: GeometryAnalysis
    ): { uvAttribute: THREE.BufferAttribute; quality: 'low' | 'medium' | 'high'; warnings: string[] } {
        const warnings: string[] = []

        // Try different methods and pick the best one
        const methods: UVMappingOptions['method'][] = ['planar', 'box', 'cylindrical']
        let bestResult: { uvAttribute: THREE.BufferAttribute; quality: 'low' | 'medium' | 'high' } | null = null
        let bestScore = -1

        for (const method of methods) {
            try {
                const testOptions = { ...options, method }
                let uvAttribute: THREE.BufferAttribute
                let quality: 'low' | 'medium' | 'high'

                switch (method) {
                    case 'planar':
                        uvAttribute = this.generatePlanarUV(geometry, testOptions, analysis)
                        quality = this.calculatePlanarQuality(geometry, analysis)
                        break
                    case 'box':
                        uvAttribute = this.generateBoxUV(geometry, testOptions, analysis)
                        quality = this.calculateBoxQuality(geometry, analysis)
                        break
                    case 'cylindrical':
                        uvAttribute = this.generateCylindricalUV(geometry, testOptions, analysis)
                        quality = this.calculateCylindricalQuality(geometry, analysis)
                        break
                    default:
                        continue
                }

                const score = this.calculateUVQualityScore(uvAttribute, geometry, analysis)

                if (score > bestScore) {
                    bestScore = score
                    bestResult = { uvAttribute, quality }
                }
            } catch (error) {
                warnings.push(`Failed to generate ${method} UV mapping: ${error}`)
            }
        }

        if (!bestResult) {
            warnings.push('All UV mapping methods failed, falling back to planar')
            return {
                uvAttribute: this.generatePlanarUV(geometry, options, analysis),
                quality: 'low',
                warnings
            }
        }

        return { ...bestResult, warnings }
    }

    // Apply UV transformations (scale, offset, rotation, flip)
    private applyUVTransformations(uvAttribute: THREE.BufferAttribute, options: UVMappingOptions): void {
        const uvArray = uvAttribute.array as Float32Array
        const vertexCount = uvAttribute.count

        for (let i = 0; i < vertexCount; i++) {
            let u = uvArray[i * 2]
            let v = uvArray[i * 2 + 1]

            // Apply flipping
            if (options.flipU) u = 1 - u
            if (options.flipV) v = 1 - v

            // Apply rotation
            if (options.rotation !== 0) {
                const cos = Math.cos(options.rotation)
                const sin = Math.sin(options.rotation)
                const centerU = 0.5
                const centerV = 0.5

                const relU = u - centerU
                const relV = v - centerV

                u = relU * cos - relV * sin + centerU
                v = relU * sin + relV * cos + centerV
            }

            // Apply scale and offset
            u = u * options.scale.x + options.offset.x
            v = v * options.scale.y + options.offset.y

            uvArray[i * 2] = u
            uvArray[i * 2 + 1] = v
        }

        uvAttribute.needsUpdate = true
    }

    // Utility methods
    private calculateSurfaceArea(geometry: THREE.BufferGeometry): number {
        const positionAttribute = geometry.getAttribute('position')
        const indexAttribute = geometry.getIndex()

        if (!indexAttribute) {
            // Non-indexed geometry
            return 0 // Simplified for now
        }

        let area = 0
        const triangle = new THREE.Triangle()

        for (let i = 0; i < indexAttribute.count; i += 3) {
            const a = indexAttribute.getX(i)
            const b = indexAttribute.getX(i + 1)
            const c = indexAttribute.getX(i + 2)

            triangle.a.fromBufferAttribute(positionAttribute, a)
            triangle.b.fromBufferAttribute(positionAttribute, b)
            triangle.c.fromBufferAttribute(positionAttribute, c)

            area += triangle.getArea()
        }

        return area
    }

    private detectHoles(geometry: THREE.BufferGeometry): boolean {
        // Simplified hole detection - would need more sophisticated algorithm
        const indexAttribute = geometry.getIndex()
        return indexAttribute ? indexAttribute.count > 1000 : false
    }

    private calculatePlanarQuality(geometry: THREE.BufferGeometry, analysis: GeometryAnalysis): 'low' | 'medium' | 'high' {
        if (analysis.type === 'floor' || analysis.type === 'ceiling') return 'high'
        if (analysis.orientation === 'horizontal') return 'high'
        if (analysis.complexity < 0.3) return 'high'
        if (analysis.complexity < 0.7) return 'medium'
        return 'low'
    }

    private calculateCylindricalQuality(geometry: THREE.BufferGeometry, analysis: GeometryAnalysis): 'low' | 'medium' | 'high' {
        // Cylindrical works well for round objects
        const { width, height, depth } = analysis.dimensions
        const isRoundish = Math.abs(width - depth) < Math.min(width, depth) * 0.2

        if (isRoundish && analysis.complexity < 0.5) return 'high'
        if (isRoundish) return 'medium'
        return 'low'
    }

    private calculateSphericalQuality(geometry: THREE.BufferGeometry, analysis: GeometryAnalysis): 'low' | 'medium' | 'high' {
        // Spherical works well for sphere-like objects
        const { width, height, depth } = analysis.dimensions
        const avgSize = (width + height + depth) / 3
        const variance = Math.abs(width - avgSize) + Math.abs(height - avgSize) + Math.abs(depth - avgSize)

        if (variance < avgSize * 0.2) return 'high'
        if (variance < avgSize * 0.5) return 'medium'
        return 'low'
    }

    private calculateBoxQuality(geometry: THREE.BufferGeometry, analysis: GeometryAnalysis): 'low' | 'medium' | 'high' {
        // Box mapping works well for complex geometries
        if (analysis.hasHoles) return 'high'
        if (analysis.complexity > 0.7) return 'high'
        if (analysis.complexity > 0.3) return 'medium'
        return 'low'
    }

    private calculateUVQualityScore(
        uvAttribute: THREE.BufferAttribute,
        geometry: THREE.BufferGeometry,
        analysis: GeometryAnalysis
    ): number {
        // Calculate distortion, coverage, and other quality metrics
        let score = 0.5 // Base score

        // Check UV bounds (should be mostly within 0-1)
        const uvArray = uvAttribute.array as Float32Array
        let inBounds = 0
        let totalArea = 0

        for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvArray[i * 2]
            const v = uvArray[i * 2 + 1]

            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                inBounds++
            }

            totalArea += Math.abs(u * v) // Simplified area calculation
        }

        const boundsScore = inBounds / uvAttribute.count
        score += boundsScore * 0.3

        // Check for reasonable UV distribution
        const avgArea = totalArea / uvAttribute.count
        if (avgArea > 0.1 && avgArea < 2) {
            score += 0.2
        }

        return Math.min(score, 1)
    }

    private validateUVMapping(
        uvAttribute: THREE.BufferAttribute,
        geometry: THREE.BufferGeometry
    ): { valid: boolean; warnings: string[] } {
        const warnings: string[] = []
        const uvArray = uvAttribute.array as Float32Array

        // Check for NaN or infinite values
        for (let i = 0; i < uvArray.length; i++) {
            if (!isFinite(uvArray[i])) {
                warnings.push('UV coordinates contain invalid values (NaN or Infinity)')
                break
            }
        }

        // Check UV bounds
        let minU = Infinity, maxU = -Infinity
        let minV = Infinity, maxV = -Infinity

        for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvArray[i * 2]
            const v = uvArray[i * 2 + 1]

            minU = Math.min(minU, u)
            maxU = Math.max(maxU, u)
            minV = Math.min(minV, v)
            maxV = Math.max(maxV, v)
        }

        if (maxU - minU > 10 || maxV - minV > 10) {
            warnings.push('UV coordinates have very large range - may cause texture stretching')
        }

        if (minU < -1 || maxU > 2 || minV < -1 || maxV > 2) {
            warnings.push('UV coordinates extend far outside 0-1 range')
        }

        return {
            valid: warnings.length === 0,
            warnings
        }
    }

    private optimizeForSeamless(uvAttribute: THREE.BufferAttribute, geometry: THREE.BufferGeometry): void {
        // Implement seam reduction algorithms
        // This is a complex topic that would require edge detection and UV island analysis
        // For now, we'll just ensure UVs are properly wrapped

        const uvArray = uvAttribute.array as Float32Array

        for (let i = 0; i < uvAttribute.count; i++) {
            let u = uvArray[i * 2]
            let v = uvArray[i * 2 + 1]

            // Wrap UVs to 0-1 range for seamless tiling
            u = u - Math.floor(u)
            v = v - Math.floor(v)

            uvArray[i * 2] = u
            uvArray[i * 2 + 1] = v
        }

        uvAttribute.needsUpdate = true
    }

    // Public utility methods
    setDebugMode(enabled: boolean): void {
        this._debugMode = enabled
    }

    setQualityThresholds(thresholds: Partial<typeof this._qualityThreshold>): void {
        this._qualityThreshold = { ...this._qualityThreshold, ...thresholds }
    }

    // Generate UV mapping for specific building elements
    generateWallUV(geometry: THREE.BufferGeometry, options: Partial<UVMappingOptions> = {}): UVMappingResult {
        return this.generateUVMapping(geometry, {
            method: 'planar',
            preserveAspectRatio: true,
            seamless: true,
            ...options
        })
    }

    generateFloorUV(geometry: THREE.BufferGeometry, options: Partial<UVMappingOptions> = {}): UVMappingResult {
        return this.generateUVMapping(geometry, {
            method: 'planar',
            scale: { x: 1, y: 1 },
            seamless: true,
            ...options
        })
    }

    generateDoorUV(geometry: THREE.BufferGeometry, options: Partial<UVMappingOptions> = {}): UVMappingResult {
        return this.generateUVMapping(geometry, {
            method: 'box',
            preserveAspectRatio: true,
            ...options
        })
    }

    generateWindowUV(geometry: THREE.BufferGeometry, options: Partial<UVMappingOptions> = {}): UVMappingResult {
        return this.generateUVMapping(geometry, {
            method: 'box',
            preserveAspectRatio: true,
            ...options
        })
    }
}

// Singleton instance
let uvMapperInstance: UVMapper | null = null

export function getUVMapper(): UVMapper {
    if (!uvMapperInstance) {
        uvMapperInstance = new UVMapper()
    }
    return uvMapperInstance
}

export function createUVMapper(debugMode = false): UVMapper {
    uvMapperInstance = new UVMapper(debugMode)
    return uvMapperInstance
}