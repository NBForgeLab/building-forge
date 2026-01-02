/**
 * اختبارات خدمة Electron
 * Tests for ElectronService
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock window.electronAPI
const mockElectronAPI = {
    saveProject: vi.fn(),
    loadProject: vi.fn(),
    exportProject: vi.fn(),
    onMenuAction: vi.fn(),
    removeMenuListener: vi.fn(),
    showNotification: vi.fn(),
    getSystemInfo: vi.fn(),
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    openDevTools: vi.fn(),
    reloadWindow: vi.fn(),
}

// Mock DOM APIs
const mockDocument = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement: vi.fn(),
}

const mockURL = {
    createObjectURL: vi.fn().mockReturnValue('blob:url'),
    revokeObjectURL: vi.fn(),
}

const mockNotification = vi.fn()

describe('ElectronService', () => {
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()

        // Mock localStorage for browser fallbacks
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
            },
            writable: true,
        })

        // Mock Notification API
        Object.defineProperty(window, 'Notification', {
            value: mockNotification,
            writable: true,
        })
        Object.defineProperty(mockNotification, 'permission', {
            value: 'granted',
            writable: true,
        })
        Object.defineProperty(mockNotification, 'requestPermission', {
            value: vi.fn().mockResolvedValue('granted'),
            writable: true,
        })

        // Mock navigator
        Object.defineProperty(window, 'navigator', {
            value: {
                platform: 'Win32',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            writable: true,
        })

        // Mock document
        Object.defineProperty(global, 'document', {
            value: mockDocument,
            writable: true,
        })

        // Mock URL
        Object.defineProperty(window, 'URL', {
            value: mockURL,
            writable: true,
        })
    })

    afterEach(() => {
        // Clean up
        delete (window as any).electronAPI
        vi.resetModules()
    })

    describe('Electron Environment', () => {
        beforeEach(() => {
            // Mock Electron environment
            ; (window as any).electronAPI = mockElectronAPI
        })

        it('should detect Electron environment correctly', async () => {
            // Re-import to get fresh instance
            const { electronService } = await import('../ElectronService')
            expect(electronService.isRunningInElectron).toBe(true)
        })

        it('should save project successfully', async () => {
            const { electronService } = await import('../ElectronService')
            const projectData = { name: 'Test Project', elements: [] }
            mockElectronAPI.saveProject.mockResolvedValue(true)

            const result = await electronService.saveProject(projectData)

            expect(result).toBe(true)
            expect(mockElectronAPI.saveProject).toHaveBeenCalledWith(projectData)
        })

        it('should load project successfully', async () => {
            const { electronService } = await import('../ElectronService')
            const projectData = { name: 'Test Project', elements: [] }
            mockElectronAPI.loadProject.mockResolvedValue(projectData)

            const result = await electronService.loadProject()

            expect(result).toEqual(projectData)
            expect(mockElectronAPI.loadProject).toHaveBeenCalled()
        })

        it('should export project successfully', async () => {
            const { electronService } = await import('../ElectronService')
            const projectData = { name: 'Test Project', elements: [] }
            mockElectronAPI.exportProject.mockResolvedValue(true)

            const result = await electronService.exportProject('glb', projectData)

            expect(result).toBe(true)
            expect(mockElectronAPI.exportProject).toHaveBeenCalledWith('glb', projectData)
        })

        it('should handle menu actions', async () => {
            const { electronService } = await import('../ElectronService')
            const callback = vi.fn()

            electronService.onMenuAction(callback)

            expect(mockElectronAPI.onMenuAction).toHaveBeenCalledWith(expect.any(Function))
        })

        it('should show notifications', async () => {
            const { electronService } = await import('../ElectronService')
            electronService.showNotification('Test Title', 'Test Body')

            expect(mockElectronAPI.showNotification).toHaveBeenCalledWith('Test Title', 'Test Body')
        })

        it('should get system info', async () => {
            const { electronService } = await import('../ElectronService')
            const systemInfo = { platform: 'win32', version: '1.0.0', arch: 'x64' }
            mockElectronAPI.getSystemInfo.mockResolvedValue(systemInfo)

            const result = await electronService.getSystemInfo()

            expect(result).toEqual(systemInfo)
            expect(mockElectronAPI.getSystemInfo).toHaveBeenCalled()
        })

        it('should control windows', async () => {
            const { electronService } = await import('../ElectronService')
            electronService.minimizeWindow()
            electronService.maximizeWindow()
            electronService.closeWindow()

            expect(mockElectronAPI.minimizeWindow).toHaveBeenCalled()
            expect(mockElectronAPI.maximizeWindow).toHaveBeenCalled()
            expect(mockElectronAPI.closeWindow).toHaveBeenCalled()
        })

        it('should handle errors gracefully', async () => {
            const { electronService } = await import('../ElectronService')
            mockElectronAPI.saveProject.mockRejectedValue(new Error('Save failed'))

            const result = await electronService.saveProject({ name: 'Test' })

            expect(result).toBe(false)
        })
    })

    describe('Browser Environment (Fallbacks)', () => {
        beforeEach(() => {
            // Ensure no Electron API
            delete (window as any).electronAPI
        })

        it('should detect browser environment correctly', async () => {
            const { electronService } = await import('../ElectronService')
            expect(electronService.isRunningInElectron).toBe(false)
        })

        it('should save project using localStorage fallback', async () => {
            const { electronService } = await import('../ElectronService')
            const projectData = { name: 'Test Project', elements: [] }

            const result = await electronService.saveProject(projectData)

            expect(result).toBe(true)
            expect(window.localStorage.setItem).toHaveBeenCalledWith(
                'buildingforge_project',
                JSON.stringify(projectData)
            )
        })

        it('should load project using localStorage fallback', async () => {
            const { electronService } = await import('../ElectronService')
            const projectData = { name: 'Test Project', elements: [] }
                ; (window.localStorage.getItem as any).mockReturnValue(JSON.stringify(projectData))

            const result = await electronService.loadProject()

            expect(result).toEqual(projectData)
            expect(window.localStorage.getItem).toHaveBeenCalledWith('buildingforge_project')
        })

        it('should return null when no project in localStorage', async () => {
            const { electronService } = await import('../ElectronService')
                ; (window.localStorage.getItem as any).mockReturnValue(null)

            const result = await electronService.loadProject()

            expect(result).toBeNull()
        })

        it('should export project by creating download link', async () => {
            const { electronService } = await import('../ElectronService')
            const projectData = { name: 'Test Project', elements: [] }

            const mockAnchor = {
                href: '',
                download: '',
                click: vi.fn(),
            }
            mockDocument.createElement.mockReturnValue(mockAnchor)

            const result = await electronService.exportProject('json', projectData)

            expect(result).toBe(true)
            expect(mockDocument.createElement).toHaveBeenCalledWith('a')
            expect(mockAnchor.click).toHaveBeenCalled()
            expect(mockURL.createObjectURL).toHaveBeenCalled()
            expect(mockURL.revokeObjectURL).toHaveBeenCalled()
        })

        it('should show browser notifications when permission granted', async () => {
            const { electronService } = await import('../ElectronService')

            electronService.showNotification('Test Title', 'Test Body')

            expect(mockNotification).toHaveBeenCalledWith('Test Title', { body: 'Test Body' })
        })

        it('should get browser system info', async () => {
            const { electronService } = await import('../ElectronService')
            const result = await electronService.getSystemInfo()

            expect(result).toEqual({
                platform: 'Win32',
                version: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                arch: 'x64',
            })
        })

        it('should request notification permission', async () => {
            const { electronService } = await import('../ElectronService')
            const result = await electronService.requestNotificationPermission()

            expect(result).toBe(true)
            expect(mockNotification.requestPermission).toHaveBeenCalled()
        })
    })

    describe('Menu Action Handling', () => {
        beforeEach(() => {
            ; (window as any).electronAPI = mockElectronAPI
        })

        it('should register and remove menu listeners', async () => {
            const { electronService } = await import('../ElectronService')
            const callback1 = vi.fn()
            const callback2 = vi.fn()

            electronService.onMenuAction(callback1)
            electronService.onMenuAction(callback2)
            electronService.removeMenuListener(callback1)

            expect(mockElectronAPI.onMenuAction).toHaveBeenCalled()
            expect(mockElectronAPI.removeMenuListener).toHaveBeenCalledWith(callback1)
        })
    })

    describe('Error Handling', () => {
        beforeEach(() => {
            ; (window as any).electronAPI = mockElectronAPI
        })

        it('should handle save project errors', async () => {
            const { electronService } = await import('../ElectronService')
            mockElectronAPI.saveProject.mockRejectedValue(new Error('Network error'))

            const result = await electronService.saveProject({ name: 'Test' })

            expect(result).toBe(false)
        })

        it('should handle load project errors', async () => {
            const { electronService } = await import('../ElectronService')
            mockElectronAPI.loadProject.mockRejectedValue(new Error('File not found'))

            const result = await electronService.loadProject()

            expect(result).toBeNull()
        })

        it('should handle export project errors', async () => {
            const { electronService } = await import('../ElectronService')
            mockElectronAPI.exportProject.mockRejectedValue(new Error('Export failed'))

            const result = await electronService.exportProject('glb', { name: 'Test' })

            expect(result).toBe(false)
        })
    })
})