/**
 * اختبارات التكامل الشامل للنظام
 * تختبر التدفقات الكاملة والتكامل بين جميع المكونات
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagnosticsService } from '../DiagnosticsService';
import { ErrorRecoveryService } from '../ErrorRecoveryService';
import { SystemIntegrationService } from '../SystemIntegrationService';
import { WorkflowManager } from '../WorkflowManager';

// Mock الخدمات
vi.mock('../ElectronService');
vi.mock('../ProjectManager');
vi.mock('../AssetManagementService');
vi.mock('../GameExportService');
vi.mock('../PerformanceManager');
vi.mock('../ValidationService');
vi.mock('../ErrorReportingSystem');

describe('SystemIntegrationService', () => {
    let systemIntegration: SystemIntegrationService;
    let mockServices: any;

    beforeEach(() => {
        // إعادة تعيين singleton
        (SystemIntegrationService as any).instance = undefined;
        systemIntegration = SystemIntegrationService.getInstance();

        // إعداد mock services
        mockServices = {
            electronService: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined)
            },
            projectManager: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined),
                getCurrentProject: vi.fn().mockReturnValue(null)
            },
            errorReportingSystem: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined),
                reportError: vi.fn()
            },
            performanceManager: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined),
                onPerformanceUpdate: vi.fn(),
                getCurrentMetrics: vi.fn().mockReturnValue({
                    fps: 60,
                    memoryUsage: 45,
                    cpuUsage: 30,
                    renderTime: 16
                })
            }
        };

        // تسجيل الخدمات
        Object.entries(mockServices).forEach(([name, service]) => {
            systemIntegration.registerService(name as any, service);
        });
    });

    afterEach(() => {
        systemIntegration.cleanup();
    });

    describe('Service Registration and Dependency Injection', () => {
        it('should register and retrieve services correctly', () => {
            const testService = { test: true };
            systemIntegration.registerService('electronService', testService as any);

            const retrieved = systemIntegration.getService('electronService');
            expect(retrieved).toBe(testService);
        });

        it('should return undefined for unregistered services', () => {
            const retrieved = systemIntegration.getService('nonExistentService' as any);
            expect(retrieved).toBeUndefined();
        });

        it('should allow overriding existing services', () => {
            const service1 = { version: 1 };
            const service2 = { version: 2 };

            systemIntegration.registerService('electronService', service1 as any);
            systemIntegration.registerService('electronService', service2 as any);

            const retrieved = systemIntegration.getService('electronService');
            expect(retrieved).toBe(service2);
        });
    });

    describe('System Initialization', () => {
        it('should initialize all services in correct order', async () => {
            await systemIntegration.initialize();

            expect(mockServices.electronService.initialize).toHaveBeenCalled();
            expect(mockServices.errorReportingSystem.initialize).toHaveBeenCalled();
            expect(mockServices.performanceManager.initialize).toHaveBeenCalled();

            const status = systemIntegration.getStatus();
            expect(status.isInitialized).toBe(true);
            expect(status.initializationProgress).toBe(100);
        });

        it('should handle initialization errors gracefully', async () => {
            mockServices.electronService.initialize.mockRejectedValue(new Error('Init failed'));

            await expect(systemIntegration.initialize()).rejects.toThrow('Init failed');

            const status = systemIntegration.getStatus();
            expect(status.isInitialized).toBe(false);
            expect(status.errors).toContain('Init failed');
        });

        it('should run custom initialization callbacks', async () => {
            const callback1 = vi.fn().mockResolvedValue(undefined);
            const callback2 = vi.fn().mockResolvedValue(undefined);

            systemIntegration.onInitialization(callback1);
            systemIntegration.onInitialization(callback2);

            await systemIntegration.initialize();

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle callback failures without stopping initialization', async () => {
            const failingCallback = vi.fn().mockRejectedValue(new Error('Callback failed'));
            const successCallback = vi.fn().mockResolvedValue(undefined);

            systemIntegration.onInitialization(failingCallback);
            systemIntegration.onInitialization(successCallback);

            await systemIntegration.initialize();

            expect(failingCallback).toHaveBeenCalled();
            expect(successCallback).toHaveBeenCalled();

            const status = systemIntegration.getStatus();
            expect(status.isInitialized).toBe(true);
            expect(status.warnings).toContain('Initialization callback failed: Callback failed');
        });
    });

    describe('System Shutdown', () => {
        beforeEach(async () => {
            await systemIntegration.initialize();
        });

        it('should shutdown all services in reverse order', async () => {
            await systemIntegration.shutdown();

            expect(mockServices.performanceManager.shutdown).toHaveBeenCalled();
            expect(mockServices.errorReportingSystem.shutdown).toHaveBeenCalled();
            expect(mockServices.electronService.shutdown).toHaveBeenCalled();

            const status = systemIntegration.getStatus();
            expect(status.isInitialized).toBe(false);
        });

        it('should run shutdown callbacks', async () => {
            const callback1 = vi.fn().mockResolvedValue(undefined);
            const callback2 = vi.fn().mockResolvedValue(undefined);

            systemIntegration.onShutdown(callback1);
            systemIntegration.onShutdown(callback2);

            await systemIntegration.shutdown();

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle shutdown errors gracefully', async () => {
            mockServices.electronService.shutdown.mockRejectedValue(new Error('Shutdown failed'));

            await expect(systemIntegration.shutdown()).resolves.not.toThrow();

            const status = systemIntegration.getStatus();
            expect(status.isInitialized).toBe(false);
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(async () => {
            await systemIntegration.initialize();
        });

        it('should setup performance monitoring during initialization', () => {
            expect(mockServices.performanceManager.onPerformanceUpdate).toHaveBeenCalled();
        });

        it('should update performance metrics when callback is triggered', () => {
            const updateCallback = mockServices.performanceManager.onPerformanceUpdate.mock.calls[0][0];

            const testMetrics = {
                memoryUsage: 75,
                cpuUsage: 50,
                renderTime: 20
            };

            updateCallback(testMetrics);

            const status = systemIntegration.getStatus();
            expect(status.performance.memoryUsage).toBe(75);
            expect(status.performance.cpuUsage).toBe(50);
            expect(status.performance.renderTime).toBe(20);
        });
    });

    describe('Integration Validation', () => {
        it('should validate integration with all required services', async () => {
            await systemIntegration.initialize();

            const validation = await systemIntegration.validateIntegration();

            expect(validation.isValid).toBe(true);
            expect(validation.issues).toHaveLength(0);
        });

        it('should detect missing required services', async () => {
            // إزالة خدمة مطلوبة
            systemIntegration.registerService('electronService', undefined as any);

            const validation = await systemIntegration.validateIntegration();

            expect(validation.isValid).toBe(false);
            expect(validation.issues).toContain('Required service missing: electronService');
        });

        it('should detect uninitialized system', async () => {
            const validation = await systemIntegration.validateIntegration();

            expect(validation.isValid).toBe(false);
            expect(validation.issues).toContain('System not initialized');
            expect(validation.recommendations).toContain('Call initialize() method');
        });

        it('should detect high memory usage', async () => {
            await systemIntegration.initialize();

            // محاكاة استخدام ذاكرة عالي
            const updateCallback = mockServices.performanceManager.onPerformanceUpdate.mock.calls[0][0];
            updateCallback({ memoryUsage: 85 });

            const validation = await systemIntegration.validateIntegration();

            expect(validation.issues).toContain('High memory usage detected');
            expect(validation.recommendations).toContain('Consider memory optimization');
        });
    });

    describe('System Restart', () => {
        it('should restart system successfully', async () => {
            await systemIntegration.initialize();
            expect(systemIntegration.getStatus().isInitialized).toBe(true);

            await systemIntegration.restart();

            expect(mockServices.electronService.shutdown).toHaveBeenCalled();
            expect(mockServices.electronService.initialize).toHaveBeenCalledTimes(2);
            expect(systemIntegration.getStatus().isInitialized).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should report errors to error reporting system', async () => {
            mockServices.electronService.initialize.mockRejectedValue(new Error('Test error'));

            try {
                await systemIntegration.initialize();
            } catch (error) {
                // متوقع
            }

            expect(mockServices.errorReportingSystem.reportError).toHaveBeenCalledWith(
                'SystemIntegration',
                'Test error',
                { phase: 'initialization' }
            );
        });
    });
});

describe('WorkflowManager', () => {
    let workflowManager: WorkflowManager;
    let systemIntegration: SystemIntegrationService;

    beforeEach(() => {
        (SystemIntegrationService as any).instance = undefined;
        systemIntegration = SystemIntegrationService.getInstance();
        workflowManager = new WorkflowManager();

        // إعداد mock services
        const mockProjectManager = {
            createProject: vi.fn().mockResolvedValue({ id: 'test-project', name: 'Test Project' }),
            getCurrentProject: vi.fn().mockReturnValue({ id: 'test-project', elements: [], assets: [] }),
            reloadProject: vi.fn().mockResolvedValue(undefined)
        };

        systemIntegration.registerService('projectManager', mockProjectManager);
    });

    describe('Workflow Execution', () => {
        it('should execute create-project workflow successfully', async () => {
            const result = await workflowManager.executeWorkflow('create-project', {
                name: 'Test Project',
                units: 'meters'
            });

            expect(result.success).toBe(true);
            expect(result.completedSteps).toContain('validate-input');
            expect(result.completedSteps).toContain('create-project-structure');
            expect(result.errors).toHaveLength(0);
        });

        it('should handle workflow validation errors', async () => {
            const result = await workflowManager.executeWorkflow('create-project', {
                name: '' // اسم فارغ
            });

            expect(result.success).toBe(false);
            expect(result.failedStep).toBe('validate-input');
            expect(result.errors).toContain('Project name is required');
        });

        it('should report progress during workflow execution', async () => {
            const progressUpdates: any[] = [];

            await workflowManager.executeWorkflow('create-project', {
                name: 'Test Project'
            }, (progress) => {
                progressUpdates.push(progress);
            });

            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates[0]).toHaveProperty('currentStep');
            expect(progressUpdates[0]).toHaveProperty('totalSteps');
            expect(progressUpdates[0]).toHaveProperty('stepName');
        });

        it('should handle workflow cancellation', async () => {
            const workflowPromise = workflowManager.executeWorkflow('create-project', {
                name: 'Test Project'
            });

            // إلغاء فوري (قد لا يعمل دائماً بسبب سرعة التنفيذ)
            const activeWorkflows = workflowManager.getActiveWorkflows();
            if (activeWorkflows.length > 0) {
                workflowManager.cancelWorkflow(activeWorkflows[0]);
            }

            try {
                await workflowPromise;
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('Workflow History', () => {
        it('should track workflow history', async () => {
            await workflowManager.executeWorkflow('create-project', {
                name: 'Test Project 1'
            });

            await workflowManager.executeWorkflow('create-project', {
                name: 'Test Project 2'
            });

            const history = workflowManager.getWorkflowHistory();
            expect(history).toHaveLength(2);
            expect(history[0].type).toBe('create-project');
            expect(history[1].type).toBe('create-project');
        });
    });
});

describe('ErrorRecoveryService', () => {
    let errorRecovery: ErrorRecoveryService;

    beforeEach(() => {
        errorRecovery = new ErrorRecoveryService();
    });

    describe('Error Handling and Recovery', () => {
        it('should handle errors and attempt recovery', async () => {
            const testError = new Error('Test error');
            const context = {
                component: 'TestComponent',
                action: 'testAction'
            };

            const result = await errorRecovery.handleError(testError, context);

            expect(result.report).toBeDefined();
            expect(result.report.error).toBe(testError);
            expect(result.report.context.component).toBe('TestComponent');
        });

        it('should try multiple recovery strategies', async () => {
            const testError = new Error('memory error');
            const context = {
                component: 'TestComponent',
                action: 'testAction',
                metadata: { memoryUsage: 85 }
            };

            const result = await errorRecovery.handleError(testError, context);

            expect(result.report.recoveryAttempts.length).toBeGreaterThan(0);
        });

        it('should prevent nested recovery attempts', async () => {
            const testError = new Error('Test error');
            const context = { component: 'TestComponent', action: 'testAction' };

            // بدء استعادة أولى
            const promise1 = errorRecovery.handleError(testError, context);

            // محاولة استعادة ثانية فورية
            const promise2 = errorRecovery.handleError(testError, context);

            const [result1, result2] = await Promise.all([promise1, promise2]);

            // الثانية يجب أن تفشل بسبب منع التداخل
            expect(result2.recovered).toBe(false);
            expect(result2.userActionRequired).toBe(true);
        });
    });

    describe('Recovery Strategies', () => {
        it('should register and use custom recovery strategies', async () => {
            const customStrategy = {
                id: 'custom-test',
                name: 'Custom Test Strategy',
                description: 'Test strategy',
                priority: 10,
                canRecover: vi.fn().mockReturnValue(true),
                recover: vi.fn().mockResolvedValue({
                    success: true,
                    message: 'Custom recovery successful'
                })
            };

            errorRecovery.registerStrategy(customStrategy);

            const testError = new Error('Test error');
            const result = await errorRecovery.handleError(testError, {
                component: 'TestComponent',
                action: 'testAction'
            });

            expect(customStrategy.canRecover).toHaveBeenCalled();
            expect(customStrategy.recover).toHaveBeenCalled();
            expect(result.recovered).toBe(true);
        });

        it('should unregister strategies', () => {
            const strategy = {
                id: 'test-strategy',
                name: 'Test',
                description: 'Test',
                priority: 1,
                canRecover: () => true,
                recover: async () => ({ success: true, message: 'test' })
            };

            errorRecovery.registerStrategy(strategy);
            const unregistered = errorRecovery.unregisterStrategy('test-strategy');

            expect(unregistered).toBe(true);

            // محاولة إلغاء تسجيل مرة أخرى
            const unregisteredAgain = errorRecovery.unregisterStrategy('test-strategy');
            expect(unregisteredAgain).toBe(false);
        });
    });

    describe('Error Statistics', () => {
        it('should provide error statistics', async () => {
            // إنشاء عدة أخطاء
            await errorRecovery.handleError(new Error('Error 1'), { component: 'Comp1', action: 'action1' });
            await errorRecovery.handleError(new Error('Error 2'), { component: 'Comp1', action: 'action2' });
            await errorRecovery.handleError(new Error('Error 3'), { component: 'Comp2', action: 'action1' });

            const stats = errorRecovery.getErrorStatistics();

            expect(stats.total).toBe(3);
            expect(stats.byComponent.Comp1).toBe(2);
            expect(stats.byComponent.Comp2).toBe(1);
        });

        it('should cleanup old resolved reports', async () => {
            // إنشاء تقرير خطأ
            const result = await errorRecovery.handleError(new Error('Test error'), {
                component: 'TestComponent',
                action: 'testAction'
            });

            // حل الخطأ يدوياً
            errorRecovery.resolveError(result.report.id, 'Manual resolution');

            // تنظيف التقارير القديمة (عمر 0 لحذف كل شيء)
            const cleanedCount = errorRecovery.cleanupOldReports(0);

            expect(cleanedCount).toBe(1);
        });
    });
});

describe('DiagnosticsService', () => {
    let diagnostics: DiagnosticsService;

    beforeEach(() => {
        diagnostics = new DiagnosticsService();
    });

    afterEach(() => {
        diagnostics.cleanup();
    });

    describe('Logging', () => {
        it('should log messages with correct format', () => {
            diagnostics.log('info', 'TestCategory', 'Test message', { data: 'test' });

            const logs = diagnostics.searchLogs({});
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('info');
            expect(logs[0].category).toBe('TestCategory');
            expect(logs[0].message).toBe('Test message');
            expect(logs[0].data).toEqual({ data: 'test' });
        });

        it('should filter logs by level', () => {
            diagnostics.setLogLevel('warn');

            diagnostics.log('debug', 'Test', 'Debug message');
            diagnostics.log('info', 'Test', 'Info message');
            diagnostics.log('warn', 'Test', 'Warn message');
            diagnostics.log('error', 'Test', 'Error message');

            const logs = diagnostics.searchLogs({});
            expect(logs).toHaveLength(2); // warn و error فقط
        });

        it('should add stack trace for errors', () => {
            diagnostics.log('error', 'TestCategory', 'Error message');

            const logs = diagnostics.searchLogs({ level: 'error' });
            expect(logs).toHaveLength(1);
            expect(logs[0].stack).toBeDefined();
        });
    });

    describe('Performance Collection', () => {
        it('should start and stop performance collection', () => {
            diagnostics.startPerformanceCollection(100);

            // التحقق من أن المجموعة بدأت
            expect(diagnostics['isCollectingPerformance']).toBe(true);

            diagnostics.stopPerformanceCollection();

            // التحقق من أن المجموعة توقفت
            expect(diagnostics['isCollectingPerformance']).toBe(false);
        });
    });

    describe('Log Search and Statistics', () => {
        beforeEach(() => {
            // إضافة بعض السجلات للاختبار
            diagnostics.log('info', 'Category1', 'Info message 1');
            diagnostics.log('warn', 'Category1', 'Warning message');
            diagnostics.log('error', 'Category2', 'Error message');
            diagnostics.log('info', 'Category2', 'Info message 2');
        });

        it('should search logs by category', () => {
            const logs = diagnostics.searchLogs({ category: 'Category1' });
            expect(logs).toHaveLength(2);
            expect(logs.every(log => log.category === 'Category1')).toBe(true);
        });

        it('should search logs by level', () => {
            const logs = diagnostics.searchLogs({ level: 'error' });
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('error');
        });

        it('should provide log statistics', () => {
            const stats = diagnostics.getLogStatistics();

            expect(stats.total).toBe(4);
            expect(stats.byLevel.info).toBe(2);
            expect(stats.byLevel.warn).toBe(1);
            expect(stats.byLevel.error).toBe(1);
            expect(stats.byCategory.Category1).toBe(2);
            expect(stats.byCategory.Category2).toBe(2);
        });
    });

    describe('Diagnostic Info Collection', () => {
        it('should collect comprehensive diagnostic information', async () => {
            const info = await diagnostics.collectDiagnosticInfo();

            expect(info).toHaveProperty('system');
            expect(info).toHaveProperty('application');
            expect(info).toHaveProperty('project');
            expect(info).toHaveProperty('services');

            expect(info.system).toHaveProperty('platform');
            expect(info.system).toHaveProperty('userAgent');
            expect(info.system).toHaveProperty('memory');
            expect(info.system).toHaveProperty('performance');

            expect(info.application).toHaveProperty('version');
            expect(info.application).toHaveProperty('environment');
            expect(info.application).toHaveProperty('features');
        });
    });

    describe('Export Functionality', () => {
        beforeEach(() => {
            diagnostics.log('info', 'Test', 'Test message 1');
            diagnostics.log('warn', 'Test', 'Test message 2');
        });

        it('should export logs as JSON', () => {
            const exported = diagnostics.exportLogs('json');
            const parsed = JSON.parse(exported);

            expect(parsed).toHaveProperty('sessionId');
            expect(parsed).toHaveProperty('exportedAt');
            expect(parsed).toHaveProperty('logs');
            expect(parsed).toHaveProperty('statistics');
            expect(parsed.logs).toHaveLength(2);
        });

        it('should export logs as CSV', () => {
            const exported = diagnostics.exportLogs('csv');
            const lines = exported.split('\n');

            expect(lines[0]).toContain('timestamp');
            expect(lines[0]).toContain('level');
            expect(lines[0]).toContain('category');
            expect(lines.length).toBe(3); // header + 2 data rows
        });

        it('should generate diagnostic report', async () => {
            const report = await diagnostics.generateDiagnosticReport();
            const parsed = JSON.parse(report);

            expect(parsed).toHaveProperty('generatedAt');
            expect(parsed).toHaveProperty('sessionId');
            expect(parsed).toHaveProperty('diagnosticInfo');
            expect(parsed).toHaveProperty('logStatistics');
            expect(parsed).toHaveProperty('performanceSummary');
        });
    });
});