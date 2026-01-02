/**
 * أدوات مساعدة لإدارة الحالة
 * Utility functions for state management
 */

import { nanoid } from 'nanoid'

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return nanoid()
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as unknown as T
    }

    if (typeof obj === 'object') {
        const clonedObj = {} as T
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key])
            }
        }
        return clonedObj
    }

    return obj
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
    }

    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
        return a === b
    }

    if (a === null || a === undefined || b === null || b === undefined) {
        return false
    }

    if (a.prototype !== b.prototype) return false

    let keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) {
        return false
    }

    return keys.every(k => deepEqual(a[k], b[k]))
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout)
        }

        timeout = setTimeout(() => {
            func(...args)
        }, wait)
    }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => (inThrottle = false), limit)
        }
    }
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format timestamp to human readable format
 */
export function formatTimestamp(timestamp: string, locale: string = 'ar'): string {
    const date = new Date(timestamp)

    if (locale === 'ar') {
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * Calculate distance between two 3D points
 */
export function calculateDistance(
    point1: { x: number; y: number; z: number },
    point2: { x: number; y: number; z: number }
): number {
    const dx = point2.x - point1.x
    const dy = point2.y - point1.y
    const dz = point2.z - point1.z

    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI)
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor
}

/**
 * Check if a point is inside a bounding box
 */
export function isPointInBounds(
    point: { x: number; y: number; z: number },
    bounds: {
        min: { x: number; y: number; z: number }
        max: { x: number; y: number; z: number }
    }
): boolean {
    return (
        point.x >= bounds.min.x && point.x <= bounds.max.x &&
        point.y >= bounds.min.y && point.y <= bounds.max.y &&
        point.z >= bounds.min.z && point.z <= bounds.max.z
    )
}

/**
 * Generate a random color in hex format
 */
export function generateRandomColor(): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ]

    return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

/**
 * Get contrast color (black or white) for a given background color
 */
export function getContrastColor(hexColor: string): string {
    const rgb = hexToRgb(hexColor)
    if (!rgb) return '#000000'

    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255

    return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

/**
 * Sanitize filename for safe file operations
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .toLowerCase()
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
    try {
        new URL(string)
        return true
    } catch (_) {
        return false
    }
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
}