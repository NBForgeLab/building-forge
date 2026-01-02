import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Element, Material } from '../../../store/types'

export interface DoorElementProps {
  element: Element
  material: Material | undefined
  wireframe: boolean
  viewMode: 'solid' | 'wireframe' | 'textured'
}

export const DoorElement: React.FC<DoorElementProps> = ({
  element,
  material,
  wireframe,
  viewMode,
}) => {
  const groupRef = useRef<THREE.Group>(null)

  // Create door geometry components
  const doorGeometry = useMemo(() => {
    const width = element.properties.width || 0.8 // Default door width
    const height = element.properties.height || 2.1 // Default door height
    const thickness = element.properties.thickness || 0.05 // Default door thickness

    return {
      door: new THREE.BoxGeometry(width, height, thickness),
      frame: new THREE.BoxGeometry(width + 0.1, height + 0.1, thickness + 0.02),
    }
  }, [element.properties])

  // Create materials
  const doorMaterial = useMemo(() => {
    if (wireframe || viewMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: material?.color || '#8B4513',
        wireframe: true,
      })
    }

    if (viewMode === 'textured' && material?.textures?.albedo) {
      const texture = new THREE.TextureLoader().load(material.textures.albedo)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping

      return new THREE.MeshStandardMaterial({
        map: texture,
        color: material.color || '#8B4513',
        roughness: material.roughness || 0.7,
        metalness: material.metalness || 0.1,
        transparent: material.opacity !== undefined,
        opacity: material.opacity || 1,
      })
    }

    return new THREE.MeshStandardMaterial({
      color: material?.color || '#8B4513',
      roughness: material?.roughness || 0.7,
      metalness: material?.metalness || 0.1,
      transparent: material?.opacity !== undefined,
      opacity: material?.opacity || 1,
    })
  }, [material, wireframe, viewMode])

  const frameMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#654321',
      roughness: 0.8,
      metalness: 0.1,
    })
  }, [])

  // Door opening animation (if door is open)
  const doorRotation = element.properties.isOpen
    ? [0, Math.PI / 2, 0]
    : [0, 0, 0]
  const doorPosition = element.properties.isOpen
    ? [-(element.properties.width || 0.8) / 2, 0, 0]
    : [0, 0, 0]

  return (
    <group
      ref={groupRef}
      position={[element.position.x, element.position.y, element.position.z]}
      rotation={[element.rotation.x, element.rotation.y, element.rotation.z]}
      scale={[element.scale.x, element.scale.y, element.scale.z]}
    >
      {/* Door frame */}
      <mesh
        geometry={doorGeometry.frame}
        material={frameMaterial}
        castShadow
        receiveShadow
      />

      {/* Door panel */}
      <mesh
        position={doorPosition as [number, number, number]}
        rotation={doorRotation as [number, number, number]}
        geometry={doorGeometry.door}
        material={doorMaterial}
        castShadow
        receiveShadow
      />

      {/* Door handle */}
      <mesh
        position={[
          (element.properties.width || 0.8) * 0.35,
          0,
          (element.properties.thickness || 0.05) / 2 + 0.01,
        ]}
      >
        <cylinderGeometry args={[0.02, 0.02, 0.1]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Door hinges */}
      {[0.3, -0.3].map((yOffset, index) => (
        <mesh
          key={index}
          position={[
            -(element.properties.width || 0.8) / 2,
            yOffset * (element.properties.height || 2.1),
            0,
          ]}
        >
          <cylinderGeometry args={[0.015, 0.015, 0.08]} />
          <meshStandardMaterial
            color="#404040"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}
