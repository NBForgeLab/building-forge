/**
 * اختبارات hook useElectron
 * Tests for useElectron hook
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useElectron } from '../useElectron'

// Mock the ElectronService
vi.mock('../services/ElectronService', () => ({
    electronService: {
        isRunningInElectron: true,
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
        requestNotificationPermission: vi.fn(),
    },
}))

import { electronService } from '../services/ElectronService'

describe('useElectron', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should return all electron service methods', () => {
        const { result } = renderHook(() => useElectron())

        expect(result.current).toHaveProperty('isElectron')
        expect(result.current).toHaveProperty('saveProject')
        expect(result.current).toHaveProperty('loadProject')
        expect(result.current).toHaveProperty('exportProject')
        expect(result.current).toHaveProperty('showNotification')
        expect(result.current).toHaveProperty('getSystemInfo')
        expect(result.current).toHaveProperty('minimizeWindow')
        expect(result.current).toHaveProperty('maximizeWindow')
        expect(result.current).toHaveProperty('closeWindow')
        expect(result.current).toHaveProperty('openDevTools')
        expect(result.current).toHaveProperty('reloadWindow')
    })

    it('should setup menu action listener when callback provided', () => {
        const onMenuAction = vi.fn()

        renderHook(() => useElectron({ onMenuAction }))

        expect(electronService.onMenuAction).toHaveBeenCalled()
    })

    it('should not setup menu action listener when no callback provided', () => {
        renderHook(() => useElectron())

        expect(electronService.onMenuAction).not.toHaveBeenCalled()
    })

    it('should cleanup menu listener on unmount', () => {
        const onMenuAction = vi.fn()

        const { unmount } = renderHook(() => useElectron({ onMenuAction }))

        unmount()

        expect(electronService.removeMenuListener).toHaveBeenCalled()
    })

    it('should request notification permission when enabled', () => {
        renderHook(() => useElectron({ enableNotifications: true }))

        expect(electronService.requestNotificationPermission).toHaveBeenCalled()
    })

    it('should not request notification permission when disabled', () => {
        renderHook(() => useElectron({ enableNotifications: false }))

        expect(electronService.requestNotificationPermission).not.toHaveBeenCalled()
    })

    it('should call saveProject with correct parameters', async () => {
        const projectData = { name: 'Test Project' }
            ; (electronService.saveProject as any).mockResolvedValue(true)

        const { result } = renderHook(() => useElectron())

        await act(async () => {
            const success = await result.current.saveProject(projectData)
            expect(success).toBe(true)
        })

        expect(electronService.saveProject).toHaveBeenCalledWith(projectData)
    })

    it('should call loadProject and return data', async () => {
        const projectData = { name: 'Test Project' }
            ; (electronService.loadProject as any).mockResolvedValue(projectData)

        const { result } = renderHook(() => useElectron())

        await act(async () => {
            const data = await result.current.loadProject()
            expect(data).toEqual(projectData)
        })

        expect(electronService.loadProject).toHaveBeenCalled()
    })

    it('should call exportProject with correct parameters', async () => {
        const projectData = { name: 'Test Project' }
            ; (electronService.exportProject as any).mockResolvedValue(true)

        const { result } = renderHook(() => useElectron())

        await act(async () => {
            const success = await result.current.exportProject('glb', projectData)
            expect(success).toBe(true)
        })

        expect(electronService.exportProject).toHaveBeenCalledWith('glb', projectData)
    })

    it('should call showNotification with correct parameters', () => {
        const { result } = renderHook(() => useElectron())

        act(() => {
            result.current.showNotification('Test Title', 'Test Body')
        })

        expect(electronService.showNotification).toHaveBeenCalledWith('Test Title', 'Test Body')
    })

    it('should call getSystemInfo and return data', async () => {
        const systemInfo = { platform: 'win32', version: '1.0.0', arch: 'x64' }
            ; (electronService.getSystemInfo as any).mockResolvedValue(systemInfo)

        const { result } = renderHook(() => useElectron())

        await act(async () => {
            const info = await result.current.getSystemInfo()
            expect(info).toEqual(systemInfo)
        })

        expect(electronService.getSystemInfo).toHaveBeenCalled()
    })

    it('should call window control methods', () => {
        const { result } = renderHook(() => useElectron())

        act(() => {
            result.current.minimizeWindow()
            result.current.maximizeWindow()
            result.current.closeWindow()
            result.current.openDevTools()
            result.current.reloadWindow()
        })

        expect(electronService.minimizeWindow).toHaveBeenCalled()
        expect(electronService.maximizeWindow).toHaveBeenCalled()
        expect(electronService.closeWindow).toHaveBeenCalled()
        expect(electronService.openDevTools).toHaveBeenCalled()
        expect(electronService.reloadWindow).toHaveBeenCalled()
    })

    it('should update menu callback when it changes', () => {
        const onMenuAction1 = vi.fn()
        const onMenuAction2 = vi.fn()

        const { rerender } = renderHook(
            ({ onMenuAction }) => useElectron({ onMenuAction }),
            { initialProps: { onMenuAction: onMenuAction1 } }
        )

        // Change the callback
        rerender({ onMenuAction: onMenuAction2 })

        // The hook should handle the callback change internally
        expect(electronService.onMenuAction).toHaveBeenCalled()
    })

    it('should return isElectron property correctly', () => {
        const { result } = renderHook(() => useElectron())

        expect(result.current.isElectron).toBe(true)
    })

    it('should handle menu action callback correctly', () => {
        const onMenuAction = vi.fn()
        let capturedCallback: ((action: string) => void) | undefined

            // Capture the callback passed to electronService.onMenuAction
            ; (electronService.onMenuAction as any).mockImplementation((callback: (action: string) => void) => {
                capturedCallback = callback
            })

        renderHook(() => useElectron({ onMenuAction }))

        // Simulate a menu action
        if (capturedCallback) {
            act(() => {
                capturedCallback('file:new')
            })
        }

        expect(onMenuAction).toHaveBeenCalledWith('file:new')
    })

    it('should handle default options correctly', () => {
        renderHook(() => useElectron())

        // Should request notifications by default
        expect(electronService.requestNotificationPermission).toHaveBeenCalled()
        // Should not setup menu listener without callback
        expect(electronService.onMenuAction).not.toHaveBeenCalled()
    })

    it('should memoize callbacks correctly', () => {
        const { result, rerender } = renderHook(() => useElectron())

        const saveProject1 = result.current.saveProject
        const loadProject1 = result.current.loadProject

        rerender()

        const saveProject2 = result.current.saveProject
        const loadProject2 = result.current.loadProject

        // Callbacks should be memoized and remain the same
        expect(saveProject1).toBe(saveProject2)
        expect(loadProject1).toBe(loadProject2)
    })
})