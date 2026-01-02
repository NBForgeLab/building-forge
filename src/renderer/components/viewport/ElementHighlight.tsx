/**
 * مكون إبراز العناصر المحددة
 * Element highlight component for selected elements
 */

import { useFrame } from '@react-three/fiber'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BuildingElement } from '../../store/types'

export interface ElementHighlightProps {
  element: BuildingElement
  type: 'selected' | 'hovered'
  color?: string
  opacity?: number
  animated?: boolean
}

export const ElementHighlight: React.FC<ElementHighlightProps> = ({
  element,
  type,
  color = type === 'selected' ? '#00aaff' : '#ffaa00',
  opacity = 0.3,
  animated = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const outlineRef = useRef<THREE.LineSegments>(null)
  const animationRef = useRef({ time: 0, direction: 1 })

  useFrame((state, delta) => {
    if (!animated || !meshRef.current) return

    // Animate opacity for visual feedback
    animationRef.current.time += delta * animationRef.current.direction

    if (animationRef.current.time > 1) {
      animationRef.current.time = 1
      animationRef.current.direction = -1
    } else if (animationRef.current.time < 0) {
      animationRef.current.time = 0
      animationRef.current.direction = 1
    }

    const currentOpacity = opacity * (0.5 + 0.5 * animationRef.current.time)

    if (meshRef.current.material instanceof THREE.Material) {
      meshRef.current.material.opacity = currentOpacity
    }
  })

  useEffect(() => {
    if (!meshRef.current || !outlineRef.current) return

    // Create highlight geometry based on element type
    let geometry: THREE.BufferGeometry

    switch (element.type) {
      case 'wall':
        geometry = createWallHighlightGeometry(element)
        break
      case 'floor':
        geometry = createFloorHighlightGeometry(element)
        break
      case 'door':
      case 'window':
        geometry = createOpeningHighlightGeometry(element)
        break
      default:
        geometry = createDefaultHighlightGeometry(element)
    }

    // Update mesh
    meshRef.current.geometry.dispose()
    meshRef.current.geometry = geometry
    meshRef.current.position.set(
      element.position.x,
      element.position.y,
      element.position.z
    )
    meshRef.current.rotation.set(
      element.rotation.x,
      element.rotation.y,
      element.rotation.z
    )
    meshRef.current.scale.set(element.scale.x, element.scale.y, element.scale.z)

    // Update outline
    const edges = new THREE.EdgesGeometry(geometry)
    outlineRef.current.geometry.dispose()
    outlineRef.current.geometry = edges
    outlineRef.current.position.copy(meshRef.current.position)
    outlineRef.current.rotation.copy(meshRef.current.rotation)
    outlineRef.current.scale.copy(meshRef.current.scale)

    return () => {
      geometry.dispose()
      edges.dispose()
    }
  }, [element])

  return (
    <group>
      {/* Highlight mesh */}
      <mesh ref={meshRef}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Outline */}
      <lineSegments ref={outlineRef}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={Math.min(opacity * 1.5, 1)}
          linewidth={2}
        />
      </lineSegments>
    </group>
  )
}

// Helper functions to create geometry for different element types
function createWallHighlightGeometry(
  element: BuildingElement
): THREE.BufferGeometry {
  const thickness = element.properties.thickness || 0.2
  const height = element.properties.height || 3
  const length = element.properties.length || 1

  return new THREE.BoxGeometry(length, height, thickness)
}

function createFloorHighlightGeometry(
  element: BuildingElement
): THREE.BufferGeometry {
  const thickness = element.properties.thickness || 0.2

  if (element.properties.points && Array.isArray(element.properties.points)) {
    // Create custom geometry from points
    const points = element.properties.points as Array<{
      x: number
      y: number
      z: number
    }>
    const shape = new THREE.Shape()

    if (points.length > 0) {
      shape.moveTo(points[0].x, points[0].z)
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].z)
      }
      shape.closePath()
    }

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false,
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }

  // Fallback to simple box
  return new THREE.BoxGeometry(2, thickness, 2)
}

function createOpeningHighlightGeometry(
  element: BuildingElement
): THREE.BufferGeometry {
  const width = element.properties.width || 1
  const height = element.properties.height || 2
  const depth = 0.1

  return new THREE.BoxGeometry(width, height, depth)
}

function createDefaultHighlightGeometry(
  element: BuildingElement
): THREE.BufferGeometry {
  return new THREE.BoxGeometry(1, 1, 1)
}
