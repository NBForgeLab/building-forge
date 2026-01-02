/**
 * لوحة الإدخال الرقمي للتحويلات الدقيقة
 * Numeric input panel for precise transformations
 */

import React, { useCallback, useEffect, useState } from 'react'
import { MathUtils } from 'three'
import { useStore } from '../../store'
import { BuildingElement } from '../../store/types'

interface NumericTransformPanelProps {
  visible: boolean
  onClose: () => void
  mode: 'translate' | 'rotate' | 'scale'
}

interface TransformValues {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
}

export const NumericTransformPanel: React.FC<NumericTransformPanelProps> = ({
  visible,
  onClose,
  mode,
}) => {
  const { selectionState, getElementById, updateElement, addHistoryEntry } =
    useStore()
  const [values, setValues] = useState<TransformValues>({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  })
  const [isRelative, setIsRelative] = useState(false)
  const [lockAspectRatio, setLockAspectRatio] = useState(true)
  const [initialValues, setInitialValues] = useState<TransformValues>({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  })

  // Calculate average values from selected elements
  const calculateAverageValues = useCallback((): TransformValues => {
    const selectedElements = selectionState.selectedElements
      .map(id => getElementById(id))
      .filter(Boolean) as BuildingElement[]

    if (selectedElements.length === 0) {
      return {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }
    }

    const totals = selectedElements.reduce(
      (acc, element) => ({
        position: {
          x: acc.position.x + element.position.x,
          y: acc.position.y + element.position.y,
          z: acc.position.z + element.position.z,
        },
        rotation: {
          x: acc.rotation.x + element.rotation.x,
          y: acc.rotation.y + element.rotation.y,
          z: acc.rotation.z + element.rotation.z,
        },
        scale: {
          x: acc.scale.x + element.scale.x,
          y: acc.scale.y + element.scale.y,
          z: acc.scale.z + element.scale.z,
        },
      }),
      {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0, y: 0, z: 0 },
      }
    )

    const count = selectedElements.length
    return {
      position: {
        x: totals.position.x / count,
        y: totals.position.y / count,
        z: totals.position.z / count,
      },
      rotation: {
        x: MathUtils.radToDeg(totals.rotation.x / count),
        y: MathUtils.radToDeg(totals.rotation.y / count),
        z: MathUtils.radToDeg(totals.rotation.z / count),
      },
      scale: {
        x: totals.scale.x / count,
        y: totals.scale.y / count,
        z: totals.scale.z / count,
      },
    }
  }, [selectionState.selectedElements, getElementById])

  // Initialize values when panel opens or selection changes
  useEffect(() => {
    if (visible) {
      const avgValues = calculateAverageValues()
      setValues(avgValues)
      setInitialValues(avgValues)
    }
  }, [visible, calculateAverageValues])

  // Handle input changes
  const handleValueChange = (
    type: keyof TransformValues,
    axis: 'x' | 'y' | 'z',
    value: string
  ) => {
    const numValue = parseFloat(value) || 0

    setValues(prev => {
      const newValues = { ...prev }

      if (type === 'scale' && lockAspectRatio && mode === 'scale') {
        // Maintain aspect ratio for scaling
        const ratio = numValue / prev.scale[axis]
        newValues.scale = {
          x: prev.scale.x * ratio,
          y: prev.scale.y * ratio,
          z: prev.scale.z * ratio,
        }
      } else {
        newValues[type] = {
          ...prev[type],
          [axis]: numValue,
        }
      }

      return newValues
    })
  }

  // Apply transformations
  const applyTransform = () => {
    const selectedElements = selectionState.selectedElements

    if (selectedElements.length === 0) return

    selectedElements.forEach(id => {
      const element = getElementById(id)
      if (!element || element.locked) return

      let newTransform: Partial<BuildingElement> = {}

      switch (mode) {
        case 'translate':
          if (isRelative) {
            newTransform.position = {
              x: element.position.x + values.position.x,
              y: element.position.y + values.position.y,
              z: element.position.z + values.position.z,
            }
          } else {
            newTransform.position = values.position
          }
          break

        case 'rotate':
          const rotationRad = {
            x: MathUtils.degToRad(values.rotation.x),
            y: MathUtils.degToRad(values.rotation.y),
            z: MathUtils.degToRad(values.rotation.z),
          }

          if (isRelative) {
            newTransform.rotation = {
              x: element.rotation.x + rotationRad.x,
              y: element.rotation.y + rotationRad.y,
              z: element.rotation.z + rotationRad.z,
            }
          } else {
            newTransform.rotation = rotationRad
          }
          break

        case 'scale':
          if (isRelative) {
            newTransform.scale = {
              x: element.scale.x * values.scale.x,
              y: element.scale.y * values.scale.y,
              z: element.scale.z * values.scale.z,
            }
          } else {
            newTransform.scale = values.scale
          }
          break
      }

      updateElement(id, newTransform)
    })

    // Add to history
    addHistoryEntry(
      `numeric_${mode}`,
      `تحويل رقمي: ${mode === 'translate' ? 'تحريك' : mode === 'rotate' ? 'دوران' : 'تحجيم'} ${selectedElements.length} عنصر`,
      {
        elementIds: selectedElements,
        mode,
        values,
        isRelative,
      }
    )

    onClose()
  }

  // Reset to initial values
  const resetValues = () => {
    setValues(initialValues)
  }

  // Quick presets
  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'zero':
        if (mode === 'translate') {
          setValues(prev => ({ ...prev, position: { x: 0, y: 0, z: 0 } }))
        } else if (mode === 'rotate') {
          setValues(prev => ({ ...prev, rotation: { x: 0, y: 0, z: 0 } }))
        }
        break
      case 'unit':
        if (mode === 'scale') {
          setValues(prev => ({ ...prev, scale: { x: 1, y: 1, z: 1 } }))
        }
        break
      case 'double':
        if (mode === 'scale') {
          setValues(prev => ({ ...prev, scale: { x: 2, y: 2, z: 2 } }))
        }
        break
      case 'half':
        if (mode === 'scale') {
          setValues(prev => ({ ...prev, scale: { x: 0.5, y: 0.5, z: 0.5 } }))
        }
        break
    }
  }

  if (!visible) return null

  const currentValues =
    values[
      mode === 'translate'
        ? 'position'
        : mode === 'rotate'
          ? 'rotation'
          : 'scale'
    ]
  const labels = {
    translate: { x: 'X (م)', y: 'Y (م)', z: 'Z (م)' },
    rotate: { x: 'X (°)', y: 'Y (°)', z: 'Z (°)' },
    scale: { x: 'X', y: 'Y', z: 'Z' },
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'translate'
              ? 'تحريك دقيق'
              : mode === 'rotate'
                ? 'دوران دقيق'
                : 'تحجيم دقيق'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isRelative}
              onChange={e => setIsRelative(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isRelative
                ? 'نسبي (إضافة للقيم الحالية)'
                : 'مطلق (استبدال القيم)'}
            </span>
          </label>
        </div>

        {/* Scale-specific options */}
        {mode === 'scale' && (
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={lockAspectRatio}
                onChange={e => setLockAspectRatio(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                الحفاظ على النسب
              </span>
            </label>
          </div>
        )}

        {/* Input Fields */}
        <div className="space-y-3 mb-4">
          {(['x', 'y', 'z'] as const).map(axis => (
            <div
              key={axis}
              className="flex items-center space-x-2 space-x-reverse"
            >
              <label className="w-12 text-sm font-medium text-gray-700 dark:text-gray-300">
                {labels[mode][axis]}
              </label>
              <input
                type="number"
                value={currentValues[axis]}
                onChange={e =>
                  handleValueChange(
                    mode === 'translate'
                      ? 'position'
                      : mode === 'rotate'
                        ? 'rotation'
                        : 'scale',
                    axis,
                    e.target.value
                  )
                }
                step={mode === 'rotate' ? 1 : mode === 'scale' ? 0.1 : 0.01}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        {/* Presets */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            قيم سريعة:
          </div>
          <div className="flex space-x-2 space-x-reverse">
            {mode === 'translate' && (
              <button
                onClick={() => applyPreset('zero')}
                className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                                         rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                صفر
              </button>
            )}
            {mode === 'rotate' && (
              <button
                onClick={() => applyPreset('zero')}
                className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                                         rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                0°
              </button>
            )}
            {mode === 'scale' && (
              <>
                <button
                  onClick={() => applyPreset('half')}
                  className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                                             rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  0.5x
                </button>
                <button
                  onClick={() => applyPreset('unit')}
                  className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                                             rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  1x
                </button>
                <button
                  onClick={() => applyPreset('double')}
                  className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                                             rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  2x
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 space-x-reverse">
          <button
            onClick={applyTransform}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md
                                 transition-colors duration-200"
          >
            تطبيق
          </button>
          <button
            onClick={resetValues}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                                 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            إعادة تعيين
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                                 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            إلغاء
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p>
            <strong>نصائح:</strong>
          </p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>استخدم Tab للتنقل بين الحقول</li>
            <li>اضغط Enter لتطبيق التغييرات</li>
            <li>اضغط Escape للإلغاء</li>
            {mode === 'scale' && (
              <li>فعل "الحفاظ على النسب" للتحجيم المتناسق</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default NumericTransformPanel
