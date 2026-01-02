/**
 * UI slice لإدارة حالة واجهة المستخدم
 * UI slice for managing user interface state
 */

import { StateCreator } from 'zustand'
import { StoreState, UISlice } from '../types'

export const createUISlice: StateCreator<
    StoreState,
    [],
    [],
    UISlice
> = (set, get) => ({
    uiState: {
        sidebarWidth: 256,
        propertiesPanelWidth: 256,
        bottomPanelHeight: 200,
        showGrid: true,
        showStats: false,
        showWireframe: false,
        viewMode: 'solid',
        cameraMode: 'perspective',
        theme: 'dark',
        language: 'ar'
    },

    updateUI: (updates) => {
        set(state => ({
            uiState: {
                ...state.uiState,
                ...updates
            }
        }))

        // Add history entry for significant UI changes
        if (updates.theme || updates.language) {
            get().addHistoryEntry(
                'ui:update',
                'تم تحديث إعدادات الواجهة',
                { updates, previousUI: get().uiState }
            )
        }
    },

    toggleGrid: () => {
        const currentShowGrid = get().uiState.showGrid

        set(state => ({
            uiState: {
                ...state.uiState,
                showGrid: !currentShowGrid
            }
        }))

        // Also update viewport grid visibility
        get().updateGrid({ visible: !currentShowGrid })

        // Add history entry
        get().addHistoryEntry(
            'ui:toggle-grid',
            currentShowGrid ? 'تم إخفاء الشبكة' : 'تم إظهار الشبكة',
            { showGrid: !currentShowGrid, previousShowGrid: currentShowGrid }
        )
    },

    toggleStats: () => {
        const currentShowStats = get().uiState.showStats

        set(state => ({
            uiState: {
                ...state.uiState,
                showStats: !currentShowStats
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'ui:toggle-stats',
            currentShowStats ? 'تم إخفاء الإحصائيات' : 'تم إظهار الإحصائيات',
            { showStats: !currentShowStats, previousShowStats: currentShowStats }
        )
    },

    toggleWireframe: () => {
        const currentShowWireframe = get().uiState.showWireframe

        set(state => ({
            uiState: {
                ...state.uiState,
                showWireframe: !currentShowWireframe
            }
        }))

        // Also update viewport rendering wireframe
        get().updateRendering({ wireframe: !currentShowWireframe })

        // Add history entry
        get().addHistoryEntry(
            'ui:toggle-wireframe',
            currentShowWireframe ? 'تم إيقاف عرض الإطار السلكي' : 'تم تفعيل عرض الإطار السلكي',
            { showWireframe: !currentShowWireframe, previousShowWireframe: currentShowWireframe }
        )
    },

    setViewMode: (mode) => {
        const previousMode = get().uiState.viewMode

        set(state => ({
            uiState: {
                ...state.uiState,
                viewMode: mode
            }
        }))

        // Update viewport rendering mode
        get().updateRendering({ viewMode: mode })

        // Add history entry
        get().addHistoryEntry(
            'ui:view-mode-change',
            `تم تغيير وضع العرض إلى: ${getViewModeName(mode)}`,
            { viewMode: mode, previousViewMode: previousMode }
        )
    },

    setCameraMode: (mode) => {
        const previousMode = get().uiState.cameraMode

        set(state => ({
            uiState: {
                ...state.uiState,
                cameraMode: mode
            }
        }))

        // Update viewport camera mode
        get().updateCamera({ mode })

        // Add history entry
        get().addHistoryEntry(
            'ui:camera-mode-change',
            `تم تغيير وضع الكاميرا إلى: ${getCameraModeName(mode)}`,
            { cameraMode: mode, previousCameraMode: previousMode }
        )
    },

    setTheme: (theme) => {
        const previousTheme = get().uiState.theme

        set(state => ({
            uiState: {
                ...state.uiState,
                theme
            }
        }))

        // Apply theme to document
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(theme)

        // Add history entry
        get().addHistoryEntry(
            'ui:theme-change',
            `تم تغيير المظهر إلى: ${getThemeName(theme)}`,
            { theme, previousTheme }
        )
    },

    setLanguage: (language) => {
        const previousLanguage = get().uiState.language

        set(state => ({
            uiState: {
                ...state.uiState,
                language
            }
        }))

        // Apply language direction to document
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = language

        // Add history entry
        get().addHistoryEntry(
            'ui:language-change',
            `تم تغيير اللغة إلى: ${getLanguageName(language)}`,
            { language, previousLanguage }
        )
    }
})

// Helper functions
function getViewModeName(mode: 'solid' | 'wireframe' | 'textured'): string {
    const modeNames = {
        solid: 'صلب',
        wireframe: 'إطار سلكي',
        textured: 'منسوج'
    }
    return modeNames[mode]
}

function getCameraModeName(mode: 'perspective' | 'orthographic'): string {
    const modeNames = {
        perspective: 'منظوري',
        orthographic: 'متعامد'
    }
    return modeNames[mode]
}

function getThemeName(theme: 'light' | 'dark'): string {
    const themeNames = {
        light: 'فاتح',
        dark: 'داكن'
    }
    return themeNames[theme]
}

function getLanguageName(language: 'ar' | 'en'): string {
    const languageNames = {
        ar: 'العربية',
        en: 'English'
    }
    return languageNames[language]
}