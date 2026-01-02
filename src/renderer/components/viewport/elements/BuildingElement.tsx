import { useFrame } from '@react-three/fiber'
import React, { useRef, useState } from 'react'
import * as THREE from 'three'
import { useMaterials, useSelection } from '../../../hooks/useStore'
import { Element } from '../../../store/types'
import { DoorElement } from './DoorElement'
import { FloorElement } from './FloorElement'
import { WallElement } from './WallElement'
import { WindowElement } from './WindowElement'

export interface BuildingElementProps {
  element: Element
  isSelected: boolean
  isHovered: boolean
  wireframe: boolean
  viewMode: 'solid' | 'wireframe' | 'textured'
}

export const BuildingElement: React.FC<BuildingElementProps> = ({
  element,
  isSelected,
  isHovered,
  wireframe,
  viewMode,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const outlineRef = useRef<THREE.LineSegments>(null)
  const [animationTime, setAnimationTime] = useState(0)

  const { getMaterialById } = useMaterials()
  const { selectElement, setHoveredElement } = useSelection()

  // Get material for the element
  const material = getMaterialById(element.materialId)

  // Animation for selected elements
  useFrame((state, delta) => {
    if (isSelected) {
      setAnimationTime(prev => prev + delta)

      if (outlineRef.current) {
        // Pulsing outline effect
        const pulse = Math.sin(animationTime * 3) * 0.5 + 0.5
        outlineRef.current.material.opacity = 0.3 + pulse * 0.4
      }
    }
  })

  // Handle click events
  const handleClick = (event: THREE.Event) => {
    event.stopPropagation()
    selectElement(element.id)
  }

  // Handle hover events
  const handlePointerOver = (event: THREE.Event) => {
    event.stopPropagation()
    setHoveredElement(element.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    setHoveredElement(null)
    document.body.style.cursor = 'default'
  }

  // Create outline geometry for selection
  const createOutlineGeometry = (geometry: THREE.BufferGeometry) => {
    const edges = new THREE.EdgesGeometry(geometry)
    return edges
  }

  // Render different element types
  const renderElementGeometry = () => {
    switch (element.type) {
      case 'wall':
        return (
          <WallElement
            element={element}
            material={material}
            wireframe={wireframe}
            viewMode={viewMode}
          />
        )
      case 'floor':
        return (
          <FloorElement
            element={element}
            material={material}
            wireframe={wireframe}
            viewMode={viewMode}
          />
        )
      case 'door':
        return (
          <DoorElement
            element={element}
            material={material}
            wireframe={wireframe}
            viewMode={viewMode}
          />
        )
      case 'window':
        return (
          <WindowElement
            element={element}
            material={material}
            wireframe={wireframe}
            viewMode={viewMode}
          />
        )
      default:
        // Default cube for unknown types
        return (
          <mesh
            ref={meshRef}
            position={[
              element.position.x,
              element.position.y,
              element.position.z,
            ]}
            rotation={[
              element.rotation.x,
              element.rotation.y,
              element.rotation.z,
            ]}
            scale={[element.scale.x, element.scale.y, element.scale.z]}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={material?.color || '#ffffff'}
              wireframe={wireframe}
              transparent={material?.opacity !== undefined}
              opacity={material?.opacity || 1}
            />
          </mesh>
        )
    }
  }

  return (
    <group name={`element-${element.id}`}>
      {renderElementGeometry()}

      {/* Selection outline */}
      {(isSelected || isHovered) && meshRef.current && (
        <lineSegments
          ref={outlineRef}
          geometry={createOutlineGeometry(meshRef.current.geometry)}
          position={meshRef.current.position}
          rotation={meshRef.current.rotation}
          scale={meshRef.current.scale}
        >
          <lineBasicMaterial
            color={isSelected ? '#00ff00' : '#ffff00'}
            transparent
            opacity={isSelected ? 0.8 : 0.5}
            linewidth={2}
          />
        </lineSegments>
      )}

      {/* Hover highlight */}
      {isHovered && !isSelected && (
        <mesh
          position={[
            element.position.x,
            element.position.y,
            element.position.z,
          ]}
          rotation={[
            element.rotation.x,
            element.rotation.y,
            element.rotation.z,
          ]}
          scale={[
            element.scale.x * 1.02,
            element.scale.y * 1.02,
            element.scale.z * 1.02,
          ]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.2}
            wireframe={false}
          />
        </mesh>
      )}
    </group>
  )
}
