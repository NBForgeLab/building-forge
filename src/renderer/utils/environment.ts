/**
 * Environment utilities for renderer process
 * Uses static configuration instead of environment files
 */

import { getAppVersion, getBuildDate, getEnvironment, isDev } from '@shared/config/appConfig';

/**
 * Check if running in development mode
 */
export const isDevMode = isDev;

/**
 * Get application version
 */
export const getVersion = getAppVersion;

/**
 * Get build date
 */
export const getBuild = getBuildDate;

/**
 * Get current environment
 */
export const getEnv = getEnvironment;

/**
 * Check if running in Electron
 */
export const isElectron = (): boolean => {
    return typeof window !== 'undefined' && !!window.electronAPI;
};

/**
 * Safe console logging for development
 */
export const devLog = (...args: any[]): void => {
    if (isDev()) {
        console.log(...args);
    }
};

/**
 * Safe console warning for development
 */
export const devWarn = (...args: any[]): void => {
    if (isDev()) {
        console.warn(...args);
    }
};

/**
 * Safe console error for development
 */
export const devError = (...args: any[]): void => {
    if (isDev()) {
        console.error(...args);
    }
};