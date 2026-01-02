/**
 * مزود نظام الاختصارات للتطبيق
 * يدير تهيئة وتكامل نظام الاختصارات مع التطبيق
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useGlobalShortcuts } from '../../hooks/useKeyboardShortcuts'
import { keyboardShortcutManager } from '../../services/KeyboardShortcutManager'
import { ShortcutHelpOverlay } from './ShortcutHelpOverlay'

interface ShortcutContextType {
  showHelp: () => void
  hideHelp: () => void
  isHelpVisible: boolean
  openShortcutManager: () => void
}

const ShortcutContext = createContext<ShortcutContextType | null>(null)

export const useShortcuts = () => {
  const context = useContext(ShortcutContext)
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutProvider')
  }
  return context
}

interface ShortcutProviderProps {
  children: React.ReactNode
  onOpenShortcutManager?: () => void
}

export const ShortcutProvider: React.FC<ShortcutProviderProps> = ({
  children,
  onOpenShortcutManager,
}) => {
  const [isHelpVisible, setIsHelpVisible] = useState(false)

  // تهيئة الاختصارات العامة
  useGlobalShortcuts()

  // تسجيل اختصار مساعدة الاختصارات
  useEffect(() => {
    keyboardShortcutManager.registerAction({
      id: 'app.show-shortcuts-help',
      name: 'عرض مساعدة الاختصارات',
      description: 'عرض نافذة مساعدة جميع الاختصارات المتاحة',
      category: 'مساعدة',
      defaultKeys: ['F1'],
      handler: () => setIsHelpVisible(true),
    })

    keyboardShortcutManager.registerAction({
      id: 'app.open-shortcut-manager',
      name: 'فتح إدارة الاختصارات',
      description: 'فتح لوحة إدارة وتخصيص الاختصارات',
      category: 'إعدادات',
      defaultKeys: ['Ctrl', 'Shift', 'K'],
      handler: () => {
        if (onOpenShortcutManager) {
          onOpenShortcutManager()
        }
      },
    })
  }, [onOpenShortcutManager])

  const showHelp = () => setIsHelpVisible(true)
  const hideHelp = () => setIsHelpVisible(false)

  const openShortcutManager = () => {
    if (onOpenShortcutManager) {
      onOpenShortcutManager()
    }
  }

  const contextValue: ShortcutContextType = {
    showHelp,
    hideHelp,
    isHelpVisible,
    openShortcutManager,
  }

  return (
    <ShortcutContext.Provider value={contextValue}>
      {children}
      <ShortcutHelpOverlay isVisible={isHelpVisible} onClose={hideHelp} />
    </ShortcutContext.Provider>
  )
}
