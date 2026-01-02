/**
 * مكون عرض الإحداثيات والقياسات في الوقت الفعلي
 */

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GameUnitsService } from '../../services/GameUnitsService'
import { MeasurementService } from '../../services/MeasurementService'

interface CoordinateDisplayProps {
  camera: THREE.Camera
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  className?: string
}

interface CoordinateInfo {
  worldPosition: THREE.Vector3
  screenPosition: THREE.Vector2
  formattedX: string
  formattedY: string
  formattedZ: string
  distance?: string
  angle?: string
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
  camera,
  scene,
  renderer,
  className = '',
}) => {
  const [coordinates, setCoordinates] = useState<CoordinateInfo | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [referencePoint, setReferencePoint] = useState<THREE.Vector3 | null>(
    null
  )
  const raycasterRef = useRef(new THREE.Raycaster())
  const unitsService = GameUnitsService.getInstance()
  const measurementService = MeasurementService.getInstance()

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isVisible) return

      updateCoordinates(event)
    }

    const handleMouseClick = (event: MouseEvent) => {
      if (event.ctrlKey) {
        setReferencePoint(event)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'F2':
          setIsVisible(!isVisible)
          break
        case 'Escape':
          setReferencePoint(null)
          break
      }
    }

    const canvas = renderer.domElement
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleMouseClick)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleMouseClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, renderer, referencePoint])

  const updateCoordinates = (event: MouseEvent) => {
    const canvas = renderer.domElement
    const rect = canvas.getBoundingClientRect()

    // تحويل إحداثيات الماوس إلى normalized device coordinates
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    // إعداد raycaster
    raycasterRef.current.setFromCamera(mouse, camera)

    // البحث عن تقاطعات مع الكائنات في المشهد
    const intersects = raycasterRef.current.intersectObjects(
      scene.children,
      true
    )

    let worldPosition: THREE.Vector3

    if (intersects.length > 0) {
      // استخدام نقطة التقاطع
      worldPosition = intersects[0].point
    } else {
      // إسقاط على مستوى الأرض (Y = 0)
      const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersectionPoint = new THREE.Vector3()
      raycasterRef.current.ray.intersectPlane(planeY, intersectionPoint)
      worldPosition = intersectionPoint || new THREE.Vector3()
    }

    // تنسيق الإحداثيات
    const formattedX = unitsService.formatValue(worldPosition.x)
    const formattedY = unitsService.formatValue(worldPosition.y)
    const formattedZ = unitsService.formatValue(worldPosition.z)

    // حساب المسافة والزاوية من النقطة المرجعية
    let distance: string | undefined
    let angle: string | undefined

    if (referencePoint) {
      const distanceResult = measurementService.calculateDistance(
        referencePoint,
        worldPosition
      )
      distance = distanceResult.formattedValue

      // حساب الزاوية (في المستوى XZ)
      const direction = new THREE.Vector2(
        worldPosition.x - referencePoint.x,
        worldPosition.z - referencePoint.z
      )
      const angleRad = Math.atan2(direction.y, direction.x)
      const angleDeg = angleRad * (180 / Math.PI)
      angle = `${angleDeg.toFixed(1)}°`
    }

    setCoordinates({
      worldPosition,
      screenPosition: mouse,
      formattedX,
      formattedY,
      formattedZ,
      distance,
      angle,
    })
  }

  const setReferencePoint = (event: MouseEvent) => {
    const canvas = renderer.domElement
    const rect = canvas.getBoundingClientRect()

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    raycasterRef.current.setFromCamera(mouse, camera)
    const intersects = raycasterRef.current.intersectObjects(
      scene.children,
      true
    )

    if (intersects.length > 0) {
      setReferencePoint(intersects[0].point)
    }
  }

  const resetReferencePoint = () => {
    setReferencePoint(null)
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  if (!isVisible || !coordinates) {
    return (
      <div className={`coordinate-display-toggle ${className}`}>
        <button
          onClick={toggleVisibility}
          className="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600"
          title="إظهار الإحداثيات (F2)"
        >
          📍
        </button>
      </div>
    )
  }

  return (
    <div className={`coordinate-display ${className}`}>
      <div className="bg-gray-900 bg-opacity-90 text-white p-3 rounded-lg shadow-lg border border-gray-600">
        {/* العنوان والتحكم */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">الإحداثيات</h4>
          <div className="flex items-center space-x-2">
            {referencePoint && (
              <button
                onClick={resetReferencePoint}
                className="text-xs text-red-400 hover:text-red-300"
                title="إزالة النقطة المرجعية (Esc)"
              >
                ✕
              </button>
            )}
            <button
              onClick={toggleVisibility}
              className="text-xs text-gray-400 hover:text-gray-300"
              title="إخفاء الإحداثيات (F2)"
            >
              👁️
            </button>
          </div>
        </div>

        {/* الإحداثيات الأساسية */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-800 px-2 py-1 rounded">
            <span className="text-red-400">X:</span>
            <span className="ml-1 font-mono">{coordinates.formattedX}</span>
          </div>
          <div className="bg-gray-800 px-2 py-1 rounded">
            <span className="text-green-400">Y:</span>
            <span className="ml-1 font-mono">{coordinates.formattedY}</span>
          </div>
          <div className="bg-gray-800 px-2 py-1 rounded">
            <span className="text-blue-400">Z:</span>
            <span className="ml-1 font-mono">{coordinates.formattedZ}</span>
          </div>
        </div>

        {/* المعلومات الإضافية */}
        {(coordinates.distance || coordinates.angle) && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            {coordinates.distance && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-400">المسافة:</span>
                <span className="font-mono">{coordinates.distance}</span>
              </div>
            )}
            {coordinates.angle && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-400">الزاوية:</span>
                <span className="font-mono">{coordinates.angle}</span>
              </div>
            )}
          </div>
        )}

        {/* النقطة المرجعية */}
        {referencePoint && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-1">النقطة المرجعية:</div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <span className="font-mono text-red-300">
                {unitsService.formatValue(referencePoint.x)}
              </span>
              <span className="font-mono text-green-300">
                {unitsService.formatValue(referencePoint.y)}
              </span>
              <span className="font-mono text-blue-300">
                {unitsService.formatValue(referencePoint.z)}
              </span>
            </div>
          </div>
        )}

        {/* تعليمات الاستخدام */}
        <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-500">
          <div>Ctrl+Click: تعيين نقطة مرجعية</div>
          <div>F2: إظهار/إخفاء | Esc: مسح المرجع</div>
        </div>
      </div>
    </div>
  )
}

/**
 * مكون مبسط لعرض الإحداثيات في شريط الحالة
 */
export const StatusBarCoordinates: React.FC<{
  coordinates: CoordinateInfo | null
  className?: string
}> = ({ coordinates, className = '' }) => {
  if (!coordinates) {
    return (
      <div className={`status-coordinates ${className}`}>
        <span className="text-gray-500 text-xs">---, ---, ---</span>
      </div>
    )
  }

  return (
    <div className={`status-coordinates ${className}`}>
      <span className="text-xs font-mono">
        <span className="text-red-400">X:</span> {coordinates.formattedX}
        <span className="mx-2 text-gray-500">|</span>
        <span className="text-green-400">Y:</span> {coordinates.formattedY}
        <span className="mx-2 text-gray-500">|</span>
        <span className="text-blue-400">Z:</span> {coordinates.formattedZ}
        {coordinates.distance && (
          <>
            <span className="mx-2 text-gray-500">|</span>
            <span className="text-yellow-400">D:</span> {coordinates.distance}
          </>
        )}
      </span>
    </div>
  )
}
