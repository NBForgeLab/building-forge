/**
 * اختبارات المتجر الرئيسي
 * Tests for the main store
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../index'
import { BuildingElement, Material } from '../types'

// Mock nanoid
vi.mock('nanoid', () => ({
    nanoid: () => 'test-id-' + Math.random().toString(36).substr(2, 9)
}))

describe('Store', () => {
    beforeEach(() => {
        // Reset store state before each test
        const store = useStore.getState()
        store.clearProject()
        store.clearHistory()
    })

    describe('Project Management', () => {
        it('should create a new project', () => {
            const { result } = renderHook(() => useStore())

            act(() => {
                result.current.createNewProject('Test Project')
            })

            const project = result.current.project
            expect(project).toBeDefined()
            expect(project?.name).toBe('Test Project')
            expect(project?.elements).toEqual([])
            expect(project?.materials).toHaveLength(6) // Default materials
        })

        it('should update project', () => {
            const { result } = renderHook(() => useStore())

            act(() => {
                result.current.createNewProject('Test Project')
            })

            const originalModified = result.current.project?.modified

            act(() => {
                result.current.updateProject({ description: 'Updated description' })
            })

            expect(result.current.project?.description).toBe('Updated description')
            expect(result.current.project?.modified).not.toBe(originalModified)
        })

        it('should clear project', () => {
            const { result } = renderHook(() => useStore())

            act(() => {
                result.current.createNewProject('Test Project')
            })

            expect(result.current.project).toBeDefined()

            act(() => {
                result.current.clearProject()
            })

            expect(result.current.project).toBeNull()
            expect(result.current.elements).toEqual([])
        })
    })

    describe('Element Management', () => {
        it('should add element', () => {
            const { result } = renderHook(() => useStore())

            const element: BuildingElement = {
                id: 'test-element',
                type: 'wall',
                name: 'Test Wall',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: { thickness: 0.2, height: 3.0 },
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(element)
            })

            expect(result.current.elements).toHaveLength(1)
            expect(result.current.elements[0].name).toBe('Test Wall')
        })

        it('should update element', () => {
            const { result } = renderHook(() => useStore())

            const element: BuildingElement = {
                id: 'test-element',
                type: 'wall',
                name: 'Test Wall',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: { thickness: 0.2, height: 3.0 },
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(element)
            })

            act(() => {
                result.current.updateElement('test-element', { name: 'Updated Wall' })
            })

            expect(result.current.elements[0].name).toBe('Updated Wall')
        })

        it('should remove element', () => {
            const { result } = renderHook(() => useStore())

            const element: BuildingElement = {
                id: 'test-element',
                type: 'wall',
                name: 'Test Wall',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: { thickness: 0.2, height: 3.0 },
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(element)
            })

            expect(result.current.elements).toHaveLength(1)

            act(() => {
                result.current.removeElement('test-element')
            })

            expect(result.current.elements).toHaveLength(0)
        })

        it('should duplicate element', () => {
            const { result } = renderHook(() => useStore())

            const element: BuildingElement = {
                id: 'test-element',
                type: 'wall',
                name: 'Test Wall',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: { thickness: 0.2, height: 3.0 },
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(element)
            })

            act(() => {
                result.current.duplicateElement('test-element')
            })

            expect(result.current.elements).toHaveLength(2)
            expect(result.current.elements[1].name).toBe('Test Wall - نسخة')
        })

        it('should get elements by type', () => {
            const { result } = renderHook(() => useStore())

            const wall: BuildingElement = {
                id: 'wall-1',
                type: 'wall',
                name: 'Wall 1',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: {},
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            const door: BuildingElement = {
                id: 'door-1',
                type: 'door',
                name: 'Door 1',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: {},
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(wall)
                result.current.addElement(door)
            })

            const walls = result.current.getElementsByType('wall')
            const doors = result.current.getElementsByType('door')

            expect(walls).toHaveLength(1)
            expect(doors).toHaveLength(1)
            expect(walls[0].name).toBe('Wall 1')
            expect(doors[0].name).toBe('Door 1')
        })
    })

    describe('Material Management', () => {
        it('should add material', () => {
            const { result } = renderHook(() => useStore())

            const material: Material = {
                id: 'test-material',
                name: 'Test Material',
                type: 'pbr',
                properties: {
                    albedo: '#ffffff',
                    metallic: 0.0,
                    roughness: 0.5,
                    normal: 0.5,
                    emission: '#000000',
                    emissionIntensity: 0.0,
                    opacity: 1.0,
                    transparent: false
                },
                textures: {},
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addMaterial(material)
            })

            // Should have default materials + the new one
            expect(result.current.materials.length).toBeGreaterThan(6)
            const addedMaterial = result.current.materials.find(m => m.name === 'Test Material')
            expect(addedMaterial).toBeDefined()
        })

        it('should get default materials', () => {
            const { result } = renderHook(() => useStore())

            const defaultMaterials = result.current.getDefaultMaterials()

            expect(defaultMaterials).toHaveLength(6)
            expect(defaultMaterials.some(m => m.name === 'خرسانة')).toBe(true)
            expect(defaultMaterials.some(m => m.name === 'طوب')).toBe(true)
            expect(defaultMaterials.some(m => m.name === 'خشب')).toBe(true)
        })
    })

    describe('Tool Management', () => {
        it('should set active tool', () => {
            const { result } = renderHook(() => useStore())

            expect(result.current.toolState.activeTool).toBe('select')

            act(() => {
                result.current.setActiveTool('wall')
            })

            expect(result.current.toolState.activeTool).toBe('wall')
        })

        it('should update tool properties', () => {
            const { result } = renderHook(() => useStore())

            act(() => {
                result.current.updateToolProperties({ wallThickness: 0.3 })
            })

            expect(result.current.toolState.toolProperties.wallThickness).toBe(0.3)
        })
    })

    describe('Selection Management', () => {
        it('should select element', () => {
            const { result } = renderHook(() => useStore())

            // First add an element
            const element: BuildingElement = {
                id: 'test-element',
                type: 'wall',
                name: 'Test Wall',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: {},
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(element)
            })

            act(() => {
                result.current.selectElement('test-element')
            })

            expect(result.current.selectionState.selectedElements).toContain('test-element')
        })

        it('should select multiple elements', () => {
            const { result } = renderHook(() => useStore())

            // First add elements
            const element1: BuildingElement = {
                id: 'element-1',
                type: 'wall',
                name: 'Wall 1',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: {},
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            const element2: BuildingElement = {
                id: 'element-2',
                type: 'door',
                name: 'Door 1',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: {},
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(element1)
                result.current.addElement(element2)
            })

            act(() => {
                result.current.selectElements(['element-1', 'element-2'])
            })

            expect(result.current.selectionState.selectedElements).toEqual(['element-1', 'element-2'])
        })

        it('should clear selection', () => {
            const { result } = renderHook(() => useStore())

            // First add elements
            const element1: BuildingElement = {
                id: 'element-1',
                type: 'wall',
                name: 'Wall 1',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: {},
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            const element2: BuildingElement = {
                id: 'element-2',
                type: 'door',
                name: 'Door 1',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                properties: {},
                visible: true,
                locked: false,
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }

            act(() => {
                result.current.addElement(element1)
                result.current.addElement(element2)
            })

            act(() => {
                result.current.selectElements(['element-1', 'element-2'])
            })

            expect(result.current.selectionState.selectedElements).toHaveLength(2)

            act(() => {
                result.current.clearSelection()
            })

            expect(result.current.selectionState.selectedElements).toHaveLength(0)
        })
    })

    describe('History Management', () => {
        it('should add history entry', () => {
            const { result } = renderHook(() => useStore())

            act(() => {
                result.current.addHistoryEntry('test:action', 'Test action', { data: 'test' })
            })

            expect(result.current.historyState.past).toHaveLength(1)
            expect(result.current.historyState.present.action).toBe('test:action')
        })

        it('should support undo/redo', () => {
            const { result } = renderHook(() => useStore())

            // Add some history entries
            act(() => {
                result.current.addHistoryEntry('action:1', 'Action 1', {})
                result.current.addHistoryEntry('action:2', 'Action 2', {})
            })

            expect(result.current.canUndo()).toBe(true)
            expect(result.current.canRedo()).toBe(false)

            // Undo
            act(() => {
                result.current.undo()
            })

            expect(result.current.historyState.present.action).toBe('action:1')
            expect(result.current.canRedo()).toBe(true)

            // Redo
            act(() => {
                result.current.redo()
            })

            expect(result.current.historyState.present.action).toBe('action:2')
        })
    })

    describe('UI State Management', () => {
        it('should toggle theme', () => {
            const { result } = renderHook(() => useStore())

            const initialTheme = result.current.uiState.theme

            act(() => {
                result.current.setTheme(initialTheme === 'dark' ? 'light' : 'dark')
            })

            expect(result.current.uiState.theme).toBe(initialTheme === 'dark' ? 'light' : 'dark')
        })

        it('should toggle grid visibility', () => {
            const { result } = renderHook(() => useStore())

            const initialShowGrid = result.current.uiState.showGrid

            act(() => {
                result.current.toggleGrid()
            })

            expect(result.current.uiState.showGrid).toBe(!initialShowGrid)
        })
    })

    describe('App State Management', () => {
        it('should set loading state', () => {
            const { result } = renderHook(() => useStore())

            act(() => {
                result.current.setLoading(true)
            })

            expect(result.current.appState.loading).toBe(true)

            act(() => {
                result.current.setLoading(false)
            })

            expect(result.current.appState.loading).toBe(false)
        })

        it('should manage recent projects', () => {
            const { result } = renderHook(() => useStore())

            const recentProject = {
                id: 'project-1',
                name: 'Recent Project',
                path: '/path/to/project',
                lastOpened: new Date().toISOString()
            }

            act(() => {
                result.current.addRecentProject(recentProject)
            })

            expect(result.current.appState.recentProjects).toContain(recentProject)

            act(() => {
                result.current.removeRecentProject('project-1')
            })

            expect(result.current.appState.recentProjects).not.toContain(recentProject)
        })
    })
})