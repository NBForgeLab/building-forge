import { app } from 'electron';

/**
 * Check if the application is running in development mode
 */
export const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Get the application version
 */
export const getAppVersion = (): string => {
    return app.getVersion();
};

/**
 * Get the application name
 */
export const getAppName = (): string => {
    return app.getName();
};

/**
 * Get the user data path
 */
export const getUserDataPath = (): string => {
    return app.getPath('userData');
};

/**
 * Get the application path
 */
export const getAppPath = (): string => {
    return app.getAppPath();
};

/**
 * Check if the application is running on Windows
 */
export const isWindows = process.platform === 'win32';

/**
 * Check if the application is running on macOS
 */
export const isMacOS = process.platform === 'darwin';

/**
 * Check if the application is running on Linux
 */
export const isLinux = process.platform === 'linux';