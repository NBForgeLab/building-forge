/**
 * Materials slice لإدارة المواد
 * Materials slice for managing materials
 */

import { StateCreator } from 'zustand'
import { Material, MaterialsSlice, StoreState } from '../types'
import { generateId } from '../utils'

export const createMaterialsSlice: StateCreator<
    StoreState,
    [],
    [],
    MaterialsSlice
> = (set, get) => ({
    materials: [],

    addMaterial: (material: Material) => {
        const newMaterial: Material = {
            ...material,
            id: material.id || generateId(),
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }

        set(state => ({
            materials: [...state.materials, newMaterial]
        }))

        // Update project if exists
        const project = get().project
        if (project) {
            get().updateProject({
                materials: [...get().materials],
                modified: new Date().toISOString()
            })
        }

        // Add history entry
        get().addHistoryEntry(
            'material:add',
            `تم إضافة مادة: ${newMaterial.name}`,
            { materialId: newMaterial.id, material: newMaterial }
        )
    },

    updateMaterial: (id: string, updates: Partial<Material>) => {
        const material = get().getMaterialById(id)
        if (!material) return

        const updatedMaterial: Material = {
            ...material,
            ...updates,
            modified: new Date().toISOString()
        }

        set(state => ({
            materials: state.materials.map(mat =>
                mat.id === id ? updatedMaterial : mat
            )
        }))

        // Update project if exists
        const project = get().project
        if (project) {
            get().updateProject({
                materials: [...get().materials],
                modified: new Date().toISOString()
            })
        }

        // Add history entry
        get().addHistoryEntry(
            'material:update',
            `تم تحديث مادة: ${material.name}`,
            { materialId: id, updates, previousState: material }
        )
    },

    removeMaterial: (id: string) => {
        const material = get().getMaterialById(id)
        if (!material) return

        // Check if material is used by any elements
        const elementsUsingMaterial = get().elements.filter(el => el.materialId === id)

        if (elementsUsingMaterial.length > 0) {
            // Remove material reference from elements
            elementsUsingMaterial.forEach(element => {
                get().updateElement(element.id, { materialId: undefined })
            })
        }

        set(state => ({
            materials: state.materials.filter(mat => mat.id !== id)
        }))

        // Update project if exists
        const project = get().project
        if (project) {
            get().updateProject({
                materials: [...get().materials],
                modified: new Date().toISOString()
            })
        }

        // Add history entry
        get().addHistoryEntry(
            'material:remove',
            `تم حذف مادة: ${material.name}`,
            { materialId: id, material, affectedElements: elementsUsingMaterial.map(el => el.id) }
        )
    },

    duplicateMaterial: (id: string) => {
        const material = get().getMaterialById(id)
        if (!material) return

        const duplicatedMaterial: Material = {
            ...material,
            id: generateId(),
            name: `${material.name} - نسخة`,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }

        get().addMaterial(duplicatedMaterial)

        return duplicatedMaterial.id
    },

    getMaterialById: (id: string) => {
        return get().materials.find(material => material.id === id)
    },

    getDefaultMaterials: (): Material[] => [
        {
            id: 'default-concrete',
            name: 'خرسانة',
            type: 'pbr',
            properties: {
                albedo: '#c0c0c0',
                metallic: 0.0,
                roughness: 0.8,
                normal: 0.5,
                emission: '#000000',
                emissionIntensity: 0.0,
                opacity: 1.0,
                transparent: false
            },
            textures: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        },
        {
            id: 'default-brick',
            name: 'طوب',
            type: 'pbr',
            properties: {
                albedo: '#8B4513',
                metallic: 0.0,
                roughness: 0.9,
                normal: 0.7,
                emission: '#000000',
                emissionIntensity: 0.0,
                opacity: 1.0,
                transparent: false
            },
            textures: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        },
        {
            id: 'default-wood',
            name: 'خشب',
            type: 'pbr',
            properties: {
                albedo: '#8B4513',
                metallic: 0.0,
                roughness: 0.7,
                normal: 0.6,
                emission: '#000000',
                emissionIntensity: 0.0,
                opacity: 1.0,
                transparent: false
            },
            textures: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        },
        {
            id: 'default-metal',
            name: 'معدن',
            type: 'pbr',
            properties: {
                albedo: '#C0C0C0',
                metallic: 1.0,
                roughness: 0.2,
                normal: 0.3,
                emission: '#000000',
                emissionIntensity: 0.0,
                opacity: 1.0,
                transparent: false
            },
            textures: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        },
        {
            id: 'default-glass',
            name: 'زجاج',
            type: 'pbr',
            properties: {
                albedo: '#E6F3FF',
                metallic: 0.0,
                roughness: 0.0,
                normal: 0.1,
                emission: '#000000',
                emissionIntensity: 0.0,
                opacity: 0.3,
                transparent: true
            },
            textures: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        },
        {
            id: 'default-tile',
            name: 'بلاط',
            type: 'pbr',
            properties: {
                albedo: '#F5F5DC',
                metallic: 0.0,
                roughness: 0.3,
                normal: 0.4,
                emission: '#000000',
                emissionIntensity: 0.0,
                opacity: 1.0,
                transparent: false
            },
            textures: {},
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }
    ]
})