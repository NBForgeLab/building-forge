import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Electron modules
const mockBrowserWindow = {
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn(() => false)
};

const mockDialog = {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn()
};

const mockIpcMain = {
    handle: vi.fn()
};

const mockNotification = {
    show: vi.fn()
};

const MockNotificationClass = vi.fn(() => mockNotification);
MockNotificationClass.isSupported = vi.fn(() => true);

const mockFs = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn()
};

// Mock modules
vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    dialog: mockDialog,
    Notification: MockNotificationClass
}));

vi.mock('fs/promises', () => mockFs);

vi.mock('../utils/environment', () => ({
    getUserDataPath: vi.fn(() => '/test/userData')
}));

vi.mock('path', () => ({
    join: vi.fn((...args) => args.join('/'))
}));

describe('IPC Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Window Controls', () => {
        it('should register window control handlers', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            setupIPC(mockBrowserWindow as any);

            expect(mockIpcMain.handle).toHaveBeenCalledWith('window:minimize', expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith('window:maximize', expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith('window:close', expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith('window:is-maximized', expect.any(Function));
        });

        it('should handle window minimize', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            setupIPC(mockBrowserWindow as any);

            // Find and call the minimize handler
            const minimizeCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'window:minimize');
            const minimizeHandler = minimizeCall?.[1];

            if (minimizeHandler) {
                await minimizeHandler();
                expect(mockBrowserWindow.minimize).toHaveBeenCalled();
            }
        });

        it('should handle window maximize/unmaximize', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            setupIPC(mockBrowserWindow as any);

            // Test maximize when not maximized
            mockBrowserWindow.isMaximized.mockReturnValue(false);
            const maximizeCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'window:maximize');
            const maximizeHandler = maximizeCall?.[1];

            if (maximizeHandler) {
                await maximizeHandler();
                expect(mockBrowserWindow.maximize).toHaveBeenCalled();
            }

            // Test unmaximize when maximized
            mockBrowserWindow.isMaximized.mockReturnValue(true);
            if (maximizeHandler) {
                await maximizeHandler();
                expect(mockBrowserWindow.unmaximize).toHaveBeenCalled();
            }
        });
    });

    describe('File Operations', () => {
        it('should handle project opening', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            mockDialog.showOpenDialog.mockResolvedValue({
                canceled: false,
                filePaths: ['/test/project.bforge']
            });

            mockFs.readFile.mockResolvedValue('{"name": "test project"}');

            setupIPC(mockBrowserWindow as any);

            const openCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'file:open-project');
            const openHandler = openCall?.[1];

            if (openHandler) {
                const result = await openHandler();

                expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(
                    mockBrowserWindow,
                    expect.objectContaining({
                        title: 'Open Building Forge Project',
                        filters: expect.arrayContaining([
                            { name: 'Building Forge Projects', extensions: ['bforge'] }
                        ])
                    })
                );

                expect(result).toEqual({
                    success: true,
                    data: { name: 'test project' }
                });
            }
        });

        it('should handle project saving', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            setupIPC(mockBrowserWindow as any);

            const saveCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'file:save-project');
            const saveHandler = saveCall?.[1];

            if (saveHandler) {
                const testData = { name: 'test project', elements: [] };
                const result = await saveHandler(null, testData);

                expect(mockFs.mkdir).toHaveBeenCalledWith('/test/userData/projects', { recursive: true });
                expect(mockFs.writeFile).toHaveBeenCalledWith(
                    expect.stringContaining('/test/userData/projects/project_'),
                    JSON.stringify(testData, null, 2)
                );

                expect(result).toEqual({ success: true });
            }
        });

        it('should handle save as dialog', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            mockDialog.showSaveDialog.mockResolvedValue({
                canceled: false,
                filePath: '/test/save/project.bforge'
            });

            mockFs.writeFile.mockResolvedValue(undefined);

            setupIPC(mockBrowserWindow as any);

            const saveAsCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'file:save-project-as');
            const saveAsHandler = saveAsCall?.[1];

            if (saveAsHandler) {
                const testData = { name: 'test project' };
                const result = await saveAsHandler(null, testData);

                expect(mockDialog.showSaveDialog).toHaveBeenCalledWith(
                    mockBrowserWindow,
                    expect.objectContaining({
                        title: 'Save Building Forge Project',
                        defaultPath: 'untitled.bforge'
                    })
                );

                expect(result).toEqual({
                    success: true,
                    path: '/test/save/project.bforge'
                });
            }
        });

        it('should handle export operations', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            mockDialog.showSaveDialog.mockResolvedValue({
                canceled: false,
                filePath: '/test/export/building.glb'
            });

            mockFs.writeFile.mockResolvedValue(undefined);

            setupIPC(mockBrowserWindow as any);

            const exportCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'file:export-glb');
            const exportHandler = exportCall?.[1];

            if (exportHandler) {
                const testData = { geometry: [], materials: [] };
                const options = { quality: 'high' };
                const result = await exportHandler(null, testData, options);

                expect(mockDialog.showSaveDialog).toHaveBeenCalledWith(
                    mockBrowserWindow,
                    expect.objectContaining({
                        title: 'Export as GLB',
                        defaultPath: 'building.glb'
                    })
                );

                expect(result).toEqual({
                    success: true,
                    path: '/test/export/building.glb'
                });
            }
        });

        it('should handle file operation errors', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            mockDialog.showOpenDialog.mockResolvedValue({
                canceled: false,
                filePaths: ['/test/project.bforge']
            });

            mockFs.readFile.mockRejectedValue(new Error('File not found'));

            setupIPC(mockBrowserWindow as any);

            const openCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'file:open-project');
            const openHandler = openCall?.[1];

            if (openHandler) {
                const result = await openHandler();

                expect(result).toEqual({
                    success: false,
                    error: 'File not found'
                });
            }
        });

        it('should handle canceled dialogs', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            mockDialog.showOpenDialog.mockResolvedValue({
                canceled: true,
                filePaths: []
            });

            setupIPC(mockBrowserWindow as any);

            const openCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'file:open-project');
            const openHandler = openCall?.[1];

            if (openHandler) {
                const result = await openHandler();

                expect(result).toEqual({
                    success: false,
                    error: 'No file selected'
                });
            }
        });
    });

    describe('Notifications', () => {
        it('should handle notification display', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            setupIPC(mockBrowserWindow as any);

            const notificationCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'notifications:show');
            const notificationHandler = notificationCall?.[1];

            if (notificationHandler) {
                await notificationHandler(null, {
                    title: 'Test Title',
                    body: 'Test Body',
                    type: 'info'
                });

                expect(MockNotificationClass.isSupported).toHaveBeenCalled();
                expect(MockNotificationClass).toHaveBeenCalledWith(expect.objectContaining({
                    title: 'Test Title',
                    body: 'Test Body'
                }));
                expect(mockNotification.show).toHaveBeenCalled();
            }
        });

        it('should check notification support', async () => {
            const { setupIPC } = await import('../ipc/ipcHandlers');

            MockNotificationClass.isSupported.mockReturnValue(false);

            setupIPC(mockBrowserWindow as any);

            const notificationCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'notifications:show');
            const notificationHandler = notificationCall?.[1];

            if (notificationHandler) {
                await notificationHandler(null, {
                    title: 'Test Title',
                    body: 'Test Body'
                });

                expect(MockNotificationClass.isSupported).toHaveBeenCalled();
                expect(MockNotificationClass).not.toHaveBeenCalled();
                expect(mockNotification.show).not.toHaveBeenCalled();
            }
        });
    });
});