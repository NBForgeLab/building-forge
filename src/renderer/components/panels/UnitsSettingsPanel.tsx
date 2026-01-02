/**
 * لوحة إعدادات وحدات القياس
 */

import React, { useEffect, useState } from 'react'
import {
  GameEngine,
  GameUnitSettings,
  UnitType,
} from '../../../shared/types/units'
import { GameUnitsService } from '../../services/GameUnitsService'

interface UnitsSettingsPanelProps {
  onSettingsChange?: (settings: GameUnitSettings) => void
}

export const UnitsSettingsPanel: React.FC<UnitsSettingsPanelProps> = ({
  onSettingsChange,
}) => {
  const unitsService = GameUnitsService.getInstance()
  const [settings, setSettings] = useState<GameUnitSettings>(
    unitsService.getCurrentSettings()
  )
  const [availableUnits, setAvailableUnits] = useState(
    unitsService.getAvailableUnits()
  )

  useEffect(() => {
    // تحديث الوحدات المتاحة عند تغيير المحرك
    const engineUnits = unitsService.getUnitsForEngine(settings.engine)
    setAvailableUnits(engineUnits)
  }, [settings.engine])

  const handleEngineChange = (engine: GameEngine) => {
    const newSettings = { ...settings, engine }

    // تحديد الوحدة الافتراضية للمحرك
    let defaultUnit = UnitType.UNITY_UNITS
    switch (engine) {
      case GameEngine.UNITY:
        defaultUnit = UnitType.UNITY_UNITS
        break
      case GameEngine.UNREAL:
        defaultUnit = UnitType.UNREAL_UNITS
        break
      case GameEngine.BLENDER:
        defaultUnit = UnitType.BLENDER_UNITS
        break
      default:
        defaultUnit = UnitType.METERS
    }

    newSettings.primaryUnit = defaultUnit
    updateSettings(newSettings)
  }

  const updateSettings = (newSettings: GameUnitSettings) => {
    setSettings(newSettings)
    unitsService.updateSettings(newSettings)
    onSettingsChange?.(newSettings)
  }

  const handleUnitChange = (unit: UnitType) => {
    updateSettings({ ...settings, primaryUnit: unit })
  }

  const handlePrecisionChange = (precision: number) => {
    updateSettings({
      ...settings,
      displayPrecision: Math.max(0, Math.min(6, precision)),
    })
  }

  const handleGridSizeChange = (gridSize: number) => {
    if (gridSize > 0) {
      updateSettings({ ...settings, gridSize })
    }
  }

  const handleSnapToleranceChange = (tolerance: number) => {
    if (tolerance > 0) {
      updateSettings({ ...settings, snapTolerance: tolerance })
    }
  }

  const getEngineDescription = (engine: GameEngine): string => {
    switch (engine) {
      case GameEngine.UNITY:
        return 'Unity Engine (1 unit = 1 meter)'
      case GameEngine.UNREAL:
        return 'Unreal Engine (1 unit = 1 cm)'
      case GameEngine.BLENDER:
        return 'Blender (1 unit = 1 meter)'
      default:
        return 'Generic/Custom Engine'
    }
  }

  return (
    <div className="units-settings-panel p-4 space-y-6">
      <div className="header">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">
          إعدادات وحدات القياس
        </h3>
        <p className="text-sm text-gray-400">
          تكوين وحدات القياس للتوافق مع محرك الألعاب المستهدف
        </p>
      </div>

      {/* اختيار محرك الألعاب */}
      <div className="engine-selection">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          محرك الألعاب المستهدف
        </label>
        <select
          value={settings.engine}
          onChange={e => handleEngineChange(e.target.value as GameEngine)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.values(GameEngine).map(engine => (
            <option key={engine} value={engine}>
              {getEngineDescription(engine)}
            </option>
          ))}
        </select>
      </div>

      {/* اختيار الوحدة الأساسية */}
      <div className="unit-selection">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          الوحدة الأساسية
        </label>
        <select
          value={settings.primaryUnit}
          onChange={e => handleUnitChange(e.target.value as UnitType)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableUnits.map(unit => (
            <option
              key={unit.name}
              value={Object.keys(UnitType).find(
                key =>
                  UnitType[key as keyof typeof UnitType] ===
                  unit.name.toLowerCase().replace(' ', '_')
              )}
            >
              {unit.name} ({unit.symbol})
            </option>
          ))}
        </select>
      </div>

      {/* دقة العرض */}
      <div className="precision-setting">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          دقة العرض (عدد الخانات العشرية)
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="6"
            value={settings.displayPrecision}
            onChange={e => handlePrecisionChange(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-white w-8 text-center">
            {settings.displayPrecision}
          </span>
        </div>
      </div>

      {/* حجم الشبكة */}
      <div className="grid-size-setting">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          حجم الشبكة (بالمتر)
        </label>
        <input
          type="number"
          min="0.01"
          max="100"
          step="0.1"
          value={settings.gridSize}
          onChange={e => handleGridSizeChange(parseFloat(e.target.value))}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* tolerance للـ snapping */}
      <div className="snap-tolerance-setting">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          دقة المحاذاة (بالمتر)
        </label>
        <input
          type="number"
          min="0.001"
          max="10"
          step="0.01"
          value={settings.snapTolerance}
          onChange={e => handleSnapToleranceChange(parseFloat(e.target.value))}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* معاينة التحويلات */}
      <div className="conversion-preview bg-gray-800 p-3 rounded-md">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          معاينة التحويلات
        </h4>
        <div className="space-y-1 text-xs text-gray-400">
          <div>1 متر = {unitsService.formatValue(1, settings.primaryUnit)}</div>
          <div>
            حجم الشبكة:{' '}
            {unitsService.formatValue(
              unitsService.getOptimalGridSize(),
              settings.primaryUnit
            )}
          </div>
          <div>
            دقة المحاذاة:{' '}
            {unitsService.formatValue(
              unitsService.getSnapTolerance(),
              settings.primaryUnit
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
