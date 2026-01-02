/**
 * خدمة Electron للتواصل مع العملية الرئيسية
 * ElectronService for communicating with the main process
 */

export interface ElectronAPI {
    // File operations
    saveProject: (data: any) => Promise<boolean>;
    loadProject: () => Promise<any>;
    exportProject: (format: string, data: any) => Promise<boolean>;

    // File system operations
    getUserDataPath: () => Promise<string>;
    ensureDirectory: (path: string) => Promise<void>;
    saveFile: (path: string, data: ArrayBuffer) => Promise<void>;
    loadFile: (path: string) => Promise<ArrayBuffer>;
    deleteFile: (path: string) => Promise<void>;
    listDirectory: (path: string) => Promise<string[]>;
    getFileStats: (path: string) => Promise<{ size: number; created: number; modified: number }>;
    getDirectoryStats: (path: string) => Promise<{ size: number; fileCount: number; created: number; modified: number }>;

    // Menu events
    onMenuAction: (callback: (action: string) => void) => void;
    removeMenuListener: (callback: (action: string) => void) => void;

    // Native notifications
    showNotification: (title: string, body: string) => void;

    // System info
    getSystemInfo: () => Promise<{
        platform: string;
        version: string;
        arch: string;
    }>;

    // Window controls
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;

    // Development helpers
    openDevTools: () => void;
    reloadWindow: () => void;
}

class ElectronService {
    private electronAPI: ElectronAPI | null = null;
    private isElectron: boolean = false;
    private menuCallbacks: Set<(action: string) => void> = new Set();

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        // Check if running in Electron environment
        this.isElectron = !!(window as any).electronAPI;

        if (this.isElectron) {
            const electronAPI = (window as any).electronAPI;

            // Create adapter for our interface
            this.electronAPI = {
                saveProject: async (data: any) => {
                    const result = await electronAPI.file.saveProject(data);
                    return result.success;
                },

                loadProject: async () => {
                    const result = await electronAPI.file.openProject();
                    return result.success ? result.data : null;
                },

                exportProject: async (format: string, data: any) => {
                    if (format === 'glb') {
                        const result = await electronAPI.file.exportGLB(data, {});
                        return result.success;
                    } else if (format === 'obj') {
                        const result = await electronAPI.file.exportOBJ(data, {});
                        return result.success;
                    }
                    return false;
                },

                // File system operations
                getUserDataPath: async () => {
                    return await electronAPI.fs.getUserDataPath();
                },

                ensureDirectory: async (path: string) => {
                    const result = await electronAPI.fs.ensureDirectory(path);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to create directory');
                    }
                },

                saveFile: async (path: string, data: ArrayBuffer) => {
                    const result = await electronAPI.fs.saveFile(path, data);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save file');
                    }
                },

                loadFile: async (path: string) => {
                    const result = await electronAPI.fs.loadFile(path);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to load file');
                    }
                    return result.data!;
                },

                deleteFile: async (path: string) => {
                    const result = await electronAPI.fs.deleteFile(path);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to delete file');
                    }
                },

                listDirectory: async (path: string) => {
                    const result = await electronAPI.fs.listDirectory(path);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to list directory');
                    }
                    return result.data!;
                },

                getFileStats: async (path: string) => {
                    const result = await electronAPI.fs.getFileStats(path);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to get file stats');
                    }
                    return result.data!;
                },

                getDirectoryStats: async (path: string) => {
                    const result = await electronAPI.fs.getDirectoryStats(path);
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to get directory stats');
                    }
                    return result.data!;
                },

                onMenuAction: (callback: (action: string) => void) => {
                    // Setup menu listeners
                    electronAPI.menu.onNewProject(() => callback('file:new'));
                    electronAPI.menu.onOpenProject(() => callback('file:open'));
                    electronAPI.menu.onSaveProject(() => callback('file:save'));
                    electronAPI.menu.onSaveProjectAs(() => callback('file:save-as'));
                    electronAPI.menu.onUndo(() => callback('edit:undo'));
                    electronAPI.menu.onRedo(() => callback('edit:redo'));
                    electronAPI.menu.onCopy(() => callback('edit:copy'));
                    electronAPI.menu.onPaste(() => callback('edit:paste'));
                    electronAPI.menu.onDelete(() => callback('edit:delete'));
                    electronAPI.menu.onSelectAll(() => callback('edit:select-all'));
                    electronAPI.tools.onToolShortcut((tool: string) => callback(`tool:${tool}`));
                },

                removeMenuListener: (callback: (action: string) => void) => {
                    // TODO: Implement proper listener removal
                },

                showNotification: (title: string, body: string) => {
                    electronAPI.notifications.show(title, body);
                },

                getSystemInfo: async () => ({
                    platform: electronAPI.system.platform,
                    version: electronAPI.system.version,
                    arch: 'x64' // Default assumption
                }),

                minimizeWindow: () => electronAPI.window.minimize(),
                maximizeWindow: () => electronAPI.window.maximize(),
                closeWindow: () => electronAPI.window.close(),
                openDevTools: () => console.log('Dev tools not exposed in preload'),
                reloadWindow: () => window.location.reload()
            };

            this.setupMenuListeners();
        } else {
            // Browser fallbacks for development
            this.setupBrowserFallbacks();
        }
    }

    private setupMenuListeners(): void {
        if (this.electronAPI?.onMenuAction) {
            this.electronAPI.onMenuAction((action: string) => {
                this.menuCallbacks.forEach(callback => callback(action));
            });
        }
    }

    private setupBrowserFallbacks(): void {
        // Create fallback API for browser development
        this.electronAPI = {
            saveProject: async (data: any) => {
                console.log('Browser fallback: Save project', data);
                // Simulate save with localStorage
                localStorage.setItem('buildingforge_project', JSON.stringify(data));
                return true;
            },

            loadProject: async () => {
                console.log('Browser fallback: Load project');
                const data = localStorage.getItem('buildingforge_project');
                return data ? JSON.parse(data) : null;
            },

            exportProject: async (format: string, data: any) => {
                console.log('Browser fallback: Export project', format, data);
                // Simulate export by downloading JSON
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `project.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                return true;
            },

            // File system fallbacks (browser limitations)
            getUserDataPath: async () => {
                console.log('Browser fallback: Get user data path');
                return '/browser-fallback/userdata';
            },

            ensureDirectory: async (path: string) => {
                console.log('Browser fallback: Ensure directory', path);
                // Browser can't create real directories
            },

            saveFile: async (path: string, data: ArrayBuffer) => {
                console.log('Browser fallback: Save file', path);
                // Store in IndexedDB for browser fallback
                const key = path.replace(/[^a-zA-Z0-9]/g, '_');
                localStorage.setItem(`bf_file_${key}`, btoa(String.fromCharCode(...new Uint8Array(data))));
            },

            loadFile: async (path: string) => {
                console.log('Browser fallback: Load file', path);
                const key = path.replace(/[^a-zA-Z0-9]/g, '_');
                const data = localStorage.getItem(`bf_file_${key}`);
                if (data) {
                    const binaryString = atob(data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    return bytes.buffer;
                }
                throw new Error('File not found');
            },

            deleteFile: async (path: string) => {
                console.log('Browser fallback: Delete file', path);
                const key = path.replace(/[^a-zA-Z0-9]/g, '_');
                localStorage.removeItem(`bf_file_${key}`);
            },

            listDirectory: async (path: string) => {
                console.log('Browser fallback: List directory', path);
                // Return mock file list
                return [];
            },

            getFileStats: async (path: string) => {
                console.log('Browser fallback: Get file stats', path);
                const now = Date.now();
                return { size: 1024, created: now, modified: now };
            },

            getDirectoryStats: async (path: string) => {
                console.log('Browser fallback: Get directory stats', path);
                const now = Date.now();
                return { size: 0, fileCount: 0, created: now, modified: now };
            },

            onMenuAction: (callback: (action: string) => void) => {
                this.menuCallbacks.add(callback);
                // Simulate menu actions with keyboard shortcuts
                this.setupKeyboardShortcuts(callback);
            },

            removeMenuListener: (callback: (action: string) => void) => {
                this.menuCallbacks.delete(callback);
            },

            showNotification: (title: string, body: string) => {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, { body });
                } else {
                    console.log('Browser notification:', title, body);
                }
            },

            getSystemInfo: async () => ({
                platform: navigator.platform,
                version: navigator.userAgent,
                arch: navigator.userAgent.includes('x64') ? 'x64' : 'x86'
            }),

            minimizeWindow: () => console.log('Browser fallback: Minimize window'),
            maximizeWindow: () => console.log('Browser fallback: Maximize window'),
            closeWindow: () => window.close(),
            openDevTools: () => console.log('Browser fallback: Open dev tools'),
            reloadWindow: () => window.location.reload()
        };
    }

    private setupKeyboardShortcuts(callback: (action: string) => void): void {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'n':
                        event.preventDefault();
                        callback('file:new');
                        break;
                    case 's':
                        event.preventDefault();
                        callback('file:save');
                        break;
                    case 'o':
                        event.preventDefault();
                        callback('file:open');
                        break;
                    case 'z':
                        event.preventDefault();
                        if (event.shiftKey) {
                            callback('edit:redo');
                        } else {
                            callback('edit:undo');
                        }
                        break;
                    case 'c':
                        event.preventDefault();
                        callback('edit:copy');
                        break;
                    case 'v':
                        event.preventDefault();
                        callback('edit:paste');
                        break;
                }
            } else {
                // Tool shortcuts
                switch (event.key.toLowerCase()) {
                    case 'v':
                        callback('tool:select');
                        break;
                    case 'w':
                        callback('tool:wall');
                        break;
                    case 'f':
                        callback('tool:floor');
                        break;
                    case 'd':
                        callback('tool:door');
                        break;
                    case 'n':
                        callback('tool:window');
                        break;
                    case 'c':
                        callback('tool:cut');
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
    }

    // Public API methods
    public async saveProject(projectData: any): Promise<boolean> {
        try {
            return await this.electronAPI!.saveProject(projectData);
        } catch (error) {
            console.error('Failed to save project:', error);
            return false;
        }
    }

    public async loadProject(): Promise<any> {
        try {
            return await this.electronAPI!.loadProject();
        } catch (error) {
            console.error('Failed to load project:', error);
            return null;
        }
    }

    public async exportProject(format: string, projectData: any): Promise<boolean> {
        try {
            return await this.electronAPI!.exportProject(format, projectData);
        } catch (error) {
            console.error('Failed to export project:', error);
            return false;
        }
    }

    public onMenuAction(callback: (action: string) => void): void {
        this.electronAPI!.onMenuAction(callback);
    }

    public removeMenuListener(callback: (action: string) => void): void {
        this.electronAPI!.removeMenuListener(callback);
    }

    public showNotification(title: string, body: string): void {
        this.electronAPI!.showNotification(title, body);
    }

    public async getSystemInfo() {
        return await this.electronAPI!.getSystemInfo();
    }

    public minimizeWindow(): void {
        this.electronAPI!.minimizeWindow();
    }

    public maximizeWindow(): void {
        this.electronAPI!.maximizeWindow();
    }

    public closeWindow(): void {
        this.electronAPI!.closeWindow();
    }

    public openDevTools(): void {
        this.electronAPI!.openDevTools();
    }

    public reloadWindow(): void {
        this.electronAPI!.reloadWindow();
    }

    public get isRunningInElectron(): boolean {
        return this.isElectron;
    }

    // File system methods
    public async getUserDataPath(): Promise<string> {
        return await this.electronAPI!.getUserDataPath();
    }

    public async ensureDirectory(path: string): Promise<void> {
        return await this.electronAPI!.ensureDirectory(path);
    }

    public async saveFile(path: string, data: ArrayBuffer): Promise<void> {
        return await this.electronAPI!.saveFile(path, data);
    }

    public async loadFile(path: string): Promise<ArrayBuffer> {
        return await this.electronAPI!.loadFile(path);
    }

    public async deleteFile(path: string): Promise<void> {
        return await this.electronAPI!.deleteFile(path);
    }

    public async listDirectory(path: string): Promise<string[]> {
        return await this.electronAPI!.listDirectory(path);
    }

    public async getFileStats(path: string): Promise<{ size: number; created: number; modified: number }> {
        return await this.electronAPI!.getFileStats(path);
    }

    public async getDirectoryStats(path: string): Promise<{ size: number; fileCount: number; created: number; modified: number }> {
        return await this.electronAPI!.getDirectoryStats(path);
    }

    // Request notification permission for browser fallback
    public async requestNotificationPermission(): Promise<boolean> {
        if (!this.isElectron && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return true; // Electron handles this automatically
    }
}

// Create singleton instance
export const electronService = new ElectronService();

// Export getter function for consistency with other services
export function getElectronService(): ElectronService {
    return electronService;
}

export default electronService;