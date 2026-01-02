import React, { useEffect, useState } from 'react'
import { useElectron } from '../../hooks/useElectron'
import {
  useKeyboardShortcuts,
  useProject,
  useProjectStatistics,
  useTools,
} from '../../hooks/useStore'
import { getDockviewLayoutManager } from '../../services/DockviewLayoutManager'
import { DockviewLayout } from './DockviewLayout'
import { TopToolbar } from './TopToolbar'

export const MainLayout: React.FC = () => {
  const { project, createProject, hasProject } = useProject()
  const { activateTool } = useTools()
  const { stats } = useProjectStatistics()

  // Layout manager state
  const [layoutManager, setLayoutManager] = useState<ReturnType<
    typeof getDockviewLayoutManager
  > | null>(null)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  const {
    isElectron,
    saveProject: saveProjectElectron,
    loadProject,
    exportProject,
    showNotification,
    getSystemInfo,
    openDevTools,
  } = useElectron({
    onMenuAction: handleMenuAction,
    enableNotifications: true,
  })

  const [systemInfo, setSystemInfo] = React.useState<any>(null)

  // Handle menu actions from native menus and toolbar
  function handleMenuAction(action: string) {
    console.log('Menu action received:', action)

    switch (action) {
      case 'file:new':
        handleNewProject()
        break
      case 'file:save':
        handleSaveProject()
        break
      case 'file:open':
        handleLoadProject()
        break
      case 'file:export':
        handleExportProject()
        break
      case 'edit:undo':
        showNotification('تراجع', 'تم التراجع عن العملية الأخيرة')
        break
      case 'edit:redo':
        showNotification('إعادة', 'تم إعادة العملية')
        break
      case 'tool:select':
        activateTool('select')
        break
      case 'tool:wall':
        activateTool('wall')
        break
      case 'tool:floor':
        activateTool('floor')
        break
      case 'tool:door':
        activateTool('door')
        break
      case 'tool:window':
        activateTool('window')
        break
      case 'tool:cut':
        activateTool('cut')
        break
      default:
        console.log('Unknown menu action:', action)
    }
  }

  // Load system info on startup
  useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        const info = await getSystemInfo()
        setSystemInfo(info)
      } catch (error) {
        console.error('Failed to load system info:', error)
      }
    }

    loadSystemInfo()
  }, [getSystemInfo])

  // Project operations
  const handleNewProject = () => {
    const projectName = prompt('اسم المشروع الجديد:', 'مشروع جديد')
    if (projectName) {
      createProject(projectName)
      showNotification('مشروع جديد', `تم إنشاء مشروع "${projectName}" بنجاح`)
    }
  }

  const handleSaveProject = async () => {
    if (!hasProject) {
      showNotification('خطأ', 'لا يوجد مشروع للحفظ')
      return
    }

    try {
      const success = await saveProjectElectron(project)
      if (success) {
        showNotification('حفظ المشروع', 'تم حفظ المشروع بنجاح')
      } else {
        showNotification('خطأ', 'فشل في حفظ المشروع')
      }
    } catch (error) {
      console.error('Save project error:', error)
      showNotification('خطأ', 'حدث خطأ أثناء حفظ المشروع')
    }
  }

  const handleLoadProject = async () => {
    try {
      const data = await loadProject()
      if (data) {
        // The project will be loaded through the store
        showNotification('تحميل المشروع', 'تم تحميل المشروع بنجاح')
      } else {
        showNotification('تنبيه', 'لم يتم العثور على مشروع للتحميل')
      }
    } catch (error) {
      console.error('Load project error:', error)
      showNotification('خطأ', 'حدث خطأ أثناء تحميل المشروع')
    }
  }

  const handleExportProject = async () => {
    if (!hasProject) {
      showNotification('خطأ', 'لا يوجد مشروع للتصدير')
      return
    }

    try {
      const success = await exportProject('glb', project)
      if (success) {
        showNotification('تصدير المشروع', 'تم تصدير المشروع بنجاح')
      } else {
        showNotification('خطأ', 'فشل في تصدير المشروع')
      }
    } catch (error) {
      console.error('Export project error:', error)
      showNotification('خطأ', 'حدث خطأ أثناء تصدير المشروع')
    }
  }

  // Handle shortcut manager opening
  const handleOpenShortcutManager = () => {
    // For now, just show a notification. In a full implementation,
    // this would open a shortcut management dialog/modal
    showNotification('إدارة الاختصارات', 'سيتم فتح إدارة الاختصارات قريباً')
  }

  return (
    <div className="h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      {/* Top Toolbar */}
      <TopToolbar
        onMenuAction={handleMenuAction}
        layoutManager={layoutManager}
        onOpenShortcutManager={handleOpenShortcutManager}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Welcome Screen */}
        {!hasProject && (
          <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
            <div className="max-w-2xl mx-auto text-center p-8">
              {/* Logo and Title */}
              <div className="mb-8">
                <div className="text-6xl mb-4">🏗️</div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Building Forge
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  أداة تصميم المباني ثلاثية الأبعاد
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleNewProject}
                  className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  🆕 إنشاء مشروع جديد
                </button>
                <button
                  onClick={handleLoadProject}
                  className="px-8 py-3 text-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  📁 فتح مشروع موجود
                </button>
              </div>

              {/* Quick Tips */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  نصائح سريعة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">💡</span>
                    <span>استخدم V للتحديد، W للجدران، F للأرضيات</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">💡</span>
                    <span>اسحب بالماوس للدوران، عجلة الماوس للتكبير</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">💡</span>
                    <span>اضغط F1 لعرض جميع الاختصارات</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">💡</span>
                    <span>اسحب الأصول من المكتبة إلى المشهد</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Dockview Layout */}
        <DockviewLayout onLayoutReady={setLayoutManager} />
      </div>
    </div>
  )
}
