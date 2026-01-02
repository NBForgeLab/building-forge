import React, { ReactElement } from 'react'
import { vi } from 'vitest'

/**
 * مكونات وأدوات مساعدة للاختبار
 */

// محاكاة Electron APIs
export const mockElectronAPI = {
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  platform: 'win32',
  versions: {
    node: '18.0.0',
    chrome: '110.0.0',
    electron: '28.0.0',
  },
}

// إعداد global للـ Electron API
global.electronAPI = mockElectronAPI

// مكون Provider للاختبار
const TestProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <div data-testid="test-provider">{children}</div>
}

// دالة render بسيطة للاختبار
export const render = (ui: ReactElement) => {
  // تنفيذ بسيط للاختبار
  return { container: document.createElement('div') }
}

// مساعدات للاختبار
export const createMockElement = (overrides = {}) => ({
  id: 'test-element-1',
  type: 'wall' as const,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  visible: true,
  selected: false,
  locked: false,
  metadata: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

export const createMockMaterial = (overrides = {}) => ({
  id: 'test-material-1',
  name: 'Test Material',
  type: 'pbr' as const,
  albedo: '#ffffff',
  roughness: 0.5,
  metallic: 0.0,
  opacity: 1.0,
  uvScale: { x: 1, y: 1 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-1',
  name: 'Test Project',
  version: '1.0.0',
  elements: [],
  materials: [],
  settings: {
    units: 'meters' as const,
    gridSize: 1,
    snapToGrid: true,
    showGrid: true,
    backgroundColor: '#f0f0f0',
    ambientLightIntensity: 0.4,
    directionalLightIntensity: 1.0,
  },
  metadata: {
    tags: [],
    exportSettings: {
      format: 'glb' as const,
      quality: 'high' as const,
      includeTextures: true,
      generateCollisionMesh: false,
      optimizeForGames: true,
    },
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})
