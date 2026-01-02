/**
 * محرر المواد التفاعلي
 * Interactive Material Editor Panel with real-time preview
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_MATERIAL_PRESETS,
  MaterialPreset,
} from '../../materials/DefaultMaterials'
import { getMaterialManager } from '../../materials/MaterialManager'
import { PBRMaterial, PBRMaterialProperties } from '../../materials/PBRMaterial'

interface MaterialEditorPanelProps {
  selectedMaterialId?: string
  onMaterialChange?: (material: PBRMaterial) => void
  onMaterialSelect?: (materialId: string) => void
}

interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const ColorInput: React.FC<ColorInputProps> = ({
  label,
  value,
  onChange,
  disabled,
}) => (
  <div className="material-editor-input-group">
    <label className="material-editor-label">{label}</label>
    <div className="material-editor-color-input">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="material-editor-color-picker"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="material-editor-color-text"
        placeholder="#FFFFFF"
      />
    </div>
  </div>
)

interface SliderInputProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  disabled?: boolean
  unit?: string
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  unit,
}) => (
  <div className="material-editor-input-group">
    <label className="material-editor-label">
      {label} {unit && `(${unit})`}
    </label>
    <div className="material-editor-slider-input">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="material-editor-slider"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        disabled={disabled}
        className="material-editor-number"
      />
    </div>
  </div>
)

interface CheckboxInputProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({
  label,
  checked,
  onChange,
  disabled,
}) => (
  <div className="material-editor-input-group">
    <label className="material-editor-checkbox-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        className="material-editor-checkbox"
      />
      {label}
    </label>
  </div>
)

const MaterialPreview: React.FC<{ material: PBRMaterial }> = ({ material }) => {
  const previewData = material.getPreviewData()

  return (
    <div className="material-preview">
      <div className="material-preview-sphere">
        <div
          className="material-preview-surface"
          style={{
            backgroundColor: previewData.albedoColor,
            opacity: previewData.isTransparent ? 0.8 : 1,
            filter: `brightness(${1 - previewData.roughnessValue * 0.3}) contrast(${1 + previewData.metallicValue * 0.5})`,
          }}
        />
        {previewData.hasNormalMap && (
          <div className="material-preview-normal-indicator">N</div>
        )}
        {previewData.hasEmission && (
          <div className="material-preview-emission-indicator">E</div>
        )}
      </div>
      <div className="material-preview-info">
        <div className="material-preview-property">
          <span>Roughness:</span>
          <span>{previewData.roughnessValue.toFixed(2)}</span>
        </div>
        <div className="material-preview-property">
          <span>Metallic:</span>
          <span>{previewData.metallicValue.toFixed(2)}</span>
        </div>
        {previewData.isTransparent && (
          <div className="material-preview-property">
            <span>Transparent:</span>
            <span>Yes</span>
          </div>
        )}
      </div>
    </div>
  )
}

const MaterialLibraryBrowser: React.FC<{
  onSelectPreset: (preset: MaterialPreset) => void
  selectedCategory?: string
  onCategoryChange: (category: string) => void
}> = ({ onSelectPreset, selectedCategory, onCategoryChange }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const categories = useMemo(() => {
    const cats = new Set(DEFAULT_MATERIAL_PRESETS.map(p => p.category))
    return ['all', ...Array.from(cats).sort()]
  }, [])

  const filteredPresets = useMemo(() => {
    let presets = DEFAULT_MATERIAL_PRESETS

    if (selectedCategory && selectedCategory !== 'all') {
      presets = presets.filter(p => p.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      presets = presets.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return presets
  }, [selectedCategory, searchQuery])

  return (
    <div className="material-library-browser">
      <div className="material-library-controls">
        <input
          type="text"
          placeholder="Search materials..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="material-library-search"
        />
        <select
          value={selectedCategory || 'all'}
          onChange={e => onCategoryChange(e.target.value)}
          className="material-library-category"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="material-library-grid">
        {filteredPresets.map((preset, index) => (
          <div
            key={index}
            className="material-library-item"
            onClick={() => onSelectPreset(preset)}
            title={preset.description}
          >
            <div
              className="material-library-thumbnail"
              style={{
                backgroundColor:
                  typeof preset.properties.albedo === 'string'
                    ? preset.properties.albedo
                    : '#FFFFFF',
              }}
            />
            <div className="material-library-name">{preset.name}</div>
            <div className="material-library-category">{preset.category}</div>
            {preset.gameOptimized && (
              <div className="material-library-badge">Game Ready</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const MaterialEditorPanel: React.FC<MaterialEditorPanelProps> = ({
  selectedMaterialId,
  onMaterialChange,
  onMaterialSelect,
}) => {
  const [currentMaterial, setCurrentMaterial] = useState<PBRMaterial | null>(
    null
  )
  const [isEditing, setIsEditing] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [materialName, setMaterialName] = useState('')

  const materialManager = getMaterialManager()

  // Load material when selection changes
  useEffect(() => {
    if (selectedMaterialId) {
      const material = materialManager.getMaterial(selectedMaterialId)
      if (material) {
        setCurrentMaterial(material)
        setMaterialName(material.name)
        setIsEditing(false)
      }
    } else {
      setCurrentMaterial(null)
      setMaterialName('')
      setIsEditing(false)
    }
  }, [selectedMaterialId, materialManager])

  // Create new material
  const handleCreateNew = useCallback(() => {
    const newMaterial = materialManager.createMaterial('New Material')
    setCurrentMaterial(newMaterial)
    setMaterialName(newMaterial.name)
    setIsEditing(true)
    onMaterialSelect?.(newMaterial.id)
  }, [materialManager, onMaterialSelect])

  // Apply preset
  const handleApplyPreset = useCallback(
    (preset: MaterialPreset) => {
      if (currentMaterial) {
        currentMaterial.updateProperties(preset.properties)
        currentMaterial.updateMetadata({
          category: preset.category,
          tags: preset.tags,
        })
        setShowLibrary(false)
        onMaterialChange?.(currentMaterial)
      } else {
        const newMaterial = materialManager.createMaterial(
          preset.name,
          preset.properties
        )
        newMaterial.updateMetadata({
          category: preset.category,
          tags: preset.tags,
        })
        setCurrentMaterial(newMaterial)
        setMaterialName(newMaterial.name)
        setIsEditing(true)
        onMaterialSelect?.(newMaterial.id)
      }
    },
    [currentMaterial, materialManager, onMaterialChange, onMaterialSelect]
  )

  // Update material property
  const updateProperty = useCallback(
    (property: keyof PBRMaterialProperties, value: any) => {
      if (!currentMaterial) return

      const updates = { [property]: value }
      currentMaterial.updateProperties(updates)
      setCurrentMaterial({ ...currentMaterial })
      onMaterialChange?.(currentMaterial)
    },
    [currentMaterial, onMaterialChange]
  )

  // Save material
  const handleSave = useCallback(() => {
    if (!currentMaterial) return

    if (materialName !== currentMaterial.name) {
      currentMaterial.name = materialName
      currentMaterial.metadata.modifiedAt = Date.now()
    }

    setIsEditing(false)
    onMaterialChange?.(currentMaterial)
  }, [currentMaterial, materialName, onMaterialChange])

  // Clone material
  const handleClone = useCallback(() => {
    if (!currentMaterial) return

    const cloned = materialManager.cloneMaterial(
      currentMaterial.id,
      `${currentMaterial.name} Copy`
    )
    if (cloned) {
      setCurrentMaterial(cloned)
      setMaterialName(cloned.name)
      setIsEditing(true)
      onMaterialSelect?.(cloned.id)
    }
  }, [currentMaterial, materialManager, onMaterialSelect])

  if (!currentMaterial) {
    return (
      <div className="material-editor-panel">
        <div className="material-editor-header">
          <h3>Material Editor</h3>
        </div>

        <div className="material-editor-empty">
          <p>No material selected</p>
          <div className="material-editor-actions">
            <button onClick={handleCreateNew} className="btn btn-primary">
              Create New Material
            </button>
            <button
              onClick={() => setShowLibrary(true)}
              className="btn btn-secondary"
            >
              Browse Library
            </button>
          </div>
        </div>

        {showLibrary && (
          <div className="material-editor-modal">
            <div className="material-editor-modal-content">
              <div className="material-editor-modal-header">
                <h4>Material Library</h4>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="material-editor-modal-close"
                >
                  ×
                </button>
              </div>
              <MaterialLibraryBrowser
                onSelectPreset={handleApplyPreset}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const props = currentMaterial.properties

  return (
    <div className="material-editor-panel">
      <div className="material-editor-header">
        <h3>Material Editor</h3>
        <div className="material-editor-header-actions">
          <button onClick={handleClone} className="btn btn-sm">
            Clone
          </button>
          <button onClick={() => setShowLibrary(true)} className="btn btn-sm">
            Library
          </button>
        </div>
      </div>

      {/* Material Preview */}
      <div className="material-editor-section">
        <h4>Preview</h4>
        <MaterialPreview material={currentMaterial} />
      </div>

      {/* Material Name */}
      <div className="material-editor-section">
        <div className="material-editor-input-group">
          <label className="material-editor-label">Name</label>
          <div className="material-editor-name-input">
            <input
              type="text"
              value={materialName}
              onChange={e => setMaterialName(e.target.value)}
              className="material-editor-text-input"
            />
            {isEditing && (
              <button onClick={handleSave} className="btn btn-sm btn-primary">
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Basic Properties */}
      <div className="material-editor-section">
        <h4>Basic Properties</h4>

        <ColorInput
          label="Albedo Color"
          value={typeof props.albedo === 'string' ? props.albedo : '#FFFFFF'}
          onChange={value => updateProperty('albedo', value)}
        />

        <SliderInput
          label="Roughness"
          value={typeof props.roughness === 'number' ? props.roughness : 0.5}
          min={0}
          max={1}
          step={0.01}
          onChange={value => updateProperty('roughness', value)}
        />

        <SliderInput
          label="Metallic"
          value={typeof props.metallic === 'number' ? props.metallic : 0}
          min={0}
          max={1}
          step={0.01}
          onChange={value => updateProperty('metallic', value)}
        />

        <SliderInput
          label="Opacity"
          value={props.opacity || 1}
          min={0}
          max={1}
          step={0.01}
          onChange={value => updateProperty('opacity', value)}
        />
      </div>

      {/* Advanced Properties */}
      <div className="material-editor-section">
        <h4>Advanced Properties</h4>

        <CheckboxInput
          label="Transparent"
          checked={props.transparent || false}
          onChange={value => updateProperty('transparent', value)}
        />

        <CheckboxInput
          label="Double Sided"
          checked={props.doubleSided || false}
          onChange={value => updateProperty('doubleSided', value)}
        />

        <SliderInput
          label="Index of Refraction"
          value={props.ior || 1.5}
          min={1}
          max={3}
          step={0.01}
          onChange={value => updateProperty('ior', value)}
        />

        {props.transparent && (
          <SliderInput
            label="Transmission"
            value={props.transmission || 0}
            min={0}
            max={1}
            step={0.01}
            onChange={value => updateProperty('transmission', value)}
          />
        )}
      </div>

      {/* Clearcoat Properties */}
      <div className="material-editor-section">
        <h4>Clearcoat</h4>

        <SliderInput
          label="Clearcoat"
          value={props.clearcoat || 0}
          min={0}
          max={1}
          step={0.01}
          onChange={value => updateProperty('clearcoat', value)}
        />

        {(props.clearcoat || 0) > 0 && (
          <SliderInput
            label="Clearcoat Roughness"
            value={props.clearcoatRoughness || 0}
            min={0}
            max={1}
            step={0.01}
            onChange={value => updateProperty('clearcoatRoughness', value)}
          />
        )}
      </div>

      {/* Sheen Properties */}
      <div className="material-editor-section">
        <h4>Sheen</h4>

        <SliderInput
          label="Sheen"
          value={props.sheen || 0}
          min={0}
          max={1}
          step={0.01}
          onChange={value => updateProperty('sheen', value)}
        />

        {(props.sheen || 0) > 0 && (
          <SliderInput
            label="Sheen Roughness"
            value={props.sheenRoughness || 0}
            min={0}
            max={1}
            step={0.01}
            onChange={value => updateProperty('sheenRoughness', value)}
          />
        )}
      </div>

      {/* Material Library Modal */}
      {showLibrary && (
        <div className="material-editor-modal">
          <div className="material-editor-modal-content">
            <div className="material-editor-modal-header">
              <h4>Material Library</h4>
              <button
                onClick={() => setShowLibrary(false)}
                className="material-editor-modal-close"
              >
                ×
              </button>
            </div>
            <MaterialLibraryBrowser
              onSelectPreset={handleApplyPreset}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialEditorPanel
