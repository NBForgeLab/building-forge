import { Box, Plane, Text } from '@react-three/drei'
import React from 'react'
import { useElements, useSelection, useUI } from '../../hooks/useStore'
import { BuildingElement } from './elements/BuildingElement'

export const SceneElements: React.FC = () => {
  const { elements } = useElements()
  const { selectionState } = useSelection()
  const { uiState } = useUI()

  return (
    <group name="scene-elements">
      {elements.map(element => {
        const isSelected = selectionState.selectedElements.includes(element.id)
        const isHovered = selectionState.hoveredElement === element.id

        return (
          <BuildingElement
            key={element.id}
            element={element}
            isSelected={isSelected}
            isHovered={isHovered}
            wireframe={
              uiState.showWireframe || uiState.viewMode === 'wireframe'
            }
            viewMode={uiState.viewMode}
          />
        )
      })}

      {/* Default scene content when no elements exist */}
      {elements.length === 0 && (
        <group name="default-scene">
          {/* Ground plane */}
          <Plane
            args={[20, 20]}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.01, 0]}
          >
            <meshStandardMaterial color="#f0f0f0" transparent opacity={0.8} />
          </Plane>

          {/* Sample building elements */}
          <group name="sample-building">
            {/* Floor */}
            <Box args={[8, 0.2, 6]} position={[0, 0.1, 0]}>
              <meshStandardMaterial color="#e0e0e0" />
            </Box>

            {/* Walls */}
            <Box args={[8, 3, 0.2]} position={[0, 1.5, 3]}>
              <meshStandardMaterial color="#d0d0d0" />
            </Box>
            <Box args={[8, 3, 0.2]} position={[0, 1.5, -3]}>
              <meshStandardMaterial color="#d0d0d0" />
            </Box>
            <Box args={[0.2, 3, 6]} position={[4, 1.5, 0]}>
              <meshStandardMaterial color="#d0d0d0" />
            </Box>
            <Box args={[0.2, 3, 6]} position={[-4, 1.5, 0]}>
              <meshStandardMaterial color="#d0d0d0" />
            </Box>

            {/* Door opening */}
            <Box args={[1.2, 2.2, 0.3]} position={[0, 1.1, 3]}>
              <meshStandardMaterial color="#f0f0f0" transparent opacity={0} />
            </Box>

            {/* Window openings */}
            <Box args={[1.5, 1, 0.3]} position={[2, 2, 3]}>
              <meshStandardMaterial color="#87CEEB" transparent opacity={0.3} />
            </Box>
            <Box args={[1.5, 1, 0.3]} position={[-2, 2, 3]}>
              <meshStandardMaterial color="#87CEEB" transparent opacity={0.3} />
            </Box>
          </group>

          {/* Welcome text */}
          <Text
            position={[0, 4, 0]}
            fontSize={0.8}
            color="#666666"
            anchorX="center"
            anchorY="middle"
          >
            مرحباً بك في Building Forge
          </Text>

          <Text
            position={[0, 3.2, 0]}
            fontSize={0.4}
            color="#888888"
            anchorX="center"
            anchorY="middle"
          >
            ابدأ بإنشاء مشروع جديد أو اختر أداة من الشريط الجانبي
          </Text>
        </group>
      )}

      {/* Preview element (when creating new elements) */}
      {/* This will be implemented when we add the tools system */}
    </group>
  )
}
