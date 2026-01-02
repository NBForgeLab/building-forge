import { DockviewApi, DockviewReact, DockviewReadyEvent } from 'dockview'
import 'dockview/dist/styles/dockview.css'
import React, { useCallback, useEffect, useRef } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { getDockviewLayoutManager } from '../../services/DockviewLayoutManager'
import '../../styles/panels.css'
import { AssetLibraryPanel } from '../panels/AssetLibraryPanel'
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { ToolPanel } from '../panels/ToolPanel'
import { ViewportPanel } from '../panels/ViewportPanel'
import { ShortcutManagerPanel } from '../ShortcutManager/ShortcutManagerPanel'

// Panel components registry
const components = {
  viewport: ViewportPanel,
  tools: ToolPanel,
  properties: PropertiesPanel,
  assetLibrary: AssetLibraryPanel,
  shortcutManager: ShortcutManagerPanel,
}

export interface DockviewLayoutProps {
  className?: string
  onLayoutReady?: (
    layoutManager: ReturnType<typeof getDockviewLayoutManager>
  ) => void
}

export const DockviewLayout: React.FC<DockviewLayoutProps> = ({
  className = '',
  onLayoutReady,
}) => {
  const { theme } = useTheme()
  const dockviewRef = useRef<DockviewApi | null>(null)
  const layoutManagerRef = useRef<ReturnType<
    typeof getDockviewLayoutManager
  > | null>(null)

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      dockviewRef.current = event.api

      // Initialize layout manager
      if (!layoutManagerRef.current) {
        layoutManagerRef.current = getDockviewLayoutManager({
          storeName: 'building-forge-layouts',
          defaultLayoutName: 'default',
          enablePopouts: true,
          enableMultiDisplay: true,
        })
      }

      // Initialize layout manager with API
      layoutManagerRef.current.initialize(event.api)

      // Notify parent component that layout is ready
      if (onLayoutReady) {
        onLayoutReady(layoutManagerRef.current)
      }
    },
    [onLayoutReady]
  )

  // Apply theme changes
  useEffect(() => {
    if (dockviewRef.current) {
      const container = document.querySelector('.dockview-container')
      if (container) {
        container.className = `dockview-container dockview-theme-${theme}`
      }
    }
  }, [theme])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layoutManagerRef.current) {
        layoutManagerRef.current.dispose()
      }
    }
  }, [])

  return (
    <div className={`h-full w-full ${className}`}>
      <DockviewReact
        className={`dockview-theme-${theme}`}
        onReady={onReady}
        components={components}
        disableFloatingGroups={false}
        rootOverlayModel={{
          size: { type: 'pixels', value: 100 },
          activationSize: { type: 'pixels', value: 50 },
        }}
      />
    </div>
  )
}
