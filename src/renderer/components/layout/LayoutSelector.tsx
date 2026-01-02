import React, { useState } from 'react'
import { getDockviewLayoutManager } from '../../services/DockviewLayoutManager'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export interface LayoutSelectorProps {
  layoutManager: ReturnType<typeof getDockviewLayoutManager>
  onLayoutChange?: (layoutName: string) => void
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  layoutManager,
  onLayoutChange,
}) => {
  const [showSelector, setShowSelector] = useState(false)
  const [layouts, setLayouts] = useState(layoutManager.getLayouts())

  const refreshLayouts = () => {
    setLayouts(layoutManager.getLayouts())
  }

  const handleRestoreLayout = async (layoutName: string) => {
    try {
      await layoutManager.restoreLayout(layoutName)
      setShowSelector(false)
      onLayoutChange?.(layoutName)
    } catch (error) {
      console.error('Failed to restore layout:', error)
    }
  }

  const handleDeleteLayout = (layoutName: string) => {
    if (confirm(`هل أنت متأكد من حذف التخطيط "${layoutName}"؟`)) {
      try {
        layoutManager.deleteLayout(layoutName)
        refreshLayouts()
      } catch (error) {
        console.error('Failed to delete layout:', error)
        alert('لا يمكن حذف التخطيط الافتراضي')
      }
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          refreshLayouts()
          setShowSelector(true)
        }}
        title="اختيار تخطيط النوافذ"
      >
        تخطيطات
      </Button>

      {showSelector && (
        <Modal
          isOpen={showSelector}
          onClose={() => setShowSelector(false)}
          title="اختيار تخطيط النوافذ"
          size="lg"
        >
          <div className="space-y-4">
            {layouts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                لا توجد تخطيطات محفوظة
              </p>
            ) : (
              <div className="grid gap-3">
                {layouts.map(layout => (
                  <div
                    key={layout.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {layout.name}
                          {layout.isDefault && (
                            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                              افتراضي
                            </span>
                          )}
                        </h3>
                      </div>
                      {layout.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {layout.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          تم الإنشاء:{' '}
                          {new Date(layout.created).toLocaleDateString('ar')}
                        </span>
                        <span>
                          آخر تعديل:{' '}
                          {new Date(layout.modified).toLocaleDateString('ar')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRestoreLayout(layout.id)}
                      >
                        استعادة
                      </Button>
                      {!layout.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLayout(layout.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                        >
                          حذف
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
              <Button variant="ghost" onClick={() => setShowSelector(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
