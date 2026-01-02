/**
 * اختبارات خاصية نظام النسخ واللصق
 * Property tests for copy and paste system
 */

import * as fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClipboardService } from '../../services/ClipboardService'
import { BuildingElement } from '../../store/types'

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
})

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true
})

// Generators for property testing
const vector3Generator = fc.record({
    x: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) }),
    y: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) }),
    z: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) })
})

const elementTypeGenerator = fc.constantFrom('wall', 'floor', 'door', 'window', 'cut', 'custom')

const buildingElementGenerator = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    type: elementTypeGenerator,
    name: fc.string({ minLength: 1, maxLength: 100 }),
    position: vector3Generator,
    rotation: vector3Generator,
    scale: vector3Generator,
    properties: fc.record({
        thickness: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(10) })),
        height: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(50) })),
        width: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(50) }))
    }),
    materialId: fc.option(fc.string()),
    visible: fc.boolean(),
    locked: fc.boolean(),
    created: fc.date().map(d => d.toISOString()),
    modified: fc.date().map(d => d.toISOString())
})

const materialGenerator = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom('pbr', 'basic'),
    properties: fc.record({
        albedo: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
        metallic: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        roughness: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        normal: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        emission: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
        emissionIntensity: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        opacity: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        transparent: fc.boolean()
    }),
    textures: fc.record({}),
    created: fc.date().map(d => d.toISOString()),
    modified: fc.date().map(d => d.toISOString())
})

describe('Clipboard System Property Tests', () => {
    let clipboardService: ClipboardService

    beforeEach(() => {
        vi.clearAllMocks()
        localStorageMock.getItem.mockReturnValue(null)
        clipboardService = ClipboardService.getInstance()
        clipboardService.clear()
    })

    describe('Property 37: Copy and Paste Elements', () => {
        it('should preserve element data integrity during copy-paste cycle', () => {
            fc.assert(fc.property(
                fc.array(buildingElementGenerator, { minLength: 1, maxLength: 10 }),
                (elements) => {
                    // Copy elements
                    const entryId = clipboardService.copyElements(elements)
                    expect(entryId).toBeDefined()

                    // Paste elements
                    const pastedEntry = clipboardService.paste()
                    expect(pastedEntry).not.toBeNull()
                    expect(pastedEntry!.data.elements).toHaveLength(elements.length)

                    // Verify data integrity (excluding IDs which may be regenerated)
                    pastedEntry!.data.elements!.forEach((pastedElement, index) => {
                        const originalElement = elements[index]
                        expect(pastedElement.type).toBe(originalElement.type)
                        expect(pastedElement.name).toBe(originalElement.name)
                        expect(pastedElement.position).toEqual(originalElement.position)
                        expect(pastedElement.rotation).toEqual(originalElement.rotation)
                        expect(pastedElement.scale).toEqual(originalElement.scale)
                        expect(pastedElement.properties).toEqual(originalElement.properties)
                        expect(pastedElement.visible).toBe(originalElement.visible)
                        expect(pastedElement.locked).toBe(originalElement.locked)
                    })
                }
            ), { numRuns: 100 })
        })

        it('should handle position offset correctly', () => {
            fc.assert(fc.property(
                fc.array(buildingElementGenerator, { minLength: 1, maxLength: 5 }),
                vector3Generator,
                (elements, offset) => {
                    // Copy with offset
                    clipboardService.copyElements(elements, [], { offsetPosition: offset })

                    // Paste
                    const pastedEntry = clipboardService.paste()
                    expect(pastedEntry).not.toBeNull()

                    // Verify offset is applied
                    pastedEntry!.data.elements!.forEach((pastedElement, index) => {
                        const originalElement = elements[index]
                        const expectedPosition = {
                            x: originalElement.position.x + offset.x,
                            y: originalElement.position.y + offset.y,
                            z: originalElement.position.z + offset.z
                        }
                        expect(pastedElement.position).toEqual(expectedPosition)
                    })
                }
            ), { numRuns: 100 })
        })

        it('should maintain clipboard history correctly', () => {
            fc.assert(fc.property(
                fc.array(fc.array(buildingElementGenerator, { minLength: 1, maxLength: 2 }), { minLength: 2, maxLength: 5 }),
                (elementArrays) => {
                    // Clear clipboard first
                    clipboardService.clear()

                    const entryIds: string[] = []

                    // Copy multiple times
                    elementArrays.forEach(elements => {
                        const entryId = clipboardService.copyElements(elements)
                        entryIds.push(entryId)
                    })

                    // Verify history exists and has reasonable size
                    const history = clipboardService.getHistory()
                    expect(history.length).toBeGreaterThan(0)
                    expect(history.length).toBeLessThanOrEqual(10) // Max history size is 10
                    expect(history.length).toBeLessThanOrEqual(elementArrays.length)
                }
            ), { numRuns: 20 })
        })
    })

    describe('Property 38: Multi-Paste Functionality', () => {
        it('should create correct number of copies with proper spacing', () => {
            fc.assert(fc.property(
                fc.array(buildingElementGenerator, { minLength: 1, maxLength: 3 }),
                fc.integer({ min: 1, max: 10 }),
                vector3Generator,
                (elements, count, spacing) => {
                    // Copy elements
                    clipboardService.copyElements(elements)

                    // Multi-paste
                    const pastedEntries = clipboardService.multiPaste(count, spacing)
                    expect(pastedEntries).toHaveLength(count)

                    // Verify spacing
                    pastedEntries.forEach((entry, copyIndex) => {
                        entry.data.elements!.forEach((pastedElement, elementIndex) => {
                            const originalElement = elements[elementIndex]
                            const expectedPosition = {
                                x: originalElement.position.x + (spacing.x * copyIndex),
                                y: originalElement.position.y + (spacing.y * copyIndex),
                                z: originalElement.position.z + (spacing.z * copyIndex)
                            }
                            expect(pastedElement.position).toEqual(expectedPosition)
                        })
                    })
                }
            ), { numRuns: 100 })
        })
    })

    describe('Property 39: Material Copy-Paste', () => {
        it('should preserve material properties during copy-paste', () => {
            fc.assert(fc.property(
                fc.array(materialGenerator, { minLength: 1, maxLength: 5 }),
                (materials) => {
                    // Copy materials
                    const entryId = clipboardService.copyMaterials(materials)
                    expect(entryId).toBeDefined()

                    // Paste materials
                    const pastedEntry = clipboardService.paste()
                    expect(pastedEntry).not.toBeNull()
                    expect(pastedEntry!.data.materials).toHaveLength(materials.length)

                    // Verify material integrity
                    pastedEntry!.data.materials!.forEach((pastedMaterial, index) => {
                        const originalMaterial = materials[index]
                        expect(pastedMaterial.name).toBe(originalMaterial.name)
                        expect(pastedMaterial.type).toBe(originalMaterial.type)
                        expect(pastedMaterial.properties).toEqual(originalMaterial.properties)
                        expect(pastedMaterial.textures).toEqual(originalMaterial.textures)
                    })
                }
            ), { numRuns: 100 })
        })
    })

    describe('Property 40: Mixed Content Handling', () => {
        it('should handle mixed elements and materials correctly', () => {
            fc.assert(fc.property(
                fc.array(buildingElementGenerator, { minLength: 1, maxLength: 3 }),
                fc.array(materialGenerator, { minLength: 1, maxLength: 3 }),
                (elements, materials) => {
                    // Copy mixed content
                    const entryId = clipboardService.copyElements(elements, materials, { includeMaterials: true })
                    expect(entryId).toBeDefined()

                    // Verify content type
                    expect(clipboardService.getContentType()).toBe('mixed')

                    // Paste and verify
                    const pastedEntry = clipboardService.paste()
                    expect(pastedEntry).not.toBeNull()
                    expect(pastedEntry!.data.elements).toHaveLength(elements.length)
                    expect(pastedEntry!.data.materials).toHaveLength(materials.length)

                    // Verify content stats
                    const stats = clipboardService.getContentStats()
                    expect(stats).toEqual({
                        elements: elements.length,
                        materials: materials.length
                    })
                }
            ), { numRuns: 100 })
        })
    })

    describe('Property 41: History Navigation', () => {
        it('should navigate history correctly in both directions', () => {
            fc.assert(fc.property(
                fc.array(fc.array(buildingElementGenerator, { minLength: 1, maxLength: 2 }), { minLength: 2, maxLength: 4 }),
                (elementArrays) => {
                    // Clear clipboard first
                    clipboardService.clear()

                    // Copy multiple entries
                    elementArrays.forEach(elements => {
                        clipboardService.copyElements(elements)
                    })

                    const historyLength = clipboardService.getHistory().length
                    expect(historyLength).toBeGreaterThan(0)

                    // Test navigation methods exist and work
                    const prevEntry = clipboardService.navigateHistory('previous')
                    expect(prevEntry).toBeDefined()

                    const nextEntry = clipboardService.navigateHistory('next')
                    expect(nextEntry).toBeDefined()

                    // Should have some current entry
                    const currentEntry = clipboardService.getCurrentEntry()
                    expect(currentEntry).not.toBeNull()
                }
            ), { numRuns: 20 })
        })
    })

    describe('Property 42: Error Handling', () => {
        it('should handle empty arrays gracefully', () => {
            fc.assert(fc.property(
                fc.constant([]),
                (emptyArray) => {
                    expect(() => {
                        clipboardService.copyElements(emptyArray)
                    }).toThrow('لا توجد عناصر للنسخ')

                    expect(() => {
                        clipboardService.copyMaterials(emptyArray)
                    }).toThrow('لا توجد مواد للنسخ')
                }
            ), { numRuns: 10 })
        })

        it('should return null when pasting from empty clipboard', () => {
            fc.assert(fc.property(
                fc.constant(null),
                () => {
                    clipboardService.clear()
                    const entry = clipboardService.paste()
                    expect(entry).toBeNull()
                    expect(clipboardService.hasContent()).toBe(false)
                }
            ), { numRuns: 10 })
        })
    })

    describe('Property 43: Performance and Memory', () => {
        it('should maintain reasonable memory usage with large datasets', () => {
            fc.assert(fc.property(
                fc.array(buildingElementGenerator, { minLength: 50, maxLength: 100 }),
                (elements) => {
                    const startTime = performance.now()

                    // Copy large dataset
                    const entryId = clipboardService.copyElements(elements)
                    expect(entryId).toBeDefined()

                    // Paste large dataset
                    const pastedEntry = clipboardService.paste()
                    expect(pastedEntry).not.toBeNull()
                    expect(pastedEntry!.data.elements).toHaveLength(elements.length)

                    const endTime = performance.now()
                    const duration = endTime - startTime

                    // Should complete within reasonable time (1 second)
                    expect(duration).toBeLessThan(1000)
                }
            ), { numRuns: 10 })
        })

        it('should limit history size to prevent memory leaks', () => {
            fc.assert(fc.property(
                fc.integer({ min: 15, max: 25 }),
                (copyCount) => {
                    // Copy more than max history size
                    for (let i = 0; i < copyCount; i++) {
                        const element: BuildingElement = {
                            id: `element-${i}`,
                            type: 'wall',
                            name: `Wall ${i}`,
                            position: { x: i, y: 0, z: 0 },
                            rotation: { x: 0, y: 0, z: 0 },
                            scale: { x: 1, y: 1, z: 1 },
                            properties: {},
                            visible: true,
                            locked: false,
                            created: new Date().toISOString(),
                            modified: new Date().toISOString()
                        }
                        clipboardService.copyElements([element])
                    }

                    const history = clipboardService.getHistory()
                    expect(history.length).toBeLessThanOrEqual(10)
                }
            ), { numRuns: 20 })
        })
    })
})