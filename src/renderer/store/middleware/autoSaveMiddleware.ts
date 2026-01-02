/**
 * Auto-save middleware للحفظ التلقائي
 * Auto-save middleware for automatic saving
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand'
import { StoreState } from '../types'
import { debounce } from '../utils'

type AutoSaveMiddleware = <
    T,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
    f: StateCreator<T, Mps, Mcs>,
    options?: AutoSaveOptions
) => StateCreator<T, Mps, Mcs>

interface AutoSaveOptions {
    enabled?: boolean
    interval?: number
    onSave?: (state: any) => Promise<void>
    onError?: (error: Error) => void
    debounceTime?: number
}

export const autoSaveMiddleware: AutoSaveMiddleware = (f, options = {}) => (set, get, api) => {
    const {
        enabled = true,
        interval = 300000, // 5 minutes
        onSave,
        onError,
        debounceTime = 2000 // 2 seconds
    } = options

    let autoSaveTimer: NodeJS.Timeout | null = null
    let lastSaveTime = Date.now()

    // Debounced save function
    const debouncedSave = debounce(async () => {
        if (!enabled) return

        try {
            const state = get() as StoreState

            // Only save if there's a project and auto-save is enabled
            if (!state.project || !state.appState.autoSave) return

            // Check if enough time has passed since last save
            const now = Date.now()
            if (now - lastSaveTime < debounceTime) return

            if (onSave) {
                await onSave(state)
                lastSaveTime = now

                // Update last saved timestamp
                if ('setLastSaved' in state) {
                    ; (state as any).setLastSaved(new Date().toISOString())
                }
            }
        } catch (error) {
            if (onError) {
                onError(error as Error)
            } else {
                console.error('Auto-save failed:', error)
            }
        }
    }, debounceTime)

    // Set up periodic auto-save
    const setupAutoSave = () => {
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer)
        }

        if (enabled && interval > 0) {
            autoSaveTimer = setInterval(() => {
                debouncedSave()
            }, interval)
        }
    }

    // Initialize auto-save
    setupAutoSave()

    // Wrap the original set function to trigger auto-save on state changes
    const wrappedSet = (partial: any, replace?: boolean) => {
        set(partial, replace)

        // Trigger debounced save after state change
        if (enabled) {
            debouncedSave()
        }
    }

    // Clean up on unmount
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            if (autoSaveTimer) {
                clearInterval(autoSaveTimer)
            }
        })
    }

    return f(wrappedSet, get, api)
}

/**
 * Create auto-save middleware with Electron service integration
 */
export function createAutoSaveMiddleware(electronService: any): AutoSaveMiddleware {
    return (f, options = {}) => autoSaveMiddleware(f, {
        ...options,
        onSave: async (state: StoreState) => {
            if (!state.project) return

            try {
                const success = await electronService.saveProject(state.project)
                if (!success) {
                    throw new Error('Failed to save project')
                }
            } catch (error) {
                throw error
            }
        },
        onError: (error: Error) => {
            console.error('Auto-save error:', error)

            // Show notification if available
            if (electronService.showNotification) {
                electronService.showNotification(
                    'خطأ في الحفظ التلقائي',
                    'فشل في حفظ المشروع تلقائياً. يرجى الحفظ يدوياً.'
                )
            }
        }
    })
}