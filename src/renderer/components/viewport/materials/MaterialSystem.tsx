import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Material } from '../../../store/types'

export interface MaterialSystemProps {
  material: Material | undefined
  wireframe: boolean
  viewMode: 'solid' | 'wireframe' | 'textured'
  elementType?: string
  elementProperties?: any
}

export const MaterialSystem: React.FC<MaterialSystemProps> = ({
  material,
  wireframe,
  viewMode,
  elementType,
  elementProperties,
}) => {
  // Create enhanced material based on type and properties
  const enhancedMaterial = useMemo(() => {
    if (wireframe || viewMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: material?.properties?.albedo || '#ffffff',
        wireframe: true,
        transparent: material?.properties?.transparent || false,
        opacity: material?.properties?.opacity || 1,
      })
    }

    if (viewMode === 'textured' && material?.textures) {
      // Load textures
      const textureLoader = new THREE.TextureLoader()
      const textures: { [key: string]: THREE.Texture } = {}

      // Load available textures
      Object.entries(material.textures).forEach(([key, url]) => {
        if (url) {
          textures[key] = textureLoader.load(url)

          // Configure texture wrapping and repeat
          textures[key].wrapS = textures[key].wrapT = THREE.RepeatWrapping

          // Set texture repeat based on element size
          if (elementProperties) {
            const scaleX =
              (elementProperties.width || elementProperties.length || 1) /
              (material.textureScale?.x || 1)
            const scaleY =
              (elementProperties.height || elementProperties.depth || 1) /
              (material.textureScale?.y || 1)
            textures[key].repeat.set(scaleX, scaleY)
          }
        }
      })

      // Create PBR material with textures
      return new THREE.MeshStandardMaterial({
        map: textures.albedo || null,
        normalMap: textures.normal || null,
        roughnessMap: textures.roughness || null,
        metalnessMap: textures.metallic || null,
        emissiveMap: textures.emission || null,

        color: material.properties?.albedo || '#ffffff',
        roughness: material.properties?.roughness || 0.5,
        metalness: material.properties?.metallic || 0.0,
        emissive: material.properties?.emission || '#000000',
        emissiveIntensity: material.properties?.emissionIntensity || 0.0,

        transparent: material.properties?.transparent || false,
        opacity: material.properties?.opacity || 1,

        // Enhanced material properties
        envMapIntensity: 1.0,
        clearcoat: material.properties?.clearcoat || 0.0,
        clearcoatRoughness: material.properties?.clearcoatRoughness || 0.0,
      })
    }

    // Solid material with enhanced properties
    const solidMaterial = new THREE.MeshStandardMaterial({
      color: material?.properties?.albedo || '#ffffff',
      roughness: material?.properties?.roughness || 0.5,
      metalness: material?.properties?.metallic || 0.0,
      emissive: material?.properties?.emission || '#000000',
      emissiveIntensity: material?.properties?.emissionIntensity || 0.0,
      transparent: material?.properties?.transparent || false,
      opacity: material?.properties?.opacity || 1,
    })

    // Apply element-specific material adjustments
    if (elementType) {
      switch (elementType) {
        case 'wall':
          solidMaterial.roughness = Math.max(solidMaterial.roughness, 0.7)
          break
        case 'floor':
          solidMaterial.roughness = Math.max(solidMaterial.roughness, 0.8)
          break
        case 'door':
          solidMaterial.roughness = Math.min(solidMaterial.roughness, 0.6)
          break
        case 'window':
          // Special handling for glass materials
          if (elementProperties?.glassType === 'clear') {
            return new THREE.MeshPhysicalMaterial({
              color: '#87CEEB',
              transparent: true,
              opacity: 0.3,
              roughness: 0.0,
              metalness: 0.0,
              transmission: 0.9,
              thickness: 0.01,
              ior: 1.5,
            })
          }
          break
      }
    }

    return solidMaterial
  }, [material, wireframe, viewMode, elementType, elementProperties])

  return <primitive object={enhancedMaterial} attach="material" />
}

// Helper function to create material variants
export const createMaterialVariant = (
  baseMaterial: Material,
  variant: 'weathered' | 'new' | 'damaged' | 'painted'
): Material => {
  const variantMaterial = { ...baseMaterial }

  switch (variant) {
    case 'weathered':
      variantMaterial.properties = {
        ...baseMaterial.properties,
        roughness: Math.min(
          (baseMaterial.properties?.roughness || 0.5) + 0.3,
          1.0
        ),
        metallic: Math.max(
          (baseMaterial.properties?.metallic || 0.0) - 0.2,
          0.0
        ),
      }
      break
    case 'new':
      variantMaterial.properties = {
        ...baseMaterial.properties,
        roughness: Math.max(
          (baseMaterial.properties?.roughness || 0.5) - 0.2,
          0.0
        ),
        metallic: Math.min(
          (baseMaterial.properties?.metallic || 0.0) + 0.1,
          1.0
        ),
      }
      break
    case 'damaged':
      variantMaterial.properties = {
        ...baseMaterial.properties,
        roughness: Math.min(
          (baseMaterial.properties?.roughness || 0.5) + 0.4,
          1.0
        ),
        opacity: Math.max((baseMaterial.properties?.opacity || 1.0) - 0.1, 0.1),
      }
      break
    case 'painted':
      variantMaterial.properties = {
        ...baseMaterial.properties,
        roughness: Math.max(
          (baseMaterial.properties?.roughness || 0.5) - 0.3,
          0.0
        ),
        metallic: 0.0,
      }
      break
  }

  return variantMaterial
}
