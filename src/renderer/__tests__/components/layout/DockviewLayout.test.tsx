import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DockviewLayout } from '../../../components/layout/DockviewLayout'
import { ThemeProvider } from '../../../contexts/ThemeContext'

// Mock dockview
vi.mock('dockview', () => ({
  DockviewReact: ({ onReady, components }: any) => {
    // Simulate dockview ready event
    React.useEffect(() => {
      if (onReady) {
        const mockApi = {
          clear: vi.fn(),
          addPanel: vi.fn(),
          removePanel: vi.fn(),
          getPanel: vi.fn(),
          toJSON: vi.fn(() => ({ panels: [], groups: [] })),
          fromJSON: vi.fn(),
          onDidLayoutChange: vi.fn(() => ({ dispose: vi.fn() })),
          onDidAddPanel: vi.fn(() => ({ dispose: vi.fn() })),
          onDidRemovePanel: vi.fn(() => ({ dispose: vi.fn() })),
        }
        onReady({ api: mockApi })
      }
    }, [onReady])

    return <div data-testid="dockview-container">Mocked Dockview</div>
  },
}))

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      private data: any = {
        layouts: {},
        currentLayout: 'default',
        popoutWindows: [],
        preferences: {
          autoSave: true,
          autoSaveInterval: 30000,
          rememberPopouts: false,
        },
      }

      get(key: string) {
        return this.data[key]
      }

      set(key: string, value: any) {
        this.data[key] = value
      }
    },
  }
})

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('DockviewLayout', () => {
  it('renders dockview container', () => {
    renderWithTheme(<DockviewLayout />)
    expect(screen.getByTestId('dockview-container')).toBeInTheDocument()
  })

  it('initializes layout manager on ready', async () => {
    const onLayoutReady = vi.fn()
    renderWithTheme(<DockviewLayout onLayoutReady={onLayoutReady} />)

    await waitFor(() => {
      expect(onLayoutReady).toHaveBeenCalledWith(
        expect.objectContaining({
          initialize: expect.any(Function),
          saveLayout: expect.any(Function),
          restoreLayout: expect.any(Function),
          resetToDefault: expect.any(Function),
        })
      )
    })
  })

  it('applies theme classes correctly', async () => {
    renderWithTheme(<DockviewLayout />)

    // Check if theme class is applied
    const container = screen.getByTestId('dockview-container').parentElement
    expect(container).toHaveClass('dockview-theme-light')
  })

  it('handles layout manager disposal on unmount', () => {
    const { unmount } = renderWithTheme(<DockviewLayout />)

    // Should not throw error on unmount
    expect(() => unmount()).not.toThrow()
  })
})
