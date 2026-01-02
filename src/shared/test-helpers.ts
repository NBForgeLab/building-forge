/**
 * دوال مساعدة للاختبار
 */

import * as fc from 'fast-check'
import { vi } from 'vitest'
import { BaseElement, Material, Vector2, Vector3 } from './types'

// دوال مساعدة للمقارنة
export const isVector3Equal = (a: Vector3, b: Vector3, tolerance = 0.001): boolean => {
    return (
        Math.abs(a.x - b.x) < tolerance &&
        Math.abs(a.y - b.y) < tolerance &&
        Math.abs(a.z - b.z) < tolerance
    )
}

export const isVector2Equal = (a: Vector2, b: Vector2, tolerance = 0.001): boolean => {
    return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance
}

// دوال التحقق من صحة البيانات
export const isValidVector3 = (vector: Vector3): boolean => {
    return (
        typeof vector.x === 'number' &&
        typeof vector.y === 'number' &&
        typeof vector.z === 'number' &&
        !isNaN(vector.x) &&
        !isNaN(vector.y) &&
        !isNaN(vector.z) &&
        isFinite(vector.x) &&
        isFinite(vector.y) &&
        isFinite(vector.z)
    )
}

export const isValidVector2 = (vector: Vector2): boolean => {
    return (
        typeof vector.x === 'number' &&
        typeof vector.y === 'number' &&
        !isNaN(vector.x) &&
        !isNaN(vector.y) &&
        isFinite(vector.x) &&
        isFinite(vector.y)
    )
}

export const isValidElement = (element: BaseElement): boolean => {
    return (
        typeof element.id === 'string' &&
        element.id.length > 0 &&
        isValidVector3(element.position) &&
        isValidVector3(element.rotation) &&
        isValidVector3(element.scale) &&
        element.scale.x > 0 &&
        element.scale.y > 0 &&
        element.scale.z > 0 &&
        typeof element.visible === 'boolean' &&
        typeof element.selected === 'boolean' &&
        typeof element.locked === 'boolean' &&
        typeof element.createdAt === 'number' &&
        typeof element.updatedAt === 'number' &&
        element.createdAt > 0 &&
        element.updatedAt >= element.createdAt
    )
}

export const isValidMaterial = (material: Material): boolean => {
    return (
        typeof material.id === 'string' &&
        material.id.length > 0 &&
        typeof material.name === 'string' &&
        material.name.length > 0 &&
        (material.type === 'pbr' || material.type === 'basic') &&
        typeof material.roughness === 'number' &&
        typeof material.metallic === 'number' &&
        typeof material.opacity === 'number' &&
        material.roughness >= 0 &&
        material.roughness <= 1 &&
        material.metallic >= 0 &&
        material.metallic <= 1 &&
        material.opacity >= 0 &&
        material.opacity <= 1 &&
        isValidVector2(material.uvScale) &&
        material.uvScale.x > 0 &&
        material.uvScale.y > 0
    )
}

// دوال محاكاة للاختبار
export const createMockCanvas = () => {
    const canvas = document.createElement('canvas')
    const context = {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        isPointInPath: vi.fn(() => false),
    }

    vi.spyOn(canvas, 'getContext').mockReturnValue(context as any)
    return { canvas, context }
}

export const createMockWebGL = () => {
    const gl = {
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        useProgram: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        getAttribLocation: vi.fn(() => 0),
        getUniformLocation: vi.fn(() => ({})),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        viewport: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        blendFunc: vi.fn(),
        depthFunc: vi.fn(),
        cullFace: vi.fn(),
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        ARRAY_BUFFER: 34962,
        ELEMENT_ARRAY_BUFFER: 34963,
        STATIC_DRAW: 35044,
        TRIANGLES: 4,
        COLOR_BUFFER_BIT: 16384,
        DEPTH_BUFFER_BIT: 256,
        DEPTH_TEST: 2929,
        BLEND: 3042,
        CULL_FACE: 2884,
        BACK: 1029,
        SRC_ALPHA: 770,
        ONE_MINUS_SRC_ALPHA: 771,
        LEQUAL: 515,
    }

    return gl
}

// دوال مساعدة للوقت
export const waitFor = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export const createMockTimestamp = (baseTime = 1640995200000) => {
    let currentTime = baseTime
    return {
        now: () => currentTime,
        advance: (ms: number) => {
            currentTime += ms
        },
        reset: () => {
            currentTime = baseTime
        },
    }
}

// دوال مساعدة للاختبارات العشوائية
export const randomBetween = (min: number, max: number): number => {
    return Math.random() * (max - min) + min
}

export const randomVector3 = (
    minX = -10,
    maxX = 10,
    minY = -10,
    maxY = 10,
    minZ = -10,
    maxZ = 10
): Vector3 => ({
    x: randomBetween(minX, maxX),
    y: randomBetween(minY, maxY),
    z: randomBetween(minZ, maxZ),
})

export const randomVector2 = (minX = -10, maxX = 10, minY = -10, maxY = 10): Vector2 => ({
    x: randomBetween(minX, maxX),
    y: randomBetween(minY, maxY),
})

// دوال مساعدة لاختبارات الأداء
export const measurePerformance = async <T>(
    fn: () => Promise<T> | T,
    iterations = 100
): Promise<{ result: T; averageTime: number; totalTime: number }> => {
    const times: number[] = []
    let result: T

    for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        result = await fn()
        const end = performance.now()
        times.push(end - start)
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const averageTime = totalTime / iterations

    return {
        result: result!,
        averageTime,
        totalTime,
    }
}

// دوال مساعدة لاختبارات الذاكرة
export const measureMemoryUsage = (): number => {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
    }
    return 0
}

// دوال مساعدة للتحقق من الخصائص
export const propertyTestRunner = <T>(
    name: string,
    arbitrary: fc.Arbitrary<T>,
    property: (value: T) => boolean | void,
    options: Partial<fc.Parameters<T>> = {}
) => {
    const defaultOptions: fc.Parameters<T> = {
        numRuns: 100,
        verbose: true,
        seed: 42,
        endOnFailure: true,
        timeout: 5000,
    }

    return fc.assert(fc.property(arbitrary, property), { ...defaultOptions, ...options })
}