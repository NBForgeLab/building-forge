import React from 'react'
import { useUI } from '../../hooks/useStore'
import { Button } from '../ui/Button'

export interface ViewportControlsProps {
  className?: string
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  className = '',
}) => {
  const {
    uiState,
    toggleGrid,
    toggleStats,
    toggleWireframe,
    setViewMode,
    setCameraMode,
  } = useUI()

  const viewModes = [
    { id: 'solid', name: 'صلب', icon: '🔳', title: 'العرض الصلب' },
    { id: 'wireframe', name: 'إطار', icon: '⬜', title: 'العرض السلكي' },
    { id: 'textured', name: 'نسيج', icon: '🎨', title: 'العرض المنسوج' },
  ]

  const cameraModes = [
    {
      id: 'perspective',
      name: 'منظوري',
      icon: '📐',
      title: 'المنظور ثلاثي الأبعاد',
    },
    {
      id: 'orthographic',
      name: 'متعامد',
      icon: '⬛',
      title: 'المنظور المتعامد',
    },
  ]

  const viewAngles = [
    { id: 'front', name: 'أمامي', icon: '⬆️', title: 'المنظر الأمامي' },
    { id: 'back', name: 'خلفي', icon: '⬇️', title: 'المنظر الخلفي' },
    { id: 'left', name: 'يسار', icon: '⬅️', title: 'المنظر الأيسر' },
    { id: 'right', name: 'يمين', icon: '➡️', title: 'المنظر الأيمن' },
    { id: 'top', name: 'علوي', icon: '🔼', title: 'المنظر العلوي' },
    { id: 'bottom', name: 'سفلي', icon: '🔽', title: 'المنظر السفلي' },
  ]

  const handleViewAngleChange = (angle: string) => {
    // This will be implemented when we add the 3D viewport
    console.log('Changing view angle to:', angle)
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* View Mode Controls */}
      <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
        {viewModes.map(mode => (
          <Button
            key={mode.id}
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(mode.id as any)}
            title={mode.title}
            className={
              uiState.viewMode === mode.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : ''
            }
          >
            {mode.icon}
          </Button>
        ))}
      </div>

      {/* Camera Mode Controls */}
      <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
        {cameraModes.map(mode => (
          <Button
            key={mode.id}
            variant="ghost"
            size="sm"
            onClick={() => setCameraMode(mode.id as any)}
            title={mode.title}
            className={
              uiState.cameraMode === mode.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : ''
            }
          >
            {mode.icon}
          </Button>
        ))}
      </div>

      {/* View Angle Controls */}
      <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
        {viewAngles.map(angle => (
          <Button
            key={angle.id}
            variant="ghost"
            size="sm"
            onClick={() => handleViewAngleChange(angle.id)}
            title={angle.title}
            className="w-8 h-8 p-0"
          >
            {angle.icon}
          </Button>
        ))}
      </div>

      {/* Display Options */}
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleGrid}
          title="إظهار/إخفاء الشبكة"
          className={uiState.showGrid ? 'bg-blue-100 dark:bg-blue-900' : ''}
        >
          شبكة
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleWireframe}
          title="إظهار/إخفاء الإطار السلكي"
          className={
            uiState.showWireframe ? 'bg-blue-100 dark:bg-blue-900' : ''
          }
        >
          إطار
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleStats}
          title="إظهار/إخفاء الإحصائيات"
          className={uiState.showStats ? 'bg-blue-100 dark:bg-blue-900' : ''}
        >
          إحصائيات
        </Button>
      </div>
    </div>
  )
}
