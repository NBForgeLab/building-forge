import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Element, Material } from '../../../store/types'

export interface WallElementProps {
  element: Element
  material: Material | undefined
  wireframe: boolean
  viewMode: 'solid' | 'wireframe' | 'textured'
}

export const WallElement: React.FC<WallElementProps> = ({
  element,
  material,
  wireframe,
  viewMode,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)

  // Create wall geometry based on element properties
  const geometry = useMemo(() => {
    const width = element.properties.width || 0.2 // Default wall thickness
    const height = element.properties.height || 3 // Default wall height
    const length = element.properties.length || 4 // Default wall length

    return new THREE.BoxGeometry(length, height, width)
  }, [element.properties])

  // Create material based on view mode and material properties
  const wallMaterial = useMemo(() => {
    if (wireframe || viewMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: material?.color || '#ffffff',
        wireframe: true,
      })
    }

    if (viewMode === 'textured' && material?.textures?.albedo) {
      const texture = new THREE.TextureLoader().load(material.textures.albedo)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(
        (element.properties.length || 4) / (material.textureScale?.x || 1),
        (element.properties.height || 3) / (material.textureScale?.y || 1)
      )

      return new THREE.MeshStandardMaterial({
        map: texture,
        color: material.color || '#ffffff',
        roughness: material.roughness || 0.8,
        metalness: material.metalness || 0.1,
        transparent: material.opacity !== undefined,
        opacity: material.opacity || 1,
      })
    }

    // Solid material
    return new THREE.MeshStandardMaterial({
      color: material?.color || '#ffffff',
      roughness: material?.roughness || 0.8,
      metalness: material?.metalness || 0.1,
      transparent: material?.opacity !== undefined,
      opacity: material?.opacity || 1,
    })
  }, [material, wireframe, viewMode, element.properties])

  return (
    <mesh
      ref={meshRef}
      position={[element.position.x, element.position.y, element.position.z]}
      rotation={[element.rotation.x, element.rotation.y, element.rotation.z]}
      scale={[element.scale.x, element.scale.y, element.scale.z]}
      geometry={geometry}
      material={wallMaterial}
      castShadow
      receiveShadow
    />
  )
}
