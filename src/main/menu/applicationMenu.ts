import { BrowserWindow, Menu, MenuItemConstructorOptions, app } from 'electron';
import { isDev, isMacOS } from '../utils/environment';

/**
 * Create the application menu with native shortcuts and IPC integration
 */
export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
    const template: MenuItemConstructorOptions[] = [];

    // macOS app menu
    if (isMacOS) {
        template.push({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    // File menu
    template.push({
        label: 'File',
        submenu: [
            {
                label: 'New Project',
                accelerator: 'CmdOrCtrl+N',
                click: () => {
                    mainWindow.webContents.send('menu:new-project');
                }
            },
            {
                label: 'Open Project...',
                accelerator: 'CmdOrCtrl+O',
                click: () => {
                    mainWindow.webContents.send('menu:open-project');
                }
            },
            { type: 'separator' },
            {
                label: 'Save Project',
                accelerator: 'CmdOrCtrl+S',
                click: () => {
                    mainWindow.webContents.send('menu:save-project');
                }
            },
            {
                label: 'Save Project As...',
                accelerator: 'CmdOrCtrl+Shift+S',
                click: () => {
                    mainWindow.webContents.send('menu:save-project-as');
                }
            },
            { type: 'separator' },
            {
                label: 'Import Asset...',
                accelerator: 'CmdOrCtrl+I',
                click: () => {
                    mainWindow.webContents.send('menu:import-asset');
                }
            },
            { type: 'separator' },
            {
                label: 'Export',
                submenu: [
                    {
                        label: 'Export as GLB...',
                        click: () => {
                            mainWindow.webContents.send('menu:export', 'glb');
                        }
                    },
                    {
                        label: 'Export as OBJ...',
                        click: () => {
                            mainWindow.webContents.send('menu:export', 'obj');
                        }
                    }
                ]
            },
            { type: 'separator' },
            isMacOS ? { role: 'close' } : { role: 'quit' }
        ]
    });

    // Edit menu
    template.push({
        label: 'Edit',
        submenu: [
            {
                label: 'Undo',
                accelerator: 'CmdOrCtrl+Z',
                click: () => {
                    mainWindow.webContents.send('menu:undo');
                }
            },
            {
                label: 'Redo',
                accelerator: process.platform === 'darwin' ? 'Cmd+Shift+Z' : 'Ctrl+Y',
                click: () => {
                    mainWindow.webContents.send('menu:redo');
                }
            },
            { type: 'separator' },
            {
                label: 'Cut',
                accelerator: 'CmdOrCtrl+X',
                click: () => {
                    mainWindow.webContents.send('menu:cut');
                }
            },
            {
                label: 'Copy',
                accelerator: 'CmdOrCtrl+C',
                click: () => {
                    mainWindow.webContents.send('menu:copy');
                }
            },
            {
                label: 'Paste',
                accelerator: 'CmdOrCtrl+V',
                click: () => {
                    mainWindow.webContents.send('menu:paste');
                }
            },
            {
                label: 'Delete',
                accelerator: process.platform === 'darwin' ? 'Backspace' : 'Delete',
                click: () => {
                    mainWindow.webContents.send('menu:delete');
                }
            },
            { type: 'separator' },
            {
                label: 'Select All',
                accelerator: 'CmdOrCtrl+A',
                click: () => {
                    mainWindow.webContents.send('menu:select-all');
                }
            }
        ]
    });

    // Tools menu
    template.push({
        label: 'Tools',
        submenu: [
            {
                label: 'Select Tool',
                accelerator: 'V',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'select');
                }
            },
            {
                label: 'Wall Tool',
                accelerator: 'W',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'wall');
                }
            },
            {
                label: 'Floor Tool',
                accelerator: 'F',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'floor');
                }
            },
            {
                label: 'Door Tool',
                accelerator: 'D',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'door');
                }
            },
            {
                label: 'Window Tool',
                accelerator: 'Shift+W',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'window');
                }
            },
            {
                label: 'Cut Tool',
                accelerator: 'C',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'cut');
                }
            },
            { type: 'separator' },
            {
                label: 'Move Tool',
                accelerator: 'M',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'move');
                }
            },
            {
                label: 'Rotate Tool',
                accelerator: 'R',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'rotate');
                }
            },
            {
                label: 'Scale Tool',
                accelerator: 'S',
                click: () => {
                    mainWindow.webContents.send('tool:shortcut', 'scale');
                }
            }
        ]
    });

    // View menu
    template.push({
        label: 'View',
        submenu: [
            {
                label: 'Front View',
                accelerator: 'Numpad1',
                click: () => {
                    mainWindow.webContents.send('view:change', 'front');
                }
            },
            {
                label: 'Side View',
                accelerator: 'Numpad3',
                click: () => {
                    mainWindow.webContents.send('view:change', 'side');
                }
            },
            {
                label: 'Top View',
                accelerator: 'Numpad7',
                click: () => {
                    mainWindow.webContents.send('view:change', 'top');
                }
            },
            {
                label: 'Perspective View',
                accelerator: 'Numpad0',
                click: () => {
                    mainWindow.webContents.send('view:change', 'perspective');
                }
            },
            { type: 'separator' },
            {
                label: 'Wireframe Mode',
                accelerator: 'Alt+Z',
                click: () => {
                    mainWindow.webContents.send('view:mode', 'wireframe');
                }
            },
            {
                label: 'Solid Mode',
                accelerator: 'Z',
                click: () => {
                    mainWindow.webContents.send('view:mode', 'solid');
                }
            },
            {
                label: 'Textured Mode',
                accelerator: 'Shift+Z',
                click: () => {
                    mainWindow.webContents.send('view:mode', 'textured');
                }
            },
            { type: 'separator' },
            {
                label: 'Focus Selected',
                accelerator: 'NumpadPeriod',
                click: () => {
                    mainWindow.webContents.send('view:focus-selected');
                }
            },
            {
                label: 'Frame All',
                accelerator: 'Home',
                click: () => {
                    mainWindow.webContents.send('view:frame-all');
                }
            },
            { type: 'separator' },
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    });

    // Window menu
    if (isMacOS) {
        template.push({
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' },
                { type: 'separator' },
                { role: 'front' }
            ]
        });
    }

    // Help menu
    template.push({
        label: 'Help',
        submenu: [
            {
                label: 'About Building Forge',
                click: () => {
                    mainWindow.webContents.send('menu:about');
                }
            },
            {
                label: 'Keyboard Shortcuts',
                accelerator: 'CmdOrCtrl+/',
                click: () => {
                    mainWindow.webContents.send('menu:shortcuts');
                }
            },
            { type: 'separator' },
            {
                label: 'Report Issue',
                click: () => {
                    mainWindow.webContents.send('menu:report-issue');
                }
            }
        ]
    });

    // Development menu (only in dev mode)
    if (isDev) {
        template.push({
            label: 'Development',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                {
                    label: 'Test Notification',
                    click: () => {
                        mainWindow.webContents.send('menu:test-notification');
                    }
                }
            ]
        });
    }

    return Menu.buildFromTemplate(template);
}