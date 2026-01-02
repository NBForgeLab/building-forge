import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import React, { useState } from 'react'
import * as THREE from 'three'
import { useViewport } from '../../hooks/useStore'

export const CoordinateDisplay: React.FC = () => {
  const { camera, raycaster, pointer } = useThree()
  const { viewportState } = useViewport()
  const [worldPosition, setWorldPosition] = useState<THREE.Vector3>(
    new THREE.Vector3()
  )
  const [screenPosition, setScreenPosition] = useState<{
    x: number
    y: number
  }>({ x: 0, y: 0 })

  // Update world position based on mouse/pointer position
  useFrame(() => {
    // Create a plane at y=0 to intersect with
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersection = new THREE.Vector3()

    // Cast ray from camera through mouse position
    raycaster.setFromCamera(pointer, camera)

    // Find intersection with ground plane
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      setWorldPosition(intersection)
    }

    // Update screen position
    setScreenPosition({ x: pointer.x, y: pointer.y })
  })

  // Format coordinate values
  const formatCoordinate = (value: number): string => {
    return value.toFixed(2)
  }

  // Convert world units to display units
  const getDisplayUnits = () => {
    // This would be configurable based on project settings
    return 'm' // meters
  }

  return (
    <Html
      position={[0, 0, 0]}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm font-mono">
        <div className="grid grid-cols-2 gap-4">
          {/* World Coordinates */}
          <div>
            <div className="text-xs text-gray-300 mb-1">إحداثيات العالم</div>
            <div className="space-y-1">
              <div>
                X: {formatCoordinate(worldPosition.x)} {getDisplayUnits()}
              </div>
              <div>
                Y: {formatCoordinate(worldPosition.y)} {getDisplayUnits()}
              </div>
              <div>
                Z: {formatCoordinate(worldPosition.z)} {getDisplayUnits()}
              </div>
            </div>
          </div>

          {/* Camera Information */}
          <div>
            <div className="text-xs text-gray-300 mb-1">معلومات الكاميرا</div>
            <div className="space-y-1">
              <div>
                الموضع: {formatCoordinate(viewportState.camera.position.x)},{' '}
                {formatCoordinate(viewportState.camera.position.y)},{' '}
                {formatCoordinate(viewportState.camera.position.z)}
              </div>
              <div>التكبير: {formatCoordinate(viewportState.camera.zoom)}x</div>
              <div>
                الوضع:{' '}
                {viewportState.camera.viewMode === 'perspective'
                  ? 'منظوري'
                  : 'متعامد'}
              </div>
            </div>
          </div>
        </div>

        {/* Grid Information */}
        {viewportState.grid.visible && (
          <div className="mt-3 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-300 mb-1">معلومات الشبكة</div>
            <div className="text-xs">
              الحجم: {viewportState.grid.size} {getDisplayUnits()} | التقسيمات:{' '}
              {viewportState.grid.divisions}
            </div>
          </div>
        )}

        {/* Performance Information */}
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            الشاشة: {screenPosition.x.toFixed(3)}, {screenPosition.y.toFixed(3)}
          </div>
        </div>
      </div>
    </Html>
  )
}
