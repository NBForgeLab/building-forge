// Temporarily disabled due to dependency conflicts
// TODO: Re-enable after updating @react-three/fiber to v9+

/*
import {
  Bloom,
  EffectComposer,
  Outline,
  Selection,
  SSAO,
} from '@react-three/postprocessing'
*/
import React from 'react'
import { useSelection, useViewport } from '../../hooks/useStore'

export const PostProcessing: React.FC = () => {
  const { viewportState } = useViewport()
  const { selectedElements } = useSelection()

  // Temporarily disabled - return null
  return null

  /*
  if (!viewportState.rendering.postProcessing) {
    return null
  }

  return (
    <EffectComposer>
      <SSAO
        samples={16}
        radius={0.1}
        intensity={1}
        bias={0.01}
        distanceThreshold={0.1}
        rangeThreshold={0.01}
      />

      <Bloom
        intensity={0.5}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.025}
        height={300}
      />

      <Selection>
        <Outline
          blur
          visibleEdgeColor="#00ff00"
          hiddenEdgeColor="#ff0000"
          edgeStrength={2.5}
          width={1000}
          height={1000}
        />
      </Selection>
    </EffectComposer>
  )
  */
}
