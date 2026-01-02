import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'

// Mock the ErrorBoundary to avoid complex testing setup
vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

// Mock the ThemeProvider
vi.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('Building Forge')).toBeInTheDocument()
  })

  it('renders the main layout components', () => {
    render(<App />)

    // Check for main sections
    expect(screen.getByText('Building Forge')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.getByText('3D Viewport')).toBeInTheDocument()
    expect(screen.getByText('Properties')).toBeInTheDocument()
  })

  it('renders tool buttons', () => {
    render(<App />)

    expect(screen.getByText('Select Tool')).toBeInTheDocument()
    expect(screen.getByText('Wall Tool')).toBeInTheDocument()
    expect(screen.getByText('Floor Tool')).toBeInTheDocument()
    expect(screen.getByText('Door Tool')).toBeInTheDocument()
    expect(screen.getByText('Window Tool')).toBeInTheDocument()
  })

  it('renders property inputs', () => {
    render(<App />)

    // Check that there are position inputs (there are 3 with value "0")
    expect(screen.getAllByDisplayValue('0')).toHaveLength(3)
  })
})
