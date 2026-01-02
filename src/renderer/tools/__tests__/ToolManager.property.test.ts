/**
 * اختبارات خاصية لمدير الأدوات المركزي
 * Property tests for ToolManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { Vector3 } from 'three'
import { ToolManager, ToolManagerConfig } from '../ToolManager'
import { ToolContext, ToolEvent } from '../BaseTool'
import { ToolType } from '../../store/types'

// Mock store
const mockStoreState = {
    elements: [],
    selectionState: {
        selectedElements: [],
        transformMode: 'translate' as const
    },
    project: {
        settings: {
            gridSize: 1,
            snapToGrid: true
        }
    },
    setActiveTool: vi.fn(),
    addElement: vi.fn(),
    addHistoryEntry: vi.fn(),
    clearPreview: vi.fn(),
    setError: vi.fn(),
    selectElements: vi.fn(),
    clearSelection: vi.fn(),
    removeElements: vi.fn(),
    duplicateElem