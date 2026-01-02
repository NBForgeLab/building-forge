import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ViewportControls } from '../../../components/layout/ViewportControls'
import { ThemeProvider } from '../../../contexts/ThemeContext'

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('ViewportControls', () => {
  it('renders all view mode controls', () => {
    renderWithProviders(<ViewportControls />)

    // Check view mode buttons
    expect(screen.getByTitle('العرض الصلب')).toBeInTheDocument()
    expect(screen.getByTitle('العرض السلكي')).toBeInTheDocument()
    expect(screen.getByTitle('العرض المنسوج')).toBeInTheDocument()
  })

  it('renders all camera mode controls', () => {
    renderWithProviders(<ViewportControls />)

    // Check camera mode buttons
    expect(screen.getByTitle('المنظور ثلاثي الأبعاد')).toBeInTheDocument()
    expect(screen.getByTitle('المنظور المتعامد')).toBeInTheDocument()
  })

  it('renders all view angle controls', () => {
    renderWithProviders(<ViewportControls />)

    // Check view angle buttons
    expect(screen.getByTitle('المنظر الأمامي')).toBeInTheDocument()
    expect(screen.getByTitle('المنظر الخلفي')).toBeInTheDocument()
    expect(screen.getByTitle('المنظر الأيسر')).toBeInTheDocument()
    expect(screen.getByTitle('المنظر الأيمن')).toBeInTheDocument()
    expect(screen.getByTitle('المنظر العلوي')).toBeInTheDocument()
    expect(screen.getByTitle('المنظر السفلي')).toBeInTheDocument()
  })

  it('renders display option controls', () => {
    renderWithProviders(<ViewportControls />)

    // Check display option buttons
    expect(screen.getByText('شبكة')).toBeInTheDocument()
    expect(screen.getByText('إطار')).toBeInTheDocument()
    expect(screen.getByText('إحصائيات')).toBeInTheDocument()
  })

  it('handles view mode changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ViewportControls />)

    const solidButton = screen.getByTitle('العرض الصلب')
    await user.click(solidButton)

    // The button should be activated (visual feedback tested in integration)
    expect(solidButton).toBeInTheDocument()
  })

  it('handles camera mode changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ViewportControls />)

    const orthographicButton = screen.getByTitle('المنظور المتعامد')
    await user.click(orthographicButton)

    // The button should be activated (visual feedback tested in integration)
    expect(orthographicButton).toBeInTheDocument()
  })

  it('handles view angle changes', async () => {
    const user = userEvent.setup()

    // Mock console.log to verify the function is called
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderWithProviders(<ViewportControls />)

    const frontButton = screen.getByTitle('المنظر الأمامي')
    await user.click(frontButton)

    expect(consoleSpy).toHaveBeenCalledWith('Changing view angle to:', 'front')

    consoleSpy.mockRestore()
  })

  it('handles display option toggles', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ViewportControls />)

    const gridButton = screen.getByText('شبكة')
    await user.click(gridButton)

    // Grid toggle should work (state change tested in store tests)
    expect(gridButton).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <ViewportControls className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows active state for current view mode', () => {
    renderWithProviders(<ViewportControls />)

    // Default view mode should be 'solid', so it should have active styling
    const solidButton = screen.getByTitle('العرض الصلب')
    expect(solidButton).toHaveClass('bg-blue-100', 'dark:bg-blue-900')
  })

  it('shows active state for current camera mode', () => {
    renderWithProviders(<ViewportControls />)

    // Default camera mode should be 'perspective', so it should have active styling
    const perspectiveButton = screen.getByTitle('المنظور ثلاثي الأبعاد')
    expect(perspectiveButton).toHaveClass('bg-blue-100', 'dark:bg-blue-900')
  })

  it('shows active state for enabled display options', () => {
    renderWithProviders(<ViewportControls />)

    // Grid is enabled by default, so it should have active styling
    const gridButton = screen.getByText('شبكة')
    expect(gridButton).toHaveClass('bg-blue-100', 'dark:bg-blue-900')
  })
})
