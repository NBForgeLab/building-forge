/**
 * Application Configuration
 * Static configuration without environment files
 */

export interface AppConfig {
    app: {
        name: string;
        version: string;
        description: string;
        author: string;
    };
    development: {
        devTools: boolean;
        hotReload: boolean;
        debugMode: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
    renderer: {
        port: number;
        host: string;
    };
    build: {
        minify: boolean;
        sourcemap: boolean;
    };
    features: {
        autoSave: boolean;
        autoSaveInterval: number;
        enablePopouts: boolean;
        enableMultiDisplay: boolean;
    };
}

// Detect environment based on build context
const isDevelopment = typeof window !== 'undefined'
    ? window.location.hostname === 'localhost'
    : false;

const isProduction = !isDevelopment;

export const appConfig: AppConfig = {
    app: {
        name: 'Building Forge',
        version: '1.0.0',
        description: 'أداة تصميم المباني ثلاثية الأبعاد المحسنة للألعاب',
        author: 'Building Forge Team'
    },
    development: {
        devTools: isDevelopment,
        hotReload: isDevelopment,
        debugMode: isDevelopment,
        logLevel: isDevelopment ? 'debug' : 'error'
    },
    renderer: {
        port: 5173,
        host: 'localhost'
    },
    build: {
        minify: isProduction,
        sourcemap: true
    },
    features: {
        autoSave: true,
        autoSaveInterval: 30000, // 30 seconds
        enablePopouts: true,
        enableMultiDisplay: true
    }
};

// Helper functions
export const isDev = (): boolean => {
    return appConfig.development.debugMode;
};

export const getAppVersion = (): string => {
    return appConfig.app.version;
};

export const getAppName = (): string => {
    return appConfig.app.name;
};

export const getBuildDate = (): string => {
    return new Date().toISOString();
};

export const getEnvironment = (): 'development' | 'production' => {
    return isDev() ? 'development' : 'production';
};