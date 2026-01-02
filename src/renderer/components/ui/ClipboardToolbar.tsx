/**
 * شريط أدوات النسخ واللصق
 * Clipboard Toolbar Component
 */

import React, { useState } from 'react'
import { useClipboard } from '../../hooks/useClipboard'
import { useSelectionState } from '../../store'
import { ClipboardManagerDialog } from '../dialogs/ClipboardManagerDialog'
import { Button } from './Button'

interface ClipboardToolbarProps {
  className?: string
  showLabels?: boolean
  orientation?: 'horizontal' | 'vertical'
  context?: 'viewport' | 'material-editor' | 'selection'
}

export const ClipboardToolbar: React.FC<ClipboardToolbarProps> = ({
  className = '',
  showLabels = true,
  orientation = 'horizontal',
  context = 'viewport',
}) => {
  const selectionState = useSelectionState()
  const [showMultiPasteDialog, setShowMultiPasteDialog] = useState(false)
  const [multiPasteSettings, setMultiPasteSettings] = useState({
    count: 3,
    spacing: { x: 2, y: 0, z: 2 },
  })

  const {
    copy,
    paste,
    multiPaste,
    duplicate,
    clear,
    canPaste,
    hasContent,
    contentStats,
    preview,
    isClipboardManagerOpen,
    openClipboardManager,
    closeClipboardManager,
  } = useClipboard({
    context,
    onError: error => {
      console.error('خطأ في الحافظة:', error)
      // يمكن إضافة نظام إشعارات هنا
    },
  })

  const hasSelection = selectionState.selectedElements.length > 0
  const clipboardPreview = preview()

  const handleMultiPaste = async () => {
    try {
      await multiPaste(multiPasteSettings.count, multiPasteSettings.spacing)
      setShowMultiPasteDialog(false)
    } catch (error) {
      console.error('فشل في اللصق المتعدد:', error)
    }
  }

  const containerClass = `clipboard-toolbar ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} ${className}`

  return (
    <>
      <div
        className={`flex items-center space-x-2 space-x-reverse ${containerClass}`}
      >
        {/* Copy Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={copy}
          disabled={!hasSelection}
          title={`نسخ العناصر المحددة (${selectionState.selectedElements.length})`}
          className="clipboard-copy-btn"
        >
          <span className="text-lg">📋</span>
          {showLabels && <span className="mr-1">نسخ</span>}
        </Button>

        {/* Paste Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={paste}
          disabled={!canPaste}
          title={
            clipboardPreview
              ? `لصق: ${clipboardPreview.description}`
              : 'لا يوجد محتوى للصق'
          }
          className="clipboard-paste-btn"
        >
          <span className="text-lg">📄</span>
          {showLabels && <span className="mr-1">لصق</span>}
        </Button>

        {/* Duplicate Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={duplicate}
          disabled={!hasSelection}
          title={`تكرار العناصر المحددة (${selectionState.selectedElements.length})`}
          className="clipboard-duplicate-btn"
        >
          <span className="text-lg">📑</span>
          {showLabels && <span className="mr-1">تكرار</span>}
        </Button>

        {/* Multi-Paste Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMultiPasteDialog(true)}
          disabled={!canPaste}
          title="لصق متعدد"
          className="clipboard-multi-paste-btn"
        >
          <span className="text-lg">📚</span>
          {showLabels && <span className="mr-1">لصق متعدد</span>}
        </Button>

        {/* Clipboard Manager Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={openClipboardManager}
          title="مدير الحافظة"
          className="clipboard-manager-btn"
        >
          <span className="text-lg">🗂️</span>
          {showLabels && <span className="mr-1">المدير</span>}
          {hasContent && (
            <span className="ml-1 px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
              {contentStats?.elements || 0}
            </span>
          )}
        </Button>

        {/* Clear Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={!hasContent}
          title="مسح الحافظة"
          className="clipboard-clear-btn text-red-600 hover:text-red-700"
        >
          <span className="text-lg">🗑️</span>
          {showLabels && <span className="mr-1">مسح</span>}
        </Button>
      </div>

      {/* Clipboard Status */}
      {hasContent && clipboardPreview && (
        <div className="clipboard-status mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              الحافظة: {clipboardPreview.description}
            </span>
            <span className="text-blue-600 text-xs">
              {new Date(clipboardPreview.timestamp).toLocaleTimeString('ar-SA')}
            </span>
          </div>
        </div>
      )}

      {/* Multi-Paste Dialog */}
      {showMultiPasteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">إعدادات اللصق المتعدد</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عدد النسخ
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={multiPasteSettings.count}
                  onChange={e =>
                    setMultiPasteSettings(prev => ({
                      ...prev,
                      count: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المسافة بين النسخ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600">X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={multiPasteSettings.spacing.x}
                      onChange={e =>
                        setMultiPasteSettings(prev => ({
                          ...prev,
                          spacing: {
                            ...prev.spacing,
                            x: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Y</label>
                    <input
                      type="number"
                      step="0.1"
                      value={multiPasteSettings.spacing.y}
                      onChange={e =>
                        setMultiPasteSettings(prev => ({
                          ...prev,
                          spacing: {
                            ...prev.spacing,
                            y: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={multiPasteSettings.spacing.z}
                      onChange={e =>
                        setMultiPasteSettings(prev => ({
                          ...prev,
                          spacing: {
                            ...prev.spacing,
                            z: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse mt-6">
              <Button
                variant="outline"
                onClick={() => setShowMultiPasteDialog(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleMultiPaste} disabled={!canPaste}>
                لصق ({multiPasteSettings.count} نسخة)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clipboard Manager Dialog */}
      <ClipboardManagerDialog
        isOpen={isClipboardManagerOpen}
        onClose={closeClipboardManager}
      />
    </>
  )
}

export default ClipboardToolbar
