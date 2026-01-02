/**
 * اختبارات مكتبة الأصول
 * Asset Library Panel Tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssetLibraryPanel } from '../AssetLibraryPanel'

// Mock services
vi.mock('../../../services/AssetManagementService', () => ({
  getAssetManagementService: () => ({
    searchAssets: vi.fn(() => ({
      assets: [],
      total: 0,
      hasMore: false,
      facets: {
        categories: {},
        tags: {},
        formats: {},
      },
    })),
    importAssets: vi.fn(() => Promise.resolve([])),
    updateAsset: vi.fn(),
  }),
}))

// Mock dockview props
const mockProps = {
  api: {} as any,
  containerApi: {} as any,
  params: {},
  title: 'Asset Library',
}

describe('AssetLibraryPanel', () => {
  it('should render asset library panel', () => {
    render(<AssetLibraryPanel {...mockProps} />)

    expect(screen.getByText('مكتبة الأصول')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('البحث في الأصول...')
    ).toBeInTheDocument()
  })

  it('should show empty state when no assets', () => {
    render(<AssetLibraryPanel {...mockProps} />)

    expect(screen.getByText('لا توجد أصول متاحة')).toBeInTheDocument()
    expect(screen.getByText('+ إضافة أصول')).toBeInTheDocument()
  })

  it('should display category filters', () => {
    render(<AssetLibraryPanel {...mockProps} />)

    expect(screen.getByText('📦 الكل')).toBeInTheDocument()
    expect(screen.getByText('🚪 الأبواب')).toBeInTheDocument()
    expect(screen.getByText('🪟 النوافذ')).toBeInTheDocument()
  })
})
