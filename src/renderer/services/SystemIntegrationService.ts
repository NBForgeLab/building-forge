/**
 * خدمة التكامل الرئيسية للنظام
 * تدير ربط جميع المكونات والخدمات مع dependency injection
 */

import { AssetIntegrationService } from './AssetIntegrationService';
import { AssetManagementService } from './AssetManagementService';
import { BForgeExporter } from './BForgeExporter';
import { BForgeImporter } from './BForgeImporter';
import { ClipboardService } from './ClipboardService';
import { DockviewLayoutManager } from './DockviewLayoutManager';
import { ElectronService } from './ElectronService';
import { ErrorReportingSystem } from './ErrorReportingSystem';
import { ExportValidator } from './ExportValidator';
import { GameExportService } from './GameExportService';
import { GameUnitsService } from './GameUnitsService';
import { GeometryValidator } from './GeometryValidator';
import { KeyboardShortcutManager } from './KeyboardShortcutManager';
import { MeasurementService } from './MeasurementService';
import { PerformanceManager } from './PerformanceManager';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { ProjectManager } from './ProjectManager';
import { ProjectMetadataManager } from './ProjectMetadataManager';
import { SnapService } from './SnapService';
import { ValidationService } from './ValidationService';

export interface SystemDependencies {
    electronService: ElectronService;
    projectManager: ProjectManager;
    assetManagementService: AssetManagementService;
    gameExportService: GameExportService;
    performanceManager: PerformanceManager;
    validationService: ValidationService;
    errorReportingSystem: ErrorReportingSystem;
    keyboardShortcutManager: KeyboardShortcutManager;
    clipboardService: ClipboardService;
    dockviewLayoutManager: DockviewLayoutManager;
    gameUnitsService: GameUnitsService;
    measurementService: MeasurementService;
    snapService: SnapService;
    performanceOptimizer: PerformanceOptimizer;
    geometryValidator: GeometryValidator;
    exportValidator: ExportValidator;
    projectMetadataManager: ProjectMetadataManager;
    bforgeExporter: BForgeExporter;
    bforgeImporter: BForgeImporter;
    assetIntegrationService: AssetIntegrationService;
}

export interface SystemStatus {
    isInitialized: boolean;
    initializationProgress: number;
    errors: string[];
    warnings: string[];
    performance: {
        memoryUsage: number;
        cpuUsage: number;
        renderTime: number;
    };
}

export class SystemIntegrationService {
    private dependencies: Partial<SystemDependencies> = {};
    private initializationCallbacks: Array<() => Promise<void>> = [];
    private shutdownCallbacks: Array<() => Promise<void>> = [];
    private status: SystemStatus = {
        isInitialized: false,
        initializationProgress: 0,
        errors: [],
        warnings: [],
        performance: {
            memoryUsage: 0,
            cpuUsage: 0,
            renderTime: 0
        }
    };

    private static instance: SystemIntegrationService;

    public static getInstance(): SystemIntegrationService {
        if (!SystemIntegrationService.instance) {
            SystemIntegrationService.instance = new SystemIntegrationService();
        }
        return SystemIntegrationService.instance;
    }

    /**
     * تسجيل خدمة في نظام dependency injection
     */
    public registerService<K extends keyof SystemDependencies>(
        name: K,
        service: SystemDependencies[K]
    ): void {
        this.dependencies[name] = service;
    }

    /**
     * الحصول على خدمة من نظام dependency injection
     */
    public getService<K extends keyof SystemDependencies>(
        name: K
    ): SystemDependencies[K] | undefined {
        return this.dependencies[name];
    }

    /**
     * تسجيل callback للتهيئة
     */
    public onInitialization(callback: () => Promise<void>): void {
        this.initializationCallbacks.push(callback);
    }

    /**
     * تسجيل callback للإغلاق
     */
    public onShutdown(callback: () => Promise<void>): void {
        this.shutdownCallbacks.push(callback);
    }

    /**
     * تهيئة جميع الأنظمة
     */
    public async initialize(): Promise<void> {
        try {
            this.status.initializationProgress = 0;
            this.status.errors = [];
            this.status.warnings = [];

            // تهيئة الخدمات الأساسية أولاً
            await this.initializeCoreServices();
            this.status.initializationProgress = 30;

            // تهيئة خدمات الواجهة
            await this.initializeUIServices();
            this.status.initializationProgress = 60;

            // تهيئة خدمات التصدير والتحليل
            await this.initializeExportServices();
            this.status.initializationProgress = 80;

            // تشغيل callbacks التهيئة المخصصة
            await this.runInitializationCallbacks();
            this.status.initializationProgress = 90;

            // إعداد مراقبة الأداء
            await this.setupPerformanceMonitoring();
            this.status.initializationProgress = 100;

            this.status.isInitialized = true;
            console.log('System integration completed successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.status.errors.push(errorMessage);
            this.getService('errorReportingSystem')?.reportError(
                'SystemIntegration',
                errorMessage,
                { phase: 'initialization' }
            );
            throw error;
        }
    }

    /**
     * تهيئة الخدمات الأساسية
     */
    private async initializeCoreServices(): Promise<void> {
        const electronService = this.getService('electronService');
        const errorReportingSystem = this.getService('errorReportingSystem');
        const performanceManager = this.getService('performanceManager');

        if (electronService) {
            await electronService.initialize?.();
        }

        if (errorReportingSystem) {
            await errorReportingSystem.initialize?.();
        }

        if (performanceManager) {
            await performanceManager.initialize?.();
        }
    }

    /**
     * تهيئة خدمات الواجهة
     */
    private async initializeUIServices(): Promise<void> {
        const keyboardShortcutManager = this.getService('keyboardShortcutManager');
        const dockviewLayoutManager = this.getService('dockviewLayoutManager');
        const clipboardService = this.getService('clipboardService');

        if (keyboardShortcutManager) {
            await keyboardShortcutManager.initialize?.();
        }

        if (dockviewLayoutManager) {
            await dockviewLayoutManager.initialize?.();
        }

        if (clipboardService) {
            await clipboardService.initialize?.();
        }
    }

    /**
     * تهيئة خدمات التصدير والتحليل
     */
    private async initializeExportServices(): Promise<void> {
        const gameExportService = this.getService('gameExportService');
        const validationService = this.getService('validationService');
        const assetManagementService = this.getService('assetManagementService');

        if (gameExportService) {
            await gameExportService.initialize?.();
        }

        if (validationService) {
            await validationService.initialize?.();
        }

        if (assetManagementService) {
            await assetManagementService.initialize?.();
        }
    }

    /**
     * تشغيل callbacks التهيئة المخصصة
     */
    private async runInitializationCallbacks(): Promise<void> {
        for (const callback of this.initializationCallbacks) {
            try {
                await callback();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown callback error';
                this.status.warnings.push(`Initialization callback failed: ${errorMessage}`);
            }
        }
    }

    /**
     * إعداد مراقبة الأداء
     */
    private async setupPerformanceMonitoring(): Promise<void> {
        const performanceManager = this.getService('performanceManager');
        const performanceOptimizer = this.getService('performanceOptimizer');

        if (performanceManager) {
            performanceManager.onPerformanceUpdate?.((metrics) => {
                this.status.performance = {
                    memoryUsage: metrics.memoryUsage || 0,
                    cpuUsage: metrics.cpuUsage || 0,
                    renderTime: metrics.renderTime || 0
                };
            });
        }

        if (performanceOptimizer) {
            await performanceOptimizer.initialize?.();
        }
    }

    /**
     * إغلاق جميع الأنظمة بشكل آمن
     */
    public async shutdown(): Promise<void> {
        try {
            // تشغيل callbacks الإغلاق المخصصة
            for (const callback of this.shutdownCallbacks) {
                try {
                    await callback();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown shutdown error';
                    console.warn(`Shutdown callback failed: ${errorMessage}`);
                }
            }

            // إغلاق الخدمات بالترتيب العكسي
            await this.shutdownServices();

            this.status.isInitialized = false;
            console.log('System shutdown completed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`System shutdown error: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * إغلاق الخدمات
     */
    private async shutdownServices(): Promise<void> {
        const services = [
            'performanceOptimizer',
            'performanceManager',
            'gameExportService',
            'validationService',
            'assetManagementService',
            'clipboardService',
            'dockviewLayoutManager',
            'keyboardShortcutManager',
            'errorReportingSystem',
            'electronService'
        ] as const;

        for (const serviceName of services) {
            const service = this.getService(serviceName);
            if (service && 'shutdown' in service && typeof service.shutdown === 'function') {
                try {
                    await service.shutdown();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown service shutdown error';
                    console.warn(`Service ${serviceName} shutdown failed: ${errorMessage}`);
                }
            }
        }
    }

    /**
     * الحصول على حالة النظام
     */
    public getStatus(): SystemStatus {
        return { ...this.status };
    }

    /**
     * التحقق من صحة التكامل
     */
    public async validateIntegration(): Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    }> {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // التحقق من وجود الخدمات الأساسية
        const requiredServices: (keyof SystemDependencies)[] = [
            'electronService',
            'projectManager',
            'errorReportingSystem'
        ];

        for (const serviceName of requiredServices) {
            if (!this.getService(serviceName)) {
                issues.push(`Required service missing: ${serviceName}`);
            }
        }

        // التحقق من حالة التهيئة
        if (!this.status.isInitialized) {
            issues.push('System not initialized');
            recommendations.push('Call initialize() method');
        }

        // التحقق من الأخطاء
        if (this.status.errors.length > 0) {
            issues.push(`System has ${this.status.errors.length} errors`);
            recommendations.push('Check error logs and resolve issues');
        }

        // التحقق من الأداء
        if (this.status.performance.memoryUsage > 80) {
            issues.push('High memory usage detected');
            recommendations.push('Consider memory optimization');
        }

        return {
            isValid: issues.length === 0,
            issues,
            recommendations
        };
    }

    /**
     * إعادة تشغيل النظام
     */
    public async restart(): Promise<void> {
        await this.shutdown();
        await this.initialize();
    }

    /**
     * تنظيف الموارد
     */
    public cleanup(): void {
        this.dependencies = {};
        this.initializationCallbacks = [];
        this.shutdownCallbacks = [];
        this.status = {
            isInitialized: false,
            initializationProgress: 0,
            errors: [],
            warnings: [],
            performance: {
                memoryUsage: 0,
                cpuUsage: 0,
                renderTime: 0
            }
        };
    }
}

export default SystemIntegrationService;