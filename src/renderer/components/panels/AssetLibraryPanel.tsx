import { IDockviewPanelProps } from 'dockview'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AssetImportOptions,
  AssetImportResult,
  AssetMetadata,
  getAssetManagementService,
} from '../../services/AssetManagementService'
import { AssetImportDialog } from '../dialogs/AssetImportDialog'
import { Button } from '../ui/Button'

interface AssetCategory {
  id: string
  name: string
  icon: string
  count: number
}

interface ImportProgress {
  completed: number
  total: number
  current: string
}

export const AssetLibraryPanel: React.FC<IDockviewPanelProps> = props => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [assets, setAssets] = useState<AssetMetadata[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([
    { id: 'all', name: 'الكل', icon: '📦', count: 0 },
    { id: 'doors', name: 'الأبواب', icon: '🚪', count: 0 },
    { id: 'windows', name: 'النوافذ', icon: '🪟', count: 0 },
    { id: 'furniture', name: 'الأثاث', icon: '🪑', count: 0 },
    { id: 'lighting', name: 'الإضاءة', icon: '💡', count: 0 },
    { id: 'wood', name: 'خشب', icon: '🪵', count: 0 },
    { id: 'metal', name: 'معدن', icon: '⚙️', count: 0 },
    { id: 'concrete', name: 'خرسانة', icon: '🧱', count: 0 },
  ])
  const [loading, setLoading] = useState<boolean>(false)
  const [importing, setImporting] = useState<boolean>(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null
  )
  const [dragOver, setDragOver] = useState<boolean>(false)
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetService = getAssetManagementService()

  // Load assets on component mount
  useEffect(() => {
    loadAssets()
  }, [selectedCategory, searchTerm])

  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      const searchResult = assetService.searchAssets({
        query: searchTerm || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        sortBy: 'name',
        sortOrder: 'asc',
      })

      setAssets(searchResult.assets)

      // Update categories with counts
      const updatedCategories: AssetCategory[] = [
        { id: 'all', name: 'الكل', icon: '📦', count: searchResult.total },
        {
          id: 'doors',
          name: 'الأبواب',
          icon: '🚪',
          count: searchResult.facets.categories.doors || 0,
        },
        {
          id: 'windows',
          name: 'النوافذ',
          icon: '🪟',
          count: searchResult.facets.categories.windows || 0,
        },
        {
          id: 'furniture',
          name: 'الأثاث',
          icon: '🪑',
          count: searchResult.facets.categories.furniture || 0,
        },
        {
          id: 'lighting',
          name: 'الإضاءة',
          icon: '💡',
          count: searchResult.facets.categories.lighting || 0,
        },
        {
          id: 'wood',
          name: 'خشب',
          icon: '🪵',
          count: searchResult.facets.categories.wood || 0,
        },
        {
          id: 'metal',
          name: 'معدن',
          icon: '⚙️',
          count: searchResult.facets.categories.metal || 0,
        },
        {
          id: 'concrete',
          name: 'خرسانة',
          icon: '🧱',
          count: searchResult.facets.categories.concrete || 0,
        },
        {
          id: 'glass',
          name: 'زجاج',
          icon: '🪟',
          count: searchResult.facets.categories.glass || 0,
        },
      ]

      setCategories(updatedCategories)
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchTerm, assetService])

  const handleFileImport = useCallback(
    async (files: FileList | File[]) => {
      if (importing) return

      setImporting(true)
      setImportProgress({ completed: 0, total: files.length, current: '' })

      try {
        const importOptions: AssetImportOptions = {
          generateThumbnail: true,
          optimizeForGame: true,
          detectDuplicates: true,
          quality: 'medium',
        }

        const results = await assetService.importAssets(
          files,
          importOptions,
          progress => setImportProgress(progress)
        )

        // Show results summary
        const successful = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length
        const duplicates = results.filter(r => r.duplicateOf).length

        console.log(
          `Import completed: ${successful} successful, ${failed} failed, ${duplicates} duplicates`
        )

        // Reload assets to show new imports
        await loadAssets()
      } catch (error) {
        console.error('Import failed:', error)
      } finally {
        setImporting(false)
        setImportProgress(null)
      }
    },
    [importing, assetService, loadAssets]
  )

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)

      const files = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
      )

      if (files.length > 0) {
        handleFileImport(files)
      }
    },
    [handleFileImport]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileImport(files)
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFileImport]
  )

  const handleAssetClick = useCallback(
    (asset: AssetMetadata) => {
      // TODO: Handle asset selection/drag start for scene integration
      console.log('Asset selected:', asset.id, asset.name)

      // Update usage statistics
      assetService.updateAsset(asset.id, {
        usage: {
          ...asset.usage,
          lastUsed: Date.now(),
          useCount: asset.usage.useCount + 1,
        },
      })
    },
    [assetService]
  )

  const handleImportClick = useCallback(() => {
    setShowImportDialog(true)
  }, [])

  const handleImportComplete = useCallback(
    async (results: AssetImportResult[]) => {
      // Show results summary
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      const duplicates = results.filter(r => r.duplicateOf).length

      console.log(
        `Import completed: ${successful} successful, ${failed} failed, ${duplicates} duplicates`
      )

      // Reload assets to show new imports
      await loadAssets()
    },
    [loadAssets]
  )

  return (
    <>
      <div
        className={`h-full w-full bg-gray-50 dark:bg-gray-800 flex flex-col ${
          dragOver
            ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400'
            : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            مكتبة الأصول
          </h2>

          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="البحث في الأصول..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={loading || importing}
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'primary' : 'ghost'}
                size="sm"
                className="text-xs"
                onClick={() => setSelectedCategory(category.id)}
                disabled={loading || importing}
              >
                {category.icon} {category.name}
                {category.count > 0 && (
                  <span className="ml-1 text-xs opacity-70">
                    ({category.count})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Import Progress */}
        {importing && importProgress && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                استيراد الأصول...
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

        {/* Drag & Drop Overlay */}
        {dragOver && (
          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-2 border-dashed border-blue-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-1">
                  إفلات الملفات هنا
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  يدعم PNG, JPG, WebP, GIF
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Assets Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin text-2xl mb-2">⏳</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                جاري تحميل الأصول...
              </p>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-500 mb-2">📦</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                لا توجد أصول متاحة
              </p>
              {searchTerm ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  جرب مصطلح بحث مختلف
                </p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  ابدأ بإضافة بعض الأصول
                </p>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportClick}
                disabled={importing}
              >
                + إضافة أصول
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {assets.map(asset => (
                <div
                  key={asset.id}
                  className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleAssetClick(asset)}
                  draggable
                  onDragStart={e => {
                    // Set drag data for scene integration
                    e.dataTransfer.setData(
                      'application/building-forge-asset',
                      JSON.stringify({
                        id: asset.id,
                        name: asset.name,
                        category: asset.category,
                      })
                    )
                  }}
                >
                  {/* Asset thumbnail */}
                  <div className="w-full h-16 bg-gray-100 dark:bg-gray-600 rounded mb-2 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-500 transition-colors overflow-hidden">
                    {asset.thumbnail ? (
                      <img
                        src={asset.thumbnail}
                        alt={asset.name}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl">
                        {asset.category === 'doors' && '🚪'}
                        {asset.category === 'windows' && '🪟'}
                        {asset.category === 'furniture' && '🪑'}
                        {asset.category === 'lighting' && '💡'}
                        {asset.category === 'wood' && '🪵'}
                        {asset.category === 'metal' && '⚙️'}
                        {asset.category === 'concrete' && '🧱'}
                        {asset.category === 'glass' && '🪟'}
                        {![
                          'doors',
                          'windows',
                          'furniture',
                          'lighting',
                          'wood',
                          'metal',
                          'concrete',
                          'glass',
                        ].includes(asset.category) && '🎨'}
                      </span>
                    )}
                  </div>

                  {/* Asset info */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">
                      {asset.name}
                    </h3>
                    {asset.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-1">
                        {asset.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>{asset.format.toUpperCase()}</span>
                      <span>{(asset.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                    {asset.usage.useCount > 0 && (
                      <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                        استُخدم {asset.usage.useCount} مرة
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing ? '⏳ جاري الاستيراد...' : '+ استيراد أصول جديدة'}
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      <AssetImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  )
}
