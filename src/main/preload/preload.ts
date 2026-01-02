import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface for type safety
export interface ElectronAPI {
    // Window controls
    window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
        onStateChanged: (callback: (state: string) => void) => void;
    };

    // File operations
    file: {
        openProject: () => Promise<{ success: boolean; data?: any; error?: string }>;
        saveProject: (data: any) => Promise<{ success: boolean; error?: string }>;
        saveProjectAs: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
        exportGLB: (data: any, options: any) => Promise<{ success: boolean; path?: string; error?: string }>;
        exportOBJ: (data: any, options: any) => Promise<{ success: boolean; path?: string; error?: string }>;
        importAsset: () => Promise<{ success: boolean; data?: any; error?: string }>;
    };

    // File system operations
    fs: {
        getUserDataPath: () => Promise<string>;
        ensureDirectory: (path: string) => Promise<{ success: boolean; error?: string }>;
        saveFile: (path: string, data: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
        loadFile: (path: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
        deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
        listDirectory: (path: string) => Promise<{ success: boolean; data?: string[]; error?: string }>;
        getFileStats: (path: string) => Promise<{ success: boolean; data?: { size: number; created: number; modified: number }; error?: string }>;
        getDirectoryStats: (path: string) => Promise<{ success: boolean; data?: { size: number; fileCount: number; created: number; modified: number }; error?: string }>;
    };

    // Menu actions
    menu: {
        onNewProject: (callback: () => void) => void;
        onOpenProject: (callback: () => void) => void;
        onSaveProject: (callback: () => void) => void;
        onSaveProjectAs: (callback: () => void) => void;
        onExport: (callback: (format: string) => void) => void;
        onUndo: (callback: () => void) => void;
        onRedo: (callback: () => void) => void;
        onCopy: (callback: () => void) => void;
        onPaste: (callback: () => void) => void;
        onDelete: (callback: () => void) => void;
        onSelectAll: (callback: () => void) => void;
    };

    // Tool shortcuts
    tools: {
        onToolShortcut: (callback: (tool: string) => void) => void;
    };

    // System info
    system: {
        platform: string;
        version: string;
        isDev: boolean;
    };

    // Notifications
    notifications: {
        show: (title: string, body: string, type?: 'info' | 'warning' | 'error') => void;
    };
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
        onStateChanged: (callback) => {
            ipcRenderer.on('window-state-changed', (_, state) => callback(state));
        }
    },

    file: {
        openProject: () => ipcRenderer.invoke('file:open-project'),
        saveProject: (data) => ipcRenderer.invoke('file:save-project', data),
        saveProjectAs: (data) => ipcRenderer.invoke('file:save-project-as', data),
        exportGLB: (data, options) => ipcRenderer.invoke('file:export-glb', data, options),
        exportOBJ: (data, options) => ipcRenderer.invoke('file:export-obj', data, options),
        importAsset: () => ipcRenderer.invoke('file:import-asset')
    },

    fs: {
        getUserDataPath: () => ipcRenderer.invoke('fs:get-userdata-path'),
        ensureDirectory: (path) => ipcRenderer.invoke('fs:ensure-directory', path),
        saveFile: (path, data) => ipcRenderer.invoke('fs:save-file', path, data),
        loadFile: (path) => ipcRenderer.invoke('fs:load-file', path),
        deleteFile: (path) => ipcRenderer.invoke('fs:delete-file', path),
        listDirectory: (path) => ipcRenderer.invoke('fs:list-directory', path),
        getFileStats: (path) => ipcRenderer.invoke('fs:get-file-stats', path),
        getDirectoryStats: (path) => ipcRenderer.invoke('fs:get-directory-stats', path)
    },

    menu: {
        onNewProject: (callback) => {
            ipcRenderer.on('menu:new-project', callback);
        },
        onOpenProject: (callback) => {
            ipcRenderer.on('menu:open-project', callback);
        },
        onSaveProject: (callback) => {
            ipcRenderer.on('menu:save-project', callback);
        },
        onSaveProjectAs: (callback) => {
            ipcRenderer.on('menu:save-project-as', callback);
        },
        onExport: (callback) => {
            ipcRenderer.on('menu:export', (_, format) => callback(format));
        },
        onUndo: (callback) => {
            ipcRenderer.on('menu:undo', callback);
        },
        onRedo: (callback) => {
            ipcRenderer.on('menu:redo', callback);
        },
        onCopy: (callback) => {
            ipcRenderer.on('menu:copy', callback);
        },
        onPaste: (callback) => {
            ipcRenderer.on('menu:paste', callback);
        },
        onDelete: (callback) => {
            ipcRenderer.on('menu:delete', callback);
        },
        onSelectAll: (callback) => {
            ipcRenderer.on('menu:select-all', callback);
        }
    },

    tools: {
        onToolShortcut: (callback) => {
            ipcRenderer.on('tool:shortcut', (_, tool) => callback(tool));
        }
    },

    system: {
        platform: process.platform,
        version: process.versions.electron,
        isDev: process.env.NODE_ENV === 'development'
    },

    notifications: {
        show: (title, body, type = 'info') => {
            ipcRenderer.invoke('notifications:show', { title, body, type });
        }
    }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for global window object
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}