import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Electron modules
const mockBrowserWindow = {
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    webContents: {
        openDevTools: vi.fn(),
        send: vi.fn(),
        setWindowOpenHandler: vi.fn(),
        on: vi.fn(),
        session: {
            webRequest: {
                onHeadersReceived: vi.fn()
            }
        }
    },
    isMaximized: vi.fn(() => false),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn()
};

const mockApp = {
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
    setAppUserModelId: vi.fn(),
    setAsDefaultProtocolClient: vi.fn(),
    isPackaged: false,
    getVersion: vi.fn(() => '1.0.0'),
    getName: vi.fn(() => 'Building Forge'),
    getPath: vi.fn(() => '/test/path'),
    getAppPath: vi.fn(() => '/test/app/path')
};

const mockMenu = {
    setApplicationMenu: vi.fn(),
    buildFromTemplate: vi.fn(() => ({}))
};

const mockDialog = {
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
    showErrorBox: vi.fn(),
    showOpenDialog: vi.fn(() => Promise.resolve({ canceled: false, filePaths: ['/test/file.bforge'] })),
    showSaveDialog: vi.fn(() => Promise.resolve({ canceled: false, filePath: '/test/save.bforge' }))
};

const mockIpcMain = {
    handle: vi.fn(),
    on: vi.fn()
};

const mockAutoUpdater = {
    checkForUpdatesAndNotify: vi.fn(),
    on: vi.fn(),
    quitAndInstall: vi.fn()
};

const mockScreen = {
    getPrimaryDisplay: vi.fn(() => ({
        workAreaSize: { width: 1920, height: 1080 }
    }))
};

const mockShell = {
    openExternal: vi.fn()
};

// Mock modules
vi.mock('electron', () => ({
    app: mockApp,
    BrowserWindow: vi.fn(() => mockBrowserWindow),
    Menu: mockMenu,
    dialog: mockDialog,
    ipcMain: mockIpcMain,
    screen: mockScreen,
    shell: mockShell
}));

vi.mock('electron-updater', () => ({
    autoUpdater: mockAutoUpdater
}));

vi.mock('path', () => ({
    join: vi.fn((...args) => args.join('/')),
    basename: vi.fn((path) => path.split('/').pop()),
    extname: vi.fn((path) => {
        const parts = path.split('.');
        return parts.length > 1 ? '.' + parts.pop() : '';
    })
}));

vi.mock('fs/promises', () => ({
    readFile: vi.fn(() => Promise.resolve('{"test": "data"}')),
    writeFile: vi.fn(() => Promise.resolve()),
    mkdir: vi.fn(() => Promise.resolve())
}));

describe('Main Process', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('Application Setup', () => {
        it('should set app user model ID on Windows', async () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'win32' });

            // Import after mocking
            await import('../main');

            expect(mockApp.setAppUserModelId).toHaveBeenCalledWith('com.buildingforge.app');

            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        it('should setup security handlers', async () => {
            await import('../main');

            expect(mockApp.on).toHaveBeenCalledWith('web-contents-created', expect.any(Function));
        });

        it('should setup protocol handler', async () => {
            await import('../main');

            expect(mockApp.setAsDefaultProtocolClient).toHaveBeenCalledWith('buildingforge');
        });
    });

    describe('Window Management', () => {
        it('should create main window when app is ready', async () => {
            const { BrowserWindow } = await import('electron');

            await import('../main');

            // Simulate app ready
            const readyCallback = mockApp.whenReady.mock.calls[0][0];
            if (readyCallback) {
                await readyCallback();
            }

            expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
                minWidth: 1200,
                minHeight: 800,
                show: false,
                webPreferences: expect.objectContaining({
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    sandbox: false
                })
            }));
        });

        it('should handle window state changes', async () => {
            await import('../main');

            expect(mockBrowserWindow.on).toHaveBeenCalledWith('maximize', expect.any(Function));
            expect(mockBrowserWindow.on).toHaveBeenCalledWith('unmaximize', expect.any(Function));
            expect(mockBrowserWindow.on).toHaveBeenCalledWith('minimize', expect.any(Function));
            expect(mockBrowserWindow.on).toHaveBeenCalledWith('restore', expect.any(Function));
        });

        it('should prevent external navigation', async () => {
            await import('../main');

            expect(mockBrowserWindow.webContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
        });
    });

    describe('Auto Updater', () => {
        it('should setup auto updater in production', async () => {
            vi.doMock('../utils/environment', () => ({
                isDev: false
            }));

            await import('../main');

            expect(mockAutoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
            expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
            expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
        });

        it('should not setup auto updater in development', async () => {
            vi.doMock('../utils/environment', () => ({
                isDev: true
            }));

            await import('../main');

            expect(mockAutoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle uncaught exceptions', async () => {
            const originalListeners = process.listeners('uncaughtException');

            await import('../main');

            const newListeners = process.listeners('uncaughtException');
            expect(newListeners.length).toBeGreaterThan(originalListeners.length);
        });

        it('should handle unhandled rejections', async () => {
            const originalListeners = process.listeners('unhandledRejection');

            await import('../main');

            const newListeners = process.listeners('unhandledRejection');
            expect(newListeners.length).toBeGreaterThan(originalListeners.length);
        });
    });
});