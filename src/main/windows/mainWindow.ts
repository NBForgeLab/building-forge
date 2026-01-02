import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { isDev } from '../utils/environment';

/**
 * Create the main application window with security settings
 */
export function createMainWindow(): BrowserWindow {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Calculate window size (80% of screen size, minimum 1200x800)
    const windowWidth = Math.max(Math.floor(width * 0.8), 1200);
    const windowHeight = Math.max(Math.floor(height * 0.8), 800);

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        minWidth: 1200,
        minHeight: 800,
        show: false, // Don't show until ready-to-show
        icon: path.join(__dirname, '../../../resources/icon.png'),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            // Security settings
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: false, // Disabled for Three.js compatibility
            webSecurity: true, // Always enable web security
            allowRunningInsecureContent: false,
            experimentalFeatures: false,

            // Preload script for secure IPC
            preload: path.join(__dirname, 'preload.js'),
        },

        // Window appearance
        backgroundColor: '#1a1a1a', // Dark theme background
        vibrancy: process.platform === 'darwin' ? 'dark' : undefined,

        // Window behavior
        center: true,
        resizable: true,
        maximizable: true,
        minimizable: true,
        closable: true,

        // Auto-hide menu bar on Windows/Linux
        autoHideMenuBar: process.platform !== 'darwin'
    });

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Focus the window
        if (isDev) {
            mainWindow.focus();
        }
    });

    // Handle window state changes
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state-changed', 'maximized');
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state-changed', 'normal');
    });

    mainWindow.on('minimize', () => {
        mainWindow.webContents.send('window-state-changed', 'minimized');
    });

    mainWindow.on('restore', () => {
        mainWindow.webContents.send('window-state-changed', 'normal');
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Open external links in default browser
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Security: Prevent navigation to external sites
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
            event.preventDefault();
        }
    });

    return mainWindow;
}