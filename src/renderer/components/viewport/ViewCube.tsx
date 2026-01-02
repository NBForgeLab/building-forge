import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import React, { useRef, useState } from 'react'
import * as THREE from 'three'
import { useViewport } from '../../hooks/useStore'

export const ViewCube: React.FC = () => {
  const { camera, gl } = useThree()
  const { setCameraPreset } = useViewport()
  const cubeRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  // Update cube rotation to match camera
  useFrame(() => {
    if (cubeRef.current) {
      // Make the cube rotate opposite to the camera to show current view
      const cameraDirection = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)

      // Convert camera direction to cube rotation
      const euler = new THREE.Euler()
      euler.setFromVector3(cameraDirection.multiplyScalar(-1))
      cubeRef.current.rotation.copy(euler)
    }
  })

  const faces = [
    {
      name: 'front',
      position: [0, 0, 0.5],
      rotation: [0, 0, 0],
      preset: 'front' as const,
    },
    {
      name: 'back',
      position: [0, 0, -0.5],
      rotation: [0, Math.PI, 0],
      preset: 'back' as const,
    },
    {
      name: 'right',
      position: [0.5, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      preset: 'right' as const,
    },
    {
      name: 'left',
      position: [-0.5, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
      preset: 'left' as const,
    },
    {
      name: 'top',
      position: [0, 0.5, 0],
      rotation: [-Math.PI / 2, 0, 0],
      preset: 'top' as const,
    },
    {
      name: 'bottom',
      position: [0, -0.5, 0],
      rotation: [Math.PI / 2, 0, 0],
      preset: 'bottom' as const,
    },
  ]

  const faceLabels = {
    front: 'أمامي',
    back: 'خلفي',
    right: 'يمين',
    left: 'يسار',
    top: 'علوي',
    bottom: 'سفلي',
  }

  const handleFaceClick = (preset: (typeof faces)[0]['preset']) => {
    setCameraPreset(preset)
  }

  return (
    <Html
      position={[0, 0, 0]}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        pointerEvents: 'auto',
        zIndex: 1000,
      }}
    >
      <div className="relative w-20 h-20">
        {/* ViewCube container */}
        <div
          className="w-full h-full relative cursor-pointer"
          style={{
            perspective: '200px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Cube faces */}
          {faces.map(face => (
            <div
              key={face.name}
              className={`
                absolute w-full h-full flex items-center justify-center text-xs font-bold
                border border-gray-400 transition-all duration-200
                ${
                  hovered === face.name
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }
              `}
              style={{
                transform: `
                  translate3d(${face.position[0] * 40}px, ${face.position[1] * 40}px, ${face.position[2] * 40}px)
                  rotateX(${face.rotation[0]}rad)
                  rotateY(${face.rotation[1]}rad)
                  rotateZ(${face.rotation[2]}rad)
                `,
                backfaceVisibility: 'hidden',
              }}
              onClick={() => handleFaceClick(face.preset)}
              onMouseEnter={() => setHovered(face.name)}
              onMouseLeave={() => setHovered(null)}
            >
              {faceLabels[face.name as keyof typeof faceLabels]}
            </div>
          ))}

          {/* Corner indicators */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
        </div>

        {/* Compass */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="w-6 h-6 bg-white border border-gray-400 rounded-full flex items-center justify-center text-xs font-bold">
            N
          </div>
        </div>
      </div>
    </Html>
  )
}
