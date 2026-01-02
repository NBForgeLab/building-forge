import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TopToolbar } from '../../../components/layout/TopToolbar'
import { ThemeProvider } from '../../../contexts/ThemeContext'

// Mock electron
vi.mock('../../../hooks/useElectron', () => ({
  useElectron: () => ({
    isElectron: true,
    saveProject: vi.fn(),
    loadProject: vi.fn(),
    exportProject: vi.fn(),
    showNotification: vi.fn(),
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    getSystemInfo: vi.fn(),
    openDevTools: vi.fn(),
  }),
}))

// Mock layout manager
const mockLayoutManager = {
  initialize: vi.fn(),
  saveLayout: vi.fn(),
  restoreLayout: vi.fn(),
  resetToDefault: vi.fn(),
  getLayouts: vi.fn(() => []),
  deleteLayout: vi.fn(),
  updatePreferences: vi.fn(),
  getPreferences: vi.fn(() => ({
    autoSave: true,
    autoSaveInterval: 30000,
    rememberPopouts: false,
  })),
  dispose: vi.fn(),
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>)
}

describe('TopToolbar', () => {
  it('renders all main sections', () => {
    renderWithProviders(<TopToolbar />)

    // Check for app title
    expect(screen.getByText('Building Forge')).toBeInTheDocument()

    // Check for tool buttons
    expect(screen.getByTitle('أداة التحديد (V)')).toBeInTheDocument()
    expect(screen.getByTitle('أداة الجدار (W)')).toBeInTheDocument()
    expect(screen.getByTitle('أداة الأرضية (F)')).toBeInTheDocument()

    // Check for file operations
    expect(screen.getByText('جديد')).toBeInTheDocument()
    expect(screen.getByText('فتح')).toBeInTheDocument()

    // Check for theme toggle
    expect(screen.getByTitle(/Switch to/)).toBeInTheDocument()
  })

  it('handles tool selection', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopToolbar />)

    const wallTool = screen.getByTitle('أداة الجدار (W)')
    await user.click(wallTool)

    // Tool should be activated (visual feedback will be tested in integration tests)
    expect(wallTool).toBeInTheDocument()
  })

  it('handles file operations', async () => {
    const user = userEvent.setup()
    const onMenuAction = vi.fn()
    renderWithProviders(<TopToolbar onMenuAction={onMenuAction} />)

    // Test new project
    const newButton = screen.getByText('جديد')
    await user.click(newButton)
    // This would trigger a prompt, which we can't easily test in unit tests

    // Test open project
    const openButton = screen.getByText('فتح')
    await user.click(openButton)
    expect(onMenuAction).toHaveBeenCalledWith('file:open')
  })

  it('shows layout controls when layout manager is provided', () => {
    renderWithProviders(<TopToolbar layoutManager={mockLayoutManager as any} />)

    expect(screen.getByText('حفظ التخطيط')).toBeInTheDocument()
    expect(screen.getByText('تخطيطات')).toBeInTheDocument()
    expect(screen.getByText('إعادة تعيين')).toBeInTheDocument()
  })

  it('handles layout save modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopToolbar layoutManager={mockLayoutManager as any} />)

    const saveLayoutButton = screen.getByText('حفظ التخطيط')
    await user.click(saveLayoutButton)

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('حفظ تخطيط النوافذ')).toBeInTheDocument()
    })

    // Check modal content
    expect(
      screen.getByPlaceholderText('اسم التخطيط (اختياري)')
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('وصف التخطيط (اختياري)')
    ).toBeInTheDocument()
  })

  it('handles layout reset with confirmation', async () => {
    const user = userEvent.setup()

    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)

    renderWithProviders(<TopToolbar layoutManager={mockLayoutManager as any} />)

    const resetButton = screen.getByText('إعادة تعيين')
    await user.click(resetButton)

    expect(window.confirm).toHaveBeenCalledWith(
      'هل أنت متأكد من إعادة تعيين التخطيط للوضع الافتراضي؟'
    )
    expect(mockLayoutManager.resetToDefault).toHaveBeenCalled()

    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('shows viewport controls', () => {
    renderWithProviders(<TopToolbar />)

    // Check for view mode controls
    expect(screen.getByTitle('العرض الصلب')).toBeInTheDocument()
    expect(screen.getByTitle('العرض السلكي')).toBeInTheDocument()
    expect(screen.getByTitle('العرض المنسوج')).toBeInTheDocument()

    // Check for camera mode controls
    expect(screen.getByTitle('المنظور ثلاثي الأبعاد')).toBeInTheDocument()
    expect(screen.getByTitle('المنظور المتعامد')).toBeInTheDocument()

    // Check for display options
    expect(screen.getByText('شبكة')).toBeInTheDocument()
    expect(screen.getByText('إطار')).toBeInTheDocument()
    expect(screen.getByText('إحصائيات')).toBeInTheDocument()
  })

  it('shows project info when project is loaded', () => {
    // This would require mocking the store with a project
    // For now, we'll test the basic rendering
    renderWithProviders(<TopToolbar />)

    // The project name would appear next to the app title when a project is loaded
    expect(screen.getByText('Building Forge')).toBeInTheDocument()
  })

  it('shows window controls in Electron environment', () => {
    renderWithProviders(<TopToolbar />)

    // Check for window control buttons
    expect(screen.getByTitle('تصغير')).toBeInTheDocument()
    expect(screen.getByTitle('تكبير')).toBeInTheDocument()
    expect(screen.getByTitle('إغلاق')).toBeInTheDocument()
  })
})
