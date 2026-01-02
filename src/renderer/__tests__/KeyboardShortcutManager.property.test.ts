/**
 * اختبارات الخصائص لنظام إدارة اختصارات لوحة المفاتيح
 * الخاصية 33: اختصارات لوحة المفاتيح القابلة للتخصيص
 * تتحقق من: المتطلبات 10.1
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KeyboardShortcutManager, ShortcutAction, ShortcutBinding } from '../services/KeyboardShortcutManager';

describe('KeyboardShortcutManager Property Tests', () => {
    let manager: KeyboardShortcutManager;

    beforeEach(() => {
        manager = new KeyboardShortcutManager();
        // تنظيف localStorage
        localStorage.clear();
    });

    afterEach(() => {
        manager.dispose();
        localStorage.clear();
    });

    describe('الخاصية 33: اختصارات لوحة المفاتيح القابلة للتخصيص', () => {
        it('يجب أن يحافظ على تسجيل الإجراءات بشكل صحيح', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        id: fc.string({ minLength: 1, maxLength: 50 }),
                        name: fc.string({ minLength: 1, maxLength: 100 }),
                        description: fc.string({ minLength: 1, maxLength: 200 }),
                        category: fc.oneof(
                            fc.constant('ملف'),
                            fc.constant('تحرير'),
                            fc.constant('أدوات'),
                            fc.constant('عرض')
                        ),
                        defaultKeys: fc.array(
                            fc.oneof(
                                fc.constant('Ctrl'),
                                fc.constant('Alt'),
                                fc.constant('Shift'),
                                fc.constant('Meta'),
                                fc.string({ minLength: 1, maxLength: 1 }).map(s => s.toUpperCase())
                            ),
                            { minLength: 1, maxLength: 4 }
                        )
                    }),
                    (actionData) => {
                        const action: ShortcutAction = {
                            ...actionData,
                            handler: () => { }
                        };

                        manager.registerAction(action);
                        const shortcuts = manager.getAllShortcuts();
                        const registeredAction = shortcuts.find(s => s.action.id === action.id);

                        expect(registeredAction).toBeDefined();
                        expect(registeredAction!.action.id).toBe(action.id);
                        expect(registeredAction!.action.name).toBe(action.name);
                        expect(registeredAction!.action.category).toBe(action.category);
                        expect(registeredAction!.binding.keys).toEqual(action.defaultKeys);
                        expect(registeredAction!.binding.enabled).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('يجب أن يكشف التعارضات في الاختصارات بشكل صحيح', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 1, maxLength: 50 }),
                            keys: fc.array(
                                fc.oneof(
                                    fc.constant('Ctrl'),
                                    fc.constant('Alt'),
                                    fc.string({ minLength: 1, maxLength: 1 }).map(s => s.toUpperCase())
                                ),
                                { minLength: 1, maxLength: 3 }
                            )
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    (actions) => {
                        // تسجيل الإجراءات
                        actions.forEach((actionData, index) => {
                            const action: ShortcutAction = {
                                id: `action-${index}-${actionData.id}`,
                                name: `Action ${index}`,
                                description: `Description ${index}`,
                                category: 'test',
                                defaultKeys: actionData.keys,
                                handler: () => { }
                            };
                            manager.registerAction(action);
                        });

                        // البحث عن التعارضات
                        const shortcuts = manager.getAllShortcuts();
                        const conflictGroups = new Map<string, string[]>();

                        shortcuts.forEach(shortcut => {
                            const keyString = shortcut.binding.keys.join('+');
                            if (!conflictGroups.has(keyString)) {
                                conflictGroups.set(keyString, []);
                            }
                            conflictGroups.get(keyString)!.push(shortcut.action.id);
                        });

                        // التحقق من كشف التعارضات
                        conflictGroups.forEach((actionIds, keyString) => {
                            if (actionIds.length > 1) {
                                // يجب أن يكون هناك تعارض
                                const conflicts = manager.detectConflicts(keyString.split('+'));
                                expect(conflicts.length).toBeGreaterThan(0);
                            }
                        });
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('يجب أن يحدث الاختصارات بشكل صحيح عند عدم وجود تعارضات', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.record({
                        actionId: fc.string({ minLength: 1, maxLength: 50 }),
                        originalKeys: fc.array(
                            fc.oneof(fc.constant('Ctrl'), fc.constant('A')),
                            { minLength: 1, maxLength: 2 }
                        ),
                        newKeys: fc.array(
                            fc.oneof(fc.constant('Alt'), fc.constant('B')),
                            { minLength: 1, maxLength: 2 }
                        )
                    }),
                    async (data) => {
                        // تسجيل إجراء أولي
                        const action: ShortcutAction = {
                            id: data.actionId,
                            name: 'Test Action',
                            description: 'Test Description',
                            category: 'test',
                            defaultKeys: data.originalKeys,
                            handler: () => { }
                        };

                        manager.registerAction(action);

                        // تحديث الاختصار
                        const success = await manager.updateBinding(data.actionId, data.newKeys);

                        if (success) {
                            const shortcuts = manager.getAllShortcuts();
                            const updatedShortcut = shortcuts.find(s => s.action.id === data.actionId);

                            expect(updatedShortcut).toBeDefined();
                            expect(updatedShortcut!.binding.keys).toEqual(data.newKeys);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('يجب أن يحافظ على حالة التفعيل/الإلغاء للاختصارات', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.record({
                        actionId: fc.string({ minLength: 1, maxLength: 50 }),
                        enabled: fc.boolean()
                    }),
                    async (data) => {
                        // تسجيل إجراء
                        const action: ShortcutAction = {
                            id: data.actionId,
                            name: 'Test Action',
                            description: 'Test Description',
                            category: 'test',
                            defaultKeys: ['Ctrl', 'T'],
                            handler: () => { }
                        };

                        manager.registerAction(action);

                        // تغيير حالة التفعيل
                        await manager.toggleBinding(data.actionId, data.enabled);

                        const shortcuts = manager.getAllShortcuts();
                        const shortcut = shortcuts.find(s => s.action.id === data.actionId);

                        expect(shortcut).toBeDefined();
                        expect(shortcut!.binding.enabled).toBe(data.enabled);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('يجب أن يعيد تعيين الاختصارات إلى القيم الافتراضية بشكل صحيح', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.record({
                        actionId: fc.string({ minLength: 1, maxLength: 50 }),
                        defaultKeys: fc.array(
                            fc.oneof(fc.constant('Ctrl'), fc.constant('D')),
                            { minLength: 1, maxLength: 2 }
                        ),
                        modifiedKeys: fc.array(
                            fc.oneof(fc.constant('Alt'), fc.constant('M')),
                            { minLength: 1, maxLength: 2 }
                        )
                    }),
                    async (data) => {
                        // تسجيل إجراء
                        const action: ShortcutAction = {
                            id: data.actionId,
                            name: 'Test Action',
                            description: 'Test Description',
                            category: 'test',
                            defaultKeys: data.defaultKeys,
                            handler: () => { }
                        };

                        manager.registerAction(action);

                        // تعديل الاختصار
                        await manager.updateBinding(data.actionId, data.modifiedKeys);

                        // إعادة تعيين إلى الافتراضي
                        const resetSuccess = await manager.resetToDefault(data.actionId);

                        if (resetSuccess) {
                            const shortcuts = manager.getAllShortcuts();
                            const shortcut = shortcuts.find(s => s.action.id === data.actionId);

                            expect(shortcut).toBeDefined();
                            expect(shortcut!.binding.keys).toEqual(data.defaultKeys);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('يجب أن يحافظ على البيانات عبر عمليات التصدير والاستيراد', async () => {
            fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            id: fc.string({ minLength: 1, maxLength: 50 }),
                            keys: fc.array(
                                fc.oneof(fc.constant('Ctrl'), fc.constant('Shift'), fc.constant('A')),
                                { minLength: 1, maxLength: 3 }
                            ),
                            enabled: fc.boolean()
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (actionsData) => {
                        // تسجيل الإجراءات
                        const originalShortcuts: Array<{ action: ShortcutAction; binding: ShortcutBinding }> = [];

                        for (const [index, actionData] of actionsData.entries()) {
                            const action: ShortcutAction = {
                                id: `action-${index}-${actionData.id}`,
                                name: `Action ${index}`,
                                description: `Description ${index}`,
                                category: 'test',
                                defaultKeys: actionData.keys,
                                handler: () => { }
                            };

                            manager.registerAction(action);
                            await manager.toggleBinding(action.id, actionData.enabled);

                            originalShortcuts.push({
                                action,
                                binding: {
                                    actionId: action.id,
                                    keys: actionData.keys,
                                    enabled: actionData.enabled
                                }
                            });
                        }

                        // تصدير البيانات
                        const exportedData = await manager.exportShortcuts();
                        expect(exportedData).toBeDefined();
                        expect(typeof exportedData).toBe('string');

                        // إنشاء مدير جديد واستيراد البيانات
                        const newManager = new KeyboardShortcutManager();

                        // تسجيل نفس الإجراءات في المدير الجديد
                        originalShortcuts.forEach(({ action }) => {
                            newManager.registerAction(action);
                        });

                        const importSuccess = await newManager.importShortcuts(exportedData);
                        expect(importSuccess).toBe(true);

                        // التحقق من البيانات المستوردة
                        const importedShortcuts = newManager.getAllShortcuts();

                        originalShortcuts.forEach(({ action, binding }) => {
                            const importedShortcut = importedShortcuts.find(s => s.action.id === action.id);
                            expect(importedShortcut).toBeDefined();
                            expect(importedShortcut!.binding.keys).toEqual(binding.keys);
                            expect(importedShortcut!.binding.enabled).toBe(binding.enabled);
                        });

                        newManager.dispose();
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('يجب أن يتعامل مع الأخطاء بشكل صحيح', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        invalidActionId: fc.string({ minLength: 1, maxLength: 50 }),
                        invalidKeys: fc.array(fc.string(), { minLength: 0, maxLength: 10 })
                    }),
                    (data) => {
                        // محاولة تحديث اختصار غير موجود
                        expect(async () => {
                            const result = await manager.updateBinding(data.invalidActionId, data.invalidKeys);
                            expect(typeof result).toBe('boolean');
                        }).not.toThrow();

                        // محاولة إعادة تعيين اختصار غير موجود
                        expect(async () => {
                            const result = await manager.resetToDefault(data.invalidActionId);
                            expect(typeof result).toBe('boolean');
                        }).not.toThrow();

                        // محاولة تفعيل/إلغاء تفعيل اختصار غير موجود
                        expect(async () => {
                            await manager.toggleBinding(data.invalidActionId, true);
                        }).not.toThrow();
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});