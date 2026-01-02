import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Viewport3D } from '../../../components/viewport/Viewport3D'
import { ThemeProvider } from '../../../contexts/ThemeContext'

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated, ...props }: any) => {
    // Simulate canvas creation
    React.useEffect(() => {
      if (onCreated) {
        const mockGL = {
          shadowMap: { enabled: false, type: 0 },
          outputColorSpace: '',
          toneMapping: 0,
          toneMappingExposure: 1,
        }
        const mockScene = {
          background: null,
        }
        const mockCamera = {
          position: { set: vi.fn() },
          lookAt: vi.fn(),
        }
        onCreated({ gl: mockGL, scene: mockScene, camera: mockCamera })
      }
    }, [onCreated])

    return (
      <div data-testid="three-canvas" {...props}>
        {children}
      </div>
    )
  },
  useFrame: vi.fn(),
  useThree: () => ({
    camera: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    gl: { domElement: { width: 800, height: 600 } },
    raycaster: {},
    pointer: { x: 0, y: 0 },
  }),
}))

// Mock React Three Drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Stats: () => <div data-testid="stats" />,
  Html: ({ children, ...props }: any) => (
    <div data-testid="html-overlay" {...props}>
      {children}
    </div>
  ),
}))

// Mock viewport components
vi.mock('../../../components/viewport/CameraController', () => ({
  CameraController: () => <div data-testid="camera-controller" />,
}))

vi.mock('../../../components/viewport/LightingSystem', () => ({
  LightingSystem: () => <div data-testid="lighting-system" />,
}))

vi.mock('../../../components/viewport/ViewportGrid', () => ({
  ViewportGrid: () => <div data-testid="viewport-grid" />,
}))

vi.mock('../../../components/viewport/SceneElements', () => ({
  SceneElements: () => <div data-testid="scene-elements" />,
}))

vi.mock('../../../components/viewport/ViewCube', () => ({
  ViewCube: () => <div data-testid="view-cube" />,
}))

vi.mock('../../../components/viewport/PostProcessing', () => ({
  PostProcessing: () => <div data-testid="post-processing" />,
}))

vi.mock('../../../components/viewport/CoordinateDisplay', () => ({
  CoordinateDisplay: () => <div data-testid="coordinate-display" />,
}))

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('Viewport3D', () => {
  it('renders 3D canvas with all components', () => {
    renderWithTheme(<Viewport3D />)

    // Check for main canvas
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument()

    // Check for essential components
    expect(screen.getByTestId('camera-controller')).toBeInTheDocument()
    expect(screen.getByTestId('lighting-system')).toBeInTheDocument()
    expect(screen.getByTestId('scene-elements')).toBeInTheDocument()
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    expect(screen.getByTestId('view-cube')).toBeInTheDocument()
    expect(screen.getByTestId('coordinate-display')).toBeInTheDocument()
  })

  it('shows grid when enabled', () => {
    // Mock store to show grid
    vi.doMock('../../../hooks/useStore', () => ({
      useUI: () => ({
        uiState: {
          showGrid: true,
          showStats: false,
          theme: 'dark',
          cameraMode: 'perspective',
          viewMode: 'solid',
        },
      }),
      useViewport: () => ({
        viewportState: {
          lighting: { shadows: true },
          camera: { position: { x: 0, y: 0, z: 0 } },
        },
      }),
    }))

    renderWithTheme(<Viewport3D />)
    expect(screen.getByTestId('viewport-grid')).toBeInTheDocument()
  })

  it('shows stats when enabled', () => {
    // Mock store to show stats
    vi.doMock('../../../hooks/useStore', () => ({
      useUI: () => ({
        uiState: {
          showGrid: false,
          showStats: true,
          theme: 'dark',
          cameraMode: 'perspective',
          viewMode: 'solid',
        },
      }),
      useViewport: () => ({
        viewportState: {
          lighting: { shadows: true },
          camera: { position: { x: 0, y: 0, z: 0 } },
        },
      }),
    }))

    renderWithTheme(<Viewport3D />)
    expect(screen.getByTestId('stats')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <Viewport3D className="custom-viewport" />
    )

    expect(container.firstChild).toHaveClass('custom-viewport')
  })

  it('shows camera and view mode information', () => {
    renderWithTheme(<Viewport3D />)

    // Check for overlay information
    expect(screen.getByText(/Camera:/)).toBeInTheDocument()
    expect(screen.getByText(/View:/)).toBeInTheDocument()
  })

  it('renders loading indicator', () => {
    renderWithTheme(<Viewport3D />)

    // Check for loading spinner
    const loadingElement = screen.getByRole('img', { hidden: true })
    expect(loadingElement).toBeInTheDocument()
  })

  it('configures canvas with proper settings', () => {
    renderWithTheme(<Viewport3D />)

    const canvas = screen.getByTestId('three-canvas')
    expect(canvas).toHaveClass('w-full', 'h-full')
  })
})
