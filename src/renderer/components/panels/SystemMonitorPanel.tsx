/**
 * لوحة مراقبة النظام والتشخيص
 * تعرض معلومات الأداء والأخطاء والسجلات في الوقت الفعلي
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bug,
  CheckCircle,
  Cpu,
  Download,
  HardDrive,
  Info,
  Memory,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import {
  DiagnosticInfo,
  DiagnosticsService,
  LogEntry,
  LogLevel,
  PerformanceMetrics,
} from '../../services/DiagnosticsService'
import {
  ErrorRecoveryService,
  ErrorReport,
} from '../../services/ErrorRecoveryService'
import {
  SystemIntegrationService,
  SystemStatus,
} from '../../services/SystemIntegrationService'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Progress } from '../ui/Progress'
import { ScrollArea } from '../ui/ScrollArea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'

interface SystemMonitorPanelProps {
  className?: string
}

export const SystemMonitorPanel: React.FC<SystemMonitorPanelProps> = ({
  className,
}) => {
  const [diagnosticsService] = useState(() => new DiagnosticsService())
  const [errorRecoveryService] = useState(() => new ErrorRecoveryService())
  const [systemIntegration] = useState(() =>
    SystemIntegrationService.getInstance()
  )

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(
    null
  )
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([])
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)

  // تحديث البيانات دورياً
  const updateData = useCallback(async () => {
    try {
      // تحديث حالة النظام
      const status = systemIntegration.getStatus()
      setSystemStatus(status)

      // تحديث معلومات التشخيص
      const info = await diagnosticsService.collectDiagnosticInfo()
      setDiagnosticInfo(info)

      // تحديث تقارير الأخطاء
      const errors = errorRecoveryService.getErrorReports()
      setErrorReports(errors.slice(-10)) // آخر 10 أخطاء

      // تحديث السجلات الحديثة
      const logs = diagnosticsService.searchLogs({})
      setRecentLogs(logs.slice(-20)) // آخر 20 سجل
    } catch (error) {
      console.error('Failed to update system monitor data:', error)
    }
  }, [diagnosticsService, errorRecoveryService, systemIntegration])

  useEffect(() => {
    updateData()

    const interval = setInterval(updateData, 2000) // تحديث كل ثانيتين
    return () => clearInterval(interval)
  }, [updateData])

  // بدء/إيقاف مراقبة الأداء
  const togglePerformanceMonitoring = useCallback(() => {
    if (isMonitoring) {
      diagnosticsService.stopPerformanceCollection()
      setIsMonitoring(false)
    } else {
      diagnosticsService.startPerformanceCollection(1000)
      setIsMonitoring(true)
    }
  }, [isMonitoring, diagnosticsService])

  // تصدير التقارير
  const exportDiagnosticReport = useCallback(async () => {
    try {
      const report = await diagnosticsService.generateDiagnosticReport()
      const blob = new Blob([report], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diagnostic-report-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export diagnostic report:', error)
    }
  }, [diagnosticsService])

  const exportLogs = useCallback(() => {
    try {
      const logs = diagnosticsService.exportLogs('json')
      const blob = new Blob([logs], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export logs:', error)
    }
  }, [diagnosticsService])

  // الحصول على لون الحالة
  const getStatusColor = (status: 'active' | 'inactive' | 'error') => {
    switch (status) {
      case 'active':
        return 'text-green-500'
      case 'inactive':
        return 'text-gray-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: 'active' | 'inactive' | 'error') => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />
      case 'inactive':
        return <XCircle className="w-4 h-4" />
      case 'error':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <XCircle className="w-4 h-4" />
    }
  }

  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'text-gray-500'
      case 'info':
        return 'text-blue-500'
      case 'warn':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      case 'fatal':
        return 'text-red-700'
      default:
        return 'text-gray-500'
    }
  }

  const getLogLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return <Bug className="w-3 h-3" />
      case 'info':
        return <Info className="w-3 h-3" />
      case 'warn':
        return <AlertTriangle className="w-3 h-3" />
      case 'error':
        return <XCircle className="w-3 h-3" />
      case 'fatal':
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Info className="w-3 h-3" />
    }
  }

  return (
    <div className={`system-monitor-panel ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">مراقب النظام</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePerformanceMonitoring}
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            {isMonitoring ? 'إيقاف المراقبة' : 'بدء المراقبة'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={updateData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportDiagnosticReport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
          <TabsTrigger value="services">الخدمات</TabsTrigger>
          <TabsTrigger value="errors">الأخطاء</TabsTrigger>
          <TabsTrigger value="logs">السجلات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* حالة النظام العامة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                حالة النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>حالة التهيئة:</span>
                    <Badge
                      variant={
                        systemStatus.isInitialized ? 'default' : 'destructive'
                      }
                    >
                      {systemStatus.isInitialized ? 'مهيأ' : 'غير مهيأ'}
                    </Badge>
                  </div>

                  {!systemStatus.isInitialized && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span>تقدم التهيئة:</span>
                        <span>{systemStatus.initializationProgress}%</span>
                      </div>
                      <Progress value={systemStatus.initializationProgress} />
                    </div>
                  )}

                  {systemStatus.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-500 mb-2">
                        الأخطاء:
                      </h4>
                      <ul className="space-y-1">
                        {systemStatus.errors.map((error, index) => (
                          <li key={index} className="text-sm text-red-400">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {systemStatus.warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium text-yellow-500 mb-2">
                        التحذيرات:
                      </h4>
                      <ul className="space-y-1">
                        {systemStatus.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-yellow-400">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* معلومات النظام */}
          {diagnosticInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  معلومات النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">النظام:</h4>
                    <div className="space-y-1 text-sm">
                      <div>المنصة: {diagnosticInfo.system.platform}</div>
                      <div>
                        الذاكرة:{' '}
                        {diagnosticInfo.system.memory.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">التطبيق:</h4>
                    <div className="space-y-1 text-sm">
                      <div>الإصدار: {diagnosticInfo.application.version}</div>
                      <div>
                        البيئة: {diagnosticInfo.application.environment}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">المشروع:</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        الاسم: {diagnosticInfo.project.name || 'غير محدد'}
                      </div>
                      <div>العناصر: {diagnosticInfo.project.elementCount}</div>
                      <div>الأصول: {diagnosticInfo.project.assetCount}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">الأداء:</h4>
                    <div className="space-y-1 text-sm">
                      <div>FPS: {diagnosticInfo.system.performance.fps}</div>
                      <div>
                        وقت العرض:{' '}
                        {diagnosticInfo.system.performance.renderTime}ms
                      </div>
                      <div>
                        استدعاءات الرسم:{' '}
                        {diagnosticInfo.system.performance.drawCalls}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                مقاييس الأداء
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Memory className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {systemStatus.performance.memoryUsage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">استخدام الذاكرة</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Cpu className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {systemStatus.performance.cpuUsage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">استخدام المعالج</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Activity className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {systemStatus.performance.renderTime.toFixed(1)}ms
                    </div>
                    <div className="text-sm text-gray-500">وقت العرض</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                حالة الخدمات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosticInfo && (
                <div className="space-y-3">
                  {Object.entries(diagnosticInfo.services).map(
                    ([serviceName, serviceInfo]) => (
                      <div
                        key={serviceName}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={getStatusColor(serviceInfo.status)}>
                            {getStatusIcon(serviceInfo.status)}
                          </div>
                          <div>
                            <div className="font-medium">{serviceName}</div>
                            <div className="text-sm text-gray-500">
                              أخطاء: {serviceInfo.errorCount}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            serviceInfo.status === 'active'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {serviceInfo.status === 'active'
                            ? 'نشط'
                            : serviceInfo.status === 'inactive'
                              ? 'غير نشط'
                              : 'خطأ'}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                تقارير الأخطاء الحديثة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {errorReports.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    لا توجد أخطاء حديثة
                  </div>
                ) : (
                  <div className="space-y-3">
                    {errorReports.map(report => (
                      <div key={report.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-red-500">
                            {report.error.name}
                          </div>
                          <Badge
                            variant={
                              report.resolved ? 'default' : 'destructive'
                            }
                          >
                            {report.resolved ? 'محلول' : 'غير محلول'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {report.error.message}
                        </div>
                        <div className="text-xs text-gray-500">
                          المكون: {report.context.component} | الوقت:{' '}
                          {report.createdAt.toLocaleString('ar')}
                        </div>
                        {report.recoveryAttempts.length > 0 && (
                          <div className="mt-2 text-xs">
                            محاولات الاستعادة: {report.recoveryAttempts.length}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  السجلات الحديثة
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportLogs}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير السجلات
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recentLogs.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    لا توجد سجلات حديثة
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentLogs.map(log => (
                      <div key={log.id} className="p-2 border rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={getLogLevelColor(log.level)}>
                            {getLogLevelIcon(log.level)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-gray-500 text-xs">
                            {log.timestamp.toLocaleTimeString('ar')}
                          </span>
                          <span className="text-blue-500 text-xs">
                            [{log.category}]
                          </span>
                        </div>
                        <div className="text-gray-700">{log.message}</div>
                        {log.data && (
                          <div className="mt-1 text-xs text-gray-500 font-mono">
                            {JSON.stringify(log.data, null, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SystemMonitorPanel
