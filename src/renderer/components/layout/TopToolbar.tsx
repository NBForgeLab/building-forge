import React, { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useElectron } from '../../hooks/useElectron'
import {
  useProject,
  useProjectStatistics,
  useTools,
  useUI,
} from '../../hooks/useStore'
import { getDockviewLayoutManager } from '../../services/DockviewLayoutManager'
import { useShortcuts } from '../ShortcutManager/ShortcutProvider'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { LayoutSelector } from './LayoutSelector'
import { ViewportControls } from './ViewportControls'

export interface TopToolbarProps {
  onMenuAction?: (action: string) => void
  layoutManager?: ReturnType<typeof getDockviewLayoutManager>
  onOpenShortcutManager?: () => void
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onMenuAction,
  layoutManager,
  onOpenShortcutManager,
}) => {
  const { theme, toggleTheme } = useTheme()
  const { project, hasProject } = useProject()
  const { activeTool, activateTool } = useTools()
  const { uiState, toggleGrid, toggleStats, toggleWireframe } = useUI()
  const { stats } = useProjectStatistics()

  // Safe shortcut hook usage with fallback
  let shortcuts: {
    showHelp: () => void
    openShortcutManager: () => void
  } | null = null
  try {
    shortcuts = useShortcuts()
  } catch (error) {
    console.warn('ShortcutProvider not available, using fallback shortcuts')
    shortcuts = {
      showHelp: () => console.log('Help shortcut triggered'),
      openShortcutManager: () => {
        if (onOpenShortcutManager) {
          onOpenShortcutManager()
        } else {
          console.log('Shortcut manager triggered')
        }
      },
    }
  }

  const { showHelp, openShortcutManager } = shortcuts

  // Layout management state
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [layoutName, setLayoutName] = useState('')
  const [layoutDescription, setLayoutDescription] = useState('')

  const {
    isElectron,
    saveProject: saveProjectElectron,
    loadProject,
    exportProject,
    showNotification,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
  } = useElectron({
    onMenuAction: onMenuAction || (() => {}),
    enableNotifications: true,
  })

  // Project operations
  const handleNewProject = () => {
    const projectName = prompt('اسم المشروع الجديد:', 'مشروع جديد')
    if (projectName && onMenuAction) {
      onMenuAction('file:new')
    }
  }

  const handleSaveProject = () => {
    if (onMenuAction) {
      onMenuAction('file:save')
    }
  }

  const handleLoadProject = () => {
    if (onMenuAction) {
      onMenuAction('file:open')
    }
  }

  const handleExportProject = () => {
    if (onMenuAction) {
      onMenuAction('file:export')
    }
  }

  // Layout management operations
  const handleSaveLayout = async () => {
    if (!layoutManager) return

    try {
      await layoutManager.saveLayout(
        layoutName || undefined,
        layoutDescription || undefined
      )
      setShowLayoutModal(false)
      setLayoutName('')
      setLayoutDescription('')
      showNotification('حفظ التخطيط', 'تم حفظ تخطيط النوافذ بنجاح')
    } catch (error) {
      console.error('Failed to save layout:', error)
      showNotification('خطأ', 'فشل في حفظ تخطيط النوافذ')
    }
  }

  const handleRestoreLayout = async () => {
    if (!layoutManager) return

    try {
      await layoutManager.restoreLayout()
      showNotification('استعادة التخطيط', 'تم استعادة تخطيط النوافذ بنجاح')
    } catch (error) {
      console.error('Failed to restore layout:', error)
      showNotification('خطأ', 'فشل في استعادة تخطيط النوافذ')
    }
  }

  const handleResetLayout = async () => {
    if (!layoutManager) return

    if (confirm('هل أنت متأكد من إعادة تعيين التخطيط للوضع الافتراضي؟')) {
      try {
        await layoutManager.resetToDefault()
        showNotification(
          'إعادة تعيين التخطيط',
          'تم إعادة تعيين التخطيط للوضع الافتراضي'
        )
      } catch (error) {
        console.error('Failed to reset layout:', error)
        showNotification('خطأ', 'فشل في إعادة تعيين التخطيط')
      }
    }
  }

  // Tool shortcuts
  const tools = [
    { id: 'select', icon: '🔍', title: 'أداة التحديد (V)', shortcut: 'V' },
    { id: 'wall', icon: '🧱', title: 'أداة الجدار (W)', shortcut: 'W' },
    { id: 'floor', icon: '🏠', title: 'أداة الأرضية (F)', shortcut: 'F' },
    { id: 'door', icon: '🚪', title: 'أداة الباب (D)', shortcut: 'D' },
    { id: 'window', icon: '🪟', title: 'أداة النافذة (N)', shortcut: 'N' },
    { id: 'cut', icon: '✂️', title: 'أداة القطع (C)', shortcut: 'C' },
  ]

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-10">
      {/* Left section - Logo and project name */}
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Building Forge
        </h1>
        {project && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            - {project.name}
          </span>
        )}
      </div>

      {/* Center section - Tools */}
      <div className="flex items-center space-x-2">
        {tools.map(tool => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => activateTool(tool.id as any)}
            title={tool.title}
            className="w-10 h-10 p-0"
          >
            {tool.icon}
          </Button>
        ))}
      </div>

      {/* Right section - File operations, view controls, and window controls */}
      <div className="flex items-center space-x-2">
        {/* File operations */}
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewProject}
            title="مشروع جديد (Ctrl+N)"
          >
            جديد
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadProject}
            title="فتح مشروع (Ctrl+O)"
          >
            فتح
          </Button>
          {hasProject && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveProject}
                title="حفظ المشروع (Ctrl+S)"
              >
                حفظ
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportProject}
                title="تصدير المشروع"
              >
                تصدير
              </Button>
            </>
          )}
        </div>

        {/* View and Layout controls */}
        <ViewportControls />

        {/* Layout controls */}
        {layoutManager && (
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLayoutModal(true)}
              title="حفظ تخطيط النوافذ"
            >
              حفظ التخطيط
            </Button>
            <LayoutSelector
              layoutManager={layoutManager}
              onLayoutChange={name => console.log('Layout changed to:', name)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetLayout}
              title="إعادة تعيين التخطيط للوضع الافتراضي"
            >
              إعادة تعيين
            </Button>
          </div>
        )}

        {/* Theme toggle and shortcuts */}
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={showHelp}
            title="عرض مساعدة الاختصارات (F1)"
            className="w-10 h-10 p-0"
          >
            ❓
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onOpenShortcutManager) {
                onOpenShortcutManager()
              } else {
                openShortcutManager()
              }
            }}
            title="إدارة الاختصارات (Ctrl+Shift+K)"
            className="w-10 h-10 p-0"
          >
            ⌨️
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="w-10 h-10 p-0"
          >
            {theme === 'dark' ? (
              // Sun icon for light mode
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              // Moon icon for dark mode
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </Button>
        </div>

        {/* Window controls for Electron */}
        {isElectron && (
          <div className="flex items-center space-x-1 ml-2 border-l border-gray-300 dark:border-gray-600 pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={minimizeWindow}
              title="تصغير"
              className="w-8 h-8 p-0"
            >
              −
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={maximizeWindow}
              title="تكبير"
              className="w-8 h-8 p-0"
            >
              □
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeWindow}
              title="إغلاق"
              className="w-8 h-8 p-0 hover:bg-red-500 hover:text-white"
            >
              ×
            </Button>
          </div>
        )}
      </div>

      {/* Layout Save Modal */}
      {showLayoutModal && (
        <Modal
          isOpen={showLayoutModal}
          onClose={() => setShowLayoutModal(false)}
          title="حفظ تخطيط النوافذ"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اسم التخطيط
              </label>
              <input
                type="text"
                value={layoutName}
                onChange={e => setLayoutName(e.target.value)}
                placeholder="اسم التخطيط (اختياري)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الوصف
              </label>
              <textarea
                value={layoutDescription}
                onChange={e => setLayoutDescription(e.target.value)}
                placeholder="وصف التخطيط (اختياري)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" onClick={() => setShowLayoutModal(false)}>
                إلغاء
              </Button>
              <Button variant="primary" onClick={handleSaveLayout}>
                حفظ
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  )
}
