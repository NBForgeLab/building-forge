/**
 * مؤشر الأدوات - تصدير جميع الأدوات
 * Tools index - export all tools
 */

// Base classes
export { BaseTool } from './BaseTool'
export type { ToolContext, ToolEvent, ToolResult, ToolState } from './BaseTool'

// Tool manager
export { ToolManager, createToolManager, getToolManager } from './ToolManager'
export type { ToolManagerConfig } from './ToolManager'

// Tool implementations
export { CutTool } from './CutTool'
export { DoorTool } from './DoorTool'
export { FloorTool } from './FloorTool'
export { SelectTool } from './SelectTool'
export { WallTool } from './WallTool'
export { WindowTool } from './WindowTool'

// Tool utilities
export const TOOL_SHORTCUTS = {
    select: 'V',
    wall: 'W',
    floor: 'F',
    door: 'D',
    window: 'N',
    cut: 'C'
} as const

export const TOOL_NAMES = {
    select: 'أداة التحديد',
    wall: 'أداة الجدار',
    floor: 'أداة الأرضية',
    door: 'أداة الباب',
    window: 'أداة النافذة',
    cut: 'أداة القطع'
} as const

export const TOOL_DESCRIPTIONS = {
    select: 'تحديد وتحريك العناصر في المشهد',
    wall: 'إنشاء جدران بالنقر والسحب',
    floor: 'إنشاء أرضيات بتحديد النقاط',
    door: 'وضع أبواب على الجدران',
    window: 'وضع نوافذ على الجدران',
    cut: 'إنشاء فتحات دقيقة في الجدران والأرضيات'
} as const

export const TOOL_ICONS = {
    select: 'cursor-arrow',
    wall: 'wall',
    floor: 'floor',
    door: 'door',
    window: 'window',
    cut: 'cut'
} as const