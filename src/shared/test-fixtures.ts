/**
 * بيانات ثابتة للاختبار (Test Fixtures)
 */

import { BaseElement, Material, Project, Vector2, Vector3 } from './types'

// إحداثيات ثابتة للاختبار
export const ORIGIN: Vector3 = { x: 0, y: 0, z: 0 }
export const UNIT_SCALE: Vector3 = { x: 1, y: 1, z: 1 }
export const UNIT_UV: Vector2 = { x: 1, y: 1 }

// مواد ثابتة للاختبار
export const DEFAULT_WALL_MATERIAL: Material = {
    id: 'material-wall-default',
    name: 'Default Wall Material',
    type: 'pbr',
    albedo: '#cccccc',
    roughness: 0.8,
    metallic: 0.0,
    opacity: 1.0,
    uvScale: UNIT_UV,
    createdAt: 1640995200000, // 2022-01-01
    updatedAt: 1640995200000,
}

export const DEFAULT_FLOOR_MATERIAL: Material = {
    id: 'material-floor-default',
    name: 'Default Floor Material',
    type: 'pbr',
    albedo: '#8B4513',
    roughness: 0.6,
    metallic: 0.0,
    opacity: 1.0,
    uvScale: { x: 4, y: 4 },
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
}

export const GLASS_MATERIAL: Material = {
    id: 'material-glass',
    name: 'Glass Material',
    type: 'pbr',
    albedo: '#ffffff',
    roughness: 0.0,
    metallic: 0.0,
    opacity: 0.3,
    uvScale: UNIT_UV,
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
}

// عناصر ثابتة للاختبار
export const SAMPLE_WALL: BaseElement = {
    id: 'wall-001',
    type: 'wall',
    position: ORIGIN,
    rotation: ORIGIN,
    scale: { x: 5, y: 3, z: 0.2 },
    materialId: DEFAULT_WALL_MATERIAL.id,
    visible: true,
    selected: false,
    locked: false,
    metadata: {
        thickness: 0.2,
        height: 3,
        length: 5,
    },
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
}

export const SAMPLE_FLOOR: BaseElement = {
    id: 'floor-001',
    type: 'floor',
    position: ORIGIN,
    rotation: ORIGIN,
    scale: { x: 10, y: 0.1, z: 10 },
    materialId: DEFAULT_FLOOR_MATERIAL.id,
    visible: true,
    selected: false,
    locked: false,
    metadata: {
        thickness: 0.1,
        area: 100,
    },
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
}

export const SAMPLE_DOOR: BaseElement = {
    id: 'door-001',
    type: 'door',
    position: { x: 2.5, y: 0, z: 0 },
    rotation: ORIGIN,
    scale: { x: 0.8, y: 2.1, z: 0.05 },
    visible: true,
    selected: false,
    locked: false,
    metadata: {
        width: 0.8,
        height: 2.1,
        openDirection: 'inward',
        handleSide: 'right',
    },
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
}

export const SAMPLE_WINDOW: BaseElement = {
    id: 'window-001',
    type: 'window',
    position: { x: 1, y: 1, z: 0 },
    rotation: ORIGIN,
    scale: { x: 1.2, y: 1.0, z: 0.1 },
    materialId: GLASS_MATERIAL.id,
    visible: true,
    selected: false,
    locked: false,
    metadata: {
        width: 1.2,
        height: 1.0,
        frameThickness: 0.05,
        glassType: 'clear',
    },
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
}

// مشروع نموذجي للاختبار
export const SAMPLE_PROJECT: Project = {
    id: 'project-sample',
    name: 'Sample Test Project',
    description: 'A sample project for testing purposes',
    version: '1.0.0',
    elements: [SAMPLE_WALL, SAMPLE_FLOOR, SAMPLE_DOOR, SAMPLE_WINDOW],
    materials: [DEFAULT_WALL_MATERIAL, DEFAULT_FLOOR_MATERIAL, GLASS_MATERIAL],
    settings: {
        units: 'meters',
        gridSize: 1,
        snapToGrid: true,
        showGrid: true,
        backgroundColor: '#f0f0f0',
        ambientLightIntensity: 0.4,
        directionalLightIntensity: 1.0,
    },
    metadata: {
        author: 'Test Author',
        tags: ['test', 'sample', 'demo'],
        exportSettings: {
            format: 'glb',
            quality: 'high',
            includeTextures: true,
            generateCollisionMesh: false,
            optimizeForGames: true,
        },
    },
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
}

// مجموعات بيانات للاختبارات المعقدة
export const LARGE_PROJECT_ELEMENTS: BaseElement[] = Array.from({ length: 100 }, (_, i) => ({
    id: `element-${i.toString().padStart(3, '0')}`,
    type: i % 4 === 0 ? 'wall' : i % 4 === 1 ? 'floor' : i % 4 === 2 ? 'door' : 'window',
    position: { x: (i % 10) * 2, y: 0, z: Math.floor(i / 10) * 2 },
    rotation: ORIGIN,
    scale: UNIT_SCALE,
    visible: true,
    selected: false,
    locked: false,
    metadata: { index: i },
    createdAt: 1640995200000 + i * 1000,
    updatedAt: 1640995200000 + i * 1000,
}))

export const STRESS_TEST_MATERIALS: Material[] = Array.from({ length: 50 }, (_, i) => ({
    id: `material-${i.toString().padStart(3, '0')}`,
    name: `Test Material ${i}`,
    type: i % 2 === 0 ? 'pbr' : 'basic',
    albedo: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    roughness: Math.random(),
    metallic: Math.random(),
    opacity: 0.5 + Math.random() * 0.5,
    uvScale: { x: 1 + Math.random() * 3, y: 1 + Math.random() * 3 },
    createdAt: 1640995200000 + i * 1000,
    updatedAt: 1640995200000 + i * 1000,
}))

// قيم حدية للاختبار
export const BOUNDARY_VALUES = {
    MIN_POSITION: -1000,
    MAX_POSITION: 1000,
    MIN_SCALE: 0.001,
    MAX_SCALE: 100,
    MIN_ROTATION: 0,
    MAX_ROTATION: 2 * Math.PI,
    MIN_OPACITY: 0,
    MAX_OPACITY: 1,
    MIN_ROUGHNESS: 0,
    MAX_ROUGHNESS: 1,
    MIN_METALLIC: 0,
    MAX_METALLIC: 1,
}

// حالات خطأ للاختبار
export const INVALID_ELEMENTS = {
    NEGATIVE_SCALE: {
        ...SAMPLE_WALL,
        id: 'invalid-negative-scale',
        scale: { x: -1, y: -1, z: -1 },
    },
    ZERO_SCALE: {
        ...SAMPLE_WALL,
        id: 'invalid-zero-scale',
        scale: { x: 0, y: 0, z: 0 },
    },
    INVALID_MATERIAL_ID: {
        ...SAMPLE_WALL,
        id: 'invalid-material-id',
        materialId: 'non-existent-material',
    },
}