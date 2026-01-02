/**
 * مربع حوار استيراد الأصول المتقدم
 * Advanced Asset Import Dialog with drag & drop and options
 */

import React, { useCallback, useRef, useState } from 'react'
import {
  AssetImportOptions,
  AssetImportResult,
  getAssetManagementService,
} from '../../services/AssetManagementService'
import { Button } from '../ui/Button'

interface AssetImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (results: AssetImportResult[]) => void
}

interface ImportSettings {
  generateThumbnail: boolean
  optimizeForGame: boolean
  quality: 'low' | 'medium' | 'high'
  maxSize: number
  detectDuplicates: boolean
  category: string
}

export const AssetImportDialog: React.FC<AssetImportDialogProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    completed: number
    total: number
    current: string
  } | null>(null)
  const [settings, setSettings] = useState<ImportSettings>({
    generateThumbnail: true,
    optimizeForGame: true,
    quality: 'medium',
    maxSize: 2048,
    detectDuplicates: true,
    category: 'general',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetService = getAssetManagementService()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )

    setSelectedFiles(prev => [...prev, ...files])
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files) {
        const fileArray = Array.from(files).filter(file =>
          file.type.startsWith('image/')
        )
        setSelectedFiles(prev => [...prev, ...fileArray])
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    []
  )

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0 || importing) return

    setImporting(true)
    setImportProgress({
      completed: 0,
      total: selectedFiles.length,
      current: '',
    })

    try {
      const importOptions: AssetImportOptions = {
        generateThumbnail: settings.generateThumbnail,
        optimizeForGame: settings.optimizeForGame,
        quality: settings.quality,
        maxSize: settings.maxSize,
        detectDuplicates: settings.detectDuplicates,
        category: settings.category,
      }

      const results = await assetService.importAssets(
        selectedFiles,
        importOptions,
        progress => setImportProgress(progress)
      )

      onImportComplete(results)

      // Reset state
      setSelectedFiles([])
      setImportProgress(null)
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }, [
    selectedFiles,
    importing,
    settings,
    assetService,
    onImportComplete,
    onClose,
  ])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            استيراد الأصول
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            اسحب وأفلت الملفات أو اختر من الكمبيوتر
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              اسحب الملفات هنا أو انقر للاختيار
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              يدعم PNG, JPG, WebP, GIF (حد أقصى 50MB لكل ملف)
            </p>
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              اختيار الملفات
            </Button>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                الملفات المحددة ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="text-sm">📄</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      disabled={importing}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Settings */}
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              إعدادات الاستيراد
            </h3>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                التصنيف
              </label>
              <select
                value={settings.category}
                onChange={e =>
                  setSettings(prev => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={importing}
              >
                <option value="general">عام</option>
                <option value="doors">أبواب</option>
                <option value="windows">نوافذ</option>
                <option value="furniture">أثاث</option>
                <option value="lighting">إضاءة</option>
                <option value="wood">خشب</option>
                <option value="metal">معدن</option>
                <option value="concrete">خرسانة</option>
                <option value="glass">زجاج</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                جودة التحسين
              </label>
              <select
                value={settings.quality}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    quality: e.target.value as 'low' | 'medium' | 'high',
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={importing}
              >
                <option value="low">منخفضة (ملفات أصغر)</option>
                <option value="medium">متوسطة (متوازنة)</option>
                <option value="high">عالية (جودة أفضل)</option>
              </select>
            </div>

            {/* Max Size */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                الحد الأقصى للحجم (بكسل)
              </label>
              <select
                value={settings.maxSize}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    maxSize: parseInt(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={importing}
              >
                <option value={512}>512x512</option>
                <option value={1024}>1024x1024</option>
                <option value={2048}>2048x2048</option>
                <option value={4096}>4096x4096</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.generateThumbnail}
                  onChange={e =>
                    setSettings(prev => ({
                      ...prev,
                      generateThumbnail: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                  disabled={importing}
                />
                <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                  إنتاج صور مصغرة
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.optimizeForGame}
                  onChange={e =>
                    setSettings(prev => ({
                      ...prev,
                      optimizeForGame: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                  disabled={importing}
                />
                <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                  تحسين للألعاب
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.detectDuplicates}
                  onChange={e =>
                    setSettings(prev => ({
                      ...prev,
                      detectDuplicates: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                  disabled={importing}
                />
                <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                  كشف الملفات المكررة
                </span>
              </label>
            </div>
          </div>

          {/* Import Progress */}
          {importing && importProgress && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  جاري الاستيراد...
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {importProgress.completed}/{importProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(importProgress.completed / importProgress.total) * 100}%`,
                  }}
                />
              </div>
              {importProgress.current && (
                <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                  {importProgress.current}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 rtl:space-x-reverse">
          <Button variant="ghost" onClick={onClose} disabled={importing}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={selectedFiles.length === 0 || importing}
          >
            {importing
              ? 'جاري الاستيراد...'
              : `استيراد ${selectedFiles.length} ملف`}
          </Button>
        </div>
      </div>
    </div>
  )
}
