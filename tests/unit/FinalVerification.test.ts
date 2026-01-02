import { beforeEach, describe, expect, it } from 'vitest';
import { FinalVerificationService } from '../../src/services/FinalVerificationService';

describe('FinalVerificationService', () => {
    let service: FinalVerificationService;

    beforeEach(() => {
        service = new FinalVerificationService();
    });

    describe('runCompleteVerification', () => {
        it('should run all verification categories', async () => {
            const report = await service.runCompleteVerification();

            expect(report).toBeDefined();
            expect(report.results).toHaveLength(8); // 8 verification categories
            expect(report.overallScore).toBeGreaterThanOrEqual(0);
            expect(report.overallScore).toBeLessThanOrEqual(100);
            expect(report.timestamp).toBeInstanceOf(Date);
        });

        it('should include all required verification categories', async () => {
            const report = await service.runCompleteVerification();

            const expectedCategories = [
                'Test Suite Verification',
                'Requirements Compliance',
                'Performance and Stability',
                'Code Quality',
                'Documentation Completeness',
                'System Integration',
                'Game Engine Compatibility',
                'Production Readiness'
            ];

            const actualCategories = report.results.map(r => r.category);
            expectedCategories.forEach(category => {
                expect(actualCategories).toContain(category);
            });
        });

        it('should calculate correct overall score', async () => {
            const report = await service.runCompleteVerification();

            const averageScore = report.results.reduce((sum, result) => sum + result.score, 0) / report.results.length;
            expect(report.overallScore).toBeCloseTo(averageScore, 1);
        });

        it('should determine correct readiness level', async () => {
            const report = await service.runCompleteVerification();

            const validLevels = ['production', 'beta', 'alpha', 'development'];
            expect(validLevels).toContain(report.readinessLevel);

            if (report.overallScore >= 90 && report.passed) {
                expect(report.readinessLevel).toBe('production');
            } else if (report.overallScore >= 75) {
                expect(report.readinessLevel).toBe('beta');
            } else if (report.overallScore >= 60) {
                expect(report.readinessLevel).toBe('alpha');
            } else {
                expect(report.readinessLevel).toBe('development');
            }
        });

        it('should provide test summary statistics', async () => {
            const report = await service.runCompleteVerification();

            expect(report.summary.totalTests).toBeGreaterThan(0);
            expect(report.summary.passedTests + report.summary.failedTests + report.summary.warningTests)
                .toBe(report.summary.totalTests);
        });

        it('should include recommendations when needed', async () => {
            const report = await service.runCompleteVerification();

            // If any category failed, there should be recommendations
            const failedCategories = report.results.filter(r => !r.passed);
            if (failedCategories.length > 0) {
                expect(report.recommendations.length).toBeGreaterThan(0);
            }
        });
    });

    describe('verification categories', () => {
        it('should verify test suite correctly', async () => {
            const report = await service.runCompleteVerification();
            const testSuiteResult = report.results.find(r => r.category === 'Test Suite Verification');

            expect(testSuiteResult).toBeDefined();
            expect(testSuiteResult!.score).toBeGreaterThanOrEqual(0);
            expect(testSuiteResult!.score).toBeLessThanOrEqual(100);
            expect(testSuiteResult!.details.length).toBeGreaterThan(0);
        });

        it('should verify requirements compliance', async () => {
            const report = await service.runCompleteVerification();
            const requirementsResult = report.results.find(r => r.category === 'Requirements Compliance');

            expect(requirementsResult).toBeDefined();
            expect(requirementsResult!.details.length).toBeGreaterThan(0);
        });

        it('should verify performance and stability', async () => {
            const report = await service.runCompleteVerification();
            const performanceResult = report.results.find(r => r.category === 'Performance and Stability');

            expect(performanceResult).toBeDefined();
            expect(performanceResult!.details.some(d => d.test === 'Memory Usage')).toBe(true);
            expect(performanceResult!.details.some(d => d.test === 'Rendering Performance')).toBe(true);
        });

        it('should verify code quality', async () => {
            const report = await service.runCompleteVerification();
            const qualityResult = report.results.find(r => r.category === 'Code Quality');

            expect(qualityResult).toBeDefined();
            expect(qualityResult!.details.some(d => d.test === 'TypeScript Compilation')).toBe(true);
            expect(qualityResult!.details.some(d => d.test === 'ESLint Checks')).toBe(true);
        });

        it('should verify documentation completeness', async () => {
            const report = await service.runCompleteVerification();
            const docsResult = report.results.find(r => r.category === 'Documentation Completeness');

            expect(docsResult).toBeDefined();
            expect(docsResult!.details.some(d => d.test === 'Project README')).toBe(true);
        });

        it('should verify system integration', async () => {
            const report = await service.runCompleteVerification();
            const integrationResult = report.results.find(r => r.category === 'System Integration');

            expect(integrationResult).toBeDefined();
            expect(integrationResult!.details.length).toBeGreaterThan(0);
        });

        it('should verify game engine compatibility', async () => {
            const report = await service.runCompleteVerification();
            const compatibilityResult = report.results.find(r => r.category === 'Game Engine Compatibility');

            expect(compatibilityResult).toBeDefined();
            expect(compatibilityResult!.details.length).toBeGreaterThan(0);
        });

        it('should verify production readiness', async () => {
            const report = await service.runCompleteVerification();
            const productionResult = report.results.find(r => r.category === 'Production Readiness');

            expect(productionResult).toBeDefined();
            expect(productionResult!.details.some(d => d.test === 'Production Build')).toBe(true);
        });
    });

    describe('report generation', () => {
        it('should generate valid completion report structure', async () => {
            const report = await service.runCompleteVerification();

            expect(report).toHaveProperty('overallScore');
            expect(report).toHaveProperty('passed');
            expect(report).toHaveProperty('results');
            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('recommendations');
            expect(report).toHaveProperty('readinessLevel');
            expect(report).toHaveProperty('timestamp');
        });

        it('should include detailed metrics in verification results', async () => {
            const report = await service.runCompleteVerification();

            // Check that some results include metrics
            const resultsWithMetrics = report.results.filter(r =>
                r.details.some(d => d.metrics && Object.keys(d.metrics).length > 0)
            );

            expect(resultsWithMetrics.length).toBeGreaterThan(0);
        });
    });
});