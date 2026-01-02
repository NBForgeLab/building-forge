import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../../contexts/ThemeContext'
import { DockviewLayout } from '../DockviewLayout'

// Mock the dockview library
vi.mock('dockview', () => ({
  DockviewReact: ({ children, className, onReady }: any) => (
    <div className={className} data-testid="dockview-container">
      {children}
      <div data-testid="mock-dockview">Dockview Mock</div>
    </div>
  ),
}))

// Mock the panel components
vi.mock('../../panels/ViewportPanel', () => ({
  ViewportPanel: () => <div data-testid="viewport-panel">Viewport Panel</div>,
}))

vi.mock('../../panels/ToolPanel', () => ({
  ToolPanel: () => <div data-testid="tool-panel">Tool Panel</div>,
}))

vi.mock('../../panels/PropertiesPanel', () => ({
  PropertiesPanel: () => (
    <div data-testid="properties-panel">Properties Panel</div>
  ),
}))

vi.mock('../../panels/AssetLibraryPanel', () => ({
  AssetLibraryPanel: () => (
    <div data-testid="asset-library-panel">Asset Library Panel</div>
  ),
}))

// Mock CSS import
vi.mock('dockview/dist/styles/dockview.css', () => ({}))

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('DockviewLayout', () => {
  it('renders without crashing', () => {
    renderWithTheme(<DockviewLayout />)
    expect(screen.getByTestId('dockview-container')).toBeInTheDocument()
  })

  it('applies the correct theme class', () => {
    renderWithTheme(<DockviewLayout />)
    const container = screen.getByTestId('dockview-container')
    expect(container).toHaveClass('dockview-theme-light')
  })

  it('applies custom className when provided', () => {
    renderWithTheme(<DockviewLayout className="custom-class" />)
    const wrapper = screen.getByTestId('dockview-container').parentElement
    expect(wrapper).toHaveClass('custom-class')
  })

  it('renders the dockview mock component', () => {
    renderWithTheme(<DockviewLayout />)
    expect(screen.getByTestId('mock-dockview')).toBeInTheDocument()
  })
})
