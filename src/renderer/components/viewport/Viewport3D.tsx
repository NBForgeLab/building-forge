import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import React, { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useUI, useViewport } from '../../hooks/useStore'
import { getTransformToolsManager } from '../../tools/TransformToolsManager'
import { CameraController } from './CameraController'
import { CoordinateDisplay } from './CoordinateDisplay'
import { LightingSystem } from './LightingSystem'
import { PostProcessing } from './PostProcessing'
import { SceneElements } from './SceneElements'
import { ViewCube } from './ViewCube'
import { ViewportGrid } from './ViewportGrid'

export interface Viewport3DProps {
  className?: string
  children?: React.ReactNode
}

// Component to setup tool manager context inside Canvas
const ToolManagerSetup: React.FC = () => {
  const { camera, scene, raycaster, gl } = useThree()

  useEffect(() => {
    if (camera && scene && raycaster && gl) {
      const transformManager = getTransformToolsManager()
      transformManager.setContext({
        camera,
        scene,
        raycaster,
        renderer: gl,
        canvas: gl.domElement,
      })
    }
  }, [camera, scene, raycaster, gl])

  return null
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  className = '',
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { uiState } = useUI()
  const { viewportState } = useViewport()

  // Canvas settings optimized for architectural visualization
  const canvasSettings = {
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance' as const,
    stencil: false,
    depth: true,
    logarithmicDepthBuffer: true, // Better depth precision for large scenes
  }

  // Camera settings
  const cameraSettings = {
    fov: 50, // Good for architectural visualization
    near: 0.1,
    far: 10000, // Large far plane for big buildings
    position: [10, 10, 10] as [number, number, number],
  }

  return (
    <div
      className={`relative w-full h-full bg-gray-100 dark:bg-gray-900 ${className}`}
    >
      <Canvas
        ref={canvasRef}
        camera={cameraSettings}
        gl={canvasSettings}
        shadows={viewportState.lighting.shadows}
        className="w-full h-full"
        onCreated={({ gl, scene, camera }) => {
          // Configure renderer for better quality
          gl.shadowMap.enabled = viewportState.lighting.shadows
          gl.shadowMap.type = THREE.PCFSoftShadowMap
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.0

          // Set background color based on theme
          scene.background = new THREE.Color(
            uiState.theme === 'dark' ? 0x1a1a1a : 0xf5f5f5
          )

          // Configure camera
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.position.set(...cameraSettings.position)
            camera.lookAt(0, 0, 0)
          }
        }}
      >
        <Suspense fallback={null}>
          {/* Setup tool manager context */}
          <ToolManagerSetup />

          {/* Camera Controller */}
          <CameraController />

          {/* Lighting System */}
          <LightingSystem />

          {/* Grid */}
          {uiState.showGrid && <ViewportGrid />}

          {/* Scene Elements */}
          <SceneElements />

          {/* Transform Gizmos and other children */}
          {children}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            enableDamping={true}
            dampingFactor={0.05}
            screenSpacePanning={false}
            minDistance={1}
            maxDistance={1000}
            maxPolarAngle={Math.PI / 2} // Prevent going below ground
            target={[0, 0, 0]}
          />

          {/* ViewCube for navigation */}
          <ViewCube />

          {/* Performance Stats */}
          {uiState.showStats && <Stats />}

          {/* Post-processing effects */}
          <PostProcessing />
        </Suspense>

        {/* Coordinate Display */}
        <CoordinateDisplay />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
          <div>Camera: {uiState.cameraMode}</div>
          <div>View: {uiState.viewMode}</div>
          {viewportState.camera.position && (
            <div>
              Position: {viewportState.camera.position.x.toFixed(1)},{' '}
              {viewportState.camera.position.y.toFixed(1)},{' '}
              {viewportState.camera.position.z.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
