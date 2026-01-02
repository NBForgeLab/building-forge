/**
 * خدمة نظام وحدات القياس المتقدم
 * تدعم Unity, Unreal, Blender مع تحويلات دقيقة
 */

import {
    GameEngine,
    GameUnitSettings,
    MeasurementResult,
    UnitDefinition,
    UnitType
} from '../../shared/types/units';

export class GameUnitsService {
    private static instance: GameUnitsService;
    private currentSettings: GameUnitSettings;
    private unitDefinitions: Map<UnitType, UnitDefinition>;
    private conversionCache: Map<string, number>;

    private constructor() {
        this.conversionCache = new Map();
        this.initializeUnitDefinitions();
        this.currentSettings = this.getDefaultSettings();
    }

    public static getInstance(): GameUnitsService {
        if (!GameUnitsService.instance) {
            GameUnitsService.instance = new GameUnitsService();
        }
        return GameUnitsService.instance;
    }

    private initializeUnitDefinitions(): void {
        this.unitDefinitions = new Map([
            [UnitType.METERS, {
                name: 'Meters',
                symbol: 'm',
                metersPerUnit: 1.0,
                precision: 3,
                gameEngine: GameEngine.GENERIC
            }],
            [UnitType.CENTIMETERS, {
                name: 'Centimeters',
                symbol: 'cm',
                metersPerUnit: 0.01,
                precision: 1,
                gameEngine: GameEngine.GENERIC
            }],
            [UnitType.MILLIMETERS, {
                name: 'Millimeters',
                symbol: 'mm',
                metersPerUnit: 0.001,
                precision: 0,
                gameEngine: GameEngine.GENERIC
            }],
            [UnitType.FEET, {
                name: 'Feet',
                symbol: 'ft',
                metersPerUnit: 0.3048,
                precision: 2,
                gameEngine: GameEngine.GENERIC
            }],
            [UnitType.INCHES, {
                name: 'Inches',
                symbol: 'in',
                metersPerUnit: 0.0254,
                precision: 2,
                gameEngine: GameEngine.GENERIC
            }],
            [UnitType.UNITY_UNITS, {
                name: 'Unity Units',
                symbol: 'u',
                metersPerUnit: 1.0, // Unity: 1 unit = 1 meter by default
                precision: 3,
                gameEngine: GameEngine.UNITY
            }],
            [UnitType.UNREAL_UNITS, {
                name: 'Unreal Units',
                symbol: 'uu',
                metersPerUnit: 0.01, // Unreal: 1 unit = 1 cm
                precision: 1,
                gameEngine: GameEngine.UNREAL
            }],
            [UnitType.BLENDER_UNITS, {
                name: 'Blender Units',
                symbol: 'bu',
                metersPerUnit: 1.0, // Blender: 1 unit = 1 meter by default
                precision: 3,
                gameEngine: GameEngine.BLENDER
            }]
        ]);
    }

    private getDefaultSettings(): GameUnitSettings {
        return {
            engine: GameEngine.UNITY,
            primaryUnit: UnitType.UNITY_UNITS,
            displayPrecision: 3,
            gridSize: 1.0,
            snapTolerance: 0.1
        };
    }

    /**
     * تحديث إعدادات الوحدات
     */
    public updateSettings(settings: Partial<GameUnitSettings>): void {
        this.currentSettings = { ...this.currentSettings, ...settings };
        this.conversionCache.clear(); // مسح cache عند تغيير الإعدادات
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    public getCurrentSettings(): GameUnitSettings {
        return { ...this.currentSettings };
    }

    /**
     * تحويل قيمة من وحدة إلى أخرى مع دقة عالية
     */
    public convertValue(value: number, fromUnit: UnitType, toUnit: UnitType): number {
        if (fromUnit === toUnit) return value;

        const cacheKey = `${fromUnit}-${toUnit}`;
        let conversionFactor = this.conversionCache.get(cacheKey);

        if (conversionFactor === undefined) {
            const fromDef = this.unitDefinitions.get(fromUnit);
            const toDef = this.unitDefinitions.get(toUnit);

            if (!fromDef || !toDef) {
                throw new Error(`Unknown unit type: ${fromUnit} or ${toUnit}`);
            }

            // تحويل عبر المتر كوحدة مرجعية
            conversionFactor = fromDef.metersPerUnit / toDef.metersPerUnit;
            this.conversionCache.set(cacheKey, conversionFactor);
        }

        return value * conversionFactor;
    }

    /**
     * تنسيق قيمة للعرض مع الوحدة المناسبة
     */
    public formatValue(value: number, unit?: UnitType, precision?: number): string {
        const targetUnit = unit || this.currentSettings.primaryUnit;
        const targetPrecision = precision ?? this.currentSettings.displayPrecision;
        const unitDef = this.unitDefinitions.get(targetUnit);

        if (!unitDef) {
            throw new Error(`Unknown unit type: ${targetUnit}`);
        }

        const formattedValue = value.toFixed(Math.min(targetPrecision, unitDef.precision));
        return `${formattedValue} ${unitDef.symbol}`;
    }

    /**
     * تحويل قيمة إلى الوحدة الأساسية الحالية
     */
    public toCurrentUnit(value: number, fromUnit: UnitType): MeasurementResult {
        const convertedValue = this.convertValue(value, fromUnit, this.currentSettings.primaryUnit);
        const formattedValue = this.formatValue(convertedValue);

        return {
            value: convertedValue,
            unit: this.currentSettings.primaryUnit,
            precision: this.currentSettings.displayPrecision,
            formattedValue
        };
    }

    /**
     * تحويل من الوحدة الأساسية إلى وحدة محددة
     */
    public fromCurrentUnit(value: number, toUnit: UnitType): MeasurementResult {
        const convertedValue = this.convertValue(value, this.currentSettings.primaryUnit, toUnit);
        const formattedValue = this.formatValue(convertedValue, toUnit);

        return {
            value: convertedValue,
            unit: toUnit,
            precision: this.unitDefinitions.get(toUnit)?.precision || 3,
            formattedValue
        };
    }

    /**
     * الحصول على جميع الوحدات المتاحة
     */
    public getAvailableUnits(): UnitDefinition[] {
        return Array.from(this.unitDefinitions.values());
    }

    /**
     * الحصول على الوحدات المناسبة لمحرك ألعاب محدد
     */
    public getUnitsForEngine(engine: GameEngine): UnitDefinition[] {
        return Array.from(this.unitDefinitions.values())
            .filter(unit => unit.gameEngine === engine || unit.gameEngine === GameEngine.GENERIC);
    }

    /**
     * التحقق من صحة قيمة الوحدة
     */
    public validateValue(value: number, unit: UnitType): boolean {
        if (!Number.isFinite(value)) return false;

        const unitDef = this.unitDefinitions.get(unit);
        if (!unitDef) return false;

        // التحقق من الحدود المعقولة (0.1mm إلى 10km)
        const valueInMeters = value * unitDef.metersPerUnit;
        return valueInMeters >= 0.0001 && valueInMeters <= 10000;
    }

    /**
     * حساب حجم الشبكة المناسب للوحدة الحالية
     */
    public getOptimalGridSize(): number {
        const unitDef = this.unitDefinitions.get(this.currentSettings.primaryUnit);
        if (!unitDef) return 1.0;

        // حساب حجم شبكة مناسب بناءً على الوحدة
        const baseGridInMeters = this.currentSettings.gridSize;
        return baseGridInMeters / unitDef.metersPerUnit;
    }

    /**
     * حساب tolerance للـ snapping بناءً على الوحدة
     */
    public getSnapTolerance(): number {
        const unitDef = this.unitDefinitions.get(this.currentSettings.primaryUnit);
        if (!unitDef) return 0.1;

        const baseToleranceInMeters = this.currentSettings.snapTolerance;
        return baseToleranceInMeters / unitDef.metersPerUnit;
    }
}