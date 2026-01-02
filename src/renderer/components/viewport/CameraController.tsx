import { useFrame, useThree } from '@react-three/fiber'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useUI, useViewport } from '../../hooks/useStore'

export const CameraController: React.FC = () => {
  const { camera, gl } = useThree()
  const { uiState } = useUI()
  const { viewportState, updateCamera } = useViewport()
  const previousCameraMode = useRef(uiState.cameraMode)
  const targetPosition = useRef(new THREE.Vector3())
  const targetLookAt = useRef(new THREE.Vector3())
  const isTransitioning = useRef(false)
  const transitionProgress = useRef(0)
  const transitionDuration = 1.0 // seconds

  // Update camera type when mode changes
  useEffect(() => {
    if (previousCameraMode.current !== uiState.cameraMode) {
      const currentPosition = camera.position.clone()
      const currentTarget = new THREE.Vector3(0, 0, 0)

      if (uiState.cameraMode === 'orthographic') {
        // Switch to orthographic camera
        const aspect = gl.domElement.width / gl.domElement.height
        const frustumSize = 20
        const orthoCamera = new THREE.OrthographicCamera(
          (frustumSize * aspect) / -2,
          (frustumSize * aspect) / 2,
          frustumSize / 2,
          frustumSize / -2,
          0.1,
          1000
        )

        orthoCamera.position.copy(currentPosition)
        orthoCamera.lookAt(currentTarget)
        orthoCamera.updateProjectionMatrix()

        // Replace camera (this is a hack, normally you'd manage this at a higher level)
        Object.setPrototypeOf(camera, THREE.OrthographicCamera.prototype)
        Object.assign(camera, orthoCamera)
      } else {
        // Switch to perspective camera
        const perspCamera = new THREE.PerspectiveCamera(
          50,
          gl.domElement.width / gl.domElement.height,
          0.1,
          1000
        )
        perspCamera.position.copy(currentPosition)
        perspCamera.lookAt(currentTarget)
        perspCamera.updateProjectionMatrix()

        // Replace camera
        Object.setPrototypeOf(camera, THREE.PerspectiveCamera.prototype)
        Object.assign(camera, perspCamera)
      }

      previousCameraMode.current = uiState.cameraMode
    }
  }, [uiState.cameraMode, camera, gl])

  // Handle smooth camera transitions
  useFrame((state, delta) => {
    // Update camera position in store
    updateCamera({
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      rotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z,
      },
      zoom: camera instanceof THREE.OrthographicCamera ? camera.zoom : 1,
    })

    // Handle smooth transitions
    if (isTransitioning.current) {
      transitionProgress.current += delta / transitionDuration

      if (transitionProgress.current >= 1) {
        // Transition complete
        transitionProgress.current = 1
        isTransitioning.current = false
      }

      // Smooth easing function
      const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      const progress = easeInOutCubic(transitionProgress.current)

      // Interpolate position
      camera.position.lerpVectors(
        camera.position,
        targetPosition.current,
        progress * 0.1 // Smooth interpolation
      )

      // Update look at
      camera.lookAt(targetLookAt.current)
      camera.updateProjectionMatrix()
    }
  })

  // Handle camera presets with smooth transitions
  useEffect(() => {
    if (viewportState.camera.preset) {
      const presets = {
        front: { position: [0, 0, 20], target: [0, 0, 0] },
        back: { position: [0, 0, -20], target: [0, 0, 0] },
        left: { position: [-20, 0, 0], target: [0, 0, 0] },
        right: { position: [20, 0, 0], target: [0, 0, 0] },
        top: { position: [0, 20, 0], target: [0, 0, 0] },
        bottom: { position: [0, -20, 0], target: [0, 0, 0] },
        isometric: { position: [15, 15, 15], target: [0, 0, 0] },
      }

      const preset =
        presets[viewportState.camera.preset as keyof typeof presets]
      if (preset) {
        // Start smooth transition
        targetPosition.current.set(
          ...(preset.position as [number, number, number])
        )
        targetLookAt.current.set(...(preset.target as [number, number, number]))
        isTransitioning.current = true
        transitionProgress.current = 0
      }
    }
  }, [viewportState.camera.preset])

  // Focus on selected elements
  useEffect(() => {
    // This would be implemented when we have selection system
    // For now, we'll leave it as a placeholder
  }, [])

  return null
}
