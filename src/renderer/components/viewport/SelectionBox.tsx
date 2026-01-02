/**
 * مكون صندوق التحديد المرئي
 * Visual selection box component
 */

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export interface SelectionBoxProps {
  start?: THREE.Vector3
  end?: THREE.Vector3
  visible?: boolean
  color?: string
  opacity?: number
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  start,
  end,
  visible = false,
  color = '#00aaff',
  opacity = 0.2,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const lineRef = useRef<THREE.LineSegments>(null)

  useEffect(() => {
    if (!visible || !start || !end || !meshRef.current || !lineRef.current) {
      if (meshRef.current) meshRef.current.visible = false
      if (lineRef.current) lineRef.current.visible = false
      return
    }

    // Calculate box dimensions
    const min = new THREE.Vector3(
      Math.min(start.x, end.x),
      Math.min(start.y, end.y),
      Math.min(start.z, end.z)
    )

    const max = new THREE.Vector3(
      Math.max(start.x, end.x),
      Math.max(start.y, end.y),
      Math.max(start.z, end.z)
    )

    const size = max.clone().sub(min)
    const center = min.clone().add(max).multiplyScalar(0.5)

    // Update mesh geometry
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
    meshRef.current.geometry.dispose()
    meshRef.current.geometry = geometry
    meshRef.current.position.copy(center)
    meshRef.current.visible = true

    // Update line geometry for wireframe
    const edges = new THREE.EdgesGeometry(geometry)
    lineRef.current.geometry.dispose()
    lineRef.current.geometry = edges
    lineRef.current.position.copy(center)
    lineRef.current.visible = true
  }, [start, end, visible])

  if (!visible) return null

  return (
    <group>
      {/* Filled box */}
      <mesh ref={meshRef}>
        <boxGeometry />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe outline */}
      <lineSegments ref={lineRef}>
        <edgesGeometry />
        <lineBasicMaterial
          color={color}
          transparent
          opacity={Math.min(opacity * 2, 1)}
        />
      </lineSegments>
    </group>
  )
}
