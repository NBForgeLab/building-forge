/**
 * اختبارات الأنواع الأساسية والتحقق من صحة البيانات
 */

import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
    baseElementArbitrary,
    materialArbitrary,
    projectArbitrary,
    runPropertyTest,
    vector2Arbitrary,
    vector3Arbitrary,
} from '../property-test-utils'
import {
    DEFAULT_WALL_MATERIAL,
    SAMPLE_FLOOR,
    SAMPLE_PROJECT,
    SAMPLE_WALL,
} from '../test-fixtures'
import {
    isValidElement,
    isValidMaterial,
    isValidVector2,
    isValidVector3,
    isVector2Equal,
    isVector3Equal,
} from '../test-helpers'
import {
    BaseElement,
    ElementType,
    Material,
    Project,
    ToolType,
    Vector2,
    Vector3,
} from '../types'

describe('Types and Enums', () => {
    it('should have all required ToolType values', () => {
        const expectedTools = [
            'select',
            'wall',
            'floor',
            'door',
            'window',
            'cut',
            'move',
            'rotate',
            'scale',
        ]

        const actualTools = Object.values(ToolType)
        expect(actualTools).toEqual(expectedTools)
    })

    it('should have all required ElementType values', () => {
        const expectedElements = ['wall', 'floor', 'door', 'window', 'asset']

        const actualElements = Object.values(ElementType)
        expect(actualElements).toEqual(expectedElements)
    })
})

describe('Vector3 Validation', () => {
    it('should validate correct Vector3 objects', () => {
        const validVectors: Vector3[] = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 2, z: 3 },
            { x: -1, y: -2, z: -3 },
            { x: 0.5, y: 1.5, z: 2.5 },
        ]

        validVectors.forEach(vector => {
            expect(isValidVector3(vector)).toBe(true)
        })
    })

    it('should reject invalid Vector3 objects', () => {
        const invalidVectors = [
            { x: NaN, y: 0, z: 0 },
            { x: 0, y: Infinity, z: 0 },
            { x: 0, y: 0, z: -Infinity },
            { x: 'invalid', y: 0, z: 0 } as any,
        ]

        invalidVectors.forEach(vector => {
            expect(isValidVector3(vector)).toBe(false)
        })
    })

    it('should compare Vector3 objects with tolerance', () => {
        const vector1: Vector3 = { x: 1, y: 2, z: 3 }
        const vector2: Vector3 = { x: 1.0001, y: 1.9999, z: 3.0001 }
        const vector3: Vector3 = { x: 1.1, y: 2.1, z: 3.1 }

        expect(isVector3Equal(vector1, vector2, 0.001)).toBe(true)
        expect(isVector3Equal(vector1, vector3, 0.001)).toBe(false)
        expect(isVector3Equal(vector1, vector3, 0.2)).toBe(true)
    })
})

describe('Vector2 Validation', () => {
    it('should validate correct Vector2 objects', () => {
        const validVectors: Vector2[] = [
            { x: 0, y: 0 },
            { x: 1, y: 2 },
            { x: -1, y: -2 },
            { x: 0.5, y: 1.5 },
        ]

        validVectors.forEach(vector => {
            expect(isValidVector2(vector)).toBe(true)
        })
    })

    it('should compare Vector2 objects with tolerance', () => {
        const vector1: Vector2 = { x: 1, y: 2 }
        const vector2: Vector2 = { x: 1.0001, y: 1.9999 }

        expect(isVector2Equal(vector1, vector2, 0.001)).toBe(true)
    })
})

describe('BaseElement Validation', () => {
    it('should validate sample elements', () => {
        expect(isValidElement(SAMPLE_WALL)).toBe(true)
        expect(isValidElement(SAMPLE_FLOOR)).toBe(true)
    })

    it('should reject elements with invalid scale', () => {
        const invalidElement: BaseElement = {
            ...SAMPLE_WALL,
            scale: { x: 0, y: 0, z: 0 },
        }

        expect(isValidElement(invalidElement)).toBe(false)
    })

    it('should reject elements with invalid timestamps', () => {
        const invalidElement: BaseElement = {
            ...SAMPLE_WALL,
            createdAt: -1,
            updatedAt: -1,
        }

        expect(isValidElement(invalidElement)).toBe(false)
    })
})

describe('Material Validation', () => {
    it('should validate sample materials', () => {
        expect(isValidMaterial(DEFAULT_WALL_MATERIAL)).toBe(true)
    })

    it('should reject materials with invalid properties', () => {
        const invalidMaterial: Material = {
            ...DEFAULT_WALL_MATERIAL,
            roughness: -1, // خارج النطاق المسموح
            metallic: 2, // خارج النطاق المسموح
        }

        expect(isValidMaterial(invalidMaterial)).toBe(false)
    })
})

describe('Property-based Tests', () => {
    it('should generate valid Vector3 objects', () => {
        runPropertyTest(
            'Vector3 generation',
            vector3Arbitrary(),
            (vector: Vector3) => {
                expect(isValidVector3(vector)).toBe(true)
            }
        )
    })

    it('should generate valid Vector2 objects', () => {
        runPropertyTest(
            'Vector2 generation',
            vector2Arbitrary(),
            (vector: Vector2) => {
                expect(isValidVector2(vector)).toBe(true)
            }
        )
    })

    it('should generate valid Material objects', () => {
        runPropertyTest(
            'Material generation',
            materialArbitrary(),
            (material: Material) => {
                expect(isValidMaterial(material)).toBe(true)
            }
        )
    })

    it('should generate valid BaseElement objects', () => {
        runPropertyTest(
            'BaseElement generation',
            baseElementArbitrary(),
            (element: BaseElement) => {
                expect(isValidElement(element)).toBe(true)
            }
        )
    })

    it('should generate valid Project objects', () => {
        runPropertyTest(
            'Project generation',
            projectArbitrary(),
            (project: Project) => {
                expect(project.id).toBeTruthy()
                expect(project.name).toBeTruthy()
                expect(Array.isArray(project.elements)).toBe(true)
                expect(Array.isArray(project.materials)).toBe(true)
                expect(project.createdAt).toBeGreaterThan(0)
                expect(project.updatedAt).toBeGreaterThanOrEqual(project.createdAt)
            }
        )
    })

    it('should maintain Vector3 equality properties', () => {
        runPropertyTest(
            'Vector3 equality reflexivity',
            vector3Arbitrary(),
            (vector: Vector3) => {
                expect(isVector3Equal(vector, vector)).toBe(true)
            }
        )

        runPropertyTest(
            'Vector3 equality symmetry',
            fc.tuple(vector3Arbitrary(), vector3Arbitrary()),
            ([vector1, vector2]: [Vector3, Vector3]) => {
                const equal1to2 = isVector3Equal(vector1, vector2)
                const equal2to1 = isVector3Equal(vector2, vector1)
                expect(equal1to2).toBe(equal2to1)
            }
        )
    })

    it('should maintain Material property constraints', () => {
        runPropertyTest(
            'Material property constraints',
            materialArbitrary(),
            (material: Material) => {
                expect(material.roughness).toBeGreaterThanOrEqual(0)
                expect(material.roughness).toBeLessThanOrEqual(1)
                expect(material.metallic).toBeGreaterThanOrEqual(0)
                expect(material.metallic).toBeLessThanOrEqual(1)
                expect(material.opacity).toBeGreaterThanOrEqual(0)
                expect(material.opacity).toBeLessThanOrEqual(1)
                expect(material.uvScale.x).toBeGreaterThan(0)
                expect(material.uvScale.y).toBeGreaterThan(0)
            }
        )
    })

    it('should maintain BaseElement scale constraints', () => {
        runPropertyTest(
            'BaseElement scale constraints',
            baseElementArbitrary(),
            (element: BaseElement) => {
                expect(element.scale.x).toBeGreaterThan(0)
                expect(element.scale.y).toBeGreaterThan(0)
                expect(element.scale.z).toBeGreaterThan(0)
            }
        )
    })
})

describe('Sample Data Integrity', () => {
    it('should have valid sample project', () => {
        expect(SAMPLE_PROJECT.id).toBeTruthy()
        expect(SAMPLE_PROJECT.name).toBeTruthy()
        expect(SAMPLE_PROJECT.elements.length).toBeGreaterThan(0)
        expect(SAMPLE_PROJECT.materials.length).toBeGreaterThan(0)

        // التحقق من صحة جميع العناصر
        SAMPLE_PROJECT.elements.forEach(element => {
            expect(isValidElement(element)).toBe(true)
        })

        // التحقق من صحة جميع المواد
        SAMPLE_PROJECT.materials.forEach(material => {
            expect(isValidMaterial(material)).toBe(true)
        })
    })

    it('should have consistent timestamps', () => {
        SAMPLE_PROJECT.elements.forEach(element => {
            expect(element.updatedAt).toBeGreaterThanOrEqual(element.createdAt)
        })

        SAMPLE_PROJECT.materials.forEach(material => {
            expect(material.updatedAt).toBeGreaterThanOrEqual(material.createdAt)
        })
    })
})