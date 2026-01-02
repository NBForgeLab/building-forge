/**
 * مدير الحافظة - نافذة إدارة تاريخ النسخ واللصق
 * Clipboard Manager - Copy/Paste history management dialog
 */

import React, { useEffect, useState } from 'react'
import { useClipboardActions, useClipboardState } from '../../store'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface ClipboardManagerDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const ClipboardManagerDialog: React.FC<ClipboardManagerDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const clipboardState = useClipboardState()
  const {
    navigateClipboardHistory,
    clearClipboard,
    removeClipboardEntry,
    pasteElements,
    pasteMaterials,
    updateClipboardState,
  } = useClipboardActions()

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      updateClipboardState()
    }
  }, [isOpen, updateClipboardState])

  const handlePasteEntry = async (entryId: string) => {
    try {
      // Navigate to the specific entry
      const entry = clipboardState.history.find(e => e.id === entryId)
      if (!entry) return

      // Set as current entry by navigating to it
      const currentIndex = clipboardState.history.findIndex(
        e => e.id === entryId
      )
      if (currentIndex !== -1) {
        // Navigate to make this entry current
        for (let i = 0; i < currentIndex; i++) {
          navigateClipboardHistory('next')
        }
      }

      // Paste based on content type
      if (entry.type === 'materials') {
        await pasteMaterials()
      } else {
        await pasteElements()
      }

      onClose()
    } catch (error) {
      console.error('فشل في لصق المحتوى:', error)
    }
  }

  const handleRemoveEntry = (entryId: string) => {
    removeClipboardEntry(entryId)
    if (selectedEntryId === entryId) {
      setSelectedEntryId(null)
    }
  }

  const handleClearAll = () => {
    clearClipboard()
    setSelectedEntryId(null)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'الآن'
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 7) return `منذ ${diffDays} يوم`

    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'elements':
        return '🏗️'
      case 'materials':
        return '🎨'
      case 'mixed':
        return '📦'
      default:
        return '📋'
    }
  }

  const getEntryTypeLabel = (type: string) => {
    switch (type) {
      case 'elements':
        return 'عناصر'
      case 'materials':
        return 'مواد'
      case 'mixed':
        return 'مختلط'
      default:
        return 'غير محدد'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="مدير الحافظة" size="large">
      <div className="clipboard-manager">
        {/* Header */}
        <div className="clipboard-header mb-4">
          <div className="flex justify-between items-center">
            <div className="clipboard-stats">
              <span className="text-sm text-gray-600">
                {clipboardState.history.length} إدخال في التاريخ
              </span>
            </div>
            <div className="clipboard-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={clipboardState.history.length === 0}
              >
                مسح الكل
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="clipboard-content">
          {clipboardState.history.length === 0 ? (
            <div className="empty-state text-center py-8">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                الحافظة فارغة
              </h3>
              <p className="text-gray-600">
                لم يتم نسخ أي محتوى بعد. استخدم Ctrl+C لنسخ العناصر أو المواد.
              </p>
            </div>
          ) : (
            <div className="clipboard-list space-y-2 max-h-96 overflow-y-auto">
              {clipboardState.history.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`clipboard-entry p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEntryId === entry.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${index === clipboardState.currentIndex ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => setSelectedEntryId(entry.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 space-x-reverse">
                      <div className="text-2xl">{getEntryIcon(entry.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 space-x-reverse mb-1">
                          <span className="font-medium text-gray-900">
                            {entry.data.metadata?.description ||
                              'محتوى غير محدد'}
                          </span>
                          {index === clipboardState.currentIndex && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              حالي
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
                          <span>النوع: {getEntryTypeLabel(entry.type)}</span>
                          {entry.data.elements && (
                            <span>العناصر: {entry.data.elements.length}</span>
                          )}
                          {entry.data.materials && (
                            <span>المواد: {entry.data.materials.length}</span>
                          )}
                          <span>{formatTimestamp(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          handlePasteEntry(entry.id)
                        }}
                      >
                        لصق
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          handleRemoveEntry(entry.id)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="clipboard-footer mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              استخدم Ctrl+Shift+V لفتح مدير الحافظة
            </div>
            <Button onClick={onClose}>إغلاق</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ClipboardManagerDialog
