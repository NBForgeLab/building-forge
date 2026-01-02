/**
 * قائمة السياق للعناصر المحددة
 * Context menu for selected elements
 */

import React, { useEffect, useRef, useState } from 'react'
import { useElements, useMaterials, useSelection } from '../../hooks/useStore'
import { BuildingElement } from '../../store/types'

export interface ContextMenuProps {
  visible: boolean
  position: { x: number; y: number }
  elements: BuildingElement[]
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  position,
  elements,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  const { duplicateElements, removeElements } = useElements()
  const { clearSelection } = useSelection()
  const { materials } = useMaterials()

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!visible || !menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    let newX = position.x
    let newY = position.y

    // Adjust horizontal position
    if (position.x + rect.width > viewport.width) {
      newX = viewport.width - rect.width - 10
    }

    // Adjust vertical position
    if (position.y + rect.height > viewport.height) {
      newY = viewport.height - rect.height - 10
    }

    setAdjustedPosition({ x: Math.max(10, newX), y: Math.max(10, newY) })
  }, [visible, position])

  // Close menu on outside click
  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose])

  const handleDuplicate = () => {
    const elementIds = elements.map(e => e.id)
    duplicateElements(elementIds)
    onClose()
  }

  const handleDelete = () => {
    const elementIds = elements.map(e => e.id)
    removeElements(elementIds)
    clearSelection()
    onClose()
  }

  const handleLock = () => {
    // TODO: Implement lock functionality
    onClose()
  }

  const handleUnlock = () => {
    // TODO: Implement unlock functionality
    onClose()
  }

  const handleHide = () => {
    // TODO: Implement hide functionality
    onClose()
  }

  const handleProperties = () => {
    // TODO: Open properties panel
    onClose()
  }

  const handleAssignMaterial = (materialId: string) => {
    // TODO: Implement material assignment
    onClose()
  }

  if (!visible) return null

  const isSingleSelection = elements.length === 1
  const isMultiSelection = elements.length > 1
  const hasLockedElements = elements.some(e => e.locked)
  const hasUnlockedElements = elements.some(e => !e.locked)
  const hasVisibleElements = elements.some(e => e.visible)
  const hasHiddenElements = elements.some(e => !e.visible)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-2 min-w-48"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Element info */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {isSingleSelection
            ? elements[0].name
            : `${elements.length} عناصر محددة`}
        </div>
        {isSingleSelection && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getElementTypeDisplayName(elements[0].type)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="py-1">
        {/* Duplicate */}
        <button
          onClick={handleDuplicate}
          className="w-full px-4 py-2 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
        >
          <span>نسخ</span>
          <span className="text-xs text-gray-400">Ctrl+D</span>
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-between"
        >
          <span>حذف</span>
          <span className="text-xs text-gray-400">Delete</span>
        </button>

        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

        {/* Lock/Unlock */}
        {hasUnlockedElements && (
          <button
            onClick={handleLock}
            className="w-full px-4 py-2 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            قفل
          </button>
        )}

        {hasLockedElements && (
          <button
            onClick={handleUnlock}
            className="w-full px-4 py-2 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            إلغاء القفل
          </button>
        )}

        {/* Hide/Show */}
        {hasVisibleElements && (
          <button
            onClick={handleHide}
            className="w-full px-4 py-2 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            إخفاء
          </button>
        )}

        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

        {/* Properties */}
        {isSingleSelection && (
          <button
            onClick={handleProperties}
            className="w-full px-4 py-2 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            خصائص
          </button>
        )}

        {/* Materials submenu */}
        {materials.length > 0 && (
          <div className="relative group">
            <button className="w-full px-4 py-2 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between">
              <span>تطبيق مادة</span>
              <span className="text-xs">›</span>
            </button>

            {/* Submenu */}
            <div className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              {materials.slice(0, 10).map(material => (
                <button
                  key={material.id}
                  onClick={() => handleAssignMaterial(material.id)}
                  className="w-full px-3 py-2 text-right text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <div
                    className="w-3 h-3 rounded-full ml-2 border border-gray-300"
                    style={{ backgroundColor: material.properties.albedo }}
                  />
                  <span className="truncate">{material.name}</span>
                </button>
              ))}

              {materials.length > 10 && (
                <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
                  +{materials.length - 10} مواد أخرى
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getElementTypeDisplayName(type: string): string {
  const typeNames: Record<string, string> = {
    wall: 'جدار',
    floor: 'أرضية',
    door: 'باب',
    window: 'نافذة',
    cut: 'قطع',
    custom: 'مخصص',
  }
  return typeNames[type] || type
}
