import { useFrame } from '@react-three/fiber'
import React, { useRef } from 'react'
import * as THREE from 'three'
import { useUI, useViewport } from '../../hooks/useStore'

export const LightingSystem: React.FC = () => {
  const { viewportState } = useViewport()
  const { uiState } = useUI()
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)
  const shadowCameraRef = useRef<THREE.OrthographicCamera>(null)
  const timeRef = useRef(0)

  // Update shadow camera to follow the scene and animate lighting
  useFrame((state, delta) => {
    timeRef.current += delta

    if (directionalLightRef.current && shadowCameraRef.current) {
      const light = directionalLightRef.current
      const shadowCamera = shadowCameraRef.current

      // Update shadow camera size based on scene bounds
      const size = 50
      shadowCamera.left = -size
      shadowCamera.right = size
      shadowCamera.top = size
      shadowCamera.bottom = -size
      shadowCamera.updateProjectionMatrix()

      // Subtle light animation for more dynamic feel
      const lightIntensity = viewportState.lighting.directionalIntensity
      light.intensity = lightIntensity + Math.sin(timeRef.current * 0.5) * 0.1
    }
  })

  // Adjust lighting based on theme
  const ambientColor =
    uiState.theme === 'dark' ? viewportState.lighting.ambientColor : '#ffffff'

  const directionalColor =
    uiState.theme === 'dark'
      ? viewportState.lighting.directionalColor
      : '#ffffff'

  return (
    <>
      {/* Ambient Light - provides overall illumination */}
      <ambientLight
        intensity={viewportState.lighting.ambientIntensity}
        color={ambientColor}
      />

      {/* Directional Light - simulates sun/main light source */}
      <directionalLight
        ref={directionalLightRef}
        position={[
          viewportState.lighting.directionalPosition.x,
          viewportState.lighting.directionalPosition.y,
          viewportState.lighting.directionalPosition.z,
        ]}
        intensity={viewportState.lighting.directionalIntensity}
        color={directionalColor}
        castShadow={viewportState.lighting.shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-near={0.1}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
      />

      {/* Hemisphere Light - provides natural sky/ground lighting */}
      <hemisphereLight
        skyColor={viewportState.lighting.skyColor}
        groundColor={viewportState.lighting.groundColor}
        intensity={viewportState.lighting.hemisphereIntensity}
      />

      {/* Point Lights for additional illumination */}
      {viewportState.lighting.pointLights.map((light, index) => (
        <pointLight
          key={index}
          position={[light.position.x, light.position.y, light.position.z]}
          intensity={light.intensity}
          color={light.color}
          distance={light.distance}
          decay={light.decay}
          castShadow={light.castShadow}
        />
      ))}

      {/* Spot Lights for focused illumination */}
      {viewportState.lighting.spotLights.map((light, index) => (
        <spotLight
          key={index}
          position={[light.position.x, light.position.y, light.position.z]}
          target-position={[light.target.x, light.target.y, light.target.z]}
          intensity={light.intensity}
          color={light.color}
          distance={light.distance}
          angle={light.angle}
          penumbra={light.penumbra}
          decay={light.decay}
          castShadow={light.castShadow}
        />
      ))}

      {/* Environment lighting for better material appearance */}
      <group>
        {/* Rim lighting */}
        <directionalLight
          position={[-10, 5, -10]}
          intensity={0.3}
          color="#4A90E2"
        />

        {/* Fill lighting */}
        <directionalLight
          position={[5, -5, 10]}
          intensity={0.2}
          color="#F5A623"
        />
      </group>
    </>
  )
}
