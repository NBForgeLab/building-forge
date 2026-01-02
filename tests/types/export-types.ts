/**
 * تعريف الأنواع المطلوبة لاختبارات التصدير
 */

// أنواع أساسية
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface Transform {
    position: Vector3;
    rotation: Vector3;
    scale: Vector3;
}

// أنواع النسيج والمواد
export type TextureCompression = 'none' | 'low' | 'medium' | 'high';
export type QualityLevel = 'low' | 'medium' | 'high';

export interface TextureInfo {
    url: string;
    repeat: { x: number; y: number };
    offset: { x: number; y: number };
    rotation: number;
    flipY: boolean;
    compression: TextureCompression;
}

export interface PBRMaterial {
    id: string;
    name: string;
    albedo: Color | TextureInfo;
    metallic: number;
    roughness: number;
    normal?: TextureInfo;
    emission?: Color;
    opacity: number;
    doubleSided: boolean;
    albedoTexture?: TextureInfo;
    normalTexture?: TextureInfo;
    roughnessTexture?: TextureInfo;
    metallicTexture?: TextureInfo;
    gameEngineSettings: {
        unity: {
            shaderType: string;
            renderQueue: number;
            enableInstancing: boolean;
        };
        unreal: {
            shaderType: string;
            blendMode: string;
            enableTessellation: boolean;
        };
        generic: {
            shaderType: string;
            alphaMode: string;
            doubleSided: boolean;
        };
    };
}

// أنواع عناصر المبنى
export interface MaterialReference {
    id: string;
    name: string;
}

export interface ElementMetadata {
    source: string;
    dateCreated: Date;
    polyCount: number;
}

export interface BuildingElement {
    id: string;
    type: 'wall' | 'floor' | 'door' | 'window' | 'stairs' | 'custom';
    transform: Transform;
    material: MaterialReference;
    properties: Record<string, any>;
    metadata: ElementMetadata;
    created: Date;
    modified: Date;
}

export interface Wall extends BuildingElement {
    type: 'wall';
    properties: {
        startPoint: Vector3;
        endPoint: Vector3;
        height: number;
        thickness: number;
        openings: Array<{
            id: string;
            position: Vector3;
            width: number;
            height: number;
        }>;
    };
}

export interface Floor extends BuildingElement {
    type: 'floor';
    properties: {
        vertices: Vector3[];
        holes: Vector3[][];
        thickness: number;
    };
}

export interface Door extends BuildingElement {
    type: 'door';
    properties: {
        width: number;
        height: number;
        depth: number;
        openDirection: 'left' | 'right';
        openAngle: number;
    };
}

export interface Window extends BuildingElement {
    type: 'window';
    properties: {
        width: number;
        height: number;
        depth: number;
        frameWidth: number;
        glassType: 'clear' | 'frosted' | 'tinted';
    };
}

// أنواع المبنى والمشروع
export interface ElementGroup {
    id: string;
    name: string;
    elementIds: string[];
    visible: boolean;
    locked: boolean;
}

export interface BoundingBox {
    min: Vector3;
    max: Vector3;
}

export interface ProjectMetadata {
    author: string;
    created: Date;
    modified: Date;
    version: string;
    description?: string;
}

export interface Building {
    id: string;
    name: string;
    elements: BuildingElement[];
    groups: ElementGroup[];
    bounds: BoundingBox;
    units: 'unity' | 'unreal' | 'blender';
    materials: PBRMaterial[];
    metadata: ProjectMetadata;
}

// أنواع إعدادات التصدير
export interface TextureCompressionSettings {
    enabled: boolean;
    targetResolution: number;
    compressionLevel: TextureCompression;
    format: 'webp' | 'jpeg' | 'png';
}

export interface OptimizationSettings {
    enabled: boolean;
    targetReduction: number;
    preserveUVs: boolean;
    preserveNormals: boolean;
    preserveBoundaries?: boolean;
}

export interface MaterialSettings {
    targetEngine: 'unity' | 'unreal' | 'generic';
    embedTextures: boolean;
    optimizeForEngine: boolean;
    generateMipmaps?: boolean;
}

export interface CollisionSettings {
    type: 'convex' | 'concave' | 'box' | 'sphere';
    simplification: number;
    generatePerElement: boolean;
    mergeStaticElements?: boolean;
}

export interface OutputSettings {
    embedAssets: boolean;
    generateThumbnail: boolean;
    includeMetadata: boolean;
    compressionLevel: 'none' | 'fast' | 'best';
}

export interface ExportSettings {
    format: 'glb' | 'obj' | 'bforge';
    quality: QualityLevel;
    includeColliders: boolean;
    includeMaterials: boolean;
    includeAnimations?: boolean;
    textureCompression?: TextureCompressionSettings;
    optimization?: OptimizationSettings;
    materialSettings?: MaterialSettings;
    collisionSettings?: CollisionSettings;
    outputSettings?: OutputSettings;
}

// أنواع نتائج التصدير
export interface TextureStats {
    width: number;
    height: number;
    format: string;
    compressed: boolean;
    originalSize: number;
    compressedSize: number;
}

export interface CollisionMesh {
    vertexCount: number;
    faceCount: number;
    originalVertexCount: number;
    type: string;
    bounds: BoundingBox;
}

export interface ExportedMaterial {
    id: string;
    name: string;
    albedo: Color;
    metallic: number;
    roughness: number;
    embeddedTextures: string[];
    unityCompatible?: boolean;
    unrealCompatible?: boolean;
    genericCompatible?: boolean;
    shaderType?: string;
}

export interface PerformanceMetrics {
    collisionComplexity: number;
    renderComplexity: number;
    physicsOptimized: boolean;
}

export interface ExportStats {
    polyCount: number;
    materialCount: number;
    textureStats?: TextureStats[];
    collisionMeshes?: CollisionMesh[];
    materials?: ExportedMaterial[];
    compressionRatio?: number;
    qualityScore?: number;
    performanceMetrics?: PerformanceMetrics;
}

export interface ExportResult {
    success: boolean;
    data?: ArrayBuffer | Blob;
    filename?: string;
    stats?: ExportStats;
    errors: string[];
    warnings?: string[];
}

// أنواع المصدرين
export interface GameOptimizedGLBExporter {
    export(building: Building, settings: ExportSettings): Promise<ExportResult>;
    dispose(): void;
}

export interface OBJExporter {
    export(building: Building, settings: ExportSettings): Promise<ExportResult>;
    dispose(): void;
}

export interface ExportOptimizer {
    optimize(building: Building, settings: OptimizationSettings): Promise<Building>;
}

export interface PBRMaterialExporter {
    exportMaterial(material: PBRMaterial, settings: MaterialSettings): Promise<ExportedMaterial>;
}

export interface CollisionMeshGenerator {
    generateCollisionMesh(element: BuildingElement, settings: CollisionSettings): Promise<CollisionMesh>;
}