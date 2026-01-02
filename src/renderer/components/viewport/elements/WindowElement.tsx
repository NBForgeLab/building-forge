import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Element, Material } from '../../../store/types'

export interface WindowElementProps {
  element: Element
  material: Material | undefined
  wireframe: boolean
  viewMode: 'solid' | 'wireframe' | 'textured'
}

export const WindowElement: React.FC<WindowElementProps> = ({
  element,
  material,
  wireframe,
  viewMode,
}) => {
  const groupRef = useRef<THREE.Group>(null)

  // Create window geometry components
  const windowGeometry = useMemo(() => {
    const width = element.properties.width || 1.2 // Default window width
    const height = element.properties.height || 1.5 // Default window height
    const thickness = element.properties.thickness || 0.05 // Default frame thickness
    const glassThickness = 0.01

    return {
      frame: new THREE.BoxGeometry(width, height, thickness),
      glass: new THREE.BoxGeometry(width - 0.1, height - 0.1, glassThickness),
      sill: new THREE.BoxGeometry(width + 0.05, 0.1, thickness + 0.02),
    }
  }, [element.properties])

  // Create materials
  const frameMaterial = useMemo(() => {
    if (wireframe || viewMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: material?.color || '#FFFFFF',
        wireframe: true,
      })
    }

    return new THREE.MeshStandardMaterial({
      color: material?.color || '#FFFFFF',
      roughness: material?.roughness || 0.6,
      metalness: material?.metalness || 0.2,
    })
  }, [material, wireframe, viewMode])

  const glassMaterial = useMemo(() => {
    if (wireframe || viewMode === 'wireframe') {
      return new THREE.MeshBasicMaterial({
        color: '#87CEEB',
        wireframe: true,
      })
    }

    const glassType = element.properties.glassType || 'clear'
    let glassColor = '#87CEEB'
    let opacity = 0.3

    switch (glassType) {
      case 'frosted':
        glassColor = '#F0F8FF'
        opacity = 0.6
        break
      case 'tinted':
        glassColor = '#2F4F4F'
        opacity = 0.5
        break
      case 'clear':
      default:
        glassColor = '#87CEEB'
        opacity = 0.3
        break
    }

    return new THREE.MeshPhysicalMaterial({
      color: glassColor,
      transparent: true,
      opacity: opacity,
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.01,
    })
  }, [element.properties.glassType, wireframe, viewMode])

  const sillMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#D3D3D3',
      roughness: 0.8,
      metalness: 0.1,
    })
  }, [])

  return (
    <group
      ref={groupRef}
      position={[element.position.x, element.position.y, element.position.z]}
      rotation={[element.rotation.x, element.rotation.y, element.rotation.z]}
      scale={[element.scale.x, element.scale.y, element.scale.z]}
    >
      {/* Window frame */}
      <mesh
        geometry={windowGeometry.frame}
        material={frameMaterial}
        castShadow
        receiveShadow
      />

      {/* Glass pane */}
      <mesh
        geometry={windowGeometry.glass}
        material={glassMaterial}
        receiveShadow
      />

      {/* Window sill */}
      <mesh
        position={[0, -(element.properties.height || 1.5) / 2 - 0.05, 0]}
        geometry={windowGeometry.sill}
        material={sillMaterial}
        castShadow
        receiveShadow
      />

      {/* Window dividers (mullions) */}
      {element.properties.hasDividers && (
        <group>
          {/* Vertical divider */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry
              args={[0.02, element.properties.height || 1.5, 0.01]}
            />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>

          {/* Horizontal divider */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[element.properties.width || 1.2, 0.02, 0.01]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}

      {/* Window handles (if openable) */}
      {element.properties.isOpenable && (
        <mesh
          position={[
            (element.properties.width || 1.2) * 0.4,
            0,
            (element.properties.thickness || 0.05) / 2 + 0.01,
          ]}
        >
          <cylinderGeometry args={[0.015, 0.015, 0.06]} />
          <meshStandardMaterial
            color="#C0C0C0"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      )}
    </group>
  )
}
