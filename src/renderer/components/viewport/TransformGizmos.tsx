/**
 * مكونات Gizmos للتحويلات ثلاثية الأبعاد
 * Transform gizmos for 3D transformations
 */

import React, { useMemo, useRef } from 'react'
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Group,
  MeshBasicMaterial,
  TorusGeometry,
  Vector3,
} from 'three'
import { useStore } from '../../store'
import { MoveGizmoData } from '../../tools/MoveTool'
import { RotateGizmoData } from '../../tools/RotateTool'
import { ScaleGizmoData } from '../../tools/ScaleTool'

interface TransformGizmosProps {
  moveData?: MoveGizmoData
  rotateData?: RotateGizmoData
  scaleData?: ScaleGizmoData
}

interface GizmoAxisProps {
  axis: 'x' | 'y' | 'z'
  color: string
  hoverColor: string
  activeColor: string
  isHovered?: boolean
  isActive?: boolean
  position: Vector3
  rotation?: Euler
  scale?: number
}

// Move Gizmo Components
const MoveAxisArrow: React.FC<GizmoAxisProps> = ({
  axis,
  color,
  hoverColor,
  activeColor,
  isHovered,
  isActive,
  position,
  rotation,
  scale = 1,
}) => {
  const groupRef = useRef<Group>(null)

  const currentColor = isActive ? activeColor : isHovered ? hoverColor : color

  const arrowGeometry = useMemo(() => {
    const shaft = new CylinderGeometry(
      0.02 * scale,
      0.02 * scale,
      0.8 * scale,
      8
    )
    const head = new ConeGeometry(0.06 * scale, 0.2 * scale, 8)
    return { shaft, head }
  }, [scale])

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: currentColor,
        transparent: true,
        opacity: 0.8,
      }),
    [currentColor]
  )

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Arrow shaft */}
      <mesh
        geometry={arrowGeometry.shaft}
        material={material}
        position={[0, 0.4 * scale, 0]}
      />
      {/* Arrow head */}
      <mesh
        geometry={arrowGeometry.head}
        material={material}
        position={[0, 0.9 * scale, 0]}
      />
    </group>
  )
}

const MovePlaneHandle: React.FC<{
  plane: 'xy' | 'xz' | 'yz'
  color: string
  hoverColor: string
  activeColor: string
  isHovered?: boolean
  isActive?: boolean
  position: Vector3
  scale?: number
}> = ({
  plane,
  color,
  hoverColor,
  activeColor,
  isHovered,
  isActive,
  position,
  scale = 1,
}) => {
  const currentColor = isActive ? activeColor : isHovered ? hoverColor : color

  const planeGeometry = useMemo(
    () => new BoxGeometry(0.2 * scale, 0.2 * scale, 0.02 * scale),
    [scale]
  )

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: currentColor,
        transparent: true,
        opacity: 0.3,
      }),
    [currentColor]
  )

  const rotation = useMemo(() => {
    switch (plane) {
      case 'xy':
        return new Euler(0, 0, 0)
      case 'xz':
        return new Euler(Math.PI / 2, 0, 0)
      case 'yz':
        return new Euler(0, 0, Math.PI / 2)
    }
  }, [plane])

  return (
    <mesh
      geometry={planeGeometry}
      material={material}
      position={position}
      rotation={rotation}
    />
  )
}

const MoveGizmo: React.FC<{ data: MoveGizmoData }> = ({ data }) => {
  const gizmoScale = 0.15 // Base scale for gizmo

  if (!data.visible) return null

  return (
    <group position={data.position}>
      {/* X Axis - Red */}
      <MoveAxisArrow
        axis="x"
        color="#ff4444"
        hoverColor="#ff6666"
        activeColor="#ff0000"
        isHovered={data.hoveredAxis === 'x'}
        isActive={data.activeAxis === 'x'}
        position={new Vector3(0.5 * gizmoScale, 0, 0)}
        rotation={new Euler(0, 0, -Math.PI / 2)}
        scale={gizmoScale}
      />

      {/* Y Axis - Green */}
      <MoveAxisArrow
        axis="y"
        color="#44ff44"
        hoverColor="#66ff66"
        activeColor="#00ff00"
        isHovered={data.hoveredAxis === 'y'}
        isActive={data.activeAxis === 'y'}
        position={new Vector3(0, 0.5 * gizmoScale, 0)}
        rotation={new Euler(0, 0, 0)}
        scale={gizmoScale}
      />

      {/* Z Axis - Blue */}
      <MoveAxisArrow
        axis="z"
        color="#4444ff"
        hoverColor="#6666ff"
        activeColor="#0000ff"
        isHovered={data.hoveredAxis === 'z'}
        isActive={data.activeAxis === 'z'}
        position={new Vector3(0, 0, 0.5 * gizmoScale)}
        rotation={new Euler(Math.PI / 2, 0, 0)}
        scale={gizmoScale}
      />

      {/* Plane handles */}
      <MovePlaneHandle
        plane="xy"
        color="#ffff44"
        hoverColor="#ffff66"
        activeColor="#ffff00"
        isHovered={data.hoveredAxis === 'xy'}
        isActive={data.activeAxis === 'xy'}
        position={new Vector3(0.3 * gizmoScale, 0.3 * gizmoScale, 0)}
        scale={gizmoScale}
      />

      <MovePlaneHandle
        plane="xz"
        color="#ff44ff"
        hoverColor="#ff66ff"
        activeColor="#ff00ff"
        isHovered={data.hoveredAxis === 'xz'}
        isActive={data.activeAxis === 'xz'}
        position={new Vector3(0.3 * gizmoScale, 0, 0.3 * gizmoScale)}
        scale={gizmoScale}
      />

      <MovePlaneHandle
        plane="yz"
        color="#44ffff"
        hoverColor="#66ffff"
        activeColor="#00ffff"
        isHovered={data.hoveredAxis === 'yz'}
        isActive={data.activeAxis === 'yz'}
        position={new Vector3(0, 0.3 * gizmoScale, 0.3 * gizmoScale)}
        scale={gizmoScale}
      />

      {/* Center sphere for free movement */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05 * gizmoScale, 16, 16]} />
        <meshBasicMaterial
          color={data.activeAxis === 'xyz' ? '#ffffff' : '#cccccc'}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}

// Rotate Gizmo Components
const RotateRing: React.FC<{
  axis: 'x' | 'y' | 'z' | 'screen'
  color: string
  hoverColor: string
  activeColor: string
  isHovered?: boolean
  isActive?: boolean
  position: Vector3
  rotation?: Euler
  scale?: number
}> = ({
  axis,
  color,
  hoverColor,
  activeColor,
  isHovered,
  isActive,
  position,
  rotation,
  scale = 1,
}) => {
  const currentColor = isActive ? activeColor : isHovered ? hoverColor : color

  const ringGeometry = useMemo(
    () => new TorusGeometry(0.8 * scale, 0.02 * scale, 8, 32),
    [scale]
  )

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: currentColor,
        transparent: true,
        opacity: 0.8,
      }),
    [currentColor]
  )

  return (
    <mesh
      geometry={ringGeometry}
      material={material}
      position={position}
      rotation={rotation}
    />
  )
}

const RotateGizmo: React.FC<{ data: RotateGizmoData }> = ({ data }) => {
  const gizmoScale = 0.15

  if (!data.visible) return null

  return (
    <group position={data.position} rotation={data.rotation}>
      {/* X Axis Ring - Red */}
      <RotateRing
        axis="x"
        color="#ff4444"
        hoverColor="#ff6666"
        activeColor="#ff0000"
        isHovered={data.hoveredAxis === 'x'}
        isActive={data.activeAxis === 'x'}
        position={new Vector3(0, 0, 0)}
        rotation={new Euler(0, Math.PI / 2, 0)}
        scale={gizmoScale}
      />

      {/* Y Axis Ring - Green */}
      <RotateRing
        axis="y"
        color="#44ff44"
        hoverColor="#66ff66"
        activeColor="#00ff00"
        isHovered={data.hoveredAxis === 'y'}
        isActive={data.activeAxis === 'y'}
        position={new Vector3(0, 0, 0)}
        rotation={new Euler(0, 0, 0)}
        scale={gizmoScale}
      />

      {/* Z Axis Ring - Blue */}
      <RotateRing
        axis="z"
        color="#4444ff"
        hoverColor="#6666ff"
        activeColor="#0000ff"
        isHovered={data.hoveredAxis === 'z'}
        isActive={data.activeAxis === 'z'}
        position={new Vector3(0, 0, 0)}
        rotation={new Euler(Math.PI / 2, 0, 0)}
        scale={gizmoScale}
      />

      {/* Screen space ring - White */}
      <RotateRing
        axis="screen"
        color="#ffffff"
        hoverColor="#cccccc"
        activeColor="#888888"
        isHovered={data.hoveredAxis === 'screen'}
        isActive={data.activeAxis === 'screen'}
        position={new Vector3(0, 0, 0)}
        rotation={new Euler(0, 0, 0)}
        scale={gizmoScale * 1.1}
      />

      {/* Center sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.03 * gizmoScale, 16, 16]} />
        <meshBasicMaterial color="#cccccc" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}

// Scale Gizmo Components
const ScaleHandle: React.FC<{
  axis: 'x' | 'y' | 'z'
  color: string
  hoverColor: string
  activeColor: string
  isHovered?: boolean
  isActive?: boolean
  position: Vector3
  rotation?: Euler
  scale?: number
}> = ({
  axis,
  color,
  hoverColor,
  activeColor,
  isHovered,
  isActive,
  position,
  rotation,
  scale = 1,
}) => {
  const currentColor = isActive ? activeColor : isHovered ? hoverColor : color

  const handleGeometry = useMemo(
    () => ({
      line: new CylinderGeometry(0.015 * scale, 0.015 * scale, 0.8 * scale, 8),
      cube: new BoxGeometry(0.08 * scale, 0.08 * scale, 0.08 * scale),
    }),
    [scale]
  )

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: currentColor,
        transparent: true,
        opacity: 0.8,
      }),
    [currentColor]
  )

  return (
    <group position={position} rotation={rotation}>
      {/* Handle line */}
      <mesh
        geometry={handleGeometry.line}
        material={material}
        position={[0, 0.4 * scale, 0]}
      />
      {/* Handle cube */}
      <mesh
        geometry={handleGeometry.cube}
        material={material}
        position={[0, 0.85 * scale, 0]}
      />
    </group>
  )
}

const ScalePlaneHandle: React.FC<{
  plane: 'xy' | 'xz' | 'yz'
  color: string
  hoverColor: string
  activeColor: string
  isHovered?: boolean
  isActive?: boolean
  position: Vector3
  scale?: number
}> = ({
  plane,
  color,
  hoverColor,
  activeColor,
  isHovered,
  isActive,
  position,
  scale = 1,
}) => {
  const currentColor = isActive ? activeColor : isHovered ? hoverColor : color

  const planeGeometry = useMemo(
    () => new BoxGeometry(0.15 * scale, 0.15 * scale, 0.02 * scale),
    [scale]
  )

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: currentColor,
        transparent: true,
        opacity: 0.4,
      }),
    [currentColor]
  )

  const rotation = useMemo(() => {
    switch (plane) {
      case 'xy':
        return new Euler(0, 0, 0)
      case 'xz':
        return new Euler(Math.PI / 2, 0, 0)
      case 'yz':
        return new Euler(0, 0, Math.PI / 2)
    }
  }, [plane])

  return (
    <mesh
      geometry={planeGeometry}
      material={material}
      position={position}
      rotation={rotation}
    />
  )
}

const ScaleGizmo: React.FC<{ data: ScaleGizmoData }> = ({ data }) => {
  const gizmoScale = 0.15

  if (!data.visible) return null

  return (
    <group position={data.position} scale={data.scale}>
      {/* X Axis - Red */}
      <ScaleHandle
        axis="x"
        color="#ff4444"
        hoverColor="#ff6666"
        activeColor="#ff0000"
        isHovered={data.hoveredAxis === 'x'}
        isActive={data.activeAxis === 'x'}
        position={new Vector3(0.5 * gizmoScale, 0, 0)}
        rotation={new Euler(0, 0, -Math.PI / 2)}
        scale={gizmoScale}
      />

      {/* Y Axis - Green */}
      <ScaleHandle
        axis="y"
        color="#44ff44"
        hoverColor="#66ff66"
        activeColor="#00ff00"
        isHovered={data.hoveredAxis === 'y'}
        isActive={data.activeAxis === 'y'}
        position={new Vector3(0, 0.5 * gizmoScale, 0)}
        rotation={new Euler(0, 0, 0)}
        scale={gizmoScale}
      />

      {/* Z Axis - Blue */}
      <ScaleHandle
        axis="z"
        color="#4444ff"
        hoverColor="#6666ff"
        activeColor="#0000ff"
        isHovered={data.hoveredAxis === 'z'}
        isActive={data.activeAxis === 'z'}
        position={new Vector3(0, 0, 0.5 * gizmoScale)}
        rotation={new Euler(Math.PI / 2, 0, 0)}
        scale={gizmoScale}
      />

      {/* Plane handles */}
      <ScalePlaneHandle
        plane="xy"
        color="#ffff44"
        hoverColor="#ffff66"
        activeColor="#ffff00"
        isHovered={data.hoveredAxis === 'xy'}
        isActive={data.activeAxis === 'xy'}
        position={new Vector3(0.25 * gizmoScale, 0.25 * gizmoScale, 0)}
        scale={gizmoScale}
      />

      <ScalePlaneHandle
        plane="xz"
        color="#ff44ff"
        hoverColor="#ff66ff"
        activeColor="#ff00ff"
        isHovered={data.hoveredAxis === 'xz'}
        isActive={data.activeAxis === 'xz'}
        position={new Vector3(0.25 * gizmoScale, 0, 0.25 * gizmoScale)}
        scale={gizmoScale}
      />

      <ScalePlaneHandle
        plane="yz"
        color="#44ffff"
        hoverColor="#66ffff"
        activeColor="#00ffff"
        isHovered={data.hoveredAxis === 'yz'}
        isActive={data.activeAxis === 'yz'}
        position={new Vector3(0, 0.25 * gizmoScale, 0.25 * gizmoScale)}
        scale={gizmoScale}
      />

      {/* Center cube for uniform scaling */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry
          args={[0.08 * gizmoScale, 0.08 * gizmoScale, 0.08 * gizmoScale]}
        />
        <meshBasicMaterial
          color={data.activeAxis === 'xyz' ? '#ffffff' : '#cccccc'}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}

// Main Transform Gizmos Component
export const TransformGizmos: React.FC<TransformGizmosProps> = ({
  moveData,
  rotateData,
  scaleData,
}) => {
  const { selectionState } = useStore()

  // Only show gizmos when elements are selected
  if (selectionState.selectedElements.length === 0) {
    return null
  }

  return (
    <>
      {/* Move Gizmo */}
      {moveData && selectionState.transformMode === 'translate' && (
        <MoveGizmo data={moveData} />
      )}

      {/* Rotate Gizmo */}
      {rotateData && selectionState.transformMode === 'rotate' && (
        <RotateGizmo data={rotateData} />
      )}

      {/* Scale Gizmo */}
      {scaleData && selectionState.transformMode === 'scale' && (
        <ScaleGizmo data={scaleData} />
      )}
    </>
  )
}

export default TransformGizmos
