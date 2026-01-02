import React, { useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MainLayout } from './components/layout/MainLayout'
import { ShortcutProvider } from './components/ShortcutManager/ShortcutProvider'
import { ThemeProvider } from './contexts/ThemeContext'
import { initializeStore } from './store'

const App: React.FC = () => {
  useEffect(() => {
    // Initialize the store when the app starts
    initializeStore()
  }, [])

  // Handle shortcut manager opening
  const handleOpenShortcutManager = () => {
    // For now, just log. In a full implementation,
    // this would open a shortcut management dialog/modal
    console.log('Opening shortcut manager...')
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ShortcutProvider onOpenShortcutManager={handleOpenShortcutManager}>
          <MainLayout />
        </ShortcutProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
