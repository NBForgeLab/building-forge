/**
 * App slice لإدارة حالة التطبيق العامة
 * App slice for managing general application state
 */

import { StateCreator } from 'zustand'
import { AppSlice, RecentProject, StoreState } from '../types'

export const createAppSlice: StateCreator<
    StoreState,
    [],
    [],
    AppSlice
> = (set, get) => ({
    appState: {
        initialized: false,
        loading: false,
        error: undefined,
        lastSaved: undefined,
        autoSave: true,
        autoSaveInterval: 300000, // 5 minutes in milliseconds
        recentProjects: []
    },

    setInitialized: (initialized) => {
        set(state => ({
            appState: {
                ...state.appState,
                initialized
            }
        }))

        if (initialized) {
            // Add history entry
            get().addHistoryEntry(
                'app:initialized',
                'تم تهيئة التطبيق بنجاح',
                { timestamp: new Date().toISOString() }
            )
        }
    },

    setLoading: (loading) => {
        set(state => ({
            appState: {
                ...state.appState,
                loading
            }
        }))
    },

    setError: (error) => {
        set(state => ({
            appState: {
                ...state.appState,
                error
            }
        }))

        if (error) {
            // Add history entry for errors
            get().addHistoryEntry(
                'app:error',
                `حدث خطأ: ${error}`,
                { error, timestamp: new Date().toISOString() }
            )
        }
    },

    setLastSaved: (timestamp) => {
        set(state => ({
            appState: {
                ...state.appState,
                lastSaved: timestamp
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'app:saved',
            'تم حفظ المشروع',
            { timestamp }
        )
    },

    setAutoSave: (enabled) => {
        const previousAutoSave = get().appState.autoSave

        set(state => ({
            appState: {
                ...state.appState,
                autoSave: enabled
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'app:autosave-toggle',
            enabled ? 'تم تفعيل الحفظ التلقائي' : 'تم إيقاف الحفظ التلقائي',
            { enabled, previousAutoSave }
        )
    },

    addRecentProject: (project) => {
        set(state => {
            const existingIndex = state.appState.recentProjects.findIndex(
                p => p.id === project.id
            )

            let newRecentProjects: RecentProject[]

            if (existingIndex >= 0) {
                // Update existing project and move to top
                newRecentProjects = [
                    { ...state.appState.recentProjects[existingIndex], ...project },
                    ...state.appState.recentProjects.filter((_, index) => index !== existingIndex)
                ]
            } else {
                // Add new project to top
                newRecentProjects = [project, ...state.appState.recentProjects]
            }

            // Limit to 10 recent projects
            newRecentProjects = newRecentProjects.slice(0, 10)

            return {
                appState: {
                    ...state.appState,
                    recentProjects: newRecentProjects
                }
            }
        })

        // Add history entry
        get().addHistoryEntry(
            'app:recent-project-add',
            `تم إضافة مشروع للمشاريع الأخيرة: ${project.name}`,
            { project }
        )
    },

    removeRecentProject: (id) => {
        const projectToRemove = get().appState.recentProjects.find(p => p.id === id)

        if (!projectToRemove) return

        set(state => ({
            appState: {
                ...state.appState,
                recentProjects: state.appState.recentProjects.filter(p => p.id !== id)
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'app:recent-project-remove',
            `تم حذف مشروع من المشاريع الأخيرة: ${projectToRemove.name}`,
            { project: projectToRemove }
        )
    }
})