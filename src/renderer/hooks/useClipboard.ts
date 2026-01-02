/**
 * Hook مخصص لإدارة عمليات النسخ واللصق
 * Custom hook for managing copy and paste operations
 */

import { useCallback, useEffect, useState } from 'react'
import { useClipboardActions, useClipboardState, useSelectionState } from '../store'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export interface UseClipboardOptions {
    enableKeyboardShortcuts?: boolean
    context?: 'viewport' | 'material-editor' | 'selection'
    onCopy?: (entryId: string) => void
    onPaste?: (elementIds: string[]) => void
    onError?: (error: Error) => void
}

export function useClipboard(options: UseClipboardOptions = {}) {
    const {
        enableKeyboardShortcuts = true,
        context = 'viewport',
        onCopy,
        onPaste,
        onError
    } = options

    const clipboardState = useClipboardState()
    const selectionState = useSelectionState()
    const {
        copySelectedElements,
        copyElements,
        copyMaterials,
        pasteElements,
        pasteMaterials,
        multiPasteElements,
        smartCopy,
        smartPaste,
        clearClipboard,
        canPaste,
        getClipboardPreview,
        updateClipboardState
    } = useClipboardActions()

    const [isClipboardManagerOpen, setIsClipboardManagerOpen] = useState(false)

    // Update clipboard state on mount
    useEffect(() => {
        updateClipboardState()
    }, [updateClipboardState])

    // Copy selected elements
    const copy = useCallback(async () => {
        try {
            if (selectionState.selectedElements.length === 0) {
                throw new Error('لا توجد عناصر محددة للنسخ')
            }

            const entryId = copySelectedElements({
                includeMaterials: true,
                preserveIds: false
            })

            onCopy?.(entryId)
            return entryId
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [selectionState.selectedElements, copySelectedElements, onCopy, onError])

    // Copy specific elements
    const copySpecificElements = useCallback(async (elementIds: string[]) => {
        try {
            const entryId = copyElements(elementIds, {
                includeMaterials: true,
                preserveIds: false
            })

            onCopy?.(entryId)
            return entryId
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [copyElements, onCopy, onError])

    // Copy materials
    const copySpecificMaterials = useCallback(async (materialIds: string[]) => {
        try {
            const entryId = copyMaterials(materialIds)
            onCopy?.(entryId)
            return entryId
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [copyMaterials, onCopy, onError])

    // Paste elements
    const paste = useCallback(async (cursorPosition?: { x: number; y: number; z: number }) => {
        try {
            if (!canPaste()) {
                throw new Error('لا يوجد محتوى للصق')
            }

            const elementIds = pasteElements({
                offsetPosition: cursorPosition || { x: 1, y: 0, z: 1 }
            })

            onPaste?.(elementIds)
            return elementIds
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [canPaste, pasteElements, onPaste, onError])

    // Multi-paste elements
    const multiPaste = useCallback(async (
        count: number,
        spacing: { x: number; y: number; z: number }
    ) => {
        try {
            if (!canPaste()) {
                throw new Error('لا يوجد محتوى للصق المتعدد')
            }

            const elementIds = multiPasteElements(count, spacing)
            onPaste?.(elementIds)
            return elementIds
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [canPaste, multiPasteElements, onPaste, onError])

    // Smart copy based on context
    const smartCopyOperation = useCallback(async () => {
        try {
            let contextType: 'selection' | 'tool' | 'material-editor' = 'selection'

            if (context === 'material-editor') {
                contextType = 'material-editor'
            } else if (context === 'viewport') {
                contextType = 'selection'
            }

            const entryId = smartCopy(contextType)
            onCopy?.(entryId)
            return entryId
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [context, smartCopy, onCopy, onError])

    // Smart paste based on context
    const smartPasteOperation = useCallback(async (cursorPosition?: { x: number; y: number; z: number }) => {
        try {
            const elementIds = smartPaste(context, cursorPosition)
            onPaste?.(elementIds)
            return elementIds
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [context, smartPaste, onPaste, onError])

    // Duplicate selected elements (copy + paste)
    const duplicate = useCallback(async () => {
        try {
            await copy()
            const elementIds = await paste({ x: 2, y: 0, z: 2 })
            return elementIds
        } catch (error) {
            onError?.(error as Error)
            throw error
        }
    }, [copy, paste, onError])

    // Clear clipboard
    const clear = useCallback(() => {
        clearClipboard()
    }, [clearClipboard])

    // Get clipboard preview
    const preview = useCallback(() => {
        return getClipboardPreview()
    }, [getClipboardPreview])

    // Open clipboard manager
    const openClipboardManager = useCallback(() => {
        setIsClipboardManagerOpen(true)
    }, [])

    // Close clipboard manager
    const closeClipboardManager = useCallback(() => {
        setIsClipboardManagerOpen(false)
    }, [])

    // Keyboard shortcuts
    const shortcuts = useKeyboardShortcuts({
        'ctrl+c': copy,
        'ctrl+v': paste,
        'ctrl+d': duplicate,
        'ctrl+shift+v': openClipboardManager,
        'ctrl+shift+c': clear
    }, enableKeyboardShortcuts)

    return {
        // State
        clipboardState,
        isClipboardManagerOpen,
        canPaste: canPaste(),
        hasContent: clipboardState.hasContent,
        contentType: clipboardState.contentType,
        contentStats: clipboardState.contentStats,

        // Operations
        copy,
        copyElements: copySpecificElements,
        copyMaterials: copySpecificMaterials,
        paste,
        multiPaste,
        smartCopy: smartCopyOperation,
        smartPaste: smartPasteOperation,
        duplicate,
        clear,
        preview,

        // UI
        openClipboardManager,
        closeClipboardManager,

        // Shortcuts
        shortcuts
    }
}

export default useClipboard