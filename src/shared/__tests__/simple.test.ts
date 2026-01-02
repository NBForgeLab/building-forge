/**
 * اختبار بسيط للتحقق من أن النظام يعمل
 */

import { describe, expect, it } from 'vitest'
import { ElementType, ToolType } from '../types'

describe('Simple Tests', () => {
    it('should have ToolType enum', () => {
        expect(ToolType.SELECT).toBe('select')
        expect(ToolType.WALL).toBe('wall')
        expect(ToolType.FLOOR).toBe('floor')
    })

    it('should have ElementType enum', () => {
        expect(ElementType.WALL).toBe('wall')
        expect(ElementType.FLOOR).toBe('floor')
        expect(ElementType.DOOR).toBe('door')
    })

    it('should perform basic math', () => {
        expect(2 + 2).toBe(4)
        expect(Math.PI).toBeCloseTo(3.14159, 4)
    })

    it('should work with arrays', () => {
        const arr = [1, 2, 3]
        expect(arr.length).toBe(3)
        expect(arr[0]).toBe(1)
    })

    it('should work with objects', () => {
        const obj = { x: 1, y: 2, z: 3 }
        expect(obj.x).toBe(1)
        expect(obj.y).toBe(2)
        expect(obj.z).toBe(3)
    })
})