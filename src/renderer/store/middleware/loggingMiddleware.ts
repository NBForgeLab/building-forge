/**
 * Logging middleware للتسجيل والتتبع
 * Logging middleware for tracking and debugging
 */

import { isDev } from '@shared/config/appConfig'
import { StateCreator, StoreMutatorIdentifier } from 'zustand'

type LoggingMiddleware = <
    T,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
    f: StateCreator<T, Mps, Mcs>,
    options?: LoggingOptions
) => StateCreator<T, Mps, Mcs>

interface LoggingOptions {
    enabled?: boolean
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    logActions?: boolean
    logStateChanges?: boolean
    logPerformance?: boolean
    filter?: (action: string, state: any) => boolean
    formatter?: (action: string, prevState: any, nextState: any, timestamp: number) => void
}

export const loggingMiddleware: LoggingMiddleware = (f, options = {}) => (set, get, api) => {
    const {
        enabled = isDev(),
        logLevel = 'info',
        logActions = true,
        logStateChanges = true,
        logPerformance = true,
        filter,
        formatter
    } = options

    if (!enabled) {
        return f(set, get, api)
    }

    const logger = createLogger(logLevel)
    let actionCounter = 0

    // Wrap the set function to add logging
    const wrappedSet = (partial: any, replace?: boolean, action?: string) => {
        if (!enabled) {
            set(partial, replace)
            return
        }

        const startTime = performance.now()
        const prevState = get()
        const actionId = ++actionCounter
        const actionName = action || `Action #${actionId}`

        // Apply filter if provided
        if (filter && !filter(actionName, prevState)) {
            set(partial, replace)
            return
        }

        // Log action start
        if (logActions) {
            logger.group(`🎬 ${actionName}`)
            logger.info('Previous State:', prevState)

            if (typeof partial === 'function') {
                logger.info('State Update Function:', partial.toString())
            } else {
                logger.info('State Update:', partial)
            }
        }

        // Apply the state change
        set(partial, replace)

        const nextState = get()
        const endTime = performance.now()
        const duration = endTime - startTime

        // Log state changes
        if (logStateChanges) {
            const changes = getStateChanges(prevState, nextState)
            if (changes.length > 0) {
                logger.info('State Changes:', changes)
            }
        }

        // Log performance
        if (logPerformance) {
            const performanceColor = duration > 10 ? 'color: red' : duration > 5 ? 'color: orange' : 'color: green'
            logger.info(`⏱️ Duration: %c${duration.toFixed(2)}ms`, performanceColor)
        }

        // Log next state
        if (logActions) {
            logger.info('Next State:', nextState)
            logger.groupEnd()
        }

        // Custom formatter
        if (formatter) {
            formatter(actionName, prevState, nextState, Date.now())
        }

        // Log to history if available - DISABLED to prevent exponential growth
        // This was causing the exponential state growth issue
        /*
        if ('addHistoryEntry' in nextState && typeof (nextState as any).addHistoryEntry === 'function') {
            ; (nextState as any).addHistoryEntry(
                'system:log',
                `تم تسجيل العملية: ${actionName}`,
                {
                    action: actionName,
                    duration,
                    changes: logStateChanges ? getStateChanges(prevState, nextState) : undefined
                }
            )
        }
        */
    }

    return f(wrappedSet, get, api)
}

// Helper functions
function createLogger(level: string) {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(level)

    return {
        debug: (...args: any[]) => {
            if (currentLevelIndex <= 0) console.debug(...args)
        },
        info: (...args: any[]) => {
            if (currentLevelIndex <= 1) console.info(...args)
        },
        warn: (...args: any[]) => {
            if (currentLevelIndex <= 2) console.warn(...args)
        },
        error: (...args: any[]) => {
            if (currentLevelIndex <= 3) console.error(...args)
        },
        group: (...args: any[]) => {
            if (currentLevelIndex <= 1) console.group(...args)
        },
        groupEnd: () => {
            if (currentLevelIndex <= 1) console.groupEnd()
        }
    }
}

function getStateChanges(prevState: any, nextState: any): Array<{ path: string; from: any; to: any }> {
    const changes: Array<{ path: string; from: any; to: any }> = []
    const maxChanges = 50 // Limit number of changes to prevent performance issues
    const maxDepth = 3 // Limit recursion depth

    function compareObjects(prev: any, next: any, path = '', depth = 0) {
        if (changes.length >= maxChanges || depth > maxDepth) return
        if (prev === next) return

        if (typeof prev !== 'object' || typeof next !== 'object' || prev === null || next === null) {
            changes.push({
                path,
                from: typeof prev === 'object' ? '[Object]' : prev,
                to: typeof next === 'object' ? '[Object]' : next
            })
            return
        }

        // Skip comparing large arrays or objects
        if (Array.isArray(prev) && prev.length > 10) {
            changes.push({ path, from: `[Array(${prev.length})]`, to: `[Array(${next.length})]` })
            return
        }

        const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])

        // Limit number of keys to compare
        const keysToCompare = Array.from(allKeys).slice(0, 20)

        for (const key of keysToCompare) {
            if (changes.length >= maxChanges) break

            const newPath = path ? `${path}.${key}` : key

            if (!(key in prev)) {
                changes.push({ path: newPath, from: undefined, to: '[Added]' })
            } else if (!(key in next)) {
                changes.push({ path: newPath, from: '[Removed]', to: undefined })
            } else {
                compareObjects(prev[key], next[key], newPath, depth + 1)
            }
        }
    }

    compareObjects(prevState, nextState)
    return changes
}

/**
 * Create development logging middleware with enhanced features
 */
export function createDevLoggingMiddleware(): LoggingMiddleware {
    return (f, options = {}) => loggingMiddleware(f, {
        enabled: isDev(),
        logLevel: 'info', // Changed from 'debug' to reduce noise
        logActions: true,
        logStateChanges: false, // Disabled to improve performance
        logPerformance: true,
        filter: (action, state) => {
            // More aggressive filtering to prevent spam
            const ignoredActions = [
                'ui:mouse-move',
                'viewport:camera-update-continuous',
                'system:log', // Ignore system log actions to prevent recursion
                'Action #' // Ignore generic numbered actions
            ]
            return !ignoredActions.some(ignored => action.includes(ignored))
        },
        formatter: (action, prevState, nextState, timestamp) => {
            // Simplified formatting to reduce console overhead
            if (action.includes('error') || action.includes('critical')) {
                console.error(`❌ Critical: ${action}`)
            }
        },
        ...options
    })
}

/**
 * Create production logging middleware with minimal logging
 */
export function createProdLoggingMiddleware(): LoggingMiddleware {
    return (f, options = {}) => loggingMiddleware(f, {
        enabled: true,
        logLevel: 'error',
        logActions: false,
        logStateChanges: false,
        logPerformance: false,
        filter: (action, state) => {
            // Only log errors and critical actions in production
            return action.includes('error') || action.includes('critical')
        },
        ...options
    })
}