import { IDockviewPanelProps } from 'dockview'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useProject, useSelection, useTools } from '../../hooks/useStore'
import { getAssetIntegrationService } from '../../services/AssetIntegrationService'
import { PerformanceManager } from '../../services/PerformanceManager'
import {
  OptimizationStats,
  PerformanceMetrics,
} from '../../services/PerformanceOptimizer'
import { getTransformToolsManager } from '../../tools/TransformToolsManager'
import { TransformGizmos } from '../viewport/TransformGizmos'
import { Viewport3D } from '../viewport/Viewport3D'
import { NumericTransformPanel } from './NumericTransformPanel'

export const ViewportPanel: React.FC<IDockviewPanelProps> = props => {
  const { activeTool } = useTools()
  const { project } = useProject()
  const { selectedElements, transformMode } = useSelection()
  const [gizmoState, setGizmoState] = useState(
    getTransformToolsManager().getGizmoState()
  )
  const [dragOver, setDragOver] = useState(false)
  const [showPerformanceOverlay, setShowPerformanceOverlay] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      fps: 60,
      drawCalls: 0,
      vertices: 0,
      triangles: 0,
      memoryUsage: 0,
      renderTime: 0,
    })
  const [optimizationStats, setOptimizationStats] = useState<OptimizationStats>(
    {
      originalDrawCalls: 0,
      optimizedDrawCalls: 0,
      originalVertices: 0,
      optimizedVertices: 0,
      textureMemorySaved: 0,
      batchedMeshes: 0,
      instancedObjects: 0,
    }
  )
  const performanceManagerRef = useRef<PerformanceManager | null>(null)
  const assetIntegrationService = getAssetIntegrationService()

  // Update gizmo state when selection or transform mode changes
  useEffect(() => {
    const transformManager = getTransformToolsManager()
    transformManager.updateTransformTools()
    setGizmoState(transformManager.getGizmoState())
  }, [selectedElements, transformMode])

  // Initialize performance manager when viewport is ready
  useEffect(() => {
    const initPerformanceManager = (
      scene: THREE.Scene,
      camera: THREE.Camera,
      renderer: THREE.WebGLRenderer
    ) => {
      if (performanceManagerRef.current) {
        performanceManagerRef.current.dispose()
      }

      performanceManagerRef.current = new PerformanceManager(
        scene,
        camera,
        renderer,
        {
          enableAutoOptimization: false,
          fpsThreshold: 30,
          drawCallThreshold: 100,
          vertexThreshold: 1000000,
          optimizationInterval: 5000,
        }
      )

      // Listen to performance updates
      performanceManagerRef.current.on('metricsUpdate', metrics => {
        setPerformanceMetrics(metrics)
      })

      performanceManagerRef.current.on('optimizationComplete', stats => {
        setOptimizationStats(stats)
      })
    }

    // This would be called from Viewport3D when it's ready
    // For now, we'll set up a placeholder
    return () => {
      if (performanceManagerRef.current) {
        performanceManagerRef.current.dispose()
        performanceManagerRef.current = null
      }
    }
  }, [])

  // Handle asset drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Check if dragging an asset
    const assetData = e.dataTransfer.getData('application/building-forge-asset')
    if (assetData) {
      setDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)

      try {
        const assetData = e.dataTransfer.getData(
          'application/building-forge-asset'
        )
        if (!assetData) return

        const asset = JSON.parse(assetData)

        // Calculate drop position (simplified - would need proper raycasting)
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        const z = ((e.clientY - rect.top) / rect.height) * 2 - 1

        // Place asset at drop position
        const result = await assetIntegrationService.placeAsset(asset.id, {
          position: new THREE.Vector3(x * 10, 0, z * 10),
          snapToGrid: true,
        })

        if (result.success) {
          console.log('Asset placed successfully:', asset.name)
        } else {
          console.error('Failed to place asset:', result.error)
        }
      } catch (error) {
        console.error('Error handling asset drop:', error)
      }
    },
    [assetIntegrationService]
  )

  const getToolName = (tool: string): string => {
    const toolNames: Record<string, string> = {
      select: 'التحديد',
      wall: 'الجدار',
      floor: 'الأرضية',
      door: 'الباب',
      window: 'النافذة',
      cut: 'القطع',
    }
    return toolNames[tool] || tool
  }

  const getTransformModeName = (mode: string): string => {
    const modeNames: Record<string, string> = {
      translate: 'التحريك',
      rotate: 'الدوران',
      scale: 'التحجيم',
    }
    return modeNames[mode] || mode
  }

  const handleCloseNumericPanel = () => {
    getTransformToolsManager().closeNumericPanel()
    setGizmoState(getTransformToolsManager().getGizmoState())
  }

  // Performance management functions
  const handleOptimizeScene = useCallback(() => {
    if (performanceManagerRef.current) {
      performanceManagerRef.current.optimizeScene()
    }
  }, [])

  const handleRestoreScene = useCallback(() => {
    if (performanceManagerRef.current) {
      performanceManagerRef.current.restoreOriginalScene()
    }
  }, [])

  const handleOptimizationSettingsChange = useCallback(
    (settings: Partial<OptimizationSettings>) => {
      if (performanceManagerRef.current) {
        performanceManagerRef.current.updateOptimizationSettings(settings)
      }
    },
    []
  )

  // Keyboard shortcuts for performance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        setShowPerformanceOverlay(!showPerformanceOverlay)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPerformanceOverlay])

  return (
    <div
      className={`h-full w-full relative ${dragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Asset Drop Overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border-2 border-dashed border-blue-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-1">
                إفلات الأصل هنا
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                سيتم وضع الأصل في المشهد
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3D Viewport */}
      <Viewport3D className="w-full h-full">
        {/* Transform Gizmos */}
        <TransformGizmos
          moveData={gizmoState.moveData}
          rotateData={gizmoState.rotateData}
          scaleData={gizmoState.scaleData}
        />
      </Viewport3D>

      {/* Tool indicator overlay */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
          <div>الأداة المحددة: {getToolName(activeTool)}</div>
          {selectedElements.length > 0 && (
            <div className="mt-1 text-xs opacity-75">
              وضع التحويل: {getTransformModeName(transformMode)}
            </div>
          )}
          {project && (
            <div className="mt-1 text-xs opacity-75">
              المشروع: {project.name}
            </div>
          )}
        </div>
      </div>

      {/* Performance overlay toggle */}
      <div className="absolute top-4 right-4 mt-20 pointer-events-auto">
        <button
          onClick={() => setShowPerformanceOverlay(!showPerformanceOverlay)}
          className="bg-gray-800 bg-opacity-80 text-white px-2 py-1 rounded text-xs hover:bg-opacity-100 transition-all"
          title="Ctrl+P لتبديل مراقب الأداء"
        >
          📊 الأداء
        </button>
      </div>

      {/* Performance overlay */}
      {showPerformanceOverlay && (
        <div className="absolute top-16 right-4 w-80 pointer-events-auto">
          <div className="bg-gray-900 bg-opacity-95 text-white rounded-lg p-4 text-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">مراقب الأداء</h3>
              <button
                onClick={() => setShowPerformanceOverlay(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Performance metrics */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>FPS:</span>
                <span
                  className={`font-mono ${
                    performanceMetrics.fps < 30
                      ? 'text-red-400'
                      : performanceMetrics.fps < 45
                        ? 'text-yellow-400'
                        : 'text-green-400'
                  }`}
                >
                  {performanceMetrics.fps}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Draw Calls:</span>
                <span
                  className={`font-mono ${
                    performanceMetrics.drawCalls > 100
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {performanceMetrics.drawCalls}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Vertices:</span>
                <span className="font-mono text-blue-400">
                  {performanceMetrics.vertices.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Render Time:</span>
                <span
                  className={`font-mono ${
                    performanceMetrics.renderTime > 16.67
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {performanceMetrics.renderTime.toFixed(1)}ms
                </span>
              </div>
            </div>

            {/* Optimization stats */}
            {optimizationStats.batchedMeshes > 0 && (
              <div className="border-t border-gray-700 pt-3 mb-4">
                <h4 className="font-semibold mb-2">إحصائيات التحسين</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Batched Meshes:</span>
                    <span className="text-green-400">
                      {optimizationStats.batchedMeshes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Instanced Objects:</span>
                    <span className="text-green-400">
                      {optimizationStats.instancedObjects}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Draw Calls Saved:</span>
                    <span className="text-green-400">
                      {optimizationStats.originalDrawCalls -
                        optimizationStats.optimizedDrawCalls}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Control buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleOptimizeScene}
                className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-xs font-medium transition-colors"
              >
                تحسين
              </button>
              <button
                onClick={handleRestoreScene}
                className="flex-1 bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded text-xs font-medium transition-colors"
              >
                استعادة
              </button>
            </div>

            {/* Performance tips */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400">
                <div>💡 نصائح الأداء:</div>
                {performanceMetrics.fps < 30 && (
                  <div>• FPS منخفض - فعل التحسينات</div>
                )}
                {performanceMetrics.drawCalls > 50 && (
                  <div>• Draw Calls مرتفع - استخدم Batching</div>
                )}
                {performanceMetrics.vertices > 500000 && (
                  <div>• Vertices كثير - فعل Culling</div>
                )}
                <div>• Ctrl+P لإخفاء/إظهار هذه اللوحة</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection info overlay */}
      {selectedElements.length > 0 && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-blue-600 bg-opacity-90 text-white px-3 py-2 rounded text-sm">
            <div>محدد: {selectedElements.length} عنصر</div>
            <div className="mt-1 text-xs opacity-75">
              G: تحريك | R: دوران | S: تحجيم | Tab: إدخال رقمي
            </div>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm max-w-xs">
          <div className="text-xs opacity-75">
            <div>• اسحب بالماوس للدوران</div>
            <div>• عجلة الماوس للتكبير/التصغير</div>
            <div>• Shift + سحب للتحريك</div>
            <div>• انقر على العناصر لتحديدها</div>
            <div>• اسحب الأصول من المكتبة لإضافتها</div>
            {selectedElements.length > 0 && (
              <>
                <div>• اسحب المحاور للتحويل</div>
                <div>• X/Y/Z: تقييد المحور</div>
                <div>• Shift: تحويل دقيق</div>
                <div>• Ctrl: محاذاة للشبكة</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transform constraints overlay */}
      {selectedElements.length > 0 && (
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
            <div className="text-xs">
              {transformMode === 'translate' && (
                <>
                  <div>
                    المحاذاة للشبكة: {gizmoState.moveData ? 'مفعل' : 'معطل'}
                  </div>
                </>
              )}
              {transformMode === 'rotate' && (
                <>
                  <div>محاذاة الزوايا: مفعل (15°)</div>
                </>
              )}
              {transformMode === 'scale' && (
                <>
                  <div>الحفاظ على النسب: مفعل</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Numeric Transform Panel */}
      <NumericTransformPanel
        visible={gizmoState.numericPanelVisible}
        mode={gizmoState.numericPanelMode}
        onClose={handleCloseNumericPanel}
      />
    </div>
  )
}
