/**
 * اختبارات الخصائص لإدارة الحالة
 * Property tests for state management
 * 
 * الخاصية 35: نظام Undo/Redo متعدد المستويات
 * Property 35: Multi-level Undo/Redo system
 * 
 * الخاصية 38: الحفظ التلقائي
 * Property 38: Auto-save functionality
 */

import { act, renderHook } from '@testing-library/react'
import * as fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStoreWithAutoSave, useStore } from '../index'
import { BuildingElement, Material } from '../types'

// Mock nanoid for consistent IDs
vi.mock('nanoid', () => ({
    nanoid: () => 'test-id-' + Math.random().toString(36).substr(2, 9)
}))

// Mock Electron service for auto-save tests
const mockElectronService = {
    saveProject: vi.fn().mockResolvedValue(true),
    showNotification: vi.fn()
}

// Arbitrary generators for test data
const elementArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    type: fc.constantFrom('wall', 'floor', 'door', 'window', 'cut'),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    position: fc.record({
        x: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
        y: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
        z: fc.float({ min: Math.fround(-100), max: Math.fround(100) })
    }),
    rotation: fc.record({
        x: fc.float({ min: Math.fround(0), max: Math.fround(360) }),
        y: fc.float({ min: Math.fround(0), max: Math.fround(360) }),
        z: fc.float({ min: Math.fround(0), max: Math.fround(360) })
    }),
    scale: fc.record({
        x: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
        y: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
        z: fc.float({ min: Math.fround(0.1), max: Math.fround(10) })
    }),
    properties: fc.record({
        thickness: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(1) })),
        height: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(10) })),
        width: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(10) }))
    }),
    visible: fc.boolean(),
    locked: fc.boolean(),
    created: fc.date().map(d => d.toISOString()),
    modified: fc.date().map(d => d.toISOString())
}) as fc.Arbitrary<BuildingElement>

const materialArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom('pbr', 'basic'),
    properties: fc.record({
        albedo: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
        metallic: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        roughness: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        normal: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        emission: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
        emissionIntensity: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        opacity: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        transparent: fc.boolean()
    }),
    textures: fc.record({}),
    created: fc.date().map(d => d.toISOString()),
    modified: fc.date().map(d => d.toISOString())
}) as fc.Arbitrary<Material>

describe('State Management Property Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        const store = useStore.getState()
        store.clearProject()
        store.clearHistory()
    })

    describe('Property 35: Multi-level Undo/Redo System', () => {
        it('Property: Undo/Redo maintains history integrity', () => {
            fc.assert(
                fc.property(
                    fc.array(elementArbitrary, { minLength: 1, maxLength: 5 }),
                    (elements) => {
                        const { result } = renderHook(() => useStore())

                        // Create a project first to allow adding elements
                        act(() => {
                            result.current.createNewProject('Test Project')
                        })

                        // Add elements and track history
                        const initialHistoryLength = result.current.historyState.past.length

                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                                result.current.addHistoryEntry(
                                    'element:add',
                                    `Added ${element.name}`,
                                    { elementId: element.id, element }
                                )
                            })
                        })

                        const afterAddHistoryLength = result.current.historyState.past.length
                        const afterAddElementsCount = result.current.elements.length

                        // History should have grown
                        expect(afterAddHistoryLength).toBeGreaterThan(initialHistoryLength)
                        // Elements should be added (note: project creation adds default materials)
                        expect(afterAddElementsCount).toBeGreaterThanOrEqual(elements.length)

                        // Undo all operations
                        let undoCount = 0
                        act(() => {
                            while (result.current.canUndo() && undoCount < elements.length) {
                                result.current.undo()
                                undoCount++
                            }
                        })

                        // Redo all operations
                        let redoCount = 0
                        act(() => {
                            while (result.current.canRedo() && redoCount < undoCount) {
                                result.current.redo()
                                redoCount++
                            }
                        })

                        // After redo, we should have some elements back
                        expect(undoCount).toBe(redoCount)
                    }
                ),
                { numRuns: 100 }
            )
        })

        it('Property: History size limit is respected', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 100 }),
                    (actions) => {
                        const { result } = renderHook(() => useStore())

                        // Create a project first
                        act(() => {
                            result.current.createNewProject('Test Project')
                        })

                        // Get the default max history size
                        const maxSize = result.current.historyState.maxHistorySize

                        // Add many history entries
                        act(() => {
                            actions.forEach((action, index) => {
                                result.current.addHistoryEntry(
                                    `action:${index}`,
                                    `Action ${index}: ${action}`,
                                    { index, action }
                                )
                            })
                        })

                        // History should not exceed max size
                        const historyLength = result.current.historyState.past.length
                        expect(historyLength).toBeLessThanOrEqual(maxSize)

                        // If we added more actions than max size, history should be at max
                        if (actions.length > maxSize) {
                            expect(historyLength).toBe(maxSize)
                        }
                    }
                ),
                { numRuns: 100 }
            )
        })

        it('Property: Undo/Redo operations are reversible', () => {
            fc.assert(
                fc.property(
                    fc.array(elementArbitrary, { minLength: 1, maxLength: 3 }),
                    fc.integer({ min: 1, max: 5 }),
                    (elements, undoRedoCycles) => {
                        const { result } = renderHook(() => useStore())

                        // Create a project first
                        act(() => {
                            result.current.createNewProject('Test Project')
                        })

                        // Add elements
                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                                result.current.addHistoryEntry(
                                    'element:add',
                                    `Added ${element.name}`,
                                    { elementId: element.id, element }
                                )
                            })
                        })

                        const originalElementsCount = result.current.elements.length
                        const originalHistoryState = JSON.parse(JSON.stringify(result.current.historyState))

                        // Perform multiple undo/redo cycles
                        for (let i = 0; i < undoRedoCycles; i++) {
                            // Undo as much as possible
                            act(() => {
                                while (result.current.canUndo()) {
                                    result.current.undo()
                                }
                            })

                            // Redo as much as possible
                            act(() => {
                                while (result.current.canRedo()) {
                                    result.current.redo()
                                }
                            })
                        }

                        // After cycles, we should be back to original state
                        expect(result.current.elements.length).toBe(originalElementsCount)
                        expect(result.current.historyState.present.action).toBe(originalHistoryState.present.action)
                    }
                ),
                { numRuns: 100 }
            )
        })

        it('Property: History entries have consistent structure', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            action: fc.string({ minLength: 1, maxLength: 50 }),
                            description: fc.string({ minLength: 1, maxLength: 100 }),
                            data: fc.anything()
                        }),
                        { minLength: 1, maxLength: 20 }
                    ),
                    (historyEntries) => {
                        const { result } = renderHook(() => useStore())

                        act(() => {
                            historyEntries.forEach(entry => {
                                result.current.addHistoryEntry(entry.action, entry.description, entry.data)
                            })
                        })

                        // Check that all history entries have required fields
                        const allEntries = [
                            ...result.current.historyState.past,
                            result.current.historyState.present,
                            ...result.current.historyState.future
                        ]

                        allEntries.forEach(entry => {
                            expect(entry).toHaveProperty('id')
                            expect(entry).toHaveProperty('timestamp')
                            expect(entry).toHaveProperty('action')
                            expect(entry).toHaveProperty('description')
                            expect(entry).toHaveProperty('data')
                            expect(typeof entry.id).toBe('string')
                            expect(typeof entry.timestamp).toBe('string')
                            expect(typeof entry.action).toBe('string')
                            expect(typeof entry.description).toBe('string')
                            expect(entry.id.length).toBeGreaterThan(0)
                            expect(entry.action.length).toBeGreaterThan(0)
                        })
                    }
                ),
                { numRuns: 100 }
            )
        })

        it('Property: Future is cleared when new action is performed after undo', () => {
            fc.assert(
                fc.property(
                    fc.array(elementArbitrary, { minLength: 2, maxLength: 4 }),
                    fc.integer({ min: 1, max: 2 }),
                    (elements, undoSteps) => {
                        const { result } = renderHook(() => useStore())

                        // Create a project first
                        act(() => {
                            result.current.createNewProject('Test Project')
                        })

                        // Add elements
                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                                result.current.addHistoryEntry(
                                    'element:add',
                                    `Added ${element.name}`,
                                    { elementId: element.id, element }
                                )
                            })
                        })

                        // Undo some steps
                        act(() => {
                            for (let i = 0; i < Math.min(undoSteps, elements.length); i++) {
                                if (result.current.canUndo()) {
                                    result.current.undo()
                                }
                            }
                        })

                        // Should have future entries
                        expect(result.current.historyState.future.length).toBeGreaterThan(0)

                        // Perform new action
                        const newElement = elements[0] // Reuse first element structure
                        act(() => {
                            result.current.addElement({ ...newElement, id: 'new-element' })
                            result.current.addHistoryEntry(
                                'element:add',
                                'Added new element',
                                { elementId: 'new-element', element: newElement }
                            )
                        })

                        // Future should be cleared
                        expect(result.current.historyState.future.length).toBe(0)
                    }
                ),
                { numRuns: 100 }
            )
        })
    })

    describe('Property 38: Auto-save Functionality', () => {
        it('Property: Auto-save triggers on state changes', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.array(elementArbitrary, { minLength: 1, maxLength: 3 }),
                    fc.integer({ min: 100, max: 500 }), // debounce time
                    async (elements, debounceTime) => {
                        const storeWithAutoSave = createStoreWithAutoSave(mockElectronService)
                        const { result } = renderHook(() => storeWithAutoSave())

                        // Create a project first
                        act(() => {
                            result.current.createNewProject('Test Project')
                            result.current.setAutoSave(true)
                        })

                        // Add elements to trigger state changes
                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                            })
                        })

                        // Wait for debounce + some buffer
                        await new Promise(resolve => setTimeout(resolve, debounceTime + 500))

                        // Auto-save should have been called
                        expect(mockElectronService.saveProject).toHaveBeenCalled()
                    }
                ),
                { numRuns: 30 } // Reduced runs for async tests
            )
        })

        it('Property: Auto-save respects enabled/disabled state', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.array(elementArbitrary, { minLength: 1, maxLength: 2 }),
                    fc.boolean(),
                    async (elements, autoSaveEnabled) => {
                        const storeWithAutoSave = createStoreWithAutoSave(mockElectronService)
                        const { result } = renderHook(() => storeWithAutoSave())

                        // Create a project and set auto-save state
                        act(() => {
                            result.current.createNewProject('Test Project')
                            result.current.setAutoSave(autoSaveEnabled)
                        })

                        // Reset mock call count
                        mockElectronService.saveProject.mockClear()

                        // Add elements to trigger state changes
                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                            })
                        })

                        // Wait for potential auto-save
                        await new Promise(resolve => setTimeout(resolve, 2500))

                        if (autoSaveEnabled) {
                            expect(mockElectronService.saveProject).toHaveBeenCalled()
                        } else {
                            expect(mockElectronService.saveProject).not.toHaveBeenCalled()
                        }
                    }
                ),
                { numRuns: 30 }
            )
        })

        it('Property: Auto-save handles errors gracefully', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.array(elementArbitrary, { minLength: 1, maxLength: 2 }),
                    fc.boolean(),
                    async (elements, shouldFail) => {
                        // Configure mock to fail or succeed
                        if (shouldFail) {
                            mockElectronService.saveProject.mockRejectedValue(new Error('Save failed'))
                        } else {
                            mockElectronService.saveProject.mockResolvedValue(true)
                        }

                        const storeWithAutoSave = createStoreWithAutoSave(mockElectronService)
                        const { result } = renderHook(() => storeWithAutoSave())

                        // Create a project
                        act(() => {
                            result.current.createNewProject('Test Project')
                            result.current.setAutoSave(true)
                        })

                        // Add elements to trigger auto-save
                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                            })
                        })

                        // Wait for auto-save attempt
                        await new Promise(resolve => setTimeout(resolve, 2500))

                        // Should have attempted to save
                        expect(mockElectronService.saveProject).toHaveBeenCalled()

                        if (shouldFail) {
                            // Should have shown error notification
                            expect(mockElectronService.showNotification).toHaveBeenCalled()
                        }

                        // Store should still be functional regardless of save success/failure
                        expect(result.current.elements.length).toBeGreaterThanOrEqual(elements.length)
                    }
                ),
                { numRuns: 30 }
            )
        })

        it('Property: Auto-save updates lastSaved timestamp', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.array(elementArbitrary, { minLength: 1, maxLength: 2 }),
                    async (elements) => {
                        const storeWithAutoSave = createStoreWithAutoSave(mockElectronService)
                        const { result } = renderHook(() => storeWithAutoSave())

                        // Create a project
                        act(() => {
                            result.current.createNewProject('Test Project')
                            result.current.setAutoSave(true)
                        })

                        const initialLastSaved = result.current.appState.lastSaved

                        // Add elements to trigger auto-save
                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                            })
                        })

                        // Wait for auto-save
                        await new Promise(resolve => setTimeout(resolve, 2500))

                        // lastSaved should be updated
                        const finalLastSaved = result.current.appState.lastSaved
                        if (mockElectronService.saveProject.mock.calls.length > 0) {
                            expect(finalLastSaved).not.toBe(initialLastSaved)
                            if (finalLastSaved) {
                                expect(new Date(finalLastSaved).getTime()).toBeGreaterThan(
                                    initialLastSaved ? new Date(initialLastSaved).getTime() : 0
                                )
                            }
                        }
                    }
                ),
                { numRuns: 30 }
            )
        })

        it('Property: Auto-save only saves when project exists', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.array(elementArbitrary, { minLength: 1, maxLength: 2 }),
                    fc.boolean(),
                    async (elements, hasProject) => {
                        const storeWithAutoSave = createStoreWithAutoSave(mockElectronService)
                        const { result } = renderHook(() => storeWithAutoSave())

                        // Conditionally create a project
                        if (hasProject) {
                            act(() => {
                                result.current.createNewProject('Test Project')
                            })
                        }

                        act(() => {
                            result.current.setAutoSave(true)
                        })

                        // Reset mock
                        mockElectronService.saveProject.mockClear()

                        // Add elements (this will fail if no project, but auto-save shouldn't trigger)
                        act(() => {
                            elements.forEach(element => {
                                try {
                                    result.current.addElement(element)
                                } catch (error) {
                                    // Ignore errors when no project exists
                                }
                            })
                        })

                        // Wait for potential auto-save
                        await new Promise(resolve => setTimeout(resolve, 2500))

                        if (hasProject) {
                            expect(mockElectronService.saveProject).toHaveBeenCalled()
                        } else {
                            expect(mockElectronService.saveProject).not.toHaveBeenCalled()
                        }
                    }
                ),
                { numRuns: 30 }
            )
        })
    })

    describe('Integration Properties: Undo/Redo with Auto-save', () => {
        it('Property: Undo/Redo operations trigger auto-save', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.array(elementArbitrary, { minLength: 2, maxLength: 3 }),
                    async (elements) => {
                        const storeWithAutoSave = createStoreWithAutoSave(mockElectronService)
                        const { result } = renderHook(() => storeWithAutoSave())

                        // Create project and enable auto-save
                        act(() => {
                            result.current.createNewProject('Test Project')
                            result.current.setAutoSave(true)
                        })

                        // Add elements with history
                        act(() => {
                            elements.forEach(element => {
                                result.current.addElement(element)
                                result.current.addHistoryEntry(
                                    'element:add',
                                    `Added ${element.name}`,
                                    { elementId: element.id, element }
                                )
                            })
                        })

                        // Clear mock calls from initial adds
                        await new Promise(resolve => setTimeout(resolve, 2500))
                        mockElectronService.saveProject.mockClear()

                        // Perform undo operation
                        act(() => {
                            if (result.current.canUndo()) {
                                result.current.undo()
                            }
                        })

                        // Wait for auto-save after undo
                        await new Promise(resolve => setTimeout(resolve, 2500))

                        // Auto-save should have been triggered by undo
                        expect(mockElectronService.saveProject).toHaveBeenCalled()

                        // Reset and test redo
                        mockElectronService.saveProject.mockClear()

                        act(() => {
                            if (result.current.canRedo()) {
                                result.current.redo()
                            }
                        })

                        // Wait for auto-save after redo
                        await new Promise(resolve => setTimeout(resolve, 2500))

                        // Auto-save should have been triggered by redo
                        expect(mockElectronService.saveProject).toHaveBeenCalled()
                    }
                ),
                { numRuns: 20 }
            )
        })
    })
})