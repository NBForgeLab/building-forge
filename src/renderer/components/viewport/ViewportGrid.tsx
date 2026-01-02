import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useViewport } from '../../hooks/useStore'

export const ViewportGrid: React.FC = () => {
  const { viewportState } = useViewport()

  // Create grid geometry and material
  const gridGeometry = useMemo(() => {
    const size = viewportState.grid.size
    const divisions = viewportState.grid.divisions

    const geometry = new THREE.BufferGeometry()
    const vertices = []
    const colors = []

    const step = size / divisions
    const halfSize = size / 2

    // Create grid lines
    for (let i = 0; i <= divisions; i++) {
      const position = -halfSize + i * step

      // Vertical lines
      vertices.push(-halfSize, 0, position, halfSize, 0, position)
      // Horizontal lines
      vertices.push(position, 0, -halfSize, position, 0, halfSize)

      // Color major and minor grid lines differently
      const isMajor = i % (divisions / 10) === 0
      const color = isMajor
        ? viewportState.grid.majorColor
        : viewportState.grid.minorColor
      const colorObj = new THREE.Color(color)

      // Add colors for both line endpoints
      colors.push(
        colorObj.r,
        colorObj.g,
        colorObj.b,
        colorObj.r,
        colorObj.g,
        colorObj.b
      )
      colors.push(
        colorObj.r,
        colorObj.g,
        colorObj.b,
        colorObj.r,
        colorObj.g,
        colorObj.b
      )
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    )
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    return geometry
  }, [viewportState.grid])

  const gridMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: viewportState.grid.opacity,
    })
  }, [viewportState.grid.opacity])

  if (!viewportState.grid.visible) {
    return null
  }

  return (
    <group>
      {/* Main grid */}
      <lineSegments geometry={gridGeometry} material={gridMaterial} />

      {/* Coordinate axes */}
      <group>
        {/* X-axis (red) */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={
                new Float32Array([0, 0, 0, viewportState.grid.size / 2, 0, 0])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff0000" linewidth={2} />
        </line>

        {/* Y-axis (green) */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={
                new Float32Array([0, 0, 0, 0, viewportState.grid.size / 2, 0])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ff00" linewidth={2} />
        </line>

        {/* Z-axis (blue) */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={
                new Float32Array([0, 0, 0, 0, 0, viewportState.grid.size / 2])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#0000ff" linewidth={2} />
        </line>
      </group>

      {/* Grid labels */}
      {viewportState.grid.showLabels && (
        <group>
          {/* Add text labels for major grid lines */}
          {/* This would require a text rendering solution like troika-three-text */}
        </group>
      )}
    </group>
  )
}
