/**
 * مدير الأداء الرئيسي
 * يدير جميع خدمات تحسين الأداء ويوفر واجهة موحدة
 */

import * as THREE from 'three';
import { MeshOptimizer, OptimizationStats } from './MeshOptimizer';
import { OptimizationSettings, PerformanceMetrics, PerformanceOptimizer } from './PerformanceOptimizer';

export interface PerformanceManagerConfig {
    enableAutoOptimization: boolean;
    fpsThreshold: number;
    drawCallThreshold: number;
    vertexThreshold: number;
    optimizationInterval: number; // milliseconds
}

export interface PerformanceAlert {
    type: 'warning' | 'critical' | 'info';
    message: string;
    timestamp: number;
    suggestion?: string;
}

export class PerformanceManager {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private performanceOptimizer: PerformanceOptimizer;
    private meshOptimizer: MeshOptimizer;
    private config: PerformanceManagerConfig;
    private alerts: PerformanceAlert[] = [];
    private isOptimized: boolean = false;
    private optimizationTimer: NodeJS.Timeout | null = null;
    private callbacks: {
        onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
        onAlert?: (alert: PerformanceAlert) => void;
        onOptimizationComplete?: (stats: OptimizationStats) => void;
    } = {};

    constructor(
        scene: THREE.Scene,
        camera: THREE.Camera,
        renderer: THREE.WebGLRenderer,
        config?: Partial<PerformanceManagerConfig>
    ) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.config = {
            enableAutoOptimization: false,
            fpsThreshold: 30,
            drawCallThreshold: 100,
            vertexThreshold: 1000000,
            optimizationInterval: 5000,
            ...config
        };

        this.performanceOptimizer = new PerformanceOptimizer(scene, camera, renderer);
        this.meshOptimizer = new MeshOptimizer(scene);

        this.startMonitoring();
    }

    /**
     * بدء مراقبة الأداء
     */
    private startMonitoring(): void {
        const monitor = () => {
            // تطبيق تحسينات الأداء
            this.performanceOptimizer.optimize();

            // الحصول على المقاييس
            const metrics = this.performanceOptimizer.getMetrics();

            // فحص التحذيرات
            this.checkForAlerts(metrics);

            // تطبيق التحسين التلقائي إذا كان مفعلاً
            if (this.config.enableAutoOptimization && !this.isOptimized) {
                this.checkAutoOptimization(metrics);
            }

            // إشعار المستمعين
            if (this.callbacks.onMetricsUpdate) {
                this.callbacks.onMetricsUpdate(metrics);
            }

            requestAnimationFrame(monitor);
        };

        monitor();
    }

    /**
     * فحص التحذيرات بناءً على المقاييس
     */
    private checkForAlerts(metrics: PerformanceMetrics): void {
        const now = Date.now();

        // تحذير FPS منخفض
        if (metrics.fps < this.config.fpsThreshold) {
            this.addAlert({
                type: metrics.fps < 15 ? 'critical' : 'warning',
                message: `FPS منخفض: ${metrics.fps}`,
                timestamp: now,
                suggestion: 'فعل تحسينات الأداء أو قلل جودة العرض'
            });
        }

        // تحذير Draw Calls مرتفع
        if (metrics.drawCalls > this.config.drawCallThreshold) {
            this.addAlert({
                type: 'warning',
                message: `عدد Draw Calls مرتفع: ${metrics.drawCalls}`,
                timestamp: now,
                suggestion: 'استخدم Mesh Batching لتقليل Draw Calls'
            });
        }

        // تحذير Vertices مرتفع
        if (metrics.vertices > this.config.vertexThreshold) {
            this.addAlert({
                type: 'warning',
                message: `عدد Vertices مرتفع: ${metrics.vertices.toLocaleString()}`,
                timestamp: now,
                suggestion: 'فعل Distance Culling أو استخدم LOD'
            });
        }

        // تحذير وقت العرض مرتفع
        if (metrics.renderTime > 33.33) { // أكثر من 30 FPS
            this.addAlert({
                type: 'warning',
                message: `وقت العرض مرتفع: ${metrics.renderTime.toFixed(2)}ms`,
                timestamp: now,
                suggestion: 'قلل جودة الظلال أو فعل Occlusion Culling'
            });
        }
    }

    /**
     * إضافة تحذير جديد
     */
    private addAlert(alert: PerformanceAlert): void {
        // تجنب التحذيرات المكررة
        const recentAlerts = this.alerts.filter(a =>
            Date.now() - a.timestamp < 5000 && a.message === alert.message
        );

        if (recentAlerts.length === 0) {
            this.alerts.push(alert);

            // الاحتفاظ بآخر 50 تحذير فقط
            if (this.alerts.length > 50) {
                this.alerts = this.alerts.slice(-50);
            }

            if (this.callbacks.onAlert) {
                this.callbacks.onAlert(alert);
            }
        }
    }

    /**
     * فحص التحسين التلقائي
     */
    private checkAutoOptimization(metrics: PerformanceMetrics): void {
        const shouldOptimize =
            metrics.fps < this.config.fpsThreshold ||
            metrics.drawCalls > this.config.drawCallThreshold ||
            metrics.vertices > this.config.vertexThreshold;

        if (shouldOptimize) {
            this.addAlert({
                type: 'info',
                message: 'تطبيق التحسين التلقائي...',
                timestamp: Date.now()
            });

            this.optimizeScene();
        }
    }

    /**
     * تحسين المشهد
     */
    public optimizeScene(): OptimizationStats {
        if (this.isOptimized) {
            this.addAlert({
                type: 'warning',
                message: 'المشهد محسن بالفعل',
                timestamp: Date.now()
            });
            return this.meshOptimizer.getStats();
        }

        const stats = this.meshOptimizer.optimizeAll();
        this.isOptimized = true;

        this.addAlert({
            type: 'info',
            message: `تم التحسين: وفر ${stats.originalDrawCalls - stats.optimizedDrawCalls} Draw Calls`,
            timestamp: Date.now()
        });

        if (this.callbacks.onOptimizationComplete) {
            this.callbacks.onOptimizationComplete(stats);
        }

        return stats;
    }

    /**
     * استعادة المشهد الأصلي
     */
    public restoreOriginalScene(): void {
        if (!this.isOptimized) {
            this.addAlert({
                type: 'warning',
                message: 'المشهد غير محسن',
                timestamp: Date.now()
            });
            return;
        }

        this.meshOptimizer.restoreOriginalMeshes();
        this.performanceOptimizer.resetVisibility();
        this.isOptimized = false;

        this.addAlert({
            type: 'info',
            message: 'تم استعادة المشهد الأصلي',
            timestamp: Date.now()
        });
    }

    /**
     * تحديث إعدادات التحسين
     */
    public updateOptimizationSettings(settings: Partial<OptimizationSettings>): void {
        this.performanceOptimizer.updateSettings(settings);
    }

    /**
     * تحديث إعدادات المدير
     */
    public updateConfig(config: Partial<PerformanceManagerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * الحصول على المقاييس الحالية
     */
    public getCurrentMetrics(): PerformanceMetrics {
        return this.performanceOptimizer.getMetrics();
    }

    /**
     * الحصول على إحصائيات التحسين
     */
    public getOptimizationStats(): OptimizationStats {
        return this.meshOptimizer.getStats();
    }

    /**
     * الحصول على إعدادات التحسين
     */
    public getOptimizationSettings(): OptimizationSettings {
        return this.performanceOptimizer.getSettings();
    }

    /**
     * الحصول على التحذيرات الحديثة
     */
    public getRecentAlerts(minutes: number = 5): PerformanceAlert[] {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.alerts.filter(alert => alert.timestamp > cutoff);
    }

    /**
     * مسح التحذيرات
     */
    public clearAlerts(): void {
        this.alerts = [];
    }

    /**
     * تسجيل callback للأحداث
     */
    public on(event: 'metricsUpdate', callback: (metrics: PerformanceMetrics) => void): void;
    public on(event: 'alert', callback: (alert: PerformanceAlert) => void): void;
    public on(event: 'optimizationComplete', callback: (stats: OptimizationStats) => void): void;
    public on(event: string, callback: any): void {
        switch (event) {
            case 'metricsUpdate':
                this.callbacks.onMetricsUpdate = callback;
                break;
            case 'alert':
                this.callbacks.onAlert = callback;
                break;
            case 'optimizationComplete':
                this.callbacks.onOptimizationComplete = callback;
                break;
        }
    }

    /**
     * إلغاء تسجيل callback
     */
    public off(event: string): void {
        switch (event) {
            case 'metricsUpdate':
                this.callbacks.onMetricsUpdate = undefined;
                break;
            case 'alert':
                this.callbacks.onAlert = undefined;
                break;
            case 'optimizationComplete':
                this.callbacks.onOptimizationComplete = undefined;
                break;
        }
    }

    /**
     * إنشاء تقرير أداء مفصل
     */
    public generatePerformanceReport(): {
        metrics: PerformanceMetrics;
        optimizationStats: OptimizationStats;
        settings: OptimizationSettings;
        config: PerformanceManagerConfig;
        alerts: PerformanceAlert[];
        recommendations: string[];
    } {
        const metrics = this.getCurrentMetrics();
        const recommendations: string[] = [];

        // توليد التوصيات
        if (metrics.fps < 30) {
            recommendations.push('فعل جميع تحسينات الأداء');
            recommendations.push('قلل جودة الظلال');
            recommendations.push('استخدم Distance Culling');
        }

        if (metrics.drawCalls > 50) {
            recommendations.push('استخدم Mesh Batching');
            recommendations.push('ادمج النسيج في Texture Atlas');
        }

        if (metrics.vertices > 500000) {
            recommendations.push('استخدم LOD للعناصر البعيدة');
            recommendations.push('فعل Frustum Culling');
        }

        if (!this.isOptimized && recommendations.length > 0) {
            recommendations.push('طبق التحسينات التلقائية');
        }

        return {
            metrics,
            optimizationStats: this.getOptimizationStats(),
            settings: this.getOptimizationSettings(),
            config: this.config,
            alerts: this.getRecentAlerts(10),
            recommendations
        };
    }

    /**
     * تصدير بيانات الأداء
     */
    public exportPerformanceData(): string {
        const report = this.generatePerformanceReport();
        return JSON.stringify(report, null, 2);
    }

    /**
     * تنظيف الموارد
     */
    public dispose(): void {
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
        }

        this.performanceOptimizer.dispose();
        this.meshOptimizer.dispose();

        this.callbacks = {};
        this.alerts = [];
    }
}