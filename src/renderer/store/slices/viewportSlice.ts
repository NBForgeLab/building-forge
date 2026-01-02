/**
 * Viewport slice لإدارة العارض ثلاثي الأبعاد
 * Viewport slice for managing 3D viewport
 */

import { StateCreator } from 'zustand'
import { CameraState, StoreState, ViewportSlice } from '../types'

export const createViewportSlice: StateCreator<
    StoreState,
    [],
    [],
    ViewportSlice
> = (set, get) => ({
    viewportState: {
        camera: {
            position: { x: 10, y: 10, z: 10 },
            target: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            zoom: 1.0,
            viewMode: 'perspective',
            preset: 'isometric'
        },
        lighting: {
            ambientIntensity: 0.4,
            ambientColor: '#ffffff',
            directionalIntensity: 1.0,
            directionalColor: '#ffffff',
            directionalPosition: { x: 10, y: 10, z: 5 },
            hemisphereIntensity: 0.3,
            skyColor: '#87CEEB',
            groundColor: '#8B4513',
            shadows: true,
            shadowQuality: 'medium',
            pointLights: [],
            spotLights: []
        },
        rendering: {
            wireframe: false,
            showNormals: false,
            showBounds: false,
            antialiasing: true,
            postProcessing: false,
            viewMode: 'solid'
        },
        grid: {
            visible: true,
            size: 20,
            divisions: 20,
            majorColor: '#888888',
            minorColor: '#cccccc',
            opacity: 0.5,
            showLabels: false
        }
    },

    updateCamera: (updates) => {
        set(state => ({
            viewportState: {
                ...state.viewportState,
                camera: {
                    ...state.viewportState.camera,
                    ...updates
                }
            }
        }))

        // Add history entry for significant camera changes
        if (updates.preset || updates.viewMode) {
            get().addHistoryEntry(
                'viewport:camera-update',
                'تم تحديث إعدادات الكاميرا',
                { updates, previousCamera: get().viewportState.camera }
            )
        }
    },

    updateLighting: (updates) => {
        set(state => ({
            viewportState: {
                ...state.viewportState,
                lighting: {
                    ...state.viewportState.lighting,
                    ...updates
                }
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'viewport:lighting-update',
            'تم تحديث إعدادات الإضاءة',
            { updates, previousLighting: get().viewportState.lighting }
        )
    },

    updateRendering: (updates) => {
        set(state => ({
            viewportState: {
                ...state.viewportState,
                rendering: {
                    ...state.viewportState.rendering,
                    ...updates
                }
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'viewport:rendering-update',
            'تم تحديث إعدادات العرض',
            { updates, previousRendering: get().viewportState.rendering }
        )
    },

    updateGrid: (updates) => {
        set(state => ({
            viewportState: {
                ...state.viewportState,
                grid: {
                    ...state.viewportState.grid,
                    ...updates
                }
            }
        }))

        // Add history entry
        get().addHistoryEntry(
            'viewport:grid-update',
            'تم تحديث إعدادات الشبكة',
            { updates, previousGrid: get().viewportState.grid }
        )
    },

    setCameraPreset: (preset) => {
        const cameraPositions: Record<CameraState['preset'], { position: { x: number, y: number, z: number }, target: { x: number, y: number, z: number } }> = {
            front: {
                position: { x: 0, y: 0, z: 10 },
                target: { x: 0, y: 0, z: 0 }
            },
            back: {
                position: { x: 0, y: 0, z: -10 },
                target: { x: 0, y: 0, z: 0 }
            },
            left: {
                position: { x: -10, y: 0, z: 0 },
                target: { x: 0, y: 0, z: 0 }
            },
            right: {
                position: { x: 10, y: 0, z: 0 },
                target: { x: 0, y: 0, z: 0 }
            },
            top: {
                position: { x: 0, y: 10, z: 0 },
                target: { x: 0, y: 0, z: 0 }
            },
            bottom: {
                position: { x: 0, y: -10, z: 0 },
                target: { x: 0, y: 0, z: 0 }
            },
            isometric: {
                position: { x: 10, y: 10, z: 10 },
                target: { x: 0, y: 0, z: 0 }
            }
        }

        const cameraConfig = cameraPositions[preset]

        get().updateCamera({
            ...cameraConfig,
            preset,
            viewMode: preset === 'isometric' ? 'perspective' : 'orthographic'
        })

        // Add history entry
        get().addHistoryEntry(
            'viewport:camera-preset',
            `تم تغيير منظور الكاميرا إلى: ${getCameraPresetName(preset)}`,
            { preset, previousPreset: get().viewportState.camera.preset }
        )
    },

    resetCamera: () => {
        const defaultCamera: CameraState = {
            position: { x: 10, y: 10, z: 10 },
            target: { x: 0, y: 0, z: 0 },
            zoom: 1.0,
            viewMode: 'perspective',
            preset: 'isometric'
        }

        get().updateCamera(defaultCamera)

        // Add history entry
        get().addHistoryEntry(
            'viewport:camera-reset',
            'تم إعادة تعيين الكاميرا',
            { previousCamera: get().viewportState.camera }
        )
    }
})

// Helper function
function getCameraPresetName(preset: CameraState['preset']): string {
    const presetNames: Record<CameraState['preset'], string> = {
        front: 'أمامي',
        back: 'خلفي',
        left: 'يسار',
        right: 'يمين',
        top: 'علوي',
        bottom: 'سفلي',
        isometric: 'متساوي القياس'
    }
    return presetNames[preset]
}