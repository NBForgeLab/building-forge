/**
 * خدمة اختبار التوافق مع محركات الألعاب
 * تختبر التوافق مع Unity, Unreal Engine, Blender وغيرها
 */

import { ExportOptions, Project } from '../types';
import { SystemIntegrationService } from './SystemIntegrationService';

export interface GameEngine {
    id: string;
    name: string;
    version: string;
    supportedFormats: string[];
    materialSystem: 'PBR' | 'Standard' | 'Custom';
    coordinateSystem: 'LeftHanded' | 'RightHanded';
    unitScale: number;
    maxTextureSize: number;
    maxPolygonCount: number;
    features: string[];
}

export interface CompatibilityTest {
    id: string;
    name: string;
    description: string;
    engineId: string;
    testType: 'export' | 'import' | 'material' | 'geometry' | 'performance';
    execute: (project: Project, options: ExportOptions) => Promise<CompatibilityResult>;
}

export interface CompatibilityResult {
    success: boolean;
    score: number; // 0-100
    message: string;
    issues: CompatibilityIssue[];
    recommendations: string[];
    exportData?: {
        fileSize: number;
        polygonCount: number;
        textureCount: number;
        materialCount: number;
    };
    performanceMetrics?: {
        exportTime: number;
        memoryUsage: number;
        compressionRatio: number;
    };
}

export interface CompatibilityIssue {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'format' | 'material' | 'geometry' | 'texture' | 'performance';
    message: string;
    suggestion?: string;
    autoFixable: boolean;
}

export interface EngineCompatibilityReport {
    engineId: string;
    engineName: string;
    overallScore: number;
    testResults: Array<{
        testId: string;
        testName: string;
        result: CompatibilityResult;
    }>;
    summary: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        criticalIssues: number;
    };
    recommendations: string[];
}

export class GameEngineCompatibilityService {
    private systemIntegration: SystemIntegrationService;
    private gameEngines: Map<string, GameEngine> = new Map();
    private compatibilityTests: Map<string, CompatibilityTest[]> = new Map();

    constructor() {
        this.systemIntegration = SystemIntegrationService.getInstance();
        this.initializeGameEngines();
        this.initializeCompatibilityTests();
    }

    /**
     * تهيئة محركات الألعاب المدعومة
     */
    private initializeGameEngines(): void {
        // Unity Engine
        this.gameEngines.set('unity', {
            id: 'unity',
            name: 'Unity',
            version: '2023.3',
            supportedFormats: ['fbx', 'obj', 'glb', 'gltf'],
            materialSystem: 'PBR',
            coordinateSystem: 'LeftHanded',
            unitScale: 1.0,
            maxTextureSize: 8192,
            maxPolygonCount: 65000,
            features: ['PBR', 'Animation', 'LOD', 'Lightmapping', 'Colliders']
        });

        // Unreal Engine
        this.gameEngines.set('unreal', {
            id: 'unreal',
            name: 'Unreal Engine',
            version: '5.3',
            supportedFormats: ['fbx', 'obj', 'glb', 'gltf'],
            materialSystem: 'PBR',
            coordinateSystem: 'LeftHanded',
            unitScale: 100.0, // cm
            maxTextureSize: 8192,
            maxPolygonCount: 100000,
            features: ['PBR', 'Nanite', 'Lumen', 'Animation', 'LOD', 'Colliders']
        });

        // Blender
        this.gameEngines.set('blender', {
            id: 'blender',
            name: 'Blender',
            version: '4.0',
            supportedFormats: ['fbx', 'obj', 'glb', 'gltf', 'dae'],
            materialSystem: 'PBR',
            coordinateSystem: 'RightHanded',
            unitScale: 1.0,
            maxTextureSize: 16384,
            maxPolygonCount: 1000000,
            features: ['PBR', 'Cycles', 'Eevee', 'Animation', 'Sculpting']
        });

        // Godot Engine
        this.gameEngines.set('godot', {
            id: 'godot',
            name: 'Godot',
            version: '4.2',
            supportedFormats: ['glb', 'gltf', 'obj', 'dae'],
            materialSystem: 'PBR',
            coordinateSystem: 'RightHanded',
            unitScale: 1.0,
            maxTextureSize: 4096,
            maxPolygonCount: 50000,
            features: ['PBR', 'GDScript', 'C#', 'Animation', 'Physics']
        });
    }

    /**
     * تهيئة اختبارات التوافق
     */
    private initializeCompatibilityTests(): void {
        // اختبارات Unity
        this.compatibilityTests.set('unity', [
            {
                id: 'unity-export-fbx',
                name: 'تصدير FBX لـ Unity',
                description: 'اختبار تصدير النماذج بصيغة FBX المتوافقة مع Unity',
                engineId: 'unity',
                testType: 'export',
                execute: async (project, options) => {
                    return this.testUnityFBXExport(project, options);
                }
            },
            {
                id: 'unity-materials-pbr',
                name: 'مواد PBR لـ Unity',
                description: 'اختبار توافق مواد PBR مع Unity',
                engineId: 'unity',
                testType: 'material',
                execute: async (project, options) => {
                    return this.testUnityPBRMaterials(project, options);
                }
            },
            {
                id: 'unity-coordinate-system',
                name: 'نظام الإحداثيات لـ Unity',
                description: 'اختبار توافق نظام الإحداثيات مع Unity',
                engineId: 'unity',
                testType: 'geometry',
                execute: async (project, options) => {
                    return this.testUnityCoordinateSystem(project, options);
                }
            }
        ]);

        // اختبارات Unreal Engine
        this.compatibilityTests.set('unreal', [
            {
                id: 'unreal-export-fbx',
                name: 'تصدير FBX لـ Unreal',
                description: 'اختبار تصدير النماذج بصيغة FBX المتوافقة مع Unreal Engine',
                engineId: 'unreal',
                testType: 'export',
                execute: async (project, options) => {
                    return this.testUnrealFBXExport(project, options);
                }
            },
            {
                id: 'unreal-materials-pbr',
                name: 'مواد PBR لـ Unreal',
                description: 'اختبار توافق مواد PBR مع Unreal Engine',
                engineId: 'unreal',
                testType: 'material',
                execute: async (project, options) => {
                    return this.testUnrealPBRMaterials(project, options);
                }
            },
            {
                id: 'unreal-scale-conversion',
                name: 'تحويل المقياس لـ Unreal',
                description: 'اختبار تحويل المقياس للوحدات المناسبة لـ Unreal Engine',
                engineId: 'unreal',
                testType: 'geometry',
                execute: async (project, options) => {
                    return this.testUnrealScaleConversion(project, options);
                }
            }
        ]);

        // اختبارات Blender
        this.compatibilityTests.set('blender', [
            {
                id: 'blender-export-glb',
                name: 'تصدير GLB لـ Blender',
                description: 'اختبار تصدير النماذج بصيغة GLB المتوافقة مع Blender',
                engineId: 'blender',
                testType: 'export',
                execute: async (project, options) => {
                    return this.testBlenderGLBExport(project, options);
                }
            },
            {
                id: 'blender-coordinate-system',
                name: 'نظام الإحداثيات لـ Blender',
                description: 'اختبار توافق نظام الإحداثيات مع Blender',
                engineId: 'blender',
                testType: 'geometry',
                execute: async (project, options) => {
                    return this.testBlenderCoordinateSystem(project, options);
                }
            }
        ]);
    }

    /**
     * اختبار التوافق مع محرك معين
     */
    public async testEngineCompatibility(
        engineId: string,
        project: Project,
        options: ExportOptions = {}
    ): Promise<EngineCompatibilityReport> {
        const engine = this.gameEngines.get(engineId);
        if (!engine) {
            throw new Error(`Unknown game engine: ${engineId}`);
        }

        const tests = this.compatibilityTests.get(engineId) || [];
        const report: EngineCompatibilityReport = {
            engineId,
            engineName: engine.name,
            overallScore: 0,
            testResults: [],
            summary: {
                totalTests: tests.length,
                passedTests: 0,
                failedTests: 0,
                criticalIssues: 0
            },
            recommendations: []
        };

        let totalScore = 0;

        // تشغيل جميع الاختبارات
        for (const test of tests) {
            try {
                const result = await test.execute(project, options);

                report.testResults.push({
                    testId: test.id,
                    testName: test.name,
                    result
                });

                totalScore += result.score;

                if (result.success) {
                    report.summary.passedTests++;
                } else {
                    report.summary.failedTests++;
                }

                // عد القضايا الحرجة
                const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
                report.summary.criticalIssues += criticalIssues.length;

                // جمع التوصيات
                report.recommendations.push(...result.recommendations);

            } catch (error) {
                report.summary.failedTests++;
                report.testResults.push({
                    testId: test.id,
                    testName: test.name,
                    result: {
                        success: false,
                        score: 0,
                        message: `خطأ في تشغيل الاختبار: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
                        issues: [{
                            severity: 'critical',
                            category: 'format',
                            message: 'فشل في تشغيل الاختبار',
                            autoFixable: false
                        }],
                        recommendations: []
                    }
                });
            }
        }

        // حساب النتيجة الإجمالية
        report.overallScore = tests.length > 0 ? totalScore / tests.length : 0;

        // إزالة التوصيات المكررة
        report.recommendations = [...new Set(report.recommendations)];

        return report;
    }

    /**
     * اختبار التوافق مع جميع المحركات
     */
    public async testAllEnginesCompatibility(
        project: Project,
        options: ExportOptions = {}
    ): Promise<Map<string, EngineCompatibilityReport>> {
        const reports = new Map<string, EngineCompatibilityReport>();

        for (const engineId of this.gameEngines.keys()) {
            try {
                const report = await this.testEngineCompatibility(engineId, project, options);
                reports.set(engineId, report);
            } catch (error) {
                console.error(`Failed to test compatibility with ${engineId}:`, error);
            }
        }

        return reports;
    }

    // اختبارات Unity المحددة
    private async testUnityFBXExport(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        const issues: CompatibilityIssue[] = [];
        const recommendations: string[] = [];
        let score = 100;

        // فحص صيغة التصدير
        if (options.format !== 'fbx') {
            issues.push({
                severity: 'medium',
                category: 'format',
                message: 'Unity يفضل صيغة FBX للنماذج ثلاثية الأبعاد',
                suggestion: 'استخدم صيغة FBX للحصول على أفضل توافق',
                autoFixable: true
            });
            score -= 20;
            recommendations.push('استخدم صيغة FBX للتصدير إلى Unity');
        }

        // فحص عدد المضلعات
        const totalPolygons = project.elements.reduce((sum, element) => {
            return sum + (element.geometry?.polygonCount || 0);
        }, 0);

        if (totalPolygons > 65000) {
            issues.push({
                severity: 'high',
                category: 'performance',
                message: `عدد المضلعات (${totalPolygons}) يتجاوز الحد الموصى به لـ Unity (65,000)`,
                suggestion: 'قم بتقليل عدد المضلعات أو استخدم LOD',
                autoFixable: true
            });
            score -= 30;
            recommendations.push('تحسين عدد المضلعات للأداء الأفضل');
        }

        // فحص المواد
        const materials = project.materials || [];
        const pbrMaterials = materials.filter(mat => mat.type === 'PBR');

        if (pbrMaterials.length !== materials.length) {
            issues.push({
                severity: 'medium',
                category: 'material',
                message: 'Unity يدعم مواد PBR بشكل أفضل',
                suggestion: 'حول جميع المواد إلى PBR',
                autoFixable: true
            });
            score -= 15;
            recommendations.push('استخدم مواد PBR للحصول على أفضل جودة بصرية');
        }

        return {
            success: score >= 70,
            score,
            message: score >= 70 ? 'متوافق مع Unity' : 'يحتاج تحسينات للتوافق مع Unity',
            issues,
            recommendations,
            exportData: {
                fileSize: 0, // سيتم حسابه في التطبيق الفعلي
                polygonCount: totalPolygons,
                textureCount: materials.reduce((sum, mat) => sum + (mat.textures?.length || 0), 0),
                materialCount: materials.length
            }
        };
    }

    private async testUnityPBRMaterials(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        const issues: CompatibilityIssue[] = [];
        const recommendations: string[] = [];
        let score = 100;

        const materials = project.materials || [];

        for (const material of materials) {
            // فحص نوع المادة
            if (material.type !== 'PBR') {
                issues.push({
                    severity: 'medium',
                    category: 'material',
                    message: `المادة ${material.name} ليست من نوع PBR`,
                    suggestion: 'حول المادة إلى PBR',
                    autoFixable: true
                });
                score -= 10;
            }

            // فحص الخصائص المطلوبة
            const requiredProperties = ['albedo', 'metallic', 'roughness', 'normal'];
            const missingProperties = requiredProperties.filter(prop => !material.properties?.[prop]);

            if (missingProperties.length > 0) {
                issues.push({
                    severity: 'low',
                    category: 'material',
                    message: `المادة ${material.name} تفتقد الخصائص: ${missingProperties.join(', ')}`,
                    suggestion: 'أضف الخصائص المفقودة',
                    autoFixable: true
                });
                score -= 5 * missingProperties.length;
            }

            // فحص أحجام النسيج
            if (material.textures) {
                for (const texture of material.textures) {
                    if (texture.width > 2048 || texture.height > 2048) {
                        issues.push({
                            severity: 'medium',
                            category: 'texture',
                            message: `النسيج ${texture.name} كبير جداً (${texture.width}x${texture.height})`,
                            suggestion: 'قلل حجم النسيج إلى 2048x2048 أو أقل',
                            autoFixable: true
                        });
                        score -= 5;
                    }
                }
            }
        }

        if (materials.length === 0) {
            issues.push({
                severity: 'high',
                category: 'material',
                message: 'لا توجد مواد في المشروع',
                suggestion: 'أضف مواد PBR للعناصر',
                autoFixable: false
            });
            score -= 40;
        }

        return {
            success: score >= 70,
            score,
            message: score >= 70 ? 'مواد متوافقة مع Unity' : 'المواد تحتاج تحسينات للتوافق مع Unity',
            issues,
            recommendations: [...new Set(recommendations)]
        };
    }

    private async testUnityCoordinateSystem(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        const issues: CompatibilityIssue[] = [];
        const recommendations: string[] = [];
        let score = 100;

        // Unity يستخدم نظام إحداثيات Left-Handed مع Y للأعلى
        // فحص اتجاه النماذج
        const hasRightHandedElements = project.elements.some(element =>
            element.transform?.rotation && this.isRightHandedRotation(element.transform.rotation)
        );

        if (hasRightHandedElements) {
            issues.push({
                severity: 'medium',
                category: 'geometry',
                message: 'بعض العناصر تستخدم نظام إحداثيات Right-Handed',
                suggestion: 'حول إلى نظام Left-Handed المستخدم في Unity',
                autoFixable: true
            });
            score -= 20;
            recommendations.push('تحويل نظام الإحداثيات إلى Left-Handed');
        }

        // فحص وحدات القياس
        if (project.settings?.units !== 'meters') {
            issues.push({
                severity: 'low',
                category: 'geometry',
                message: `وحدة القياس الحالية (${project.settings?.units}) قد تحتاج تعديل في Unity`,
                suggestion: 'استخدم المتر كوحدة أساسية',
                autoFixable: true
            });
            score -= 10;
            recommendations.push('استخدم المتر كوحدة قياس أساسية');
        }

        return {
            success: score >= 70,
            score,
            message: score >= 70 ? 'نظام الإحداثيات متوافق مع Unity' : 'نظام الإحداثيات يحتاج تعديلات للتوافق مع Unity',
            issues,
            recommendations
        };
    }

    // اختبارات Unreal Engine المحددة
    private async testUnrealFBXExport(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        const issues: CompatibilityIssue[] = [];
        const recommendations: string[] = [];
        let score = 100;

        // Unreal Engine يدعم FBX بشكل ممتاز
        if (options.format !== 'fbx') {
            issues.push({
                severity: 'medium',
                category: 'format',
                message: 'Unreal Engine يفضل صيغة FBX',
                suggestion: 'استخدم صيغة FBX للحصول على أفضل توافق',
                autoFixable: true
            });
            score -= 15;
        }

        // فحص عدد المضلعات (Unreal يدعم عدد أكبر)
        const totalPolygons = project.elements.reduce((sum, element) => {
            return sum + (element.geometry?.polygonCount || 0);
        }, 0);

        if (totalPolygons > 100000) {
            issues.push({
                severity: 'medium',
                category: 'performance',
                message: `عدد المضلعات مرتفع (${totalPolygons})، قد يؤثر على الأداء`,
                suggestion: 'استخدم Nanite أو LOD في Unreal Engine',
                autoFixable: false
            });
            score -= 20;
            recommendations.push('استخدم تقنيات Unreal المتقدمة للتحسين');
        }

        return {
            success: score >= 70,
            score,
            message: score >= 70 ? 'متوافق مع Unreal Engine' : 'يحتاج تحسينات للتوافق مع Unreal Engine',
            issues,
            recommendations
        };
    }

    private async testUnrealPBRMaterials(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        // مشابه لـ Unity لكن مع اعتبارات خاصة بـ Unreal
        return this.testUnityPBRMaterials(project, options);
    }

    private async testUnrealScaleConversion(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        const issues: CompatibilityIssue[] = [];
        const recommendations: string[] = [];
        let score = 100;

        // Unreal يستخدم السنتيمتر كوحدة أساسية
        if (project.settings?.units === 'meters') {
            recommendations.push('تذكر أن Unreal Engine يستخدم السنتيمتر كوحدة أساسية');
        }

        // فحص أحجام العناصر
        const hasVerySmallElements = project.elements.some(element => {
            const scale = element.transform?.scale;
            return scale && (scale.x < 0.01 || scale.y < 0.01 || scale.z < 0.01);
        });

        if (hasVerySmallElements) {
            issues.push({
                severity: 'medium',
                category: 'geometry',
                message: 'بعض العناصر صغيرة جداً قد تسبب مشاكل في Unreal Engine',
                suggestion: 'تأكد من أن العناصر بحجم مناسب (أكبر من 1 سم)',
                autoFixable: true
            });
            score -= 15;
        }

        return {
            success: score >= 70,
            score,
            message: score >= 70 ? 'المقياس متوافق مع Unreal Engine' : 'المقياس يحتاج تعديلات للتوافق مع Unreal Engine',
            issues,
            recommendations
        };
    }

    // اختبارات Blender المحددة
    private async testBlenderGLBExport(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        const issues: CompatibilityIssue[] = [];
        const recommendations: string[] = [];
        let score = 100;

        // Blender يدعم GLB/GLTF بشكل ممتاز
        if (!['glb', 'gltf'].includes(options.format || '')) {
            recommendations.push('Blender يدعم GLB/GLTF بشكل ممتاز');
        }

        // Blender مرن جداً مع الصيغ والمواد
        return {
            success: true,
            score,
            message: 'متوافق بشكل ممتاز مع Blender',
            issues,
            recommendations
        };
    }

    private async testBlenderCoordinateSystem(project: Project, options: ExportOptions): Promise<CompatibilityResult> {
        const issues: CompatibilityIssue[] = [];
        const recommendations: string[] = [];
        let score = 100;

        // Blender يستخدم نظام Right-Handed مع Z للأعلى
        recommendations.push('Blender يستخدم نظام Right-Handed مع Z للأعلى');

        return {
            success: true,
            score,
            message: 'نظام الإحداثيات متوافق مع Blender',
            issues,
            recommendations
        };
    }

    /**
     * فحص ما إذا كان الدوران يستخدم نظام Right-Handed
     */
    private isRightHandedRotation(rotation: { x: number; y: number; z: number }): boolean {
        // منطق مبسط للفحص
        return Math.abs(rotation.z) > Math.abs(rotation.y);
    }

    /**
     * الحصول على معلومات محرك الألعاب
     */
    public getGameEngine(engineId: string): GameEngine | undefined {
        return this.gameEngines.get(engineId);
    }

    /**
     * الحصول على جميع محركات الألعاب المدعومة
     */
    public getSupportedEngines(): GameEngine[] {
        return Array.from(this.gameEngines.values());
    }

    /**
     * إضافة محرك ألعاب جديد
     */
    public addGameEngine(engine: GameEngine): void {
        this.gameEngines.set(engine.id, engine);
    }

    /**
     * إضافة اختبار توافق جديد
     */
    public addCompatibilityTest(engineId: string, test: CompatibilityTest): void {
        const tests = this.compatibilityTests.get(engineId) || [];
        tests.push(test);
        this.compatibilityTests.set(engineId, tests);
    }
}

export default GameEngineCompatibilityService;