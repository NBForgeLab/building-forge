/**
 * React hook لاستخدام خدمة Electron
 * React hook for using Electron service
 */

import { useCallback, useEffect, useRef } from 'react';
import { electronService } from '../services/ElectronService';

export interface UseElectronOptions {
    onMenuAction?: (action: string) => void;
    enableNotifications?: boolean;
}

export function useElectron(options: UseElectronOptions = {}) {
    const { onMenuAction, enableNotifications = true } = options;
    const menuCallbackRef = useRef(onMenuAction);

    // Update ref when callback changes
    useEffect(() => {
        menuCallbackRef.current = onMenuAction;
    }, [onMenuAction]);

    // Setup menu action listener
    useEffect(() => {
        if (!menuCallbackRef.current) return;

        const handleMenuAction = (action: string) => {
            menuCallbackRef.current?.(action);
        };

        electronService.onMenuAction(handleMenuAction);

        return () => {
            electronService.removeMenuListener(handleMenuAction);
        };
    }, []);

    // Request notification permission
    useEffect(() => {
        if (enableNotifications && !electronService.isElectron) {
            // Only request permission if not already granted or denied
            if ('Notification' in window && Notification.permission === 'default') {
                electronService.requestNotificationPermission();
            }
        }
    }, [enableNotifications]);

    // File operations
    const saveProject = useCallback(async (projectData: any) => {
        return await electronService.saveProject(projectData);
    }, []);

    const loadProject = useCallback(async () => {
        return await electronService.loadProject();
    }, []);

    const exportProject = useCallback(async (format: string, projectData: any) => {
        return await electronService.exportProject(format, projectData);
    }, []);

    // Notifications
    const showNotification = useCallback((title: string, body: string) => {
        electronService.showNotification(title, body);
    }, []);

    // System info
    const getSystemInfo = useCallback(async () => {
        return await electronService.getSystemInfo();
    }, []);

    // Window controls
    const minimizeWindow = useCallback(() => {
        electronService.minimizeWindow();
    }, []);

    const maximizeWindow = useCallback(() => {
        electronService.maximizeWindow();
    }, []);

    const closeWindow = useCallback(() => {
        electronService.closeWindow();
    }, []);

    const openDevTools = useCallback(() => {
        electronService.openDevTools();
    }, []);

    const reloadWindow = useCallback(() => {
        electronService.reloadWindow();
    }, []);

    return {
        // Properties
        isElectron: electronService.isRunningInElectron,

        // File operations
        saveProject,
        loadProject,
        exportProject,

        // Notifications
        showNotification,

        // System
        getSystemInfo,

        // Window controls
        minimizeWindow,
        maximizeWindow,
        closeWindow,
        openDevTools,
        reloadWindow,
    };
}

export default useElectron;