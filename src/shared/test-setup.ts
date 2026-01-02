import '@testing-library/jest-dom'
import * as fc from 'fast-check'
import { afterEach, beforeAll } from 'vitest'

// إعداد fast-check للاختبارات الخاصية
fc.configureGlobal({
  numRuns: 10, // تقليل العدد للاختبار السريع
  verbose: false,
  seed: 42, // بذرة ثابتة للنتائج القابلة للتكرار
  endOnFailure: true
})

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => { },
  }),
})

// تنظيف بعد كل اختبار
afterEach(() => {
  // تنظيف عام
})

// إعداد متغيرات البيئة للاختبار
beforeAll(() => {
  // محاكاة بيئة Electron
  global.__IS_ELECTRON__ = true
})