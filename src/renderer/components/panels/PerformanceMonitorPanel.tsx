/**
 * لوحة مراقبة الأداء المتقدمة
 * تعرض إحصائيات الأداء في الوقت الفعلي مع اقتراحات التحسين
 */

import React, { useEffect, useRef, useState } from 'react'
import { OptimizationStats } from '../services/MeshOptimizer'
import {
  OptimizationSettings,
  PerformanceMetrics,
} from '../services/PerformanceOptimizer'

interface PerformanceMonitorPanelProps {
  metrics: PerformanceMetrics
  optimizationStats: OptimizationStats
  settings: OptimizationSettings
  onSettingsChange: (settings: Partial<OptimizationSettings>) => void
  onOptimize: () => void
  onRestore: () => void
}

interface PerformanceHistory {
  timestamp: number
  fps: number
  drawCalls: number
  vertices: number
  renderTime: number
}

export const PerformanceMonitorPanel: React.FC<
  PerformanceMonitorPanelProps
> = ({
  metrics,
  optimizationStats,
  settings,
  onSettingsChange,
  onOptimize,
  onRestore,
}) => {
  const [history, setHistory] = useState<PerformanceHistory[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  // تحديث تاريخ الأداء
  useEffect(() => {
    const updateHistory = () => {
      const now = Date.now()
      setHistory(prev => {
        const newEntry: PerformanceHistory = {
          timestamp: now,
          fps: metrics.fps,
          drawCalls: metrics.drawCalls,
          vertices: metrics.vertices,
          renderTime: metrics.renderTime,
        }

        // الاحتفاظ بآخر 100 نقطة فقط
        const updated = [...prev, newEntry].slice(-100)
        return updated
      })

      animationFrameRef.current = requestAnimationFrame(updateHistory)
    }

    updateHistory()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [metrics])

  // رسم مخطط الأداء
  useEffect(() => {
    if (!canvasRef.current || history.length < 2) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // مسح الكانفاس
    ctx.clearRect(0, 0, width, height)

    // رسم الخلفية
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    // رسم الشبكة
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1

    // خطوط أفقية
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // خطوط عمودية
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // رسم خط FPS
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.beginPath()

    const maxFPS = 120
    history.forEach((entry, index) => {
      const x = (index / (history.length - 1)) * width
      const y = height - (entry.fps / maxFPS) * height

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // رسم خط Draw Calls
    ctx.strokeStyle = '#ff6600'
    ctx.lineWidth = 2
    ctx.beginPath()

    const maxDrawCalls = Math.max(...history.map(h => h.drawCalls), 100)
    history.forEach((entry, index) => {
      const x = (index / (history.length - 1)) * width
      const y = height - (entry.drawCalls / maxDrawCalls) * height

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // إضافة تسميات
    ctx.fillStyle = '#fff'
    ctx.font = '12px Arial'
    ctx.fillText(`FPS: ${metrics.fps}`, 10, 20)
    ctx.fillText(`Draw Calls: ${metrics.drawCalls}`, 10, 35)
    ctx.fillText(`Vertices: ${metrics.vertices.toLocaleString()}`, 10, 50)
  }, [history, metrics])

  // حساب اقتراحات التحسين
  const getOptimizationSuggestions = (): string[] => {
    const suggestions: string[] = []

    if (metrics.fps < 30) {
      suggestions.push('الأداء منخفض جداً - فعل جميع تحسينات الأداء')
    } else if (metrics.fps < 45) {
      suggestions.push('الأداء متوسط - فعل Occlusion Culling')
    }

    if (metrics.drawCalls > 100) {
      suggestions.push('عدد Draw Calls مرتفع - استخدم Mesh Batching')
    }

    if (metrics.vertices > 1000000) {
      suggestions.push('عدد Vertices مرتفع - فعل Distance Culling')
    }

    if (metrics.renderTime > 16.67) {
      suggestions.push('وقت العرض مرتفع - قلل جودة الظلال')
    }

    if (
      optimizationStats.originalDrawCalls > optimizationStats.optimizedDrawCalls
    ) {
      suggestions.push(
        `تم توفير ${optimizationStats.originalDrawCalls - optimizationStats.optimizedDrawCalls} Draw Calls`
      )
    }

    return suggestions
  }

  const suggestions = getOptimizationSuggestions()

  return (
    <div className="performance-monitor-panel">
      <div className="panel-header">
        <h3>مراقب الأداء</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="toggle-advanced"
        >
          {showAdvanced ? 'إخفاء التفاصيل' : 'إظهار التفاصيل'}
        </button>
      </div>

      {/* مخطط الأداء */}
      <div className="performance-chart">
        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          style={{ width: '100%', height: '150px' }}
        />
      </div>

      {/* مقاييس الأداء الأساسية */}
      <div className="performance-metrics">
        <div className="metric-row">
          <span className="metric-label">FPS:</span>
          <span
            className={`metric-value ${metrics.fps < 30 ? 'critical' : metrics.fps < 45 ? 'warning' : 'good'}`}
          >
            {metrics.fps}
          </span>
        </div>

        <div className="metric-row">
          <span className="metric-label">Draw Calls:</span>
          <span
            className={`metric-value ${metrics.drawCalls > 100 ? 'warning' : 'good'}`}
          >
            {metrics.drawCalls}
          </span>
        </div>

        <div className="metric-row">
          <span className="metric-label">Vertices:</span>
          <span className="metric-value">
            {metrics.vertices.toLocaleString()}
          </span>
        </div>

        <div className="metric-row">
          <span className="metric-label">Render Time:</span>
          <span
            className={`metric-value ${metrics.renderTime > 16.67 ? 'warning' : 'good'}`}
          >
            {metrics.renderTime.toFixed(2)}ms
          </span>
        </div>
      </div>

      {/* إعدادات التحسين */}
      <div className="optimization-settings">
        <h4>إعدادات التحسين</h4>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.enableOcclusionCulling}
            onChange={e =>
              onSettingsChange({ enableOcclusionCulling: e.target.checked })
            }
          />
          <span>Occlusion Culling</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.enableFrustumCulling}
            onChange={e =>
              onSettingsChange({ enableFrustumCulling: e.target.checked })
            }
          />
          <span>Frustum Culling</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.enableDistanceCulling}
            onChange={e =>
              onSettingsChange({ enableDistanceCulling: e.target.checked })
            }
          />
          <span>Distance Culling</span>
        </label>

        <div className="setting-item">
          <label>Max Draw Distance:</label>
          <input
            type="range"
            min="100"
            max="2000"
            value={settings.maxDrawDistance}
            onChange={e =>
              onSettingsChange({ maxDrawDistance: parseInt(e.target.value) })
            }
          />
          <span>{settings.maxDrawDistance}m</span>
        </div>
      </div>

      {/* إحصائيات التحسين */}
      {showAdvanced && (
        <div className="optimization-stats">
          <h4>إحصائيات التحسين</h4>

          <div className="stat-row">
            <span>Draw Calls الأصلية:</span>
            <span>{optimizationStats.originalDrawCalls}</span>
          </div>

          <div className="stat-row">
            <span>Draw Calls المحسنة:</span>
            <span>{optimizationStats.optimizedDrawCalls}</span>
          </div>

          <div className="stat-row">
            <span>Batched Meshes:</span>
            <span>{optimizationStats.batchedMeshes}</span>
          </div>

          <div className="stat-row">
            <span>Instanced Objects:</span>
            <span>{optimizationStats.instancedObjects}</span>
          </div>

          <div className="stat-row">
            <span>Memory Saved:</span>
            <span>
              {(optimizationStats.textureMemorySaved / 1024 / 1024).toFixed(2)}{' '}
              MB
            </span>
          </div>
        </div>
      )}

      {/* اقتراحات التحسين */}
      {suggestions.length > 0 && (
        <div className="optimization-suggestions">
          <h4>اقتراحات التحسين</h4>
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={index} className="suggestion-item">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* أزرار التحكم */}
      <div className="control-buttons">
        <button onClick={onOptimize} className="optimize-button">
          تطبيق التحسينات
        </button>
        <button onClick={onRestore} className="restore-button">
          استعادة الأصلي
        </button>
      </div>

      <style jsx>{`
        .performance-monitor-panel {
          padding: 16px;
          background: #2a2a2a;
          border-radius: 8px;
          color: white;
          font-family: Arial, sans-serif;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-header h3 {
          margin: 0;
          color: #fff;
        }

        .toggle-advanced {
          background: #444;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .toggle-advanced:hover {
          background: #555;
        }

        .performance-chart {
          margin-bottom: 16px;
          border: 1px solid #444;
          border-radius: 4px;
        }

        .performance-metrics {
          margin-bottom: 16px;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #333;
        }

        .metric-label {
          color: #ccc;
        }

        .metric-value {
          font-weight: bold;
        }

        .metric-value.good {
          color: #00ff00;
        }

        .metric-value.warning {
          color: #ffaa00;
        }

        .metric-value.critical {
          color: #ff0000;
        }

        .optimization-settings {
          margin-bottom: 16px;
        }

        .optimization-settings h4 {
          margin: 0 0 8px 0;
          color: #fff;
        }

        .setting-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          gap: 8px;
        }

        .setting-item input[type='checkbox'] {
          margin-right: 8px;
        }

        .setting-item input[type='range'] {
          flex: 1;
          margin: 0 8px;
        }

        .optimization-stats {
          margin-bottom: 16px;
          padding: 12px;
          background: #333;
          border-radius: 4px;
        }

        .optimization-stats h4 {
          margin: 0 0 8px 0;
          color: #fff;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 14px;
        }

        .optimization-suggestions {
          margin-bottom: 16px;
          padding: 12px;
          background: #2a4a2a;
          border-radius: 4px;
          border-left: 4px solid #00ff00;
        }

        .optimization-suggestions h4 {
          margin: 0 0 8px 0;
          color: #fff;
        }

        .suggestion-item {
          margin-bottom: 4px;
          font-size: 14px;
          color: #ccc;
        }

        .control-buttons {
          display: flex;
          gap: 8px;
        }

        .optimize-button,
        .restore-button {
          flex: 1;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .optimize-button {
          background: #00aa00;
          color: white;
        }

        .optimize-button:hover {
          background: #00cc00;
        }

        .restore-button {
          background: #aa6600;
          color: white;
        }

        .restore-button:hover {
          background: #cc7700;
        }
      `}</style>
    </div>
  )
}
