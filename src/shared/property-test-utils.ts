import * as fc from 'fast-check'
import { BaseElement, ElementType, Material, Project, ToolType, Vector2, Vector3 } from './types'

/**
 * مولدات البيانات لاختبارات الخصائص باستخدام fast-check
 */

// مولد Vector3
export const vector3Arbitrary = (): fc.Arbitrary<Vector3> =>
  fc.record({
    x: fc.double({ min: -1000, max: 1000 }),
    y: fc.double({ min: -1000, max: 1000 }),
    z: fc.double({ min: -1000, max: 1000 }),
  })

// مولد Vector2
export const vector2Arbitrary = (): fc.Arbitrary<Vector2> =>
  fc.record({
    x: fc.double({ min: -100, max: 100 }),
    y: fc.double({ min: -100, max: 100 }),
  })

// مولد Material
export const materialArbitrary = (): fc.Arbitrary<Material> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom('pbr', 'basic'),
    albedo: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
    normal: fc.option(fc.webUrl(), { nil: undefined }),
    roughness: fc.double({ min: 0, max: 1 }),
    metallic: fc.double({ min: 0, max: 1 }),
    opacity: fc.double({ min: 0, max: 1 }),
    emissive: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`), { nil: undefined }),
    uvScale: vector2Arbitrary(),
    createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
    updatedAt: fc.integer({ min: 1000000000000, max: Date.now() }),
  })

// مولد BaseElement
export const baseElementArbitrary = (): fc.Arbitrary<BaseElement> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constantFrom(...Object.values(ElementType)),
    position: vector3Arbitrary(),
    rotation: vector3Arbitrary(),
    scale: vector3Arbitrary().map(v => ({
      x: Math.abs(v.x) + 0.1, // تجنب القيم الصفرية
      y: Math.abs(v.y) + 0.1,
      z: Math.abs(v.z) + 0.1,
    })),
    materialId: fc.option(fc.uuid(), { nil: undefined }),
    visible: fc.boolean(),
    selected: fc.boolean(),
    locked: fc.boolean(),
    metadata: fc.dictionary(fc.string(), fc.anything()),
    createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
    updatedAt: fc.integer({ min: 1000000000000, max: Date.now() }),
  })

// مولد Project
export const projectArbitrary = (): fc.Arbitrary<Project> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    version: fc.string({ minLength: 5, maxLength: 10 }).filter(v => /^\d+\.\d+\.\d+$/.test(v)),
    elements: fc.array(baseElementArbitrary(), { maxLength: 50 }),
    materials: fc.array(materialArbitrary(), { maxLength: 20 }),
    settings: fc.record({
      units: fc.constantFrom('meters', 'centimeters', 'inches', 'feet'),
      gridSize: fc.double({ min: 0.1, max: 10 }),
      snapToGrid: fc.boolean(),
      showGrid: fc.boolean(),
      backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`),
      ambientLightIntensity: fc.double({ min: 0, max: 2 }),
      directionalLightIntensity: fc.double({ min: 0, max: 3 }),
    }),
    metadata: fc.record({
      author: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
      thumbnail: fc.option(fc.webUrl(), { nil: undefined }),
      exportSettings: fc.record({
        format: fc.constantFrom('glb', 'obj'),
        quality: fc.constantFrom('high', 'medium', 'low'),
        includeTextures: fc.boolean(),
        generateCollisionMesh: fc.boolean(),
        optimizeForGames: fc.boolean(),
      }),
    }),
    createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
    updatedAt: fc.integer({ min: 1000000000000, max: Date.now() }),
  })

// مولد ToolType
export const toolTypeArbitrary = (): fc.Arbitrary<ToolType> =>
  fc.constantFrom(...Object.values(ToolType))

// مولد ElementType
export const elementTypeArbitrary = (): fc.Arbitrary<ElementType> =>
  fc.constantFrom(...Object.values(ElementType))

// مولدات للقيم الرقمية المحددة
export const positiveNumberArbitrary = () => fc.double({ min: 0.001, max: 1000 })
export const angleArbitrary = () => fc.double({ min: 0, max: 2 * Math.PI })
export const percentageArbitrary = () => fc.double({ min: 0, max: 1 })

// إعدادات fast-check المخصصة للمشروع
export const propertyTestConfig: fc.Parameters<unknown> = {
  numRuns: 10, // تقليل العدد للاختبار السريع
  verbose: false,
  seed: 42,
  endOnFailure: true,
  timeout: 2000, // 2 ثانية لكل اختبار
}

// دالة مساعدة لتشغيل اختبارات الخصائص
export const runPropertyTest = <T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void,
  config: Partial<fc.Parameters<T>> = {}
) => {
  return fc.assert(
    fc.property(arbitrary, predicate),
    { ...propertyTestConfig, ...config }
  )
}