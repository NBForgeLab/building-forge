/**
 * مدير التخطيط المتقدم لـ Dockview
 * Advanced Dockview Layout Manager
 * 
 * يوفر إدارة متقدمة لتخطيطات Dockview مع حفظ واستعادة التخطيط
 * وإعادة تعيين للوضع الافتراضي ودعم النوافذ المنفصلة والشاشات المتعددة
 */

import { DockviewApi } from 'dockview'

export interface DockviewLayoutConfig {
    id: string
    name: string
    description?: string
    layout: any // Dockview serialized layout
    created: string
    modified: string
    isDefault?: boolean
}

export interface PopoutWindow {
    id: string
    panelId: string
    bounds: {
        x: number
        y: number
        width: number
        height: number
    }
    display?: number // Display index for multi-monitor support
}

export interface LayoutManagerOptions {
    storeName?: string
    defaultLayoutName?: string
    enablePopouts?: boolean
    enableMultiDisplay?: boolean
}

export class DockviewLayoutManager {
    private storageKey: string
    private api: DockviewApi | null = null
    private options: Required<LayoutManagerOptions>
    private autoSaveTimer: NodeJS.Timeout | null = null
    private popoutWindows: Map<string, any> = new Map()

    constructor(options: LayoutManagerOptions = {}) {
        this.options = {
            storeName: options.storeName || 'dockview-layouts',
            defaultLayoutName: options.defaultLayoutName || 'default',
            enablePopouts: options.enablePopouts ?? true,
            enableMultiDisplay: options.enableMultiDisplay ?? true,
        }

        // Initialize localStorage for persistent layout storage
        this.storageKey = `dockview-${this.options.storeName}`
        this.initializeStorage()

        this.setupAutoSave()
    }

    /**
     * تهيئة التخزين المحلي
     * Initialize local storage
     */
    private initializeStorage(): void {
        const defaultData = {
            layouts: {},
            currentLayout: this.options.defaultLayoutName,
            popoutWindows: [],
            preferences: {
                autoSave: true,
                autoSaveInterval: 30000, // 30 seconds
                rememberPopouts: false,
            },
        }

        const existingData = localStorage.getItem(this.storageKey)
        if (!existingData) {
            localStorage.setItem(this.storageKey, JSON.stringify(defaultData))
        }
    }

    /**
     * الحصول على البيانات من التخزين المحلي
     * Get data from local storage
     */
    private getStorageData(): any {
        const data = localStorage.getItem(this.storageKey)
        return data ? JSON.parse(data) : {}
    }

    /**
     * حفظ البيانات في التخزين المحلي
     * Save data to local storage
     */
    private setStorageData(key: string, value: any): void {
        const data = this.getStorageData()
        data[key] = value
        localStorage.setItem(this.storageKey, JSON.stringify(data))
    }

    /**
     * تهيئة مدير التخطيط مع API الخاص بـ Dockview
     * Initialize layout manager with Dockview API
     */
    initialize(api: DockviewApi): void {
        this.api = api
        this.setupEventListeners()
        this.restoreLayout()
    }

    /**
     * إعداد مستمعي الأحداث لـ Dockview
     * Setup event listeners for Dockview
     */
    private setupEventListeners(): void {
        if (!this.api) return

        // Listen for layout changes
        this.api.onDidLayoutChange(() => {
            const data = this.getStorageData()
            if (data.preferences?.autoSave) {
                this.debouncedSave()
            }
        })

        // Listen for panel additions/removals
        this.api.onDidAddPanel(() => {
            const data = this.getStorageData()
            if (data.preferences?.autoSave) {
                this.debouncedSave()
            }
        })

        this.api.onDidRemovePanel(() => {
            const data = this.getStorageData()
            if (data.preferences?.autoSave) {
                this.debouncedSave()
            }
        })
    }

    /**
     * حفظ التخطيط الحالي
     * Save current layout
     */
    async saveLayout(name?: string, description?: string): Promise<void> {
        if (!this.api) {
            throw new Error('DockviewLayoutManager not initialized')
        }

        const data = this.getStorageData()
        const layoutName = name || data.currentLayout
        const serializedLayout = this.api.toJSON()

        const layoutConfig: DockviewLayoutConfig = {
            id: layoutName,
            name: layoutName,
            description,
            layout: serializedLayout,
            created: this.getExistingLayout(layoutName)?.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            isDefault: layoutName === this.options.defaultLayoutName,
        }

        // Save to localStorage
        const layouts = data.layouts || {}
        layouts[layoutName] = layoutConfig
        this.setStorageData('layouts', layouts)
        this.setStorageData('currentLayout', layoutName)

        console.log(`Layout "${layoutName}" saved successfully`)
    }

    /**
     * استعادة التخطيط المحفوظ
     * Restore saved layout
     */
    async restoreLayout(name?: string): Promise<void> {
        if (!this.api) {
            throw new Error('DockviewLayoutManager not initialized')
        }

        const data = this.getStorageData()
        const layoutName = name || data.currentLayout
        const layoutConfig = this.getExistingLayout(layoutName)

        if (!layoutConfig) {
            console.warn(`Layout "${layoutName}" not found, using default layout`)
            await this.resetToDefault()
            return
        }

        try {
            // Clear current layout
            this.api.clear()

            // Restore from serialized layout
            this.api.fromJSON(layoutConfig.layout)

            this.setStorageData('currentLayout', layoutName)
            console.log(`Layout "${layoutName}" restored successfully`)

            // Restore popout windows if enabled
            if (this.options.enablePopouts && data.preferences?.rememberPopouts) {
                await this.restorePopoutWindows()
            }
        } catch (error) {
            console.error(`Failed to restore layout "${layoutName}":`, error)
            await this.resetToDefault()
        }
    }

    /**
     * إعادة تعيين التخطيط للوضع الافتراضي
     * Reset layout to default
     */
    async resetToDefault(): Promise<void> {
        if (!this.api) {
            throw new Error('DockviewLayoutManager not initialized')
        }

        // Clear current layout
        this.api.clear()

        // Setup default layout
        this.setupDefaultLayout()

        // Save as default if it doesn't exist
        const defaultLayout = this.getExistingLayout(this.options.defaultLayoutName)
        if (!defaultLayout) {
            await this.saveLayout(this.options.defaultLayoutName, 'Default layout')
        }

        this.setStorageData('currentLayout', this.options.defaultLayoutName)
        console.log('Layout reset to default')
    }

    /**
     * إعداد التخطيط الافتراضي
     * Setup default layout
     */
    private setupDefaultLayout(): void {
        if (!this.api) return

        // Add main viewport panel in the center
        this.api.addPanel({
            id: 'viewport',
            component: 'viewport',
            title: 'العارض ثلاثي الأبعاد',
            position: { direction: 'right' },
        })

        // Add tools panel on the left
        this.api.addPanel({
            id: 'tools',
            component: 'tools',
            title: 'الأدوات',
            position: { direction: 'left', referencePanel: 'viewport' },
            initialWidth: 280,
        })

        // Add properties panel on the right
        this.api.addPanel({
            id: 'properties',
            component: 'properties',
            title: 'الخصائص',
            position: { direction: 'right', referencePanel: 'viewport' },
            initialWidth: 280,
        })

        // Add asset library panel below tools
        this.api.addPanel({
            id: 'assetLibrary',
            component: 'assetLibrary',
            title: 'مكتبة الأصول',
            position: { direction: 'below', referencePanel: 'tools' },
            initialHeight: 300,
        })
    }

    /**
     * استخراج panel كنافذة منفصلة
     * Extract panel as popout window
     */
    async popoutPanel(panelId: string, bounds?: Partial<PopoutWindow['bounds']>): Promise<void> {
        if (!this.options.enablePopouts) {
            throw new Error('Popout windows are disabled')
        }

        if (!this.api) {
            throw new Error('DockviewLayoutManager not initialized')
        }

        const panel = this.api.getPanel(panelId)
        if (!panel) {
            throw new Error(`Panel "${panelId}" not found`)
        }

        // Get current display information for multi-monitor support
        const displays = this.options.enableMultiDisplay ? await this.getDisplays() : []
        const primaryDisplay = displays[0] || { bounds: { x: 0, y: 0, width: 1920, height: 1080 } }

        const windowBounds = {
            x: bounds?.x || primaryDisplay.bounds.x + 100,
            y: bounds?.y || primaryDisplay.bounds.y + 100,
            width: bounds?.width || 800,
            height: bounds?.height || 600,
        }

        // Create popout window (this would need to be implemented with Electron's main process)
        const popoutWindow = await this.createPopoutWindow(panelId, windowBounds)

        if (popoutWindow) {
            this.popoutWindows.set(panelId, popoutWindow)

            // Remove panel from main window
            this.api.removePanel(panelId)

            // Save popout window info
            const data = this.getStorageData()
            const popoutWindows = data.popoutWindows || []
            popoutWindows.push({
                id: panelId,
                panelId,
                bounds: windowBounds,
                display: 0, // Primary display for now
            })
            this.setStorageData('popoutWindows', popoutWindows)

            console.log(`Panel "${panelId}" popped out to separate window`)
        }
    }

    /**
     * إرجاع panel من النافذة المنفصلة إلى النافذة الرئيسية
     * Return panel from popout window to main window
     */
    async popinPanel(panelId: string): Promise<void> {
        const popoutWindow = this.popoutWindows.get(panelId)
        if (!popoutWindow) {
            throw new Error(`Popout window for panel "${panelId}" not found`)
        }

        // Close popout window
        popoutWindow.close()
        this.popoutWindows.delete(panelId)

        // Add panel back to main window
        if (this.api) {
            this.api.addPanel({
                id: panelId,
                component: panelId,
                title: this.getPanelTitle(panelId),
                position: { direction: 'right' }, // Default position
            })
        }

        // Remove from stored popout windows
        const data = this.getStorageData()
        const popoutWindows = (data.popoutWindows || []).filter(w => w.panelId !== panelId)
        this.setStorageData('popoutWindows', popoutWindows)

        console.log(`Panel "${panelId}" returned to main window`)
    }

    /**
     * الحصول على قائمة التخطيطات المحفوظة
     * Get list of saved layouts
     */
    getLayouts(): DockviewLayoutConfig[] {
        const data = this.getStorageData()
        const layouts = data.layouts || {}
        return Object.values(layouts).sort((a, b) =>
            new Date(b.modified).getTime() - new Date(a.modified).getTime()
        )
    }

    /**
     * حذف تخطيط محفوظ
     * Delete saved layout
     */
    deleteLayout(name: string): void {
        if (name === this.options.defaultLayoutName) {
            throw new Error('Cannot delete default layout')
        }

        const data = this.getStorageData()
        const layouts = data.layouts || {}
        delete layouts[name]
        this.setStorageData('layouts', layouts)

        // If current layout was deleted, switch to default
        if (data.currentLayout === name) {
            this.setStorageData('currentLayout', this.options.defaultLayoutName)
        }

        console.log(`Layout "${name}" deleted`)
    }

    /**
     * تحديث إعدادات مدير التخطيط
     * Update layout manager preferences
     */
    updatePreferences(preferences: Partial<{
        autoSave: boolean;
        autoSaveInterval: number;
        rememberPopouts: boolean;
    }>): void {
        const data = this.getStorageData()
        const currentPrefs = data.preferences || {}
        const newPrefs = { ...currentPrefs, ...preferences }
        this.setStorageData('preferences', newPrefs)

        // Update auto-save if changed
        if (preferences.autoSave !== undefined || preferences.autoSaveInterval !== undefined) {
            this.setupAutoSave()
        }
    }

    /**
     * الحصول على الإعدادات الحالية
     * Get current preferences
     */
    getPreferences() {
        const data = this.getStorageData()
        return data.preferences || {}
    }

    /**
     * تنظيف الموارد
     * Cleanup resources
     */
    dispose(): void {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer)
            this.autoSaveTimer = null
        }

        // Close all popout windows
        this.popoutWindows.forEach(window => window.close())
        this.popoutWindows.clear()
    }

    // Private helper methods

    private getExistingLayout(name: string): DockviewLayoutConfig | undefined {
        const data = this.getStorageData()
        const layouts = data.layouts || {}
        return layouts[name]
    }

    private setupAutoSave(): void {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer)
            this.autoSaveTimer = null
        }

        const data = this.getStorageData()
        const preferences = data.preferences || {}
        if (preferences.autoSave) {
            this.autoSaveTimer = setInterval(() => {
                this.saveLayout().catch(console.error)
            }, preferences.autoSaveInterval || 30000)
        }
    }

    private debouncedSave = this.debounce(() => {
        this.saveLayout().catch(console.error)
    }, 1000)

    private debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout | null = null
        return (...args: Parameters<T>) => {
            if (timeout) clearTimeout(timeout)
            timeout = setTimeout(() => func(...args), wait)
        }
    }

    private async createPopoutWindow(
        panelId: string,
        bounds: PopoutWindow['bounds']
    ): Promise<any | null> {
        try {
            // Communicate with main process to create popout window
            if (typeof window !== 'undefined' && window.electronAPI) {
                const windowId = await window.electronAPI.createPopoutWindow({
                    panelId,
                    bounds,
                    title: this.getPanelTitle(panelId),
                })

                if (windowId) {
                    // Create a mock BrowserWindow object for tracking
                    const mockWindow = {
                        id: windowId,
                        close: () => {
                            window.electronAPI?.closePopoutWindow(windowId)
                        }
                    } as any

                    return mockWindow
                }
            }
        } catch (error) {
            console.error(`Failed to create popout window for panel "${panelId}":`, error)
        }
        return null
    }

    private async getDisplays(): Promise<any[]> {
        try {
            if (typeof window !== 'undefined' && window.electronAPI) {
                return await window.electronAPI.getDisplays()
            }
        } catch (error) {
            console.error('Failed to get display information:', error)
        }
        return []
    }

    private async restorePopoutWindows(): Promise<void> {
        const data = this.getStorageData()
        const popoutWindows = data.popoutWindows || []

        for (const popoutInfo of popoutWindows) {
            try {
                await this.popoutPanel(popoutInfo.panelId, popoutInfo.bounds)
            } catch (error) {
                console.error(`Failed to restore popout window for panel "${popoutInfo.panelId}":`, error)
            }
        }
    }

    private getPanelTitle(panelId: string): string {
        const titles: Record<string, string> = {
            viewport: 'العارض ثلاثي الأبعاد',
            tools: 'الأدوات',
            properties: 'الخصائص',
            assetLibrary: 'مكتبة الأصول',
        }
        return titles[panelId] || panelId
    }
}

// Singleton instance
let layoutManagerInstance: DockviewLayoutManager | null = null

export function getDockviewLayoutManager(options?: LayoutManagerOptions): DockviewLayoutManager {
    if (!layoutManagerInstance) {
        layoutManagerInstance = new DockviewLayoutManager(options)
    }
    return layoutManagerInstance
}