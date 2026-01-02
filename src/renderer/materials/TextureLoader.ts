/**
 * محمل النسيج المتقدم
 * Advanced texture loader with multiple format support and caching
 */

export interface TextureLoadOptions {
    flipY?: boolean
    generateMipmaps?: boolean
    wrapS?: 'repeat' | 'clamp' | 'mirror'
    wrapT?: 'repeat' | 'clamp' | 'mirror'
    minFilter?: 'nearest' | 'linear' | 'nearestMipmap' | 'linearMipmap'
    magFilter?: 'nearest' | 'linear'
    format?: 'rgb' | 'rgba' | 'alpha' | 'luminance'
    type?: 'unsignedByte' | 'float' | 'halfFloat'
}

export interface TextureInfo {
    width: number
    height: number
    format: string
    size: number // in bytes
    url: string
    loadTime: number
    hasAlpha: boolean
}

export interface LoadProgress {
    loaded: number
    total: number
    percentage: number
    url: string
}

export type ProgressCallback = (progress: LoadProgress) => void
export type ErrorCallback = (error: Error, url: string) => void

export class TextureLoader {
    private _cache: Map<string, HTMLImageElement> = new Map()
    private _loading: Map<string, Promise<HTMLImageElement>> = new Map()
    private _textureInfo: Map<string, TextureInfo> = new Map()
    private _supportedFormats: Set<string> = new Set()
    private _maxTextureSize = 4096
    private _totalCacheSize = 0
    private _maxCacheSize = 256 * 1024 * 1024 // 256MB

    constructor() {
        this.detectSupportedFormats()
        this.detectMaxTextureSize()
    }

    // Detect supported texture formats
    private detectSupportedFormats(): void {
        // Basic formats always supported
        this._supportedFormats.add('png')
        this._supportedFormats.add('jpg')
        this._supportedFormats.add('jpeg')
        this._supportedFormats.add('gif')
        this._supportedFormats.add('bmp')
        this._supportedFormats.add('webp')

        // Test for advanced formats
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (ctx) {
            // Test WebP support
            canvas.toBlob((blob) => {
                if (blob) {
                    this._supportedFormats.add('webp')
                }
            }, 'image/webp')

            // Test AVIF support (newer browsers)
            try {
                canvas.toBlob((blob) => {
                    if (blob) {
                        this._supportedFormats.add('avif')
                    }
                }, 'image/avif')
            } catch (e) {
                // AVIF not supported
            }
        }

        // HDR formats (would need additional libraries)
        // this._supportedFormats.add('hdr')
        // this._supportedFormats.add('exr')
    }

    // Detect maximum texture size
    private detectMaxTextureSize(): void {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

        if (gl) {
            this._maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
        }
    }

    // Load single texture
    async load(
        url: string,
        options: TextureLoadOptions = {},
        onProgress?: ProgressCallback,
        onError?: ErrorCallback
    ): Promise<HTMLImageElement | null> {
        try {
            // Check cache first
            if (this._cache.has(url)) {
                const cached = this._cache.get(url)!
                if (onProgress) {
                    onProgress({ loaded: 1, total: 1, percentage: 100, url })
                }
                return cached
            }

            // Check if already loading
            if (this._loading.has(url)) {
                return await this._loading.get(url)!
            }

            // Validate URL and format
            if (!this.isValidTextureUrl(url)) {
                throw new Error(`Unsupported texture format: ${url}`)
            }

            // Start loading
            const loadPromise = this.loadImage(url, options, onProgress)
            this._loading.set(url, loadPromise)

            const image = await loadPromise

            // Remove from loading map
            this._loading.delete(url)

            if (image) {
                // Validate image size
                if (image.width > this._maxTextureSize || image.height > this._maxTextureSize) {
                    console.warn(`Texture ${url} exceeds maximum size (${this._maxTextureSize}x${this._maxTextureSize})`)
                    // Could resize here if needed
                }

                // Add to cache
                this.addToCache(url, image)

                // Store texture info
                this._textureInfo.set(url, {
                    width: image.width,
                    height: image.height,
                    format: this.getImageFormat(url),
                    size: this.estimateImageSize(image),
                    url,
                    loadTime: Date.now(),
                    hasAlpha: this.hasAlphaChannel(image)
                })
            }

            return image

        } catch (error) {
            this._loading.delete(url)
            if (onError) {
                onError(error as Error, url)
            }
            console.error(`Failed to load texture: ${url}`, error)
            return null
        }
    }

    // Load multiple textures
    async loadMultiple(
        urls: string[],
        options: TextureLoadOptions = {},
        onProgress?: ProgressCallback,
        onError?: ErrorCallback
    ): Promise<(HTMLImageElement | null)[]> {
        const results: (HTMLImageElement | null)[] = []
        let completed = 0

        const loadPromises = urls.map(async (url, index) => {
            try {
                const image = await this.load(url, options, undefined, onError)
                results[index] = image
                completed++

                if (onProgress) {
                    onProgress({
                        loaded: completed,
                        total: urls.length,
                        percentage: (completed / urls.length) * 100,
                        url
                    })
                }

                return image
            } catch (error) {
                results[index] = null
                completed++
                if (onError) {
                    onError(error as Error, url)
                }
                return null
            }
        })

        await Promise.all(loadPromises)
        return results
    }

    // Load image with progress tracking
    private loadImage(
        url: string,
        options: TextureLoadOptions,
        onProgress?: ProgressCallback
    ): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const image = new Image()

            // Set CORS if needed
            if (this.isCrossOrigin(url)) {
                image.crossOrigin = 'anonymous'
            }

            // Track loading progress (limited for images)
            let progressReported = false

            image.onload = () => {
                if (!progressReported && onProgress) {
                    onProgress({ loaded: 1, total: 1, percentage: 100, url })
                }
                resolve(image)
            }

            image.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`))
            }

            // Start loading
            image.src = url

            // Report initial progress
            if (onProgress && !progressReported) {
                onProgress({ loaded: 0, total: 1, percentage: 0, url })
                progressReported = true
            }
        })
    }

    // Cache management
    private addToCache(url: string, image: HTMLImageElement): void {
        const imageSize = this.estimateImageSize(image)

        // Check cache size limit
        if (this._totalCacheSize + imageSize > this._maxCacheSize) {
            this.evictOldestEntries(imageSize)
        }

        this._cache.set(url, image)
        this._totalCacheSize += imageSize
    }

    private evictOldestEntries(requiredSpace: number): void {
        // Sort by load time (oldest first)
        const entries = Array.from(this._textureInfo.entries())
            .sort((a, b) => a[1].loadTime - b[1].loadTime)

        let freedSpace = 0
        for (const [url, info] of entries) {
            if (freedSpace >= requiredSpace) break

            this._cache.delete(url)
            this._textureInfo.delete(url)
            freedSpace += info.size
            this._totalCacheSize -= info.size
        }
    }

    // Utility methods
    private isValidTextureUrl(url: string): boolean {
        try {
            const urlObj = new URL(url, window.location.href)
            const extension = urlObj.pathname.split('.').pop()?.toLowerCase()
            return extension ? this._supportedFormats.has(extension) : false
        } catch {
            return false
        }
    }

    private isCrossOrigin(url: string): boolean {
        try {
            const urlObj = new URL(url, window.location.href)
            return urlObj.origin !== window.location.origin
        } catch {
            return false
        }
    }

    private getImageFormat(url: string): string {
        try {
            const urlObj = new URL(url, window.location.href)
            return urlObj.pathname.split('.').pop()?.toLowerCase() || 'unknown'
        } catch {
            return 'unknown'
        }
    }

    private estimateImageSize(image: HTMLImageElement): number {
        // Rough estimate: width * height * 4 bytes (RGBA)
        return image.width * image.height * 4
    }

    private hasAlphaChannel(image: HTMLImageElement): boolean {
        // Create a small canvas to test for alpha
        const canvas = document.createElement('canvas')
        canvas.width = Math.min(image.width, 32)
        canvas.height = Math.min(image.height, 32)

        const ctx = canvas.getContext('2d')
        if (!ctx) return false

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data

            // Check alpha channel (every 4th byte)
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] < 255) {
                    return true
                }
            }
        } catch (error) {
            // Security error or other issue
            console.warn('Could not analyze alpha channel:', error)
        }

        return false
    }

    // Public API methods
    isLoaded(url: string): boolean {
        return this._cache.has(url)
    }

    isLoading(url: string): boolean {
        return this._loading.has(url)
    }

    getFromCache(url: string): HTMLImageElement | undefined {
        return this._cache.get(url)
    }

    getTextureInfo(url: string): TextureInfo | undefined {
        return this._textureInfo.get(url)
    }

    getSupportedFormats(): string[] {
        return Array.from(this._supportedFormats)
    }

    getMaxTextureSize(): number {
        return this._maxTextureSize
    }

    getCacheSize(): number {
        return this._totalCacheSize
    }

    getCacheCount(): number {
        return this._cache.size
    }

    // Cache control
    clearCache(): void {
        this._cache.clear()
        this._textureInfo.clear()
        this._totalCacheSize = 0
    }

    removeFromCache(url: string): boolean {
        const image = this._cache.get(url)
        const info = this._textureInfo.get(url)

        if (image && info) {
            this._cache.delete(url)
            this._textureInfo.delete(url)
            this._totalCacheSize -= info.size
            return true
        }

        return false
    }

    setCacheSize(maxSize: number): void {
        this._maxCacheSize = maxSize

        // Evict entries if current size exceeds new limit
        if (this._totalCacheSize > maxSize) {
            this.evictOldestEntries(this._totalCacheSize - maxSize)
        }
    }

    // Preload textures
    async preload(urls: string[], options: TextureLoadOptions = {}): Promise<void> {
        await this.loadMultiple(urls, options)
    }

    // Create texture from canvas
    createTextureFromCanvas(canvas: HTMLCanvasElement, name: string): HTMLImageElement {
        const image = new Image()
        image.src = canvas.toDataURL()

        // Add to cache with generated name
        const url = `canvas://${name}`
        this._cache.set(url, image)

        this._textureInfo.set(url, {
            width: canvas.width,
            height: canvas.height,
            format: 'canvas',
            size: this.estimateImageSize(image),
            url,
            loadTime: Date.now(),
            hasAlpha: true // Canvas can have alpha
        })

        return image
    }

    // Generate procedural texture
    generateProceduralTexture(
        width: number,
        height: number,
        generator: (x: number, y: number) => [number, number, number, number],
        name: string
    ): HTMLImageElement {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('Could not create canvas context')
        }

        const imageData = ctx.createImageData(width, height)
        const data = imageData.data

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4
                const [r, g, b, a] = generator(x / width, y / height)

                data[index] = Math.round(r * 255)     // Red
                data[index + 1] = Math.round(g * 255) // Green
                data[index + 2] = Math.round(b * 255) // Blue
                data[index + 3] = Math.round(a * 255) // Alpha
            }
        }

        ctx.putImageData(imageData, 0, 0)
        return this.createTextureFromCanvas(canvas, name)
    }

    // Get cache statistics
    getCacheStatistics(): {
        totalSize: number
        maxSize: number
        count: number
        hitRate: number
        formats: Record<string, number>
        averageSize: number
    } {
        const formats: Record<string, number> = {}
        let totalSize = 0

        this._textureInfo.forEach(info => {
            formats[info.format] = (formats[info.format] || 0) + 1
            totalSize += info.size
        })

        return {
            totalSize,
            maxSize: this._maxCacheSize,
            count: this._cache.size,
            hitRate: 0, // Would need to track hits/misses
            formats,
            averageSize: this._cache.size > 0 ? totalSize / this._cache.size : 0
        }
    }

    // Dispose and cleanup
    dispose(): void {
        this.clearCache()
        this._loading.clear()
        this._supportedFormats.clear()
    }
}