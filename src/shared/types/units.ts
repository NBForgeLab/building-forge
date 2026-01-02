/**
 * نظام وحدات القياس المتقدم لـ Building Forge
 * يدعم Unity, Unreal, Blender units مع تحويلات دقيقة
 */

export enum GameEngine {
    UNITY = 'unity',
    UNREAL = 'unreal',
    BLENDER = 'blender',
    GENERIC = 'generic'
}

export enum UnitType {
    METERS = 'meters',
    CENTIMETERS = 'centimeters',
    MILLIMETERS = 'millimeters',
    FEET = 'feet',
    INCHES = 'inches',
    UNITY_UNITS = 'unity_units',
    UNREAL_UNITS = 'unreal_units',
    BLENDER_UNITS = 'blender_units'
}

export interface UnitDefinition {
    name: string;
    symbol: string;
    metersPerUnit: number;
    precision: number;
    gameEngine?: GameEngine;
}

export interface UnitConversion {
    fromUnit: UnitType;
    toUnit: UnitType;
    factor: number;
}

export interface GameUnitSettings {
    engine: GameEngine;
    primaryUnit: UnitType;
    displayPrecision: number;
    gridSize: number;
    snapTolerance: number;
}

export interface MeasurementResult {
    value: number;
    unit: UnitType;
    precision: number;
    formattedValue: string;
}