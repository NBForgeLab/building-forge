import { IDockviewPanelProps } from 'dockview'
import React from 'react'
import { useTools } from '../../hooks/useStore'
import { Button } from '../ui/Button'

export const ToolPanel: React.FC<IDockviewPanelProps> = props => {
  const { activeTool, activateTool } = useTools()

  const tools = [
    { id: 'select', name: '🔍 أداة التحديد', shortcut: 'V' },
    { id: 'wall', name: '🧱 أداة الجدار', shortcut: 'W' },
    { id: 'floor', name: '🏠 أداة الأرضية', shortcut: 'F' },
    { id: 'door', name: '🚪 أداة الباب', shortcut: 'D' },
    { id: 'window', name: '🪟 أداة النافذة', shortcut: 'N' },
    { id: 'cut', name: '✂️ أداة القطع', shortcut: 'C' },
  ]

  return (
    <div className="h-full w-full bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          الأدوات (Tools)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          اختر الأداة المناسبة لبناء مشروعك
        </p>
      </div>

      <div className="space-y-2">
        {tools.map(tool => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'primary' : 'ghost'}
            size="sm"
            className="w-full justify-start text-left"
            onClick={() => activateTool(tool.id as any)}
            title={`${tool.name} (${tool.shortcut})`}
          >
            <span className="flex items-center gap-2">
              {tool.name}
              <span className="ml-auto text-xs opacity-60">
                {tool.shortcut}
              </span>
            </span>
          </Button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          اختصارات لوحة المفاتيح
        </h3>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {tools.map(tool => (
            <div key={tool.id} className="flex justify-between">
              <span>{tool.name.replace(/[🔍🧱🏠🚪🪟✂️] /, '')}</span>
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                {tool.shortcut}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current tool info */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          الأداة النشطة
        </h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {tools.find(t => t.id === activeTool)?.name || 'غير محدد'}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            انقر في العارض ثلاثي الأبعاد لاستخدام هذه الأداة
          </div>
        </div>
      </div>
    </div>
  )
}
