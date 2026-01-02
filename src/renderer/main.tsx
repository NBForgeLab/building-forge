import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Get the root element
const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

// Create React root with React 18
const root = createRoot(container)

// Render the app in StrictMode for development checks
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
