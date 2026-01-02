/**
 * نافذة مساعدة الاختصارات القابلة للبحث
 * تعرض جميع الاختصارات المتاحة مع إمكانية البحث
 */

import React, { useEffect, useState } from 'react'
import {
  keyboardShortcutManager,
  ShortcutAction,
  ShortcutBinding,
} from '../../services/KeyboardShortcutManager'
import './ShortcutHelpOverlay.css'

interface ShortcutHelpItem {
  action: ShortcutAction
  binding: ShortcutBinding
}

interface ShortcutHelpOverlayProps {
  isVisible: boolean
  onClose: () => void
}

export const ShortcutHelpOverlay: React.FC<ShortcutHelpOverlayProps> = ({
  isVisible,
  onClose,
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutHelpItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    if (isVisible) {
      loadShortcuts()
    }
  }, [isVisible])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible, onClose])

  const loadShortcuts = () => {
    const allShortcuts = keyboardShortcutManager.getAllShortcuts()
    const enabledShortcuts = allShortcuts
      .filter(item => item.binding.enabled)
      .map(item => ({
        action: item.action,
        binding: item.binding,
      }))
    setShortcuts(enabledShortcuts)
  }

  const categories = React.useMemo(() => {
    const cats = new Set<string>()
    shortcuts.forEach(shortcut => cats.add(shortcut.action.category))
    return Array.from(cats).sort()
  }, [shortcuts])

  const filteredShortcuts = React.useMemo(() => {
    return shortcuts.filter(shortcut => {
      const matchesSearch =
        shortcut.action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.action.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        shortcut.binding.keys.some(key =>
          key.toLowerCase().includes(searchTerm.toLowerCase())
        )

      const matchesCategory =
        selectedCategory === 'all' ||
        shortcut.action.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [shortcuts, searchTerm, selectedCategory])

  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, ShortcutHelpItem[]> = {}
    filteredShortcuts.forEach(shortcut => {
      const category = shortcut.action.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(shortcut)
    })
    return groups
  }, [filteredShortcuts])

  const formatKeys = (keys: string[]): string => {
    return keys.join(' + ')
  }

  if (!isVisible) return null

  return (
    <div className="shortcut-help-overlay" onClick={onClose}>
      <div className="shortcut-help-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcut-help-header">
          <h2>دليل اختصارات لوحة المفاتيح</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <div className="shortcut-help-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="البحث في الاختصارات أو الأوامر..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="all">جميع الفئات</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="shortcut-help-content">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="no-results">
              لا توجد اختصارات تطابق البحث الحالي
            </div>
          ) : (
            Object.entries(groupedShortcuts).map(
              ([category, categoryShortcuts]) => (
                <div key={category} className="shortcut-category-group">
                  <h3 className="category-title">{category}</h3>
                  <div className="shortcuts-grid">
                    {categoryShortcuts.map(({ action, binding }) => (
                      <div key={action.id} className="shortcut-help-item">
                        <div className="shortcut-info">
                          <div className="shortcut-name">{action.name}</div>
                          <div className="shortcut-description">
                            {action.description}
                          </div>
                        </div>
                        <div className="shortcut-keys">
                          {formatKeys(binding.keys)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </div>

        <div className="shortcut-help-footer">
          <div className="help-tip">
            💡 يمكنك تخصيص هذه الاختصارات من إعدادات التطبيق
          </div>
          <div className="help-tip">
            اضغط <kbd>Esc</kbd> لإغلاق هذه النافذة
          </div>
        </div>
      </div>
    </div>
  )
}
