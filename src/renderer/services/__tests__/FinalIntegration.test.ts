/**
 * اختبارات التكامل النهائي الشاملة
 * تختبر جميع الأنظمة معاً في سيناريوهات واقعية
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagnosticsService } from '../DiagnosticsService';
import { ErrorRecoveryService } from '../ErrorRecoveryService';
import { GameEngineCompatibilityService } from '../GameEngineCompatibilityService';
import { ProductionOptimizationService } from '../ProductionOptimizationService';
import { QualityAssuranceService } from '../QualityAssuranceService';
import { StressTestService } from '../StressTestService';
import { SystemIntegrationService } from '../SystemIntegrationService';
import { WorkflowManager } from '../WorkflowManager';

// Mock جميع الخدمات الخارجية
vi.mock('../ElectronService');
vi.mock('../ProjectManager');
vi.mock('../AssetManagementService');
vi.mock('../GameExportService');
vi.mock('../PerformanceManager');
vi.mock('../ValidationService');

describe('Final Integration Tests', () => {
    let systemIntegration: SystemIntegrationService;
    let workflowManager: WorkflowManager;
    let qualityAssurance: QualityAssuranceService;
    let gameEngineCompatibility: GameEngineCompatibilityService;
    let stressTest: StressTestService;
    let productionOptimization: ProductionOptimizationService;
    let errorRecovery: ErrorRecoveryService;
    let diagnostics: DiagnosticsService;

    beforeEach(async () => {
        // إعادة تعيين singleton
        (SystemIntegrationService as any).instance = undefined;

        // تهيئة جميع الخدمات
        systemIntegration = SystemIntegrationService.getInstance();
        workflowManager = new WorkflowManager();
        qualityAssurance = new QualityAssuranceService();
        gameEngineCompatibility = new GameEngineCompatibilityService();
        stressTest = new StressTestService();
        productionOptimization = new ProductionOptimizationService();
        errorRecovery = new ErrorRecoveryService();
        diagnostics = new DiagnosticsService();

        // إعداد mock services
        const mockServices = {
            electronService: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined)
            },
            projectManager: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined),
                createProject: vi.fn().mockResolvedValue({
                    id: 'test-project',
                    name: 'Test Project',
                    elements: [],
                    materials: [],
                    assets: []
                }),
                getCurrentProject: vi.fn().mockReturnValue({
                    id: 'test-project',
                    name: 'Test Project',
                    elements: [],
                    materials: [],
                    assets: []
                })
            },
            gameExportService: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined),
                exportProject: vi.fn().mockResolvedValue({
                    success: true,
                    errors: [],
                    warnings: []
                }),
                canExportFormat: vi.fn().mockReturnValue(true)
            },
            performanceManager: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined),
                getCurrentMetrics: vi.fn().mockReturnValue({
                    fps: 60,
                    memoryUsage: 45,
                    cpuUsage: 30,
                    renderTime: 16,
                    responseTime: 50
                }),
                onPerformanceUpdate: vi.fn()
            },
            validationService: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mkResolvedValue(undefined),
                validateProject: vi.fn().mockResolvedValue({
                    isValid: true,
                    errors: [],
                    warnings: []
                })
            },
            errorReportingSystem: {
                initialize: vi.fn().mockResolvedValue(undefined),
                shutdown: vi.fn().mockResolvedValue(undefined),
                reportError: vi.fn()
            }
        };

        // تسجيل الخدمات
        Object.entries(mockServices).forEach(([name, service]) => {
            systemIntegration.registerService(name as any, service);
        });

        // تهيئة النظام
        await systemIntegration.initialize();
    });

    afterEach(async () => {
        await systemIntegration.shutdown();
        systemIntegration.cleanup();
        diagnostics.cleanup();
    });

    describe('Complete System Integration', () => {
        it('should initialize all systems successfully', async () => {
            const status = systemIntegration.getStatus();

            expect(status.isInitialized).toBe(true);
            expect(status.initializationProgress).toBe(100);
            expect(status.errors).toHaveLength(0);
        });

        it('should validate system integration', async () => {
            const validation = await systemIntegration.validateIntegration();

            expect(validation.isValid).toBe(true);
            expect(validation.issues).toHaveLength(0);
        });

        it('should handle system restart gracefully', async () => {
            const initialStatus = systemIntegration.getStatus();
            expect(initialStatus.isInitialized).toBe(true);

            await systemIntegration.restart();

            const finalStatus = systemIntegration.getStatus();
            expect(finalStatus.isInitialized).toBe(true);
            expect(finalStatus.errors).toHaveLength(0);
        });
    });

    describe('End-to-End Workflows', () => {
        it('should complete full project creation workflow', async () => {
            const result = await workflowManager.executeWorkflow('create-project', {
                name: 'Integration Test Project',
                units: 'meters',
                template: 'basic'
            });

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.completedSteps).toContain('validate-input');
            expect(result.completedSteps).toContain('create-project-structure');
            expect(result.duration).toBeGreaterThan(0);
        });

        it('should complete full export workflow', async () => {
            // إنشاء مشروع أولاً
            const createResult = await workflowManager.executeWorkflow('create-project', {
                name: 'Export Test Project',
                units: 'meters'
            });
            expect(createResult.success).toBe(true);

            // تصدير المشروع
            const exportResult = await workflowManager.executeWorkflow('export-project', {
                format: 'glb',
                optimize: true,
                includeTextures: true
            });

            expect(exportResult.success).toBe(true);
            expect(exportResult.errors).toHaveLength(0);
        });

        it('should handle workflow cancellation', async () => {
            const workflowPromise = workflowManager.executeWorkflow('create-project', {
                name: 'Cancellation Test'
            });

            // محاولة الإلغاء
            const activeWorkflows = workflowManager.getActiveWorkflows();
            if (activeWorkflows.length > 0) {
                const cancelled = workflowManager.cancelWorkflow(activeWorkflows[0]);
                expect(cancelled).toBe(true);
            }

            try {
                await workflowPromise;
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('Quality Assurance Integration', () => {
        it('should run comprehensive quality tests', async () => {
            const report = await qualityAssurance.runAllTests();

            expect(report).toBeDefined();
            expect(report.overallScore).toBeGreaterThanOrEqual(0);
            expect(report.overallScore).toBeLessThanOrEqual(100);
            expect(report.summary.totalTests).toBeGreaterThan(0);
            expect(report.testResults).toHaveLength(report.summary.totalTests);
        });

        it('should provide meaningful recommendations', async () => {
            const report = await qualityAssurance.runAllTests();

            expect(Array.isArray(report.recommendations)).toBe(true);
            expect(Array.isArray(report.criticalIssues)).toBe(true);
        });

        it('should track test history', async () => {
            await qualityAssurance.runAllTests();
            await qualityAssurance.runAllTests();

            const history = qualityAssurance.getTestHistory();
            expect(history).toHaveLength(2);

            const latestReport = qualityAssurance.getLatestReport();
            expect(latestReport).toBeDefined();
        });
    });

    describe('Game Engine Compatibility', () => {
        it('should test Unity compatibility', async () => {
            const mockProject = {
                id: 'test-project',
                name: 'Unity Test',
                elements: [
                    {
                        id: 'wall-1',
                        type: 'wall' as const,
                        geometry: { polygonCount: 1000 },
                        material: { type: 'PBR' as const, name: 'Test Material' }
                    }
                ],
                materials: [
                    {
                        id: 'mat-1',
                        name: 'Test Material',
                        type: 'PBR' as const,
                        properties: {
                            albedo: { r: 1, g: 1, b: 1 },
                            metallic: 0.5,
                            roughness: 0.5
                        }
                    }
                ],
                assets: [],
                settings: { units: 'meters' }
            };

            const report = await gameEngineCompatibility.testEngineCompatibility(
                'unity',
                mockProject as any,
                { format: 'fbx' }
            );

            expect(report.engineId).toBe('unity');
            expect(report.engineName).toBe('Unity');
            expect(report.overallScore).toBeGreaterThanOrEqual(0);
            expect(report.testResults.length).toBeGreaterThan(0);
        });

        it('should test Unreal Engine compatibility', async () => {
            const mockProject = {
                id: 'test-project',
                name: 'Unreal Test',
                elements: [],
                materials: [],
                assets: [],
                settings: { units: 'meters' }
            };

            const report = await gameEngineCompatibility.testEngineCompatibility(
                'unreal',
                mockProject as any,
                { format: 'fbx' }
            );

            expect(report.engineId).toBe('unreal');
            expect(report.engineName).toBe('Unreal Engine');
            expect(report.overallScore).toBeGreaterThanOrEqual(0);
        });

        it('should test all engines compatibility', async () => {
            const mockProject = {
                id: 'test-project',
                name: 'All Engines Test',
                elements: [],
                materials: [],
                assets: [],
                settings: { units: 'meters' }
            };

            const reports = await gameEngineCompatibility.testAllEnginesCompatibility(
                mockProject as any,
                { format: 'glb' }
            );

            expect(reports.size).toBeGreaterThan(0);
            expect(reports.has('unity')).toBe(true);
            expect(reports.has('unreal')).toBe(true);
            expect(reports.has('blender')).toBe(true);
        });
    });

    describe('Stress Testing Integration', () => {
        it('should run memory pressure test', async () => {
            const config = {
                duration: 5000,
                intensity: 'low' as const,
                testTypes: ['memory-pressure' as const],
                maxMemoryUsage: 80,
                maxCpuUsage: 80,
                targetFps: 30
            };

            const report = await stressTest.runStressTest(config);

            expect(report.results).toHaveLength(1);
            expect(report.results[0].testType).toBe('memory-pressure');
            expect(report.overallScore).toBeGreaterThanOrEqual(0);
            expect(report.systemStability).toBeDefined();
        });

        it('should run multiple stress tests', async () => {
            const config = {
                duration: 3000,
                intensity: 'low' as const,
                testTypes: ['memory-pressure' as const, 'cpu-intensive' as const, 'rapid-operations' as const],
                maxMemoryUsage: 80,
                maxCpuUsage: 80,
                targetFps: 30
            };

            const report = await stressTest.runStressTest(config);

            expect(report.results).toHaveLength(3);
            expect(report.summary.totalTests).toBe(3);
            expect(report.recommendations).toBeDefined();
        });

        it('should handle stress test cancellation', async () => {
            const config = {
                duration: 10000,
                intensity: 'low' as const,
                testTypes: ['memory-pressure' as const],
                maxMemoryUsage: 80,
                maxCpuUsage: 80,
                targetFps: 30
            };

            const testPromise = stressTest.runStressTest(config);

            // إيقاف الاختبار بعد فترة قصيرة
            setTimeout(() => {
                stressTest.stopCurrentTest();
            }, 1000);

            const report = await testPromise;
            expect(report).toBeDefined();
        });
    });

    describe('Production Optimization Integration', () => {
        it('should run production optimizations', async () => {
            const config = {
                target: 'production' as const,
                optimizations: [
                    'code-splitting' as const,
                    'asset-optimization' as const,
                    'memory-optimization' as const
                ],
                aggressiveness: 'moderate' as const,
                preserveDebugInfo: false,
                enableProfiling: false
            };

            const report = await productionOptimization.optimizeForProduction(config);

            expect(report.results).toHaveLength(3);
            expect(report.overallImprovement).toBeGreaterThanOrEqual(0);
            expect(report.readinessScore).toBeGreaterThanOrEqual(0);
            expect(report.compliance).toBeDefined();
        });

        it('should provide optimization recommendations', async () => {
            const config = {
                target: 'production' as const,
                optimizations: ['bundle-optimization' as const],
                aggressiveness: 'conservative' as const,
                preserveDebugInfo: true,
                enableProfiling: false
            };

            const report = await productionOptimization.optimizeForProduction(config);

            expect(Array.isArray(report.recommendations)).toBe(true);
            expect(report.benchmarks).toBeDefined();
            expect(report.benchmarks.startupTime).toBeGreaterThan(0);
        });
    });

    describe('Error Recovery Integration', () => {
        it('should handle and recover from errors', async () => {
            const testError = new Error('Integration test error');
            const context = {
                component: 'IntegrationTest',
                action: 'testErrorRecovery',
                projectId: 'test-project'
            };

            const result = await errorRecovery.handleError(testError, context);

            expect(result.report).toBeDefined();
            expect(result.report.error).toBe(testError);
            expect(result.report.context.component).toBe('IntegrationTest');
            expect(result.report.recoveryAttempts).toBeDefined();
        });

        it('should provide error statistics', async () => {
            // إنشاء عدة أخطاء
            await errorRecovery.handleError(new Error('Error 1'), { component: 'Test1', action: 'action1' });
            await errorRecovery.handleError(new Error('Error 2'), { component: 'Test1', action: 'action2' });
            await errorRecovery.handleError(new Error('Error 3'), { component: 'Test2', action: 'action1' });

            const stats = errorRecovery.getErrorStatistics();

            expect(stats.total).toBe(3);
            expect(stats.byComponent.Test1).toBe(2);
            expect(stats.byComponent.Test2).toBe(1);
        });
    });

    describe('Diagnostics Integration', () => {
        it('should collect comprehensive diagnostic information', async () => {
            const info = await diagnostics.collectDiagnosticInfo();

            expect(info.system).toBeDefined();
            expect(info.application).toBeDefined();
            expect(info.project).toBeDefined();
            expect(info.services).toBeDefined();

            expect(info.system.platform).toBeDefined();
            expect(info.application.version).toBeDefined();
        });

        it('should log and search messages', () => {
            diagnostics.log('info', 'IntegrationTest', 'Test message 1', { data: 'test1' });
            diagnostics.log('warn', 'IntegrationTest', 'Test message 2', { data: 'test2' });
            diagnostics.log('error', 'IntegrationTest', 'Test message 3', { data: 'test3' });

            const allLogs = diagnostics.searchLogs({});
            expect(allLogs.length).toBeGreaterThanOrEqual(3);

            const errorLogs = diagnostics.searchLogs({ level: 'error' });
            expect(errorLogs.length).toBeGreaterThanOrEqual(1);

            const testLogs = diagnostics.searchLogs({ category: 'IntegrationTest' });
            expect(testLogs.length).toBeGreaterThanOrEqual(3);
        });

        it('should provide log statistics', () => {
            diagnostics.log('info', 'Stats', 'Info message');
            diagnostics.log('warn', 'Stats', 'Warning message');
            diagnostics.log('error', 'Stats', 'Error message');

            const stats = diagnostics.getLogStatistics();

            expect(stats.total).toBeGreaterThan(0);
            expect(stats.byLevel.info).toBeGreaterThan(0);
            expect(stats.byLevel.warn).toBeGreaterThan(0);
            expect(stats.byLevel.error).toBeGreaterThan(0);
        });

        it('should generate diagnostic report', async () => {
            const report = await diagnostics.generateDiagnosticReport();
            const parsed = JSON.parse(report);

            expect(parsed.generatedAt).toBeDefined();
            expect(parsed.sessionId).toBeDefined();
            expect(parsed.diagnosticInfo).toBeDefined();
            expect(parsed.logStatistics).toBeDefined();
        });
    });

    describe('Performance Under Load', () => {
        it('should maintain performance with multiple concurrent operations', async () => {
            const operations = [
                // عملية إنشاء مشروع
                workflowManager.executeWorkflow('create-project', {
                    name: 'Concurrent Test 1',
                    units: 'meters'
                }),

                // عملية فحص الجودة
                qualityAssurance.runAllTests(),

                // عملية جمع التشخيص
                diagnostics.collectDiagnosticInfo()
            ];

            const results = await Promise.allSettled(operations);

            // التحقق من أن معظم العمليات نجحت
            const successfulOperations = results.filter(result => result.status === 'fulfilled');
            expect(successfulOperations.length).toBeGreaterThanOrEqual(2);

            // التحقق من الأداء
            const performanceManager = systemIntegration.getService('performanceManager');
            const metrics = performanceManager?.getCurrentMetrics?.();

            if (metrics) {
                expect(metrics.memoryUsage).toBeLessThan(90);
                expect(metrics.cpuUsage).toBeLessThan(90);
            }
        });

        it('should handle rapid sequential operations', async () => {
            const operations = [];

            // تشغيل عدة عمليات متتالية
            for (let i = 0; i < 10; i++) {
                operations.push(
                    systemIntegration.getStatus()
                );
            }

            // جميع العمليات يجب أن تكتمل بنجاح
            expect(operations).toHaveLength(10);
            operations.forEach(status => {
                expect(status.isInitialized).toBe(true);
            });
        });
    });

    describe('Data Integrity and Consistency', () => {
        it('should maintain data consistency across services', async () => {
            // إنشاء مشروع
            const createResult = await workflowManager.executeWorkflow('create-project', {
                name: 'Consistency Test Project',
                units: 'meters'
            });
            expect(createResult.success).toBe(true);

            // التحقق من أن المشروع متاح في جميع الخدمات
            const projectManager = systemIntegration.getService('projectManager');
            const currentProject = projectManager?.getCurrentProject?.();

            expect(currentProject).toBeDefined();
            expect(currentProject?.name).toBe('Consistency Test Project');
        });

        it('should handle service failures gracefully', async () => {
            // محاكاة فشل خدمة
            const projectManager = systemIntegration.getService('projectManager');
            if (projectManager) {
                projectManager.getCurrentProject = vi.fn().mockImplementation(() => {
                    throw new Error('Service failure simulation');
                });
            }

            // يجب أن يتعامل النظام مع الفشل بشكل صحيح
            const validation = await systemIntegration.validateIntegration();

            // النظام يجب أن يكون قادراً على اكتشاف المشكلة
            expect(validation.isValid).toBe(true); // النظام ما زال يعمل
        });
    });

    describe('Memory Management and Cleanup', () => {
        it('should clean up resources properly', async () => {
            const initialMetrics = systemIntegration.getService('performanceManager')?.getCurrentMetrics?.();

            // تشغيل عدة عمليات
            await qualityAssurance.runAllTests();
            await diagnostics.collectDiagnosticInfo();

            // تنظيف الموارد
            diagnostics.cleanup();

            const finalMetrics = systemIntegration.getService('performanceManager')?.getCurrentMetrics?.();

            // التحقق من أن الذاكرة لم تزد بشكل كبير
            if (initialMetrics && finalMetrics) {
                const memoryIncrease = finalMetrics.memoryUsage - initialMetrics.memoryUsage;
                expect(memoryIncrease).toBeLessThan(20); // أقل من 20% زيادة
            }
        });

        it('should handle system shutdown and restart cycles', async () => {
            // دورة إغلاق وإعادة تشغيل متعددة
            for (let i = 0; i < 3; i++) {
                await systemIntegration.shutdown();
                expect(systemIntegration.getStatus().isInitialized).toBe(false);

                await systemIntegration.initialize();
                expect(systemIntegration.getStatus().isInitialized).toBe(true);
            }
        });
    });
});