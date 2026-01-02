/**
 * أنواع البيانات لإدارة الحالة
 * Types for state management
 */

// Project types
export interface Project {
    id: string
    name: string
    description?: string
    created: string
    modified: string
    version: string
    elements: BuildingElement[]
    materials: Material[]
    settings: ProjectSettings
    metadata: ProjectMetadata
}

export interface ProjectMetadata {
    author?: string
    tags: string[]
    thumbnail?: string
    fileSize?: number
    exportFormats: string[]
}

export interface ProjectSettings {
    units: 'metric' | 'imperial'
    gridSize: number
    snapToGrid: boolean
    showGrid: boolean
    backgroundColor: string
    lightingPreset: 'indoor' | 'outdoor' | 'studio'
    renderQuality: 'low' | 'medium' | 'high'
}

// Building elements
export interface BuildingElement {
    id: string
    type: ElementType
    name: string
    position: Vector3
    rotation: Vector3
    scale: Vector3
    properties: ElementProperties
    materialId?: string
    visible: boolean
    locked: boolean
    created: string
    modified: string
}

export type ElementType = 'wall' | 'floor' | 'door' | 'window' | 'cut' | 'custom'

export interface Vector3 {
    x: number
    y: number
    z: number
}

export interface ElementProperties {
    // Wall properties
    thickness?: number
    height?: number

    // Door/Window properties
    width?: number
    openDirection?: 'left' | 'right' | 'inward' | 'outward'

    // Floor properties
    area?: number

    // Cut properties
    shape?: 'rectangle' | 'circle' | 'custom'

    // Custom properties
    [key: string]: any
}

// Materials
export interface Material {
    id: string
    name: string
    type: 'pbr' | 'basic'
    properties: MaterialProperties
    textures: MaterialTextures
    created: string
    modified: string
}

export interface MaterialProperties {
    albedo: string // hex color
    metallic: number // 0-1
    roughness: number // 0-1
    normal: number // 0-1
    emission: string // hex color
    emissionIntensity: number // 0-1
    opacity: number // 0-1
    transparent: boolean
}

export interface MaterialTextures {
    albedo?: string // texture path
    normal?: string
    metallic?: string
    roughness?: string
    emission?: string
    opacity?: string
}

// Tools
export type ToolType = 'select' | 'wall' | 'floor' | 'door' | 'window' | 'cut' | 'move' | 'rotate' | 'scale'

export interface ToolState {
    activeTool: ToolType
    toolProperties: ToolProperties
    previewElement?: BuildingElement
}

export interface ToolProperties {
    // Wall tool
    wallThickness?: number
    wallHeight?: number

    // Door tool
    doorWidth?: number
    doorHeight?: number
    doorType?: 'single' | 'double' | 'sliding'

    // Window tool
    windowWidth?: number
    windowHeight?: number
    windowType?: 'single' | 'double' | 'sliding'

    // Floor tool
    floorThickness?: number

    // Cut tool
    cutShape?: 'rectangle' | 'circle' | 'custom'
    cutDepth?: number
}

// Viewport
export interface ViewportState {
    camera: CameraState
    lighting: LightingState
    rendering: RenderingState
    grid: GridState
}

export interface CameraState {
    position: Vector3
    target: Vector3
    rotation?: Vector3
    zoom: number
    viewMode: 'perspective' | 'orthographic'
    preset?: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'isometric'
}

export interface LightingState {
    ambientIntensity: number
    ambientColor: string
    directionalIntensity: number
    directionalColor: string
    directionalPosition: Vector3
    hemisphereIntensity: number
    skyColor: string
    groundColor: string
    shadows: boolean
    shadowQuality: 'low' | 'medium' | 'high'
    pointLights: PointLight[]
    spotLights: SpotLight[]
}

export interface PointLight {
    position: Vector3
    intensity: number
    color: string
    distance: number
    decay: number
    castShadow: boolean
}

export interface SpotLight {
    position: Vector3
    target: Vector3
    intensity: number
    color: string
    distance: number
    angle: number
    penumbra: number
    decay: number
    castShadow: boolean
}

export interface RenderingState {
    wireframe: boolean
    showNormals: boolean
    showBounds: boolean
    antialiasing: boolean
    postProcessing: boolean
    viewMode?: 'solid' | 'wireframe' | 'textured'
}

export interface GridState {
    visible: boolean
    size: number
    divisions: number
    majorColor: string
    minorColor: string
    opacity: number
    showLabels: boolean
}

// Selection
export interface SelectionState {
    selectedElements: string[]
    hoveredElement?: string
    selectionBox?: SelectionBox
    transformMode: 'translate' | 'rotate' | 'scale'
    transformSpace: 'local' | 'world'
}

export interface SelectionBox {
    start: Vector2
    end: Vector2
}

export interface Vector2 {
    x: number
    y: number
}

// History (Undo/Redo)
export interface HistoryState {
    past: HistoryEntry[]
    present: HistoryEntry
    future: HistoryEntry[]
    maxHistorySize: number
}

export interface HistoryEntry {
    id: string
    timestamp: string
    action: string
    description: string
    data: any
}

// UI State
export interface UIState {
    sidebarWidth: number
    propertiesPanelWidth: number
    bottomPanelHeight: number
    showGrid: boolean
    showStats: boolean
    showWireframe: boolean
    viewMode: 'solid' | 'wireframe' | 'textured'
    cameraMode: 'perspective' | 'orthographic'
    theme: 'light' | 'dark'
    language: 'ar' | 'en'
}

// Application State
export interface AppState {
    initialized: boolean
    loading: boolean
    error?: string
    lastSaved?: string
    autoSave: boolean
    autoSaveInterval: number
    recentProjects: RecentProject[]
}

export interface RecentProject {
    id: string
    name: string
    path: string
    lastOpened: string
    thumbnail?: string
}

// Store slices
export interface ProjectSlice {
    project: Project | null
    setProject: (project: Project) => void
    updateProject: (updates: Partial<Project>) => void
    createNewProject: (name: string) => void
    clearProject: () => void
}

export interface ElementsSlice {
    elements: BuildingElement[]
    addElement: (element: BuildingElement) => void
    updateElement: (id: string, updates: Partial<BuildingElement>) => void
    removeElement: (id: string) => void
    removeElements: (ids: string[]) => void
    duplicateElement: (id: string) => void
    duplicateElements: (ids: string[]) => void
    getElementById: (id: string) => BuildingElement | undefined
    getElementsByType: (type: ElementType) => BuildingElement[]
}

export interface MaterialsSlice {
    materials: Material[]
    addMaterial: (material: Material) => void
    updateMaterial: (id: string, updates: Partial<Material>) => void
    removeMaterial: (id: string) => void
    duplicateMaterial: (id: string) => void
    getMaterialById: (id: string) => Material | undefined
    getDefaultMaterials: () => Material[]
}

export interface ToolsSlice {
    toolState: ToolState
    setActiveTool: (tool: ToolType) => void
    updateToolProperties: (properties: Partial<ToolProperties>) => void
    setPreviewElement: (element?: BuildingElement) => void
    clearPreview: () => void
}

export interface ViewportSlice {
    viewportState: ViewportState
    updateCamera: (updates: Partial<CameraState>) => void
    updateLighting: (updates: Partial<LightingState>) => void
    updateRendering: (updates: Partial<RenderingState>) => void
    updateGrid: (updates: Partial<GridState>) => void
    setCameraPreset: (preset: CameraState['preset']) => void
    resetCamera: () => void
}

export interface SelectionSlice {
    selectionState: SelectionState
    selectElement: (id: string, addToSelection?: boolean) => void
    selectElements: (ids: string[]) => void
    deselectElement: (id: string) => void
    clearSelection: () => void
    setHoveredElement: (id?: string) => void
    setTransformMode: (mode: SelectionState['transformMode']) => void
    setTransformSpace: (space: SelectionState['transformSpace']) => void
}

export interface HistorySlice {
    historyState: HistoryState
    addHistoryEntry: (action: string, description: string, data: any) => void
    undo: () => void
    redo: () => void
    clearHistory: () => void
    canUndo: () => boolean
    canRedo: () => boolean
}

export interface UISlice {
    uiState: UIState
    updateUI: (updates: Partial<UIState>) => void
    toggleGrid: () => void
    toggleStats: () => void
    toggleWireframe: () => void
    setViewMode: (mode: UIState['viewMode']) => void
    setCameraMode: (mode: UIState['cameraMode']) => void
    setTheme: (theme: UIState['theme']) => void
    setLanguage: (language: UIState['language']) => void
}

export interface AppSlice {
    appState: AppState
    setInitialized: (initialized: boolean) => void
    setLoading: (loading: boolean) => void
    setError: (error?: string) => void
    setLastSaved: (timestamp: string) => void
    setAutoSave: (enabled: boolean) => void
    addRecentProject: (project: RecentProject) => void
    removeRecentProject: (id: string) => void
}

// Combined store type
export type StoreState = ProjectSlice &
    ElementsSlice &
    MaterialsSlice &
    ToolsSlice &
    ViewportSlice &
    SelectionSlice &
    HistorySlice &
    UISlice &
    AppSlice &
    ClipboardSlice

// Clipboard types
export interface ClipboardState {
    hasContent: boolean
    contentType: 'elements' | 'materials' | 'mixed' | null
    contentStats: { elements: number; materials: number } | null
    history: any[] // ClipboardEntry[] - imported from service
    currentIndex: number
}

export interface ClipboardSlice {
    clipboardState: ClipboardState

    // Copy operations
    copySelectedElements: (options?: any) => string // ClipboardOptions
    copyElements: (elementIds: string[], options?: any) => string
    copyMaterials: (materialIds: string[]) => string

    // Paste operations
    pasteElements: (options?: any) => string[]
    pasteMaterials: () => string[]
    multiPasteElements: (count: number, spacing: { x: number; y: number; z: number }) => string[]

    // Smart operations
    smartCopy: (context: 'selection' | 'tool' | 'material-editor') => string
    smartPaste: (context: 'viewport' | 'material-editor', cursorPosition?: { x: number; y: number; z: number }) => string[]

    // Clipboard management
    updateClipboardState: () => void
    navigateClipboardHistory: (direction: 'previous' | 'next') => any // ClipboardEntry | null
    clearClipboard: () => void
    removeClipboardEntry: (entryId: string) => boolean

    // Utility methods
    canPaste: () => boolean
    getClipboardPreview: () => {
        type: string
        elementCount: number
        materialCount: number
        description: string
        timestamp: number
    } | null
}