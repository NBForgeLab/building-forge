import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Electron modules
const mockBrowserWindow = {
    webContents: {
        send: vi.fn()
    }
};

const mockApp = {
    getName: vi.fn(() => 'Building Forge')
};

const mockMenu = {
    buildFromTemplate: vi.fn(() => ({}))
};

// Mock modules
vi.mock('electron', () => ({
    Menu: mockMenu,
    app: mockApp
}));

describe('Application Menu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should create application menu', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        const menu = createApplicationMenu(mockBrowserWindow as any);

        expect(mockMenu.buildFromTemplate).toHaveBeenCalledWith(expect.any(Array));
        expect(menu).toBeDefined();
    });

    it('should include File menu with correct shortcuts', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const fileMenu = template.find((menu: any) => menu.label === 'File');

        expect(fileMenu).toBeDefined();
        expect(fileMenu.submenu).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: 'New Project',
                    accelerator: 'CmdOrCtrl+N'
                }),
                expect.objectContaining({
                    label: 'Open Project...',
                    accelerator: 'CmdOrCtrl+O'
                }),
                expect.objectContaining({
                    label: 'Save Project',
                    accelerator: 'CmdOrCtrl+S'
                })
            ])
        );
    });

    it('should include Edit menu with undo/redo', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const editMenu = template.find((menu: any) => menu.label === 'Edit');

        expect(editMenu).toBeDefined();
        expect(editMenu.submenu).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z'
                }),
                expect.objectContaining({
                    label: 'Redo'
                })
            ])
        );
    });

    it('should include Tools menu with tool shortcuts', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const toolsMenu = template.find((menu: any) => menu.label === 'Tools');

        expect(toolsMenu).toBeDefined();
        expect(toolsMenu.submenu).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: 'Select Tool',
                    accelerator: 'V'
                }),
                expect.objectContaining({
                    label: 'Wall Tool',
                    accelerator: 'W'
                }),
                expect.objectContaining({
                    label: 'Floor Tool',
                    accelerator: 'F'
                })
            ])
        );
    });

    it('should include View menu with camera controls', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const viewMenu = template.find((menu: any) => menu.label === 'View');

        expect(viewMenu).toBeDefined();
        expect(viewMenu.submenu).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: 'Front View',
                    accelerator: 'Numpad1'
                }),
                expect.objectContaining({
                    label: 'Perspective View',
                    accelerator: 'Numpad0'
                })
            ])
        );
    });

    it('should send IPC messages when menu items are clicked', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const fileMenu = template.find((menu: any) => menu.label === 'File');
        const newProjectItem = fileMenu.submenu.find((item: any) => item.label === 'New Project');

        // Simulate menu click
        if (newProjectItem.click) {
            newProjectItem.click();
            expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('menu:new-project');
        }
    });

    it('should send tool shortcuts when tool menu items are clicked', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const toolsMenu = template.find((menu: any) => menu.label === 'Tools');
        const selectToolItem = toolsMenu.submenu.find((item: any) => item.label === 'Select Tool');

        // Simulate menu click
        if (selectToolItem.click) {
            selectToolItem.click();
            expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('tool:shortcut', 'select');
        }
    });

    it('should include macOS specific menu items on macOS', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: true
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const appMenu = template.find((menu: any) => menu.label === 'Building Forge');

        expect(appMenu).toBeDefined();
        expect(appMenu.submenu).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ role: 'about' }),
                expect.objectContaining({ role: 'quit' })
            ])
        );
    });

    it('should include development menu in dev mode', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: true,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const devMenu = template.find((menu: any) => menu.label === 'Development');

        expect(devMenu).toBeDefined();
        expect(devMenu.submenu).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ role: 'reload' }),
                expect.objectContaining({ role: 'toggleDevTools' })
            ])
        );
    });

    it('should handle export submenu correctly', async () => {
        vi.doMock('../utils/environment', () => ({
            isDev: false,
            isMacOS: false
        }));

        const { createApplicationMenu } = await import('../menu/applicationMenu');

        createApplicationMenu(mockBrowserWindow as any);

        const template = mockMenu.buildFromTemplate.mock.calls[0][0];
        const fileMenu = template.find((menu: any) => menu.label === 'File');
        const exportItem = fileMenu.submenu.find((item: any) => item.label === 'Export');

        expect(exportItem).toBeDefined();
        expect(exportItem.submenu).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: 'Export as GLB...'
                }),
                expect.objectContaining({
                    label: 'Export as OBJ...'
                })
            ])
        );

        // Test export GLB click
        const glbExportItem = exportItem.submenu.find((item: any) => item.label === 'Export as GLB...');
        if (glbExportItem.click) {
            glbExportItem.click();
            expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('menu:export', 'glb');
        }
    });
});