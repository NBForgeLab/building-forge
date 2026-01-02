/**
 * اختبارات خصائص نظام القياس والدقة
 * تتحقق من المتطلبات 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fc from 'fast-check';
import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameEngine, UnitType } from '../../../shared/types/units';
import { GameUnitsService } from '../../services/GameUnitsService';
import { MeasurementService } from '../../services/MeasurementService';
import { SnapService } from '../../services/SnapService';

describe('Measurement System Properties', () => {
    let unitsService: GameUnitsService;
    let measurementService: MeasurementService;
    let snapService: SnapService;
    let scene: THREE.Scene;

    beforeEach(() => {
        scene = new THREE.Scene();
        unitsService = GameUnitsService.getInstance();
        measurementService = MeasurementService.getInstance();
        snapService = SnapService.getInstance(scene);
    });

    /**
     * الخاصية 11: دعم وحدات القياس
     * تتحقق من: المتطلبات 5.1
     */
    describe('Property 11: Unit System Support', () => {
        it('should maintain precision across unit conversions', () => {
            fc.assert(fc.property(
                fc.float({ min: 0.001, max: 1000 }),
                fc.constantFrom(...Object.values(UnitType)),
                fc.constantFrom(...Object.values(UnitType)),
                (value, fromUnit, toUnit) => {
                    // تحويل ذهاب وإياب يجب أن يحافظ على القيمة الأصلية
                    const converted = unitsService.convertValue(value, fromUnit, toUnit);
                    const backConverted = unitsService.convertValue(converted, toUnit, fromUnit);

                    const tolerance = 1e-10;
                    const difference = Math.abs(value - backConverted);

                    expect(difference).toBeLessThan(tolerance);
                }
            ), { numRuns: 100 });
        });

        it('should validate unit values correctly', () => {
            fc.assert(fc.property(
                fc.float({ min: -10000, max: 10000 }),
                fc.constantFrom(...Object.values(UnitType)),
                (value, unit) => {
                    const isValid = unitsService.validateValue(value, unit);

                    // القيم الصالحة يجب أن تكون موجبة وضمن حدود معقولة
                    if (value <= 0) {
                        expect(isValid).toBe(false);
                    } else {
                        const unitDef = unitsService.getAvailableUnits()
                            .find(u => u.name.toLowerCase().includes(unit));

                        if (unitDef) {
                            const valueInMeters = value * unitDef.metersPerUnit;
                            const expectedValid = valueInMeters >= 0.0001 && valueInMeters <= 10000;
                            expect(isValid).toBe(expectedValid);
                        }
                    }
                }
            ), { numRuns: 100 });
        });

        it('should format values consistently', () => {
            fc.assert(fc.property(
                fc.float({ min: 0.001, max: 1000 }),
                fc.constantFrom(...Object.values(UnitType)),
                fc.integer({ min: 0, max: 6 }),
                (value, unit, precision) => {
                    unitsService.updateSettings({
                        primaryUnit: unit,
                        displayPrecision: precision
                    });

                    const formatted = unitsService.formatValue(value, unit, precision);

                    // التحقق من وجود القيمة والوحدة في النص المنسق
                    expect(formatted).toContain(value.toFixed(precision));
                    expect(formatted).toMatch(/\s[a-zA-Z²³]+$/); // وحدة في النهاية
                }
            ), { numRuns: 100 });
        });
    });

    /**
     * الخاصية 12: دقة القياسات
     * تتحقق من: المتطلبات 5.2, 5.3
     */
    describe('Property 12: Measurement Precision', () => {
        it('should calculate distances accurately', () => {
            fc.assert(fc.property(
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: -100, max: 100 }),
                (x1, y1, z1, x2, y2, z2) => {
                    const point1 = new THREE.Vector3(x1, y1, z1);
                    const point2 = new THREE.Vector3(x2, y2, z2);

                    const result = measurementService.calculateDistance(point1, point2);
                    const expectedDistance = point1.distanceTo(point2);

                    expect(Math.abs(result.value - expectedDistance)).toBeLessThan(1e-10);
                    expect(result.formattedValue).toBeTruthy();
                }
            ), { numRuns: 100 });
        });

        it('should calculate angles correctly', () => {
            fc.assert(fc.property(
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                (cx, cy, cz, x1, y1, z1, x2, y2, z2) => {
                    const center = new THREE.Vector3(cx, cy, cz);
                    const point1 = new THREE.Vector3(x1, y1, z1);
                    const point2 = new THREE.Vector3(x2, y2, z2);

                    // تجنب النقاط المتطابقة
                    if (center.distanceTo(point1) < 1e-6 || center.distanceTo(point2) < 1e-6) {
                        return;
                    }

                    const angle = measurementService.calculateAngle(center, point1, point2);

                    // الزاوية يجب أن تكون بين 0 و 180 درجة
                    expect(angle).toBeGreaterThanOrEqual(0);
                    expect(angle).toBeLessThanOrEqual(180);
                    expect(Number.isFinite(angle)).toBe(true);
                }
            ), { numRuns: 100 });
        });

        it('should maintain precision in point-to-line distance calculations', () => {
            fc.assert(fc.property(
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                (px, py, pz, x1, y1, z1, x2, y2, z2) => {
                    const point = new THREE.Vector3(px, py, pz);
                    const lineStart = new THREE.Vector3(x1, y1, z1);
                    const lineEnd = new THREE.Vector3(x2, y2, z2);

                    // تجنب الخطوط بطول صفر
                    if (lineStart.distanceTo(lineEnd) < 1e-6) {
                        return;
                    }

                    const result = measurementService.calculatePointToLineDistance(point, lineStart, lineEnd);

                    // المسافة يجب أن تكون موجبة أو صفر
                    expect(result.value).toBeGreaterThanOrEqual(0);
                    expect(Number.isFinite(result.value)).toBe(true);

                    // إذا كانت النقطة على الخط، المسافة يجب أن تكون قريبة من الصفر
                    const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
                    const pointToStart = new THREE.Vector3().subVectors(point, lineStart);
                    const projection = line.clone().multiplyScalar(
                        pointToStart.dot(line) / line.lengthSq()
                    );
                    const projectionPoint = new THREE.Vector3().addVectors(lineStart, projection);

                    if (projection.length() <= line.length() && projection.dot(line) >= 0) {
                        const expectedDistance = point.distanceTo(projectionPoint);
                        expect(Math.abs(result.value - expectedDistance)).toBeLessThan(1e-6);
                    }
                }
            ), { numRuns: 100 });
        });
    });

    /**
     * الخاصية 13: حسابات المساحة والحجم
     * تتحقق من: المتطلبات 5.4
     */
    describe('Property 13: Area and Volume Calculations', () => {
        it('should calculate polygon areas correctly', () => {
            fc.assert(fc.property(
                fc.float({ min: 1, max: 10 }),
                fc.float({ min: 1, max: 10 }),
                (width, height) => {
                    // إنشاء مستطيل بسيط
                    const vertices = [
                        new THREE.Vector3(0, 0, 0),
                        new THREE.Vector3(width, 0, 0),
                        new THREE.Vector3(width, 0, height),
                        new THREE.Vector3(0, 0, height)
                    ];

                    const result = measurementService.calculatePolygonArea(vertices);
                    const expectedArea = width * height;

                    expect(Math.abs(result.area - expectedArea)).toBeLessThan(1e-6);
                    expect(result.formattedArea).toBeTruthy();
                }
            ), { numRuns: 100 });
        });

        it('should calculate perimeters correctly', () => {
            fc.assert(fc.property(
                fc.float({ min: 1, max: 10 }),
                fc.float({ min: 1, max: 10 }),
                (width, height) => {
                    // إنشاء مستطيل بسيط
                    const vertices = [
                        new THREE.Vector3(0, 0, 0),
                        new THREE.Vector3(width, 0, 0),
                        new THREE.Vector3(width, 0, height),
                        new THREE.Vector3(0, 0, height)
                    ];

                    const result = measurementService.calculatePolygonArea(vertices);
                    const expectedPerimeter = 2 * (width + height);

                    expect(Math.abs(result.perimeter - expectedPerimeter)).toBeLessThan(1e-6);
                    expect(result.formattedPerimeter).toBeTruthy();
                }
            ), { numRuns: 100 });
        });

        it('should calculate bounding box dimensions correctly', () => {
            fc.assert(fc.property(
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: 1, max: 10 }),
                fc.float({ min: 1, max: 10 }),
                fc.float({ min: 1, max: 10 }),
                (x, y, z, width, height, depth) => {
                    // إنشاء box geometry
                    const geometry = new THREE.BoxGeometry(width, height, depth);
                    geometry.translate(x, y, z);

                    const result = measurementService.calculateBoundingBoxDimensions(geometry);

                    expect(Math.abs(result.width - width)).toBeLessThan(1e-6);
                    expect(Math.abs(result.height - height)).toBeLessThan(1e-6);
                    expect(Math.abs(result.depth - depth)).toBeLessThan(1e-6);

                    expect(result.formattedWidth).toBeTruthy();
                    expect(result.formattedHeight).toBeTruthy();
                    expect(result.formattedDepth).toBeTruthy();
                }
            ), { numRuns: 100 });
        });
    });

    /**
     * الخاصية 14: وظائف Snap-to-Grid
     * تتحقق من: المتطلبات 5.5
     */
    describe('Property 14: Snap-to-Grid Functionality', () => {
        it('should snap positions to grid correctly', () => {
            fc.assert(fc.property(
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: -100, max: 100 }),
                fc.float({ min: 0.1, max: 10 }),
                (x, y, z, gridSize) => {
                    unitsService.updateSettings({ gridSize });
                    snapService.updateSettings({
                        enabled: true,
                        gridSnap: true,
                        snapTolerance: gridSize / 2
                    });

                    const position = new THREE.Vector3(x, y, z);
                    const result = snapService.snapPosition(position);

                    if (result.snapped) {
                        const optimalGridSize = unitsService.getOptimalGridSize();

                        // التحقق من أن الموضع المحاذي يقع على الشبكة
                        const snappedX = result.position.x;
                        const snappedZ = result.position.z;

                        const gridX = Math.round(snappedX / optimalGridSize) * optimalGridSize;
                        const gridZ = Math.round(snappedZ / optimalGridSize) * optimalGridSize;

                        expect(Math.abs(snappedX - gridX)).toBeLessThan(1e-6);
                        expect(Math.abs(snappedZ - gridZ)).toBeLessThan(1e-6);
                    }
                }
            ), { numRuns: 100 });
        });

        it('should respect snap tolerance', () => {
            fc.assert(fc.property(
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: 0.01, max: 1 }),
                (x, y, z, tolerance) => {
                    snapService.updateSettings({
                        enabled: true,
                        gridSnap: true,
                        snapTolerance: tolerance
                    });

                    const position = new THREE.Vector3(x, y, z);
                    const result = snapService.snapPosition(position);

                    if (result.snapped) {
                        // المسافة بين الموضع الأصلي والمحاذي يجب أن تكون ضمن tolerance
                        expect(result.distance).toBeLessThanOrEqual(tolerance);
                    } else {
                        // إذا لم يحدث snap، المسافة يجب أن تكون أكبر من tolerance
                        const gridSize = unitsService.getOptimalGridSize();
                        const gridX = Math.round(x / gridSize) * gridSize;
                        const gridZ = Math.round(z / gridSize) * gridSize;
                        const gridPosition = new THREE.Vector3(gridX, y, gridZ);
                        const distance = position.distanceTo(gridPosition);

                        if (distance > tolerance) {
                            expect(result.snapped).toBe(false);
                        }
                    }
                }
            ), { numRuns: 100 });
        });

        it('should snap angles to increments correctly', () => {
            fc.assert(fc.property(
                fc.float({ min: -Math.PI * 4, max: Math.PI * 4 }),
                fc.integer({ min: 1, max: 90 }),
                (angle, increment) => {
                    snapService.updateSettings({
                        enabled: true,
                        angleSnap: true,
                        angleIncrement: increment
                    });

                    const snappedAngle = snapService.snapAngle(angle);
                    const incrementRad = increment * (Math.PI / 180);

                    // التحقق من أن الزاوية المحاذية تقع على زيادة صحيحة
                    const expectedSnapped = Math.round(angle / incrementRad) * incrementRad;

                    expect(Math.abs(snappedAngle - expectedSnapped)).toBeLessThan(1e-10);
                }
            ), { numRuns: 100 });
        });

        it('should maintain snap consistency across multiple calls', () => {
            fc.assert(fc.property(
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                fc.float({ min: -10, max: 10 }),
                (x, y, z) => {
                    const position = new THREE.Vector3(x, y, z);

                    const result1 = snapService.snapPosition(position);
                    const result2 = snapService.snapPosition(position);

                    // نفس الموضع يجب أن يعطي نفس النتيجة
                    expect(result1.snapped).toBe(result2.snapped);
                    expect(result1.position.equals(result2.position)).toBe(true);
                    expect(result1.snapType).toBe(result2.snapType);
                    expect(Math.abs(result1.distance - result2.distance)).toBeLessThan(1e-10);
                }
            ), { numRuns: 100 });
        });
    });

    /**
     * اختبارات التكامل للنظام الكامل
     */
    describe('Integration Properties', () => {
        it('should maintain measurement accuracy across different unit systems', () => {
            fc.assert(fc.property(
                fc.float({ min: 1, max: 100 }),
                fc.constantFrom(...Object.values(GameEngine)),
                (distance, engine) => {
                    // تعيين محرك الألعاب
                    let primaryUnit: UnitType;
                    switch (engine) {
                        case GameEngine.UNITY:
                            primaryUnit = UnitType.UNITY_UNITS;
                            break;
                        case GameEngine.UNREAL:
                            primaryUnit = UnitType.UNREAL_UNITS;
                            break;
                        case GameEngine.BLENDER:
                            primaryUnit = UnitType.BLENDER_UNITS;
                            break;
                        default:
                            primaryUnit = UnitType.METERS;
                    }

                    unitsService.updateSettings({ engine, primaryUnit });

                    // إنشاء نقطتين
                    const point1 = new THREE.Vector3(0, 0, 0);
                    const point2 = new THREE.Vector3(distance, 0, 0);

                    const result = measurementService.calculateDistance(point1, point2);

                    // التحقق من أن القياس صحيح بالوحدة المحددة
                    expect(Math.abs(result.value - distance)).toBeLessThan(1e-6);
                    expect(result.unit).toBe(primaryUnit);
                    expect(result.formattedValue).toContain(distance.toFixed(3));
                }
            ), { numRuns: 100 });
        });
    });
});