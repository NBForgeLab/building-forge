import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext'

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, toggleTheme, setTheme } = useTheme()

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
    </div>
  )
}

describe('ThemeContext', () => {
  // Mock localStorage
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('provides default dark theme', () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
  })

  it('loads theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('light')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })

  it('toggles theme correctly', () => {
    mockLocalStorage.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')

    fireEvent.click(screen.getByText('Toggle Theme'))

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'building-forge-theme',
      'light'
    )
  })

  it('sets theme directly', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByText('Set Light'))

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'building-forge-theme',
      'light'
    )
  })

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = vi.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    console.error = originalError
  })
})
