import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Element, Material } from '../../../store/types'

export interface FloorElementProps {
  element: Element
  material: Material | undefined
  wireframe: boolean
  viewMode: 'solid' | 'wireframe' | 'textured'
}

export const FloorElement: React.FC<FloorElementProps> = ({
  element,
  material,
  wireframe,
  viewMode,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)

  // Create floor geometry based on element properties
  const geometry = useMemo(() => {
    const width = element.properties.width || 4 // Default floor width
    const height = element.properties.height || 0.1 // Default floor thickness
    const depth = element.properties.depth || 4 // Default floor depth

    // For complex floor shapes, we could use Shape geometry
    if (element.properties.shape === 'custom' && element.properties.points) {
      const shape = new THREE.Shape()
      const points = element.properties.points as Array<{
        x: number
        y: number
      }>

      if (points.length > 0) {
        shape.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          shape.lineTo(points[i].x, points[i].y)
        }
        shape.closePath()
      }

      const extrudeSettings = {
        depth: height,
        bevelEnabled: false,
      }

      return new THREE.ExtrudeGeometry(shape, extrudeSettings)
    }

    // Default rectangular floor
    return new THREE.BoxGeometry(width, height, depth)
  }, [element.properties])

  // Create material based on view mode and material properties
  const floorMaterial = useMemo(() => {
    if (wireframe || viewMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: material?.color || '#cccccc',
        wireframe: true,
      })
    }

    if (viewMode === 'textured' && material?.textures?.albedo) {
      const texture = new THREE.TextureLoader().load(material.textures.albedo)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(
        (element.properties.width || 4) / (material.textureScale?.x || 1),
        (element.properties.depth || 4) / (material.textureScale?.y || 1)
      )

      return new THREE.MeshStandardMaterial({
        map: texture,
        color: material.color || '#cccccc',
        roughness: material.roughness || 0.9,
        metalness: material.metalness || 0.0,
        transparent: material.opacity !== undefined,
        opacity: material.opacity || 1,
      })
    }

    // Solid material
    return new THREE.MeshStandardMaterial({
      color: material?.color || '#cccccc',
      roughness: material?.roughness || 0.9,
      metalness: material?.metalness || 0.0,
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
      material={floorMaterial}
      castShadow
      receiveShadow
    />
  )
}
