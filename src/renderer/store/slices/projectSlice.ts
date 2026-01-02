/**
 * Project slice لإدارة حالة المشروع
 * Project slice for managing project state
 */

import { StateCreator } from 'zustand'
import { Project, ProjectSlice, StoreState } from '../types'
import { generateId } from '../utils'

export const createProjectSlice: StateCreator<
    StoreState,
    [],
    [],
    ProjectSlice
> = (set, get) => ({
    project: null,

    setProject: (project: Project) => {
        set({ project })

        // Update elements and materials from project
        const { elements, materials } = project
        set({ elements, materials })

        // Add to recent projects
        get().addRecentProject({
            id: project.id,
            name: project.name,
            path: '', // Will be set when saving
            lastOpened: new Date().toISOString(),
            thumbnail: project.metadata.thumbnail
        })

        // Add history entry
        get().addHistoryEntry(
            'project:load',
            `تم تحميل المشروع: ${project.name}`,
            { projectId: project.id, projectName: project.name }
        )
    },

    updateProject: (updates: Partial<Project>) => {
        const currentProject = get().project
        if (!currentProject) return

        const updatedProject: Project = {
            ...currentProject,
            ...updates,
            modified: new Date().toISOString()
        }

        set({ project: updatedProject })

        // Add history entry
        get().addHistoryEntry(
            'project:update',
            'تم تحديث إعدادات المشروع',
            { updates, projectId: currentProject.id }
        )
    },

    createNewProject: (name: string) => {
        const newProject: Project = {
            id: generateId(),
            name,
            description: '',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: '1.0.0',
            elements: [],
            materials: get().getDefaultMaterials(),
            settings: {
                units: 'metric',
                gridSize: 1.0,
                snapToGrid: true,
                showGrid: true,
                backgroundColor: '#f0f0f0',
                lightingPreset: 'indoor',
                renderQuality: 'medium'
            },
            metadata: {
                author: '',
                tags: [],
                exportFormats: ['glb', 'obj']
            }
        }

        set({
            project: newProject,
            elements: [],
            materials: get().getDefaultMaterials()
        })

        // Clear selection and history
        get().clearSelection()
        get().clearHistory()

        // Add history entry
        get().addHistoryEntry(
            'project:create',
            `تم إنشاء مشروع جديد: ${name}`,
            { projectId: newProject.id, projectName: name }
        )

        // Add to recent projects
        get().addRecentProject({
            id: newProject.id,
            name: newProject.name,
            path: '',
            lastOpened: new Date().toISOString()
        })
    },

    clearProject: () => {
        set({
            project: null,
            elements: [],
            materials: get().getDefaultMaterials()
        })

        // Clear selection and history
        get().clearSelection()
        get().clearHistory()

        // Clear preview
        get().clearPreview()
    }
})