import { app, BrowserWindow, dialog, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import { setupIPC } from './ipc/ipcHandlers';
import { createApplicationMenu } from './menu/applicationMenu';
import { isDev } from './utils/environment';
import { createMainWindow } from './windows/mainWindow';

class ElectronApp {
    private mainWindow: BrowserWindow | null = null;
    private isQuitting = false;

    constructor() {
        this.setupApp();
        this.setupEventHandlers();
        this.setupAutoUpdater();
    }

    private setupApp(): void {
        // Set app user model ID for Windows
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.buildingforge.app');
        }

        // Security: Prevent new window creation
        app.on('web-contents-created', (_, contents) => {
            contents.on('new-window', (navigationEvent, navigationURL) => {
                navigationEvent.preventDefault();
                shell.openExternal(navigationURL);
            });
        });

        // Set CSP for security
        app.on('web-contents-created', (_, contents) => {
            contents.session.webRequest.onHeadersReceived((details, callback) => {
                callback({
                    responseHeaders: {
                        ...details.responseHeaders,
                        'Content-Security-Policy': [
                            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                            "style-src 'self' 'unsafe-inline' data:; " +
                            "img-src 'self' data: blob: https:; " +
                            "font-src 'self' data: https: blob:; " +
                            "connect-src 'self' https: wss: ws: http://localhost:*;"
                        ]
                    }
                });
            });
        });
    }

    private setupEventHandlers(): void {
        app.whenReady().then(() => {
            this.createWindow();
            this.setupMenu();
            this.setupIPC();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('before-quit', () => {
            this.isQuitting = true;
        });

        // Handle protocol for deep linking
        app.setAsDefaultProtocolClient('buildingforge');
    }

    private setupAutoUpdater(): void {
        if (!isDev) {
            autoUpdater.checkForUpdatesAndNotify();

            autoUpdater.on('update-available', () => {
                dialog.showMessageBox(this.mainWindow!, {
                    type: 'info',
                    title: 'Update Available',
                    message: 'A new version is available. It will be downloaded in the background.',
                    buttons: ['OK']
                });
            });

            autoUpdater.on('update-downloaded', () => {
                dialog.showMessageBox(this.mainWindow!, {
                    type: 'info',
                    title: 'Update Ready',
                    message: 'Update downloaded. The application will restart to apply the update.',
                    buttons: ['Restart Now', 'Later']
                }).then((result) => {
                    if (result.response === 0) {
                        autoUpdater.quitAndInstall();
                    }
                });
            });
        }
    }

    private createWindow(): void {
        this.mainWindow = createMainWindow();

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting && process.platform === 'darwin') {
                event.preventDefault();
                this.mainWindow?.hide();
            }
        });

        // Load the app
        if (isDev || process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
            console.log('Loading from development server: http://localhost:5173');
            this.mainWindow.loadURL('http://localhost:5173');
            this.mainWindow.webContents.openDevTools();
        } else {
            // For production build, load from dist/renderer
            const rendererPath = path.join(__dirname, '../renderer/index.html');
            console.log('Loading renderer from:', rendererPath);
            this.mainWindow.loadFile(rendererPath);
        }
    }

    private setupMenu(): void {
        const menu = createApplicationMenu(this.mainWindow!);
        Menu.setApplicationMenu(menu);
    }

    private setupIPC(): void {
        setupIPC(this.mainWindow!);
    }

    public getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }
}

// Create and start the application
const electronApp = new ElectronApp();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    dialog.showErrorBox('Unexpected Error', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export { electronApp };

