/**
 * أداة القياس التفاعلية مع دعم القياسات الدقيقة
 */

import * as THREE from 'three';
import { GameUnitsService } from '../services/GameUnitsService';
import { BaseTool } from './BaseTool';

interface MeasurementPoint {
    position: THREE.Vector3;
    worldPosition: THREE.Vector3;
    timestamp: number;
}

interface MeasurementLine {
    id: string;
    startPoint: MeasurementPoint;
    endPoint: MeasurementPoint;
    distance: number;
    formattedDistance: string;
    line: THREE.Line;
    label: THREE.Sprite;
}

export class RulerTool extends BaseTool {
    private measurements: Map<string, MeasurementLine> = new Map();
    private currentMeasurement: Partial<MeasurementLine> | null = null;
    private previewLine: THREE.Line | null = null;
    private measurementGroup: THREE.Group;
    private unitsService: GameUnitsService;
    private isActive = false;

    constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
        super('ruler', scene, camera, renderer);

        this.measurementGroup = new THREE.Group();
        this.measurementGroup.name = 'measurements';
        this.scene.add(this.measurementGroup);

        this.unitsService = GameUnitsService.getInstance();
    }

    public activate(): void {
        this.isActive = true;
        this.showMeasurements();

        // تغيير cursor للإشارة إلى وضع القياس
        if (this.renderer.domElement) {
            this.renderer.domElement.style.cursor = 'crosshair';
        }
    }

    public deactivate(): void {
        this.isActive = false;
        this.clearCurrentMeasurement();
        this.hideMeasurements();

        // إعادة cursor للوضع الطبيعي
        if (this.renderer.domElement) {
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    public onMouseDown(event: MouseEvent): void {
        if (!this.isActive) return;

        const intersection = this.getIntersection(event);
        if (!intersection) return;

        const point: MeasurementPoint = {
            position: intersection.point.clone(),
            worldPosition: intersection.point.clone(),
            timestamp: Date.now()
        };

        if (!this.currentMeasurement || !this.currentMeasurement.startPoint) {
            // بداية قياس جديد
            this.startNewMeasurement(point);
        } else {
            // إنهاء القياس الحالي
            this.finishCurrentMeasurement(point);
        }
    }

    public onMouseMove(event: MouseEvent): void {
        if (!this.isActive || !this.currentMeasurement?.startPoint) return;

        const intersection = this.getIntersection(event);
        if (!intersection) return;

        this.updatePreviewLine(intersection.point);
    }

    public onKeyDown(event: KeyboardEvent): void {
        if (!this.isActive) return;

        switch (event.key) {
            case 'Escape':
                this.clearCurrentMeasurement();
                break;
            case 'Delete':
            case 'Backspace':
                this.deleteLastMeasurement();
                break;
            case 'c':
            case 'C':
                if (event.ctrlKey) {
                    this.copyMeasurementsToClipboard();
                } else {
                    this.clearAllMeasurements();
                }
                break;
        }
    }

    private startNewMeasurement(startPoint: MeasurementPoint): void {
        this.currentMeasurement = {
            id: `measurement_${Date.now()}`,
            startPoint
        };

        // إنشاء خط المعاينة
        this.createPreviewLine(startPoint.position);
    }

    private finishCurrentMeasurement(endPoint: MeasurementPoint): void {
        if (!this.currentMeasurement?.startPoint) return;

        const distance = this.currentMeasurement.startPoint.position.distanceTo(endPoint.position);
        const formattedDistance = this.unitsService.formatValue(distance);

        const measurementLine: MeasurementLine = {
            id: this.currentMeasurement.id!,
            startPoint: this.currentMeasurement.startPoint,
            endPoint,
            distance,
            formattedDistance,
            line: this.createMeasurementLine(this.currentMeasurement.startPoint.position, endPoint.position),
            label: this.createMeasurementLabel(
                this.currentMeasurement.startPoint.position.clone().lerp(endPoint.position, 0.5),
                formattedDistance
            )
        };

        this.measurements.set(measurementLine.id, measurementLine);
        this.measurementGroup.add(measurementLine.line);
        this.measurementGroup.add(measurementLabel.label);

        // مسح المعاينة والقياس الحالي
        this.clearPreviewLine();
        this.currentMeasurement = null;

        // إرسال حدث القياس المكتمل
        this.emitMeasurementComplete(measurementLine);
    }

    private createPreviewLine(startPosition: THREE.Vector3): void {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            startPosition,
            startPosition.clone()
        ]);

        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2,
            transparent: true,
            opacity: 0.7,
            depthTest: false
        });

        this.previewLine = new THREE.Line(geometry, material);
        this.previewLine.renderOrder = 1000;
        this.measurementGroup.add(this.previewLine);
    }

    private updatePreviewLine(endPosition: THREE.Vector3): void {
        if (!this.previewLine || !this.currentMeasurement?.startPoint) return;

        const positions = [
            this.currentMeasurement.startPoint.position,
            endPosition
        ];

        this.previewLine.geometry.setFromPoints(positions);
        this.previewLine.geometry.attributes.position.needsUpdate = true;

        // تحديث المسافة في الوقت الفعلي
        const distance = this.currentMeasurement.startPoint.position.distanceTo(endPosition);
        const formattedDistance = this.unitsService.formatValue(distance);

        // إرسال حدث تحديث المعاينة
        this.emitPreviewUpdate(distance, formattedDistance);
    }

    private createMeasurementLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

        const material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linewidth: 3,
            transparent: true,
            opacity: 0.9,
            depthTest: false
        });

        const line = new THREE.Line(geometry, material);
        line.renderOrder = 999;

        // إضافة نقاط النهاية
        this.addEndPoints(line, start, end);

        return line;
    }

    private addEndPoints(line: THREE.Line, start: THREE.Vector3, end: THREE.Vector3): void {
        const pointGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const pointMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            depthTest: false
        });

        const startPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        startPoint.position.copy(start);
        startPoint.renderOrder = 1001;

        const endPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        endPoint.position.copy(end);
        endPoint.renderOrder = 1001;

        line.add(startPoint);
        line.add(endPoint);
    }

    private createMeasurementLabel(position: THREE.Vector3, text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;

        // إعداد النص
        const fontSize = 32;
        context.font = `${fontSize}px Arial`;
        context.fillStyle = 'white';
        context.strokeStyle = 'black';
        context.lineWidth = 2;

        // قياس النص
        const metrics = context.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize;

        // تحديد حجم Canvas
        canvas.width = textWidth + 20;
        canvas.height = textHeight + 20;

        // إعادة تطبيق الإعدادات بعد تغيير الحجم
        context.font = `${fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // رسم خلفية
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // رسم النص
        context.strokeStyle = 'black';
        context.lineWidth = 3;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);

        context.fillStyle = 'white';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // إنشاء texture و sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
        sprite.renderOrder = 1002;

        return sprite;
    }

    private clearPreviewLine(): void {
        if (this.previewLine) {
            this.measurementGroup.remove(this.previewLine);
            this.previewLine.geometry.dispose();
            (this.previewLine.material as THREE.Material).dispose();
            this.previewLine = null;
        }
    }

    private clearCurrentMeasurement(): void {
        this.clearPreviewLine();
        this.currentMeasurement = null;
    }

    private deleteLastMeasurement(): void {
        const measurementIds = Array.from(this.measurements.keys());
        if (measurementIds.length === 0) return;

        const lastId = measurementIds[measurementIds.length - 1];
        this.deleteMeasurement(lastId);
    }

    private deleteMeasurement(id: string): void {
        const measurement = this.measurements.get(id);
        if (!measurement) return;

        this.measurementGroup.remove(measurement.line);
        this.measurementGroup.remove(measurement.label);

        measurement.line.geometry.dispose();
        (measurement.line.material as THREE.Material).dispose();
        (measurement.label.material as THREE.SpriteMaterial).map?.dispose();
        (measurement.label.material as THREE.Material).dispose();

        this.measurements.delete(id);
    }

    private clearAllMeasurements(): void {
        for (const id of this.measurements.keys()) {
            this.deleteMeasurement(id);
        }
        this.clearCurrentMeasurement();
    }

    private showMeasurements(): void {
        this.measurementGroup.visible = true;
    }

    private hideMeasurements(): void {
        this.measurementGroup.visible = false;
    }

    private copyMeasurementsToClipboard(): void {
        const measurementTexts = Array.from(this.measurements.values())
            .map(m => `${m.formattedDistance}`)
            .join('\n');

        if (measurementTexts) {
            navigator.clipboard.writeText(measurementTexts);
        }
    }

    private emitMeasurementComplete(measurement: MeasurementLine): void {
        const event = new CustomEvent('measurementComplete', {
            detail: {
                id: measurement.id,
                distance: measurement.distance,
                formattedDistance: measurement.formattedDistance,
                startPoint: measurement.startPoint,
                endPoint: measurement.endPoint
            }
        });

        window.dispatchEvent(event);
    }

    private emitPreviewUpdate(distance: number, formattedDistance: string): void {
        const event = new CustomEvent('measurementPreview', {
            detail: { distance, formattedDistance }
        });

        window.dispatchEvent(event);
    }

    /**
     * الحصول على جميع القياسات الحالية
     */
    public getMeasurements(): MeasurementLine[] {
        return Array.from(this.measurements.values());
    }

    /**
     * تحديث عرض القياسات عند تغيير الوحدات
     */
    public updateUnitsDisplay(): void {
        for (const measurement of this.measurements.values()) {
            // إعادة تنسيق المسافة
            measurement.formattedDistance = this.unitsService.formatValue(measurement.distance);

            // تحديث التسمية
            this.measurementGroup.remove(measurement.label);
            (measurement.label.material as THREE.SpriteMaterial).map?.dispose();
            (measurement.label.material as THREE.Material).dispose();

            measurement.label = this.createMeasurementLabel(
                measurement.startPoint.position.clone().lerp(measurement.endPoint.position, 0.5),
                measurement.formattedDistance
            );

            this.measurementGroup.add(measurement.label);
        }
    }

    public dispose(): void {
        this.clearAllMeasurements();
        this.scene.remove(this.measurementGroup);
    }
}