import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LayoutSelector } from '../../../components/layout/LayoutSelector'
import { ThemeProvider } from '../../../contexts/ThemeContext'

const mockLayoutManager = {
  getLayouts: vi.fn(() => [
    {
      id: 'default',
      name: 'default',
      description: 'Default layout',
      layout: { panels: [], groups: [] },
      created: '2024-01-01T00:00:00.000Z',
      modified: '2024-01-01T00:00:00.000Z',
      isDefault: true,
    },
    {
      id: 'custom1',
      name: 'custom1',
      description: 'Custom layout 1',
      layout: { panels: [], groups: [] },
      created: '2024-01-02T00:00:00.000Z',
      modified: '2024-01-02T00:00:00.000Z',
      isDefault: false,
    },
  ]),
  restoreLayout: vi.fn(),
  deleteLayout: vi.fn(),
}

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('LayoutSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders layout selector button', () => {
    renderWithTheme(<LayoutSelector layoutManager={mockLayoutManager as any} />)

    expect(screen.getByText('تخطيطات')).toBeInTheDocument()
  })

  it('opens layout selector modal when clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<LayoutSelector layoutManager={mockLayoutManager as any} />)

    const button = screen.getByText('تخطيطات')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('اختيار تخطيط النوافذ')).toBeInTheDocument()
    })
  })

  it('displays available layouts in modal', async () => {
    const user = userEvent.setup()
    renderWithTheme(<LayoutSelector layoutManager={mockLayoutManager as any} />)

    const button = screen.getByText('تخطيطات')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeInTheDocument()
      expect(screen.getByText('custom1')).toBeInTheDocument()
      expect(screen.getByText('Default layout')).toBeInTheDocument()
      expect(screen.getByText('Custom layout 1')).toBeInTheDocument()
    })

    // Check for default badge
    expect(screen.getByText('افتراضي')).toBeInTheDocument()
  })

  it('handles layout restoration', async () => {
    const user = userEvent.setup()
    const onLayoutChange = vi.fn()

    renderWithTheme(
      <LayoutSelector
        layoutManager={mockLayoutManager as any}
        onLayoutChange={onLayoutChange}
      />
    )

    const button = screen.getByText('تخطيطات')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('custom1')).toBeInTheDocument()
    })

    const restoreButtons = screen.getAllByText('استعادة')
    await user.click(restoreButtons[1]) // Click restore for custom1

    expect(mockLayoutManager.restoreLayout).toHaveBeenCalledWith('custom1')
    expect(onLayoutChange).toHaveBeenCalledWith('custom1')
  })

  it('handles layout deletion with confirmation', async () => {
    const user = userEvent.setup()

    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)

    renderWithTheme(<LayoutSelector layoutManager={mockLayoutManager as any} />)

    const button = screen.getByText('تخطيطات')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('custom1')).toBeInTheDocument()
    })

    const deleteButton = screen.getByText('حذف')
    await user.click(deleteButton)

    expect(window.confirm).toHaveBeenCalledWith(
      'هل أنت متأكد من حذف التخطيط "custom1"؟'
    )
    expect(mockLayoutManager.deleteLayout).toHaveBeenCalledWith('custom1')

    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('does not show delete button for default layout', async () => {
    const user = userEvent.setup()
    renderWithTheme(<LayoutSelector layoutManager={mockLayoutManager as any} />)

    const button = screen.getByText('تخطيطات')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeInTheDocument()
    })

    // Should only have one delete button (for custom1, not default)
    const deleteButtons = screen.getAllByText('حذف')
    expect(deleteButtons).toHaveLength(1)
  })

  it('shows empty state when no layouts available', async () => {
    const emptyLayoutManager = {
      ...mockLayoutManager,
      getLayouts: vi.fn(() => []),
    }

    const user = userEvent.setup()
    renderWithTheme(
      <LayoutSelector layoutManager={emptyLayoutManager as any} />
    )

    const button = screen.getByText('تخطيطات')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('لا توجد تخطيطات محفوظة')).toBeInTheDocument()
    })
  })

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<LayoutSelector layoutManager={mockLayoutManager as any} />)

    const button = screen.getByText('تخطيطات')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('اختيار تخطيط النوافذ')).toBeInTheDocument()
    })

    const closeButton = screen.getByText('إغلاق')
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('اختيار تخطيط النوافذ')).not.toBeInTheDocument()
    })
  })
})
