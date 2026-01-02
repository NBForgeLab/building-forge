/**
 * مولدات البيانات العشوائية لاختبارات التصدير
 * 
 * هذا الملف يحتوي على مولدات fast-check لإنتاج بيانات عشوائية
 * صالحة لاختبار نظام التصدير
 */

import {
    Building,
    BuildingElement,
    Color,
    Door,
    ExportSettings,
    Floor,
    PBRMaterial,
    QualityLevel,
    TextureCompression,
    TextureInfo,
    Transform,
    Vector3,
    Wall,
    Window
} from '@/types';
import fc from 'fast-check';

/**
 * مولد Vector3 عشوائي
 */
export const generateVector3 = (): fc.Arbitrary<Vector3> =>
    fc.record({
        x: fc.float({ min: -100, max: 100 }),
        y: fc.float({ min: -100, max: 100 }),
        z: fc.float({ min: -100, max: 100 })
    });

/**
 * مولد Transform عشوائي
 */
export const generateTransform = (): fc.Arbitrary<Transform> =>
    fc.record({
        position: generateVector3(),
        rotation: fc.record({
            x: fc.float({ min: 0, max: Math.fround(Math.PI * 2) }),
            y: fc.float({ min: 0, max: Math.fround(Math.PI * 2) }),
            z: fc.float({ min: 0, max: Math.fround(Math.PI * 2) })
        }),
        scale: fc.record({
            x: fc.float({ min: Math.fround(0.1), max: Math.fround(5) }),
            y: fc.float({ min: Math.fround(0.1), max: Math.fround(5) }),
            z: fc.float({ min: Math.fround(0.1), max: Math.fround(5) })
        })
    });

/**
 * مولد Color عشوائي
 */
export const generateColor = (): fc.Arbitrary<Color> =>
    fc.record({
        r: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        g: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        b: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        a: fc.float({ min: Math.fround(0), max: Math.fround(1) })
    });

/**
 * مولد TextureInfo عشوائي
 */
export const generateTextureInfo = (): fc.Arbitrary<TextureInfo> =>
    fc.record({
        url: fc.webUrl(),
        repeat: fc.record({
            x: fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
            y: fc.float({ min: Math.fround(0.1), max: Math.fround(10) })
        }),
        offset: fc.record({
            x: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
            y: fc.float({ min: Math.fround(0), max: Math.fround(1) })
        }),
        rotation: fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2) }),
        flipY: fc.boolean(),
        compression: fc.constantFrom('none', 'low', 'medium', 'high') as fc.Arbitrary<TextureCompression>
    });

/**
 * مولد جدار عشوائي
 */
export const generateRandomWall = (): fc.Arbitrary<Wall> =>
    fc.record({
        id: fc.uuid(),
        type: fc.constant('wall' as const),
        transform: generateTransform(),
        material: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 })
        }),
        properties: fc.record({
            startPoint: generateVector3(),
            endPoint: generateVector3(),
            height: fc.float({ min: Math.fround(1), max: Math.fround(10) }),
            thickness: fc.float({ min: Math.fround(0.1), max: Math.fround(1) }),
            openings: fc.array(fc.record({
                id: fc.uuid(),
                position: generateVector3(),
                width: fc.float({ min: Math.fround(0.5), max: Math.fround(3) }),
                height: fc.float({ min: Math.fround(0.5), max: Math.fround(3) })
            }), { maxLength: 5 })
        }),
        metadata: fc.record({
            source: fc.constant('user'),
            dateCreated: fc.date(),
            polyCount: fc.integer({ min: 100, max: 10000 })
        }),
        created: fc.date(),
        modified: fc.date()
    });

/**
 * مولد أرضية عشوائية
 */
export const generateRandomFloor = (): fc.Arbitrary<Floor> =>
    fc.record({
        id: fc.uuid(),
        type: fc.constant('floor' as const),
        transform: generateTransform(),
        material: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 })
        }),
        properties: fc.record({
            vertices: fc.array(generateVector3(), { minLength: 3, maxLength: 20 }),
            holes: fc.array(fc.array(generateVector3(), { minLength: 3, maxLength: 10 }), { maxLength: 3 }),
            thickness: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) })
        }),
        metadata: fc.record({
            source: fc.constant('user'),
            dateCreated: fc.date(),
            polyCount: fc.integer({ min: 50, max: 5000 })
        }),
        created: fc.date(),
        modified: fc.date()
    });

/**
 * مولد باب عشوائي
 */
export const generateRandomDoor = (): fc.Arbitrary<Door> =>
    fc.record({
        id: fc.uuid(),
        type: fc.constant('door' as const),
        transform: generateTransform(),
        material: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 })
        }),
        properties: fc.record({
            width: fc.float({ min: Math.fround(0.6), max: Math.fround(2.5) }),
            height: fc.float({ min: Math.fround(1.8), max: Math.fround(3) }),
            depth: fc.float({ min: Math.fround(0.05), max: Math.fround(0.2) }),
            openDirection: fc.constantFrom('left', 'right'),
            openAngle: fc.float({ min: Math.fround(0), max: Math.fround(180) })
        }),
        metadata: fc.record({
            source: fc.constant('user'),
            dateCreated: fc.date(),
            polyCount: fc.integer({ min: 200, max: 2000 })
        }),
        created: fc.date(),
        modified: fc.date()
    });

/**
 * مولد نافذة عشوائية
 */
export const generateRandomWindow = (): fc.Arbitrary<Window> =>
    fc.record({
        id: fc.uuid(),
        type: fc.constant('window' as const),
        transform: generateTransform(),
        material: fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 })
        }),
        properties: fc.record({
            width: fc.float({ min: Math.fround(0.5), max: Math.fround(3) }),
            height: fc.float({ min: Math.fround(0.5), max: Math.fround(2.5) }),
            depth: fc.float({ min: Math.fround(0.05), max: Math.fround(0.3) }),
            frameWidth: fc.float({ min: Math.fround(0.02), max: Math.fround(0.1) }),
            glassType: fc.constantFrom('clear', 'frosted', 'tinted')
        }),
        metadata: fc.record({
            source: fc.constant('user'),
            dateCreated: fc.date(),
            polyCount: fc.integer({ min: 150, max: 1500 })
        }),
        created: fc.date(),
        modified: fc.date()
    });

/**
 * مولد عنصر مبنى عشوائي
 */
export const generateRandomElement = (): fc.Arbitrary<BuildingElement> =>
    fc.oneof(
        generateRandomWall(),
        generateRandomFloor(),
        generateRandomDoor(),
        generateRandomWindow()
    );

/**
 * مولد مبنى عشوائي
 */
export const generateRandomBuilding = (): fc.Arbitrary<Building> =>
    fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        elements: fc.array(generateRandomElement(), { minLength: 1, maxLength: 50 }),
        groups: fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            elementIds: fc.array(fc.uuid(), { maxLength: 10 }),
            visible: fc.boolean(),
            locked: fc.boolean()
        }), { maxLength: 10 }),
        bounds: fc.record({
            min: generateVector3(),
            max: generateVector3()
        }).map(bounds => {
            // التأكد من أن max >= min
            const min = bounds.min;
            const max = bounds.max;
            return {
                min: {
                    x: Math.min(min.x, max.x),
                    y: Math.min(min.y, max.y),
                    z: Math.min(min.z, max.z)
                },
                max: {
                    x: Math.max(min.x, max.x) + 0.1, // إضافة هامش صغير
                    y: Math.max(min.y, max.y) + 0.1,
                    z: Math.max(min.z, max.z) + 0.1
                }
            };
        }),
        units: fc.constantFrom('unity', 'unreal', 'blender'),
        materials: fc.array(generateRandomPBRMaterial(), { minLength: 1, maxLength: 20 }),
        metadata: fc.record({
            author: fc.string({ minLength: 1, maxLength: 100 }),
            created: fc.date(),
            modified: fc.date(),
            version: fc.string({ minLength: 1, maxLength: 20 }),
            description: fc.option(fc.string({ maxLength: 500 }))
        })
    });

/**
 * مولد مادة PBR عشوائية
 */
export const generateRandomPBRMaterial = (): fc.Arbitrary<PBRMaterial> =>
    fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        albedo: fc.oneof(generateColor(), generateTextureInfo()),
        metallic: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        roughness: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        normal: fc.option(generateTextureInfo()),
        emission: fc.option(generateColor()),
        opacity: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
        doubleSided: fc.boolean(),
        albedoTexture: fc.option(generateTextureInfo()),
        normalTexture: fc.option(generateTextureInfo()),
        roughnessTexture: fc.option(generateTextureInfo()),
        metallicTexture: fc.option(generateTextureInfo()),
        gameEngineSettings: fc.record({
            unity: fc.record({
                shaderType: fc.constantFrom('Standard', 'URP/Lit', 'HDRP/Lit'),
                renderQueue: fc.integer({ min: 1000, max: 5000 }),
                enableInstancing: fc.boolean()
            }),
            unreal: fc.record({
                shaderType: fc.constantFrom('DefaultLit', 'Unlit', 'TwoSided'),
                blendMode: fc.constantFrom('Opaque', 'Masked', 'Translucent'),
                enableTessellation: fc.boolean()
            }),
            generic: fc.record({
                shaderType: fc.constantFrom('PBR', 'Phong', 'Lambert'),
                alphaMode: fc.constantFrom('OPAQUE', 'MASK', 'BLEND'),
                doubleSided: fc.boolean()
            })
        })
    });

/**
 * مولد إعدادات التصدير العشوائية
 */
export const generateRandomExportSettings = (): fc.Arbitrary<ExportSettings> =>
    fc.record({
        format: fc.constantFrom('glb', 'obj', 'bforge'),
        quality: fc.constantFrom('high', 'medium', 'low') as fc.Arbitrary<QualityLevel>,
        includeColliders: fc.boolean(),
        includeMaterials: fc.boolean(),
        includeAnimations: fc.boolean(),
        textureCompression: fc.option(fc.record({
            enabled: fc.boolean(),
            targetResolution: fc.constantFrom(256, 512, 1024, 2048),
            compressionLevel: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<TextureCompression>,
            format: fc.constantFrom('webp', 'jpeg', 'png')
        })),
        optimization: fc.option(fc.record({
            enabled: fc.boolean(),
            targetReduction: fc.float({ min: Math.fround(0.1), max: Math.fround(0.9) }),
            preserveUVs: fc.boolean(),
            preserveNormals: fc.boolean(),
            preserveBoundaries: fc.boolean()
        })),
        materialSettings: fc.option(fc.record({
            targetEngine: fc.constantFrom('unity', 'unreal', 'generic'),
            embedTextures: fc.boolean(),
            optimizeForEngine: fc.boolean(),
            generateMipmaps: fc.boolean()
        })),
        collisionSettings: fc.option(fc.record({
            type: fc.constantFrom('convex', 'concave', 'box', 'sphere'),
            simplification: fc.float({ min: Math.fround(0.01), max: Math.fround(0.5) }),
            generatePerElement: fc.boolean(),
            mergeStaticElements: fc.boolean()
        })),
        outputSettings: fc.option(fc.record({
            embedAssets: fc.boolean(),
            generateThumbnail: fc.boolean(),
            includeMetadata: fc.boolean(),
            compressionLevel: fc.constantFrom('none', 'fast', 'best')
        }))
    });

/**
 * إنشاء مبنى اختبار بسيط
 */
export const createTestBuilding = (): Building => ({
    id: 'test-building-001',
    name: 'Test Building',
    elements: [
        {
            id: 'wall-001',
            type: 'wall',
            transform: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            material: { id: 'material-001', name: 'Test Material' },
            properties: {
                startPoint: { x: 0, y: 0, z: 0 },
                endPoint: { x: 5, y: 0, z: 0 },
                height: 3,
                thickness: 0.2,
                openings: []
            },
            metadata: {
                source: 'test',
                dateCreated: new Date(),
                polyCount: 1000
            },
            created: new Date(),
            modified: new Date()
        }
    ],
    groups: [],
    bounds: {
        min: { x: -10, y: -10, z: -10 },
        max: { x: 10, y: 10, z: 10 }
    },
    units: 'unity',
    materials: [createTestMaterial()],
    metadata: {
        author: 'Test Author',
        created: new Date(),
        modified: new Date(),
        version: '1.0.0',
        description: 'Test building for export tests'
    }
});

/**
 * إنشاء مادة اختبار بسيطة
 */
export const createTestMaterial = (): PBRMaterial => ({
    id: 'material-001',
    name: 'Test PBR Material',
    albedo: { r: 0.8, g: 0.8, b: 0.8, a: 1.0 },
    metallic: 0.0,
    roughness: 0.5,
    normal: undefined,
    emission: undefined,
    opacity: 1.0,
    doubleSided: false,
    albedoTexture: undefined,
    normalTexture: undefined,
    roughnessTexture: undefined,
    metallicTexture: undefined,
    gameEngineSettings: {
        unity: {
            shaderType: 'Standard',
            renderQueue: 2000,
            enableInstancing: true
        },
        unreal: {
            shaderType: 'DefaultLit',
            blendMode: 'Opaque',
            enableTessellation: false
        },
        generic: {
            shaderType: 'PBR',
            alphaMode: 'OPAQUE',
            doubleSided: false
        }
    }
});

/**
 * مولد بيانات اختبار محددة للسيناريوهات الخاصة
 */
export const generateExportTestScenarios = () => ({
    // مبنى بسيط مع جدار واحد
    simpleBuilding: fc.constant(createTestBuilding()),

    // مبنى معقد مع عناصر متعددة
    complexBuilding: fc.record({
        ...createTestBuilding(),
        elements: fc.array(generateRandomElement(), { minLength: 10, maxLength: 100 })
    }),

    // مبنى مع مواد متعددة
    materialRichBuilding: fc.record({
        ...createTestBuilding(),
        materials: fc.array(generateRandomPBRMaterial(), { minLength: 5, maxLength: 50 })
    }),

    // مبنى مع نسيج عالي الدقة
    highResTextureBuilding: fc.record({
        ...createTestBuilding(),
        materials: fc.array(fc.record({
            ...generateRandomPBRMaterial(),
            albedoTexture: fc.record({
                ...generateTextureInfo(),
                url: fc.constant('test-texture-4k.png')
            })
        }), { minLength: 1, maxLength: 10 })
    })
});