/**
 * Persist middleware لحفظ الإعدادات
 * Persist middleware for saving settings
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand'
import { StoreState } from '../types'
import { debounce } from '../utils'

type PersistMiddleware = <
    T,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
    f: StateCreator<T, Mps, Mcs>,
    options?: PersistOptions
) => StateCreator<T, Mps, Mcs>

interface PersistOptions {
    name: string
    storage?: Storage
    partialize?: (state: any) => any
    onRehydrateStorage?: () => (state?: any, error?: Error) => void
    version?: number
    migrate?: (persistedState: any, version: number) => any
    merge?: (persistedState: any, currentState: any) => any
    skipHydration?: boolean
    debounceTime?: number
}

export const persistMiddleware: PersistMiddleware = (f, options = {}) => (set, get, api) => {
    const {
        name,
        storage = localStorage,
        partialize = (state) => state,
        onRehydrateStorage,
        version = 0,
        migrate,
        merge = (persistedState, currentState) => ({ ...currentState, ...persistedState }),
        skipHydration = false,
        debounceTime = 1000
    } = options

    if (!name) {
        throw new Error('Persist middleware requires a name option')
    }

    const storageKey = `building-forge-${name}`
    let hasHydrated = false

    // Debounced persist function
    const debouncedPersist = debounce(() => {
        try {
            const state = get()
            const stateToPersist = partialize(state)
            const serializedState = JSON.stringify({
                state: stateToPersist,
                version
            })
            storage.setItem(storageKey, serializedState)
        } catch (error) {
            console.error(`Failed to persist state for ${name}:`, error)
        }
    }, debounceTime)

    // Hydrate function
    const hydrate = () => {
        if (hasHydrated || skipHydration) return

        try {
            const serializedState = storage.getItem(storageKey)
            if (!serializedState) {
                hasHydrated = true
                return
            }

            const { state: persistedState, version: persistedVersion } = JSON.parse(serializedState)

            let stateToMerge = persistedState

            // Handle migration if needed
            if (migrate && persistedVersion !== version) {
                stateToMerge = migrate(persistedState, persistedVersion)
            }

            // Merge with current state
            const currentState = get()
            const mergedState = merge(stateToMerge, currentState)

            // Apply the merged state
            set(mergedState, true)

            hasHydrated = true

            // Call rehydration callback
            const onRehydrate = onRehydrateStorage?.()
            onRehydrate?.(mergedState)

        } catch (error) {
            console.error(`Failed to hydrate state for ${name}:`, error)
            const onRehydrate = onRehydrateStorage?.()
            onRehydrate?.(undefined, error as Error)
            hasHydrated = true
        }
    }

    // Wrap set function to trigger persistence
    const wrappedSet = (partial: any, replace?: boolean) => {
        set(partial, replace)

        // Only persist after hydration is complete
        if (hasHydrated) {
            debouncedPersist()
        }
    }

    // Hydrate on initialization
    if (!skipHydration) {
        hydrate()
    }

    return f(wrappedSet, get, api)
}

/**
 * Create persist middleware for UI settings
 */
export function createUIPersistMiddleware(): PersistMiddleware {
    return (f, options = {}) => persistMiddleware(f, {
        name: 'ui-settings',
        partialize: (state: StoreState) => ({
            uiState: state.uiState,
            viewportState: {
                camera: state.viewportState?.camera,
                grid: state.viewportState?.grid
            }
        }),
        version: 1,
        migrate: (persistedState, version) => {
            // Handle migration from version 0 to 1
            if (version === 0) {
                return {
                    ...persistedState,
                    uiState: {
                        ...persistedState.uiState,
                        language: persistedState.uiState?.language || 'ar'
                    }
                }
            }
            return persistedState
        },
        ...options
    })
}

/**
 * Create persist middleware for app settings
 */
export function createAppPersistMiddleware(): PersistMiddleware {
    return (f, options = {}) => persistMiddleware(f, {
        name: 'app-settings',
        partialize: (state: StoreState) => ({
            appState: {
                autoSave: state.appState?.autoSave,
                autoSaveInterval: state.appState?.autoSaveInterval,
                recentProjects: state.appState?.recentProjects
            },
            toolState: {
                toolProperties: state.toolState?.toolProperties
            }
        }),
        version: 1,
        migrate: (persistedState, version) => {
            // Handle migration from version 0 to 1
            if (version === 0) {
                return {
                    ...persistedState,
                    appState: {
                        ...persistedState.appState,
                        autoSaveInterval: persistedState.appState?.autoSaveInterval || 300000
                    }
                }
            }
            return persistedState
        },
        ...options
    })
}

/**
 * Create persist middleware for materials library
 */
export function createMaterialsPersistMiddleware(): PersistMiddleware {
    return (f, options = {}) => persistMiddleware(f, {
        name: 'materials-library',
        partialize: (state: StoreState) => ({
            materials: state.materials?.filter(material =>
                !material.id.startsWith('default-') // Don't persist default materials
            )
        }),
        version: 1,
        merge: (persistedState, currentState) => ({
            ...currentState,
            materials: [
                ...currentState.materials?.filter((material: any) =>
                    material.id.startsWith('default-')
                ) || [],
                ...persistedState.materials || []
            ]
        }),
        ...options
    })
}

/**
 * Clear all persisted data
 */
export function clearPersistedData() {
    const keys = ['ui-settings', 'app-settings', 'materials-library']

    keys.forEach(key => {
        try {
            localStorage.removeItem(`building-forge-${key}`)
        } catch (error) {
            console.error(`Failed to clear persisted data for ${key}:`, error)
        }
    })
}

/**
 * Export persisted data for backup
 */
export function exportPersistedData(): Record<string, any> {
    const keys = ['ui-settings', 'app-settings', 'materials-library']
    const data: Record<string, any> = {}

    keys.forEach(key => {
        try {
            const serializedData = localStorage.getItem(`building-forge-${key}`)
            if (serializedData) {
                data[key] = JSON.parse(serializedData)
            }
        } catch (error) {
            console.error(`Failed to export persisted data for ${key}:`, error)
        }
    })

    return data
}

/**
 * Import persisted data from backup
 */
export function importPersistedData(data: Record<string, any>) {
    Object.entries(data).forEach(([key, value]) => {
        try {
            localStorage.setItem(`building-forge-${key}`, JSON.stringify(value))
        } catch (error) {
            console.error(`Failed to import persisted data for ${key}:`, error)
        }
    })
}