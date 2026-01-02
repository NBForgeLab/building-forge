/**
 * مكتبة المواد الافتراضية
 * Default material library with presets for common building materials
 */

import { PBRMaterialProperties } from './PBRMaterial'

export interface MaterialPreset {
    name: string
    description: string
    category: string
    tags: string[]
    properties: PBRMaterialProperties
    gameOptimized?: boolean
    complexity?: 'low' | 'medium' | 'high'
}

export const DEFAULT_MATERIAL_PRESETS: MaterialPreset[] = [
    // Concrete Materials
    {
        name: 'Concrete - Smooth',
        description: 'Smooth concrete surface for modern buildings',
        category: 'concrete',
        tags: ['concrete', 'smooth', 'building', 'modern'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#C0C0C0',
            roughness: 0.8,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Concrete - Rough',
        description: 'Rough concrete with visible texture',
        category: 'concrete',
        tags: ['concrete', 'rough', 'building', 'industrial'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#A0A0A0',
            roughness: 0.9,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Concrete - Weathered',
        description: 'Weathered concrete with stains and wear',
        category: 'concrete',
        tags: ['concrete', 'weathered', 'old', 'worn'],
        complexity: 'medium',
        gameOptimized: true,
        properties: {
            albedo: '#909090',
            roughness: 0.95,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },

    // Wood Materials
    {
        name: 'Wood - Oak',
        description: 'Natural oak wood with warm brown tones',
        category: 'wood',
        tags: ['wood', 'oak', 'natural', 'warm'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#8B4513',
            roughness: 0.7,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Wood - Pine',
        description: 'Light pine wood for interior use',
        category: 'wood',
        tags: ['wood', 'pine', 'natural', 'light'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#DEB887',
            roughness: 0.6,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Wood - Mahogany',
        description: 'Rich mahogany wood for luxury interiors',
        category: 'wood',
        tags: ['wood', 'mahogany', 'luxury', 'dark'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#C04000',
            roughness: 0.5,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Wood - Weathered',
        description: 'Weathered wood with gray patina',
        category: 'wood',
        tags: ['wood', 'weathered', 'gray', 'old'],
        complexity: 'medium',
        gameOptimized: true,
        properties: {
            albedo: '#8C7853',
            roughness: 0.9,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },

    // Metal Materials
    {
        name: 'Steel - Brushed',
        description: 'Brushed steel with directional finish',
        category: 'metal',
        tags: ['metal', 'steel', 'brushed', 'industrial'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#708090',
            roughness: 0.3,
            metallic: 0.9,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Aluminum - Polished',
        description: 'Highly polished aluminum surface',
        category: 'metal',
        tags: ['metal', 'aluminum', 'polished', 'reflective'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#C0C0C0',
            roughness: 0.1,
            metallic: 0.95,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Copper - Oxidized',
        description: 'Oxidized copper with green patina',
        category: 'metal',
        tags: ['metal', 'copper', 'oxidized', 'patina'],
        complexity: 'medium',
        gameOptimized: true,
        properties: {
            albedo: '#4C7C59',
            roughness: 0.8,
            metallic: 0.7,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Iron - Rusted',
        description: 'Rusted iron with orange-brown corrosion',
        category: 'metal',
        tags: ['metal', 'iron', 'rusted', 'weathered'],
        complexity: 'medium',
        gameOptimized: true,
        properties: {
            albedo: '#B7410E',
            roughness: 0.9,
            metallic: 0.4,
            opacity: 1.0,
            transparent: false
        }
    },

    // Glass Materials
    {
        name: 'Glass - Clear',
        description: 'Crystal clear glass for windows',
        category: 'glass',
        tags: ['glass', 'clear', 'transparent', 'window'],
        complexity: 'medium',
        gameOptimized: false,
        properties: {
            albedo: '#FFFFFF',
            roughness: 0.0,
            metallic: 0.0,
            transmission: 0.9,
            opacity: 0.1,
            transparent: true,
            ior: 1.52
        }
    },
    {
        name: 'Glass - Frosted',
        description: 'Frosted glass for privacy',
        category: 'glass',
        tags: ['glass', 'frosted', 'translucent', 'privacy'],
        complexity: 'medium',
        gameOptimized: false,
        properties: {
            albedo: '#F8F8FF',
            roughness: 0.8,
            metallic: 0.0,
            transmission: 0.3,
            opacity: 0.7,
            transparent: true,
            ior: 1.52
        }
    },
    {
        name: 'Glass - Tinted',
        description: 'Tinted glass for modern buildings',
        category: 'glass',
        tags: ['glass', 'tinted', 'modern', 'blue'],
        complexity: 'medium',
        gameOptimized: false,
        properties: {
            albedo: '#4169E1',
            roughness: 0.1,
            metallic: 0.0,
            transmission: 0.6,
            opacity: 0.4,
            transparent: true,
            ior: 1.52
        }
    },

    // Brick Materials
    {
        name: 'Brick - Red Clay',
        description: 'Traditional red clay brick',
        category: 'brick',
        tags: ['brick', 'red', 'clay', 'traditional'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#B22222',
            roughness: 0.9,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Brick - Yellow',
        description: 'Yellow brick for accent walls',
        category: 'brick',
        tags: ['brick', 'yellow', 'accent', 'warm'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#DAA520',
            roughness: 0.85,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Brick - Weathered',
        description: 'Old weathered brick with moss',
        category: 'brick',
        tags: ['brick', 'weathered', 'old', 'moss'],
        complexity: 'medium',
        gameOptimized: true,
        properties: {
            albedo: '#8B4513',
            roughness: 0.95,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },

    // Stone Materials
    {
        name: 'Stone - Granite',
        description: 'Polished granite for countertops',
        category: 'stone',
        tags: ['stone', 'granite', 'polished', 'luxury'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#696969',
            roughness: 0.2,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Stone - Marble',
        description: 'White marble with subtle veining',
        category: 'stone',
        tags: ['stone', 'marble', 'white', 'elegant'],
        complexity: 'medium',
        gameOptimized: true,
        properties: {
            albedo: '#F8F8FF',
            roughness: 0.1,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Stone - Limestone',
        description: 'Natural limestone for building facades',
        category: 'stone',
        tags: ['stone', 'limestone', 'natural', 'facade'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#F5F5DC',
            roughness: 0.8,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Stone - Slate',
        description: 'Dark slate for roofing',
        category: 'stone',
        tags: ['stone', 'slate', 'dark', 'roofing'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#2F4F4F',
            roughness: 0.7,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },

    // Ceramic Materials
    {
        name: 'Ceramic - White',
        description: 'Glossy white ceramic tile',
        category: 'ceramic',
        tags: ['ceramic', 'tile', 'white', 'glossy'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#FFFFFF',
            roughness: 0.1,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Ceramic - Subway Tile',
        description: 'Classic white subway tile',
        category: 'ceramic',
        tags: ['ceramic', 'subway', 'white', 'classic'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#F8F8FF',
            roughness: 0.2,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Ceramic - Terracotta',
        description: 'Warm terracotta ceramic',
        category: 'ceramic',
        tags: ['ceramic', 'terracotta', 'warm', 'earth'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#E2725B',
            roughness: 0.6,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },

    // Fabric Materials
    {
        name: 'Fabric - Canvas',
        description: 'Heavy canvas fabric',
        category: 'fabric',
        tags: ['fabric', 'canvas', 'heavy', 'natural'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#F5F5DC',
            roughness: 0.9,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Fabric - Velvet',
        description: 'Luxurious velvet fabric',
        category: 'fabric',
        tags: ['fabric', 'velvet', 'luxury', 'soft'],
        complexity: 'medium',
        gameOptimized: false,
        properties: {
            albedo: '#8B0000',
            roughness: 0.8,
            metallic: 0.0,
            sheen: 0.3,
            sheenRoughness: 0.2,
            opacity: 1.0,
            transparent: false
        }
    },

    // Plastic Materials
    {
        name: 'Plastic - Matte',
        description: 'Matte plastic surface',
        category: 'plastic',
        tags: ['plastic', 'matte', 'synthetic'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#FFFFFF',
            roughness: 0.8,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Plastic - Glossy',
        description: 'High-gloss plastic finish',
        category: 'plastic',
        tags: ['plastic', 'glossy', 'reflective'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#FFFFFF',
            roughness: 0.1,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },

    // Rubber Materials
    {
        name: 'Rubber - Black',
        description: 'Matte black rubber',
        category: 'rubber',
        tags: ['rubber', 'black', 'matte', 'flexible'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#2F2F2F',
            roughness: 0.9,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },

    // Paint Materials
    {
        name: 'Paint - Matte White',
        description: 'Flat matte white paint',
        category: 'paint',
        tags: ['paint', 'white', 'matte', 'wall'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#FFFFFF',
            roughness: 0.9,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Paint - Satin White',
        description: 'Satin finish white paint',
        category: 'paint',
        tags: ['paint', 'white', 'satin', 'wall'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#FFFFFF',
            roughness: 0.4,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    },
    {
        name: 'Paint - Gloss White',
        description: 'High-gloss white paint',
        category: 'paint',
        tags: ['paint', 'white', 'gloss', 'trim'],
        complexity: 'low',
        gameOptimized: true,
        properties: {
            albedo: '#FFFFFF',
            roughness: 0.1,
            metallic: 0.0,
            opacity: 1.0,
            transparent: false
        }
    }
]

// Helper functions for material presets
export function getMaterialPresetsByCategory(category: string): MaterialPreset[] {
    return DEFAULT_MATERIAL_PRESETS.filter(preset => preset.category === category)
}

export function getMaterialPresetsByTag(tag: string): MaterialPreset[] {
    return DEFAULT_MATERIAL_PRESETS.filter(preset => preset.tags.includes(tag))
}

export function getGameOptimizedPresets(): MaterialPreset[] {
    return DEFAULT_MATERIAL_PRESETS.filter(preset => preset.gameOptimized)
}

export function getPresetsByComplexity(complexity: 'low' | 'medium' | 'high'): MaterialPreset[] {
    return DEFAULT_MATERIAL_PRESETS.filter(preset => preset.complexity === complexity)
}

export function getAllCategories(): string[] {
    const categories = new Set(DEFAULT_MATERIAL_PRESETS.map(preset => preset.category))
    return Array.from(categories).sort()
}

export function getAllTags(): string[] {
    const tags = new Set<string>()
    DEFAULT_MATERIAL_PRESETS.forEach(preset => {
        preset.tags.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
}

export function findPresetByName(name: string): MaterialPreset | undefined {
    return DEFAULT_MATERIAL_PRESETS.find(preset => preset.name === name)
}

export function searchPresets(query: string): MaterialPreset[] {
    const lowerQuery = query.toLowerCase()
    return DEFAULT_MATERIAL_PRESETS.filter(preset =>
        preset.name.toLowerCase().includes(lowerQuery) ||
        preset.description.toLowerCase().includes(lowerQuery) ||
        preset.category.toLowerCase().includes(lowerQuery) ||
        preset.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
}