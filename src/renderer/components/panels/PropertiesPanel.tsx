import { IDockviewPanelProps } from 'dockview'
import React from 'react'
import { useTools } from '../../hooks/useStore'

export const PropertiesPanel: React.FC<IDockviewPanelProps> = props => {
  const { activeTool, toolProperties, updateToolProperties } = useTools()

  return (
    <div className="h-full w-full bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          الخصائص (Properties)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          تحكم في خصائص العناصر المحددة
        </p>
      </div>

      {/* General position properties */}
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            الموضع والأبعاد
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                الموضع X (متر)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                الموضع Y (متر)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                الموضع Z (متر)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue="0"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Tool-specific properties */}
        {activeTool === 'wall' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              خصائص الجدار
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  السماكة (م)
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toolProperties.wallThickness || 0.2}
                  onChange={e =>
                    updateToolProperties({
                      wallThickness: parseFloat(e.target.value),
                    })
                  }
                  step="0.1"
                  min="0.1"
                  max="1.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  الارتفاع (م)
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toolProperties.wallHeight || 3.0}
                  onChange={e =>
                    updateToolProperties({
                      wallHeight: parseFloat(e.target.value),
                    })
                  }
                  step="0.1"
                  min="1.0"
                  max="10.0"
                />
              </div>
            </div>
          </div>
        )}

        {activeTool === 'door' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              خصائص الباب
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  العرض (م)
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toolProperties.doorWidth || 0.9}
                  onChange={e =>
                    updateToolProperties({
                      doorWidth: parseFloat(e.target.value),
                    })
                  }
                  step="0.1"
                  min="0.5"
                  max="2.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  الارتفاع (م)
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toolProperties.doorHeight || 2.1}
                  onChange={e =>
                    updateToolProperties({
                      doorHeight: parseFloat(e.target.value),
                    })
                  }
                  step="0.1"
                  min="1.5"
                  max="3.0"
                />
              </div>
            </div>
          </div>
        )}

        {activeTool === 'window' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              خصائص النافذة
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  العرض (م)
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toolProperties.windowWidth || 1.2}
                  onChange={e =>
                    updateToolProperties({
                      windowWidth: parseFloat(e.target.value),
                    })
                  }
                  step="0.1"
                  min="0.5"
                  max="3.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  الارتفاع (م)
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toolProperties.windowHeight || 1.5}
                  onChange={e =>
                    updateToolProperties({
                      windowHeight: parseFloat(e.target.value),
                    })
                  }
                  step="0.1"
                  min="0.5"
                  max="2.5"
                />
              </div>
            </div>
          </div>
        )}

        {activeTool === 'floor' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              خصائص الأرضية
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  السماكة (م)
                </label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={toolProperties.floorThickness || 0.15}
                  onChange={e =>
                    updateToolProperties({
                      floorThickness: parseFloat(e.target.value),
                    })
                  }
                  step="0.05"
                  min="0.05"
                  max="0.5"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
