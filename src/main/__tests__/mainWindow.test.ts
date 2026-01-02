import { beforeEach, describe, expect, it, vi } from 'vitest';

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
        on: vi.fn()
    }
};

const mockScreen = {
    getPrimaryDisplay: vi.fn(() => ({
        workAreaSize: { width: 1920, height: 1080 }
    }))
};

// Mock modules
vi.mock('electron', () => ({
    BrowserWindow: vi.fn(() => mockBrowserWindow),
    screen: mockScreen
}));

vi.mock('path', () => ({
    join: vi.fn((...args) => args.join('/'))
}));

describe('Main Window', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should create window with correct dimensions', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { BrowserWindow } = await import('electron');
        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                width: 1536, // 80% of 1920
                height: 864, // 80% of 1080
                minWidth: 1200,
                minHeight: 800
            })
        );
    });

    it('should use minimum dimensions when screen is small', async () => {
        mockScreen.getPrimaryDisplay.mockReturnValue({
            workAreaSize: { width: 1024, height: 768 }
        });

        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { BrowserWindow } = await import('electron');
        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                width: 1200, // Minimum width
                height: 800   // Minimum height
            })
        );
    });

    it('should configure security settings correctly', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { BrowserWindow } = await import('electron');
        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                webPreferences: expect.objectContaining({
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    sandbox: false,
                    webSecurity: true,
                    allowRunningInsecureContent: false,
                    experimentalFeatures: false
                })
            })
        );
    });

    it('should set preload script path', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { BrowserWindow } = await import('electron');
        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                webPreferences: expect.objectContaining({
                    preload: expect.stringContaining('preload.js')
                })
            })
        );
    });

    it('should configure window appearance', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { BrowserWindow } = await import('electron');
        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                backgroundColor: '#1a1a1a',
                center: true,
                resizable: true,
                maximizable: true,
                minimizable: true,
                closable: true,
                show: false
            })
        );
    });

    it('should setup window event handlers', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(mockBrowserWindow.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
        expect(mockBrowserWindow.on).toHaveBeenCalledWith('maximize', expect.any(Function));
        expect(mockBrowserWindow.on).toHaveBeenCalledWith('unmaximize', expect.any(Function));
        expect(mockBrowserWindow.on).toHaveBeenCalledWith('minimize', expect.any(Function));
        expect(mockBrowserWindow.on).toHaveBeenCalledWith('restore', expect.any(Function));
    });

    it('should show window when ready', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        // Simulate ready-to-show event
        const readyCallback = mockBrowserWindow.once.mock.calls.find(
            call => call[0] === 'ready-to-show'
        )?.[1];

        if (readyCallback) {
            readyCallback();
            expect(mockBrowserWindow.show).toHaveBeenCalled();
        }
    });

    it('should send window state changes via IPC', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        // Test maximize event
        const maximizeCallback = mockBrowserWindow.on.mock.calls.find(
            call => call[0] === 'maximize'
        )?.[1];

        if (maximizeCallback) {
            maximizeCallback();
            expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('window-state-changed', 'maximized');
        }

        // Test unmaximize event
        const unmaximizeCallback = mockBrowserWindow.on.mock.calls.find(
            call => call[0] === 'unmaximize'
        )?.[1];

        if (unmaximizeCallback) {
            unmaximizeCallback();
            expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('window-state-changed', 'normal');
        }
    });

    it('should setup external link handling', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(mockBrowserWindow.webContents.setWindowOpenHandler).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should prevent external navigation', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(mockBrowserWindow.webContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
    });

    it('should load correct URL in development', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: true
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        // The loading happens in the constructor, so it should be called immediately
        expect(mockBrowserWindow.loadURL).toHaveBeenCalledWith('http://localhost:5173');
        expect(mockBrowserWindow.webContents.openDevTools).toHaveBeenCalled();
    });

    it('should load file in production', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        // The loading happens in the constructor, so it should be called immediately
        expect(mockBrowserWindow.loadFile).toHaveBeenCalledWith(
            expect.stringContaining('renderer/index.html')
        );
        expect(mockBrowserWindow.webContents.openDevTools).not.toHaveBeenCalled();
    });

    it('should handle external link opening correctly', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        const windowOpenHandler = mockBrowserWindow.webContents.setWindowOpenHandler.mock.calls[0][0];

        // Test external HTTP link
        const httpResult = windowOpenHandler({ url: 'https://example.com' });
        expect(httpResult).toEqual({ action: 'deny' });

        // Test internal link
        const internalResult = windowOpenHandler({ url: 'about:blank' });
        expect(internalResult).toEqual({ action: 'allow' });
    });

    it('should prevent navigation to external sites', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        const navigationHandler = mockBrowserWindow.webContents.on.mock.calls.find(
            call => call[0] === 'will-navigate'
        )?.[1];

        if (navigationHandler) {
            const mockEvent = { preventDefault: vi.fn() };

            // Test external navigation (should be prevented)
            navigationHandler(mockEvent, 'https://malicious-site.com');
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        }
    });

    it('should configure macOS specific settings', async () => {
        // Mock macOS
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'darwin' });

        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { BrowserWindow } = await import('electron');
        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                titleBarStyle: 'hiddenInset',
                vibrancy: 'dark'
            })
        );

        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should configure Windows/Linux specific settings', async () => {
        // Mock Windows
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'win32' });

        vi.doMock('../utils/environment', () => ({
            isDev: false
        }));

        const { BrowserWindow } = await import('electron');
        const { createMainWindow } = await import('../windows/mainWindow');

        createMainWindow();

        expect(BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                titleBarStyle: 'default',
                autoHideMenuBar: true
            })
        );

        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
});