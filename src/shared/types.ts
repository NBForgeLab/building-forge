/**
 * الأنواع المشتركة بين العملية الرئيسية وعملية العرض
 */

// أنواع الأدوات الأساسية
export enum ToolType {
  SELECT = 'select',
  WALL = 'wall',
  FLOOR = 'floor',
  DOOR = 'door',
  WINDOW = 'window',
  CUT = 'cut',
  MOVE = 'move',
  ROTATE = 'rotate',
  SCALE = 'scale'
}

// أنواع العناصر في المشهد
export enum ElementType {
  WALL = 'wall',
  FLOOR = 'floor',
  DOOR = 'door',
  WINDOW = 'window',
  ASSET = 'asset'
}

// واجهة العنصر الأساسي
export interface BaseElement {
  id: string
  type: ElementType
  position: Vector3
  rotation: Vector3
  scale: Vector3
  materialId?: string
  visible: boolean
  selected: boolean
  locked: boolean
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

// نوع Vector3 للإحداثيات ثلاثية الأبعاد
export interface Vector3 {
  x: number
  y: number
  z: number
}

// واجهة المادة
export interface Material {
  id: string
  name: string
  type: 'pbr' | 'basic'
  albedo: string // لون أو مسار النسيج
  normal?: string
  roughness: number
  metallic: number
  opacity: number
  emissive?: string
  uvScale: Vector2
  createdAt: number
  updatedAt: number
}

// نوع Vector2 للإحداثيات ثنائية الأبعاد
export interface Vector2 {
  x: number
  y: number
}

// واجهة المشروع
export interface Project {
  id: string
  name: string
  description?: string
  version: string
  elements: BaseElement[]
  materials: Material[]
  settings: ProjectSettings
  metadata: ProjectMetadata
  createdAt: number
  updatedAt: number
}

// إعدادات المشروع
export interface ProjectSettings {
  units: 'meters' | 'centimeters' | 'inches' | 'feet'
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  backgroundColor: string
  ambientLightIntensity: number
  directionalLightIntensity: number
}

// البيانات الوصفية للمشروع
export interface ProjectMetadata {
  author?: string
  tags: string[]
  thumbnail?: string
  exportSettings: ExportSettings
}

// إعدادات التصدير
export interface ExportSettings {
  format: 'glb' | 'obj'
  quality: 'high' | 'medium' | 'low'
  includeTextures: boolean
  generateCollisionMesh: boolean
  optimizeForGames: boolean
}

// رسائل IPC بين العمليات
export interface IPCMessage {
  type: string
  payload?: unknown
}

// أحداث IPC
export enum IPCEvents {
  // أحداث الملفات
  FILE_NEW = 'file:new',
  FILE_OPEN = 'file:open',
  FILE_SAVE = 'file:save',
  FILE_SAVE_AS = 'file:save-as',
  FILE_EXPORT = 'file:export',
  
  // أحداث الأدوات
  TOOL_ACTIVATE = 'tool:activate',
  TOOL_DEACTIVATE = 'tool:deactivate',
  
  // أحداث المشروع
  PROJECT_UPDATED = 'project:updated',
  PROJECT_LOADED = 'project:loaded',
  
  // أحداث النظام
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_MAXIMIZE = 'window:maximize',
  WINDOW_CLOSE = 'window:close'
}