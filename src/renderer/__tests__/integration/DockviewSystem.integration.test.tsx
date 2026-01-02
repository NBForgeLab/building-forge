import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MainLayout } from '../../components/layout/MainLayout'
import { ThemeProvider } from '../../contexts/ThemeContext'

// Mock dockview
vi.mock('dockview', () => ({
  DockviewReact: ({ onReady, components }: any) => {
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

    return (
      <div data-testid="dockview-container">
        <div data-testid="viewport-panel">Viewport Panel</div>
        <div data-testid="tool-panel">Tool Panel</div>
        <div data-testid="properties-panel">Properties Panel</div>
        <div data-testid="asset-library-panel">Asset Library Panel</div>
      </div>
    )
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

// Mock electron
vi.mock('../../hooks/useElectron', () => ({
  useElectron: () => ({
    isElectron: true,
    saveProject: vi.fn(),
    loadProject: vi.fn(),
    exportProject: vi.fn(),
    showNotification: vi.fn(),
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    getSystemInfo: vi.fn().mockResolvedValue({}),
    openDevTools: vi.fn(),
  }),
}))

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('Dockview System Integration', () => {
  it('renders complete layout with all components', async () => {
    renderWithProviders(<MainLayout />)

    // Check for top toolbar
    expect(screen.getByText('Building Forge')).toBeInTheDocument()

    // Check for dockview container
    await waitFor(() => {
      expect(screen.getByTestId('dockview-container')).toBeInTheDocument()
    })

    // Check for all panels
    expect(screen.getByTestId('viewport-panel')).toBeInTheDocument()
    expect(screen.getByTestId('tool-panel')).toBeInTheDocument()
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByTestId('asset-library-panel')).toBeInTheDocument()
  })

  it('integrates toolbar with layout manager', async () => {
    renderWithProviders(<MainLayout />)

    // Wait for layout manager to be initialized
    await waitFor(() => {
      expect(screen.getByText('حفظ التخطيط')).toBeInTheDocument()
    })

    // Layout controls should be available
    expect(screen.getByText('تخطيطات')).toBeInTheDocument()
    expect(screen.getByText('إعادة تعيين')).toBeInTheDocument()
  })

  it('handles tool selection from toolbar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MainLayout />)

    // Select wall tool
    const wallTool = screen.getByTitle('أداة الجدار (W)')
    await user.click(wallTool)

    // Tool should be visually active
    expect(wallTool).toHaveClass('bg-blue-500', 'text-white')
  })

  it('handles view mode changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MainLayout />)

    // Change to wireframe view
    const wireframeButton = screen.getByTitle('العرض السلكي')
    await user.click(wireframeButton)

    // Button should show active state
    expect(wireframeButton).toHaveClass('bg-blue-100', 'dark:bg-blue-900')
  })

  it('handles layout save workflow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MainLayout />)

    // Wait for layout manager
    await waitFor(() => {
      expect(screen.getByText('حفظ التخطيط')).toBeInTheDocument()
    })

    // Open save layout modal
    const saveButton = screen.getByText('حفظ التخطيط')
    await user.click(saveButton)

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('حفظ تخطيط النوافذ')).toBeInTheDocument()
    })

    // Fill in layout details
    const nameInput = screen.getByPlaceholderText('اسم التخطيط (اختياري)')
    await user.type(nameInput, 'My Custom Layout')

    const descInput = screen.getByPlaceholderText('وصف التخطيط (اختياري)')
    await user.type(descInput, 'A custom layout for testing')

    // Save the layout
    const modalSaveButton = screen.getByRole('button', { name: 'حفظ' })
    await user.click(modalSaveButton)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('حفظ تخطيط النوافذ')).not.toBeInTheDocument()
    })
  })

  it('handles layout selection workflow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MainLayout />)

    // Wait for layout manager
    await waitFor(() => {
      expect(screen.getByText('تخطيطات')).toBeInTheDocument()
    })

    // Open layout selector
    const layoutsButton = screen.getByText('تخطيطات')
    await user.click(layoutsButton)

    // Selector modal should appear
    await waitFor(() => {
      expect(screen.getByText('اختيار تخطيط النوافذ')).toBeInTheDocument()
    })

    // Close the modal
    const closeButton = screen.getByText('إغلاق')
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('اختيار تخطيط النوافذ')).not.toBeInTheDocument()
    })
  })

  it('handles layout reset workflow', async () => {
    const user = userEvent.setup()

    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)

    renderWithProviders(<MainLayout />)

    // Wait for layout manager
    await waitFor(() => {
      expect(screen.getByText('إعادة تعيين')).toBeInTheDocument()
    })

    // Reset layout
    const resetButton = screen.getByText('إعادة تعيين')
    await user.click(resetButton)

    // Confirmation should be shown
    expect(window.confirm).toHaveBeenCalledWith(
      'هل أنت متأكد من إعادة تعيين التخطيط للوضع الافتراضي؟'
    )

    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('handles project operations from toolbar', async () => {
    const user = userEvent.setup()

    // Mock window.prompt
    const originalPrompt = window.prompt
    window.prompt = vi.fn(() => 'Test Project')

    renderWithProviders(<MainLayout />)

    // Create new project
    const newButton = screen.getByText('جديد')
    await user.click(newButton)

    expect(window.prompt).toHaveBeenCalledWith(
      'اسم المشروع الجديد:',
      'مشروع جديد'
    )

    // Restore original prompt
    window.prompt = originalPrompt
  })

  it('handles theme toggle', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MainLayout />)

    // Find theme toggle button (sun/moon icon)
    const themeButton = screen.getByTitle(/Switch to/)
    await user.click(themeButton)

    // Theme should change (tested through context)
    expect(themeButton).toBeInTheDocument()
  })

  it('handles display option toggles', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MainLayout />)

    // Toggle grid
    const gridButton = screen.getByText('شبكة')
    await user.click(gridButton)

    // Grid should be toggled (visual state change)
    expect(gridButton).toBeInTheDocument()

    // Toggle wireframe
    const wireframeButton = screen.getByText('إطار')
    await user.click(wireframeButton)

    expect(wireframeButton).toBeInTheDocument()

    // Toggle stats
    const statsButton = screen.getByText('إحصائيات')
    await user.click(statsButton)

    expect(statsButton).toBeInTheDocument()
  })

  it('maintains responsive layout', () => {
    renderWithProviders(<MainLayout />)

    // Check main layout structure
    const mainContainer = screen.getByText('Building Forge').closest('div')
    expect(mainContainer).toHaveClass('h-screen', 'flex', 'flex-col')

    // Check toolbar is fixed height
    const toolbar = screen.getByText('Building Forge').closest('header')
    expect(toolbar).toHaveClass('h-14', 'flex-shrink-0')
  })
})
