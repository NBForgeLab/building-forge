/**
 * اختبارات حوار استيراد الأصول
 * Asset Import Dialog Tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssetImportDialog } from '../AssetImportDialog'

// Mock services
vi.mock('../../../services/AssetManagementService', () => ({
  getAssetManagementService: () => ({
    importAssets: vi.fn(() => Promise.resolve([])),
  }),
}))

describe('AssetImportDialog', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onImportComplete: vi.fn(),
  }

  it('should render when open', () => {
    render(<AssetImportDialog {...mockProps} />)

    expect(screen.getByText('استيراد الأصول')).toBeInTheDocument()
    expect(
      screen.getByText('اسحب وأفلت الملفات أو اختر من الكمبيوتر')
    ).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<AssetImportDialog {...mockProps} isOpen={false} />)

    expect(screen.queryByText('استيراد الأصول')).not.toBeInTheDocument()
  })

  it('should show import settings', () => {
    render(<AssetImportDialog {...mockProps} />)

    expect(screen.getByText('إعدادات الاستيراد')).toBeInTheDocument()
    expect(screen.getByText('التصنيف')).toBeInTheDocument()
    expect(screen.getByText('جودة التحسين')).toBeInTheDocument()
  })

  it('should show drag and drop area', () => {
    render(<AssetImportDialog {...mockProps} />)

    expect(
      screen.getByText('اسحب الملفات هنا أو انقر للاختيار')
    ).toBeInTheDocument()
    expect(
      screen.getByText('يدعم PNG, JPG, WebP, GIF (حد أقصى 50MB لكل ملف)')
    ).toBeInTheDocument()
  })

  it('should have category options', () => {
    render(<AssetImportDialog {...mockProps} />)

    expect(screen.getByDisplayValue('general')).toBeInTheDocument()
  })

  it('should have quality options', () => {
    render(<AssetImportDialog {...mockProps} />)

    expect(screen.getByDisplayValue('medium')).toBeInTheDocument()
  })
})
