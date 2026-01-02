import { BrowserWindow, dialog, ipcMain, Notification } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getUserDataPath } from '../utils/environment';

/**
 * Setup all IPC handlers for secure communication between main and renderer processes
 */
export function setupIPC(mainWindow: BrowserWindow): void {
    // Window controls
    ipcMain.handle('window:minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.handle('window:maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.handle('window:close', () => {
        mainWindow.close();
    });

    ipcMain.handle('window:is-maximized', () => {
        return mainWindow.isMaximized();
    });

    // File operations
    ipcMain.handle('file:open-project', async () => {
        try {
            const result = await dialog.showOpenDialog(mainWindow, {
                title: 'Open Building Forge Project',
                filters: [
                    { name: 'Building Forge Projects', extensions: ['bforge'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

            if (result.canceled || !result.filePaths.length) {
                return { success: false, error: 'No file selected' };
            }

            const filePath = result.filePaths[0];
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const projectData = JSON.parse(fileContent);

            return { success: true, data: projectData };
        } catch (error) {
            console.error('Error opening project:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('file:save-project', async (_, data) => {
        try {
            // For now, save to a default location in userData
            const userDataPath = getUserDataPath();
            const projectsDir = path.join(userDataPath, 'projects');

            // Ensure projects directory exists
            await fs.mkdir(projectsDir, { recursive: true });

            const fileName = `project_${Date.now()}.bforge`;
            const filePath = path.join(projectsDir, fileName);

            await fs.writeFile(filePath, JSON.stringify(data, null, 2));

            return { success: true };
        } catch (error) {
            console.error('Error saving project:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('file:save-project-as', async (_, data) => {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: 'Save Building Forge Project',
                defaultPath: 'untitled.bforge',
                filters: [
                    { name: 'Building Forge Projects', extensions: ['bforge'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'No file path selected' };
            }

            await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));

            return { success: true, path: result.filePath };
        } catch (error) {
            console.error('Error saving project as:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('file:export-glb', async (_, data, options) => {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: 'Export as GLB',
                defaultPath: 'building.glb',
                filters: [
                    { name: 'GLB Files', extensions: ['glb'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'No file path selected' };
            }

            // TODO: Implement actual GLB export logic
            // For now, just create a placeholder file
            await fs.writeFile(result.filePath, JSON.stringify({
                format: 'GLB',
                data,
                options,
                exported: new Date().toISOString()
            }));

            return { success: true, path: result.filePath };
        } catch (error) {
            console.error('Error exporting GLB:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('file:export-obj', async (_, data, options) => {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: 'Export as OBJ',
                defaultPath: 'building.obj',
                filters: [
                    { name: 'OBJ Files', extensions: ['obj'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'No file path selected' };
            }

            // TODO: Implement actual OBJ export logic
            // For now, just create a placeholder file
            await fs.writeFile(result.filePath, `# Building Forge OBJ Export
# Exported: ${new Date().toISOString()}
# Data: ${JSON.stringify(data)}
# Options: ${JSON.stringify(options)}
`);

            return { success: true, path: result.filePath };
        } catch (error) {
            console.error('Error exporting OBJ:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('file:import-asset', async () => {
        try {
            const result = await dialog.showOpenDialog(mainWindow, {
                title: 'Import Asset',
                filters: [
                    { name: '3D Models', extensions: ['glb', 'gltf', 'obj', 'fbx'] },
                    { name: 'Textures', extensions: ['png', 'jpg', 'jpeg', 'tga', 'exr'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile', 'multiSelections']
            });

            if (result.canceled || !result.filePaths.length) {
                return { success: false, error: 'No files selected' };
            }

            // TODO: Implement actual asset import logic
            const importedAssets = result.filePaths.map(filePath => ({
                path: filePath,
                name: path.basename(filePath),
                type: path.extname(filePath).toLowerCase(),
                size: 0 // TODO: Get actual file size
            }));

            return { success: true, data: importedAssets };
        } catch (error) {
            console.error('Error importing asset:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    // Notifications
    ipcMain.handle('notifications:show', async (_, { title, body, type }) => {
        if (Notification.isSupported()) {
            const notification = new Notification({
                title,
                body,
                icon: path.join(__dirname, '../../../resources/icon.png')
            });

            notification.show();
        }
    });

    // File system operations for asset management
    ipcMain.handle('fs:get-userdata-path', async () => {
        return getUserDataPath();
    });

    ipcMain.handle('fs:ensure-directory', async (_, dirPath: string) => {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return { success: true };
        } catch (error) {
            console.error('Error creating directory:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('fs:save-file', async (_, filePath: string, data: ArrayBuffer) => {
        try {
            const buffer = Buffer.from(data);
            await fs.writeFile(filePath, buffer);
            return { success: true };
        } catch (error) {
            console.error('Error saving file:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('fs:load-file', async (_, filePath: string) => {
        try {
            const buffer = await fs.readFile(filePath);
            return { success: true, data: buffer.buffer };
        } catch (error) {
            console.error('Error loading file:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('fs:delete-file', async (_, filePath: string) => {
        try {
            await fs.unlink(filePath);
            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('fs:list-directory', async (_, dirPath: string) => {
        try {
            const files = await fs.readdir(dirPath);
            return { success: true, data: files };
        } catch (error) {
            console.error('Error listing directory:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('fs:get-file-stats', async (_, filePath: string) => {
        try {
            const stats = await fs.stat(filePath);
            return {
                success: true,
                data: {
                    size: stats.size,
                    created: stats.birthtime.getTime(),
                    modified: stats.mtime.getTime()
                }
            };
        } catch (error) {
            console.error('Error getting file stats:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('fs:get-directory-stats', async (_, dirPath: string) => {
        try {
            const stats = await fs.stat(dirPath);

            // Calculate directory size and file count recursively
            let totalSize = 0;
            let fileCount = 0;

            async function calculateDirSize(dir: string): Promise<void> {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await calculateDirSize(fullPath);
                    } else {
                        const fileStats = await fs.stat(fullPath);
                        totalSize += fileStats.size;
                        fileCount++;
                    }
                }
            }

            await calculateDirSize(dirPath);

            return {
                success: true,
                data: {
                    size: totalSize,
                    fileCount,
                    created: stats.birthtime.getTime(),
                    modified: stats.mtime.getTime()
                }
            };
        } catch (error) {
            console.error('Error getting directory stats:', error);
            return { success: false, error: (error as Error).message };
        }
    });
}