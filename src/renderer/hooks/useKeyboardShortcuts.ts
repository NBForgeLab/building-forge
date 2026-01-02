/**
 * Hook لاستخدام نظام الاختصارات بسهولة في المكونات
 */

import { useCallback, useEffect } from 'react';
import { keyboardShortcutManager, ShortcutAction } from '../services/KeyboardShortcutManager';

export interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
}

export const useKeyboardShortcuts = (
    shortcuts: Omit<ShortcutAction, 'handler'>[],
    handlers: Record<string, () => void>,
    options: UseKeyboardShortcutsOptions = {}
) => {
    const { enabled = true } = options;

    // تسجيل الاختصارات
    useEffect(() => {
        if (!enabled) return;

        const actionsToRegister: ShortcutAction[] = shortcuts.map(shortcut => ({
            ...shortcut,
            handler: handlers[shortcut.id] || (() => { })
        }));

        // تسجيل جميع الاختصارات
        actionsToRegister.forEach(action => {
            keyboardShortcutManager.registerAction(action);
        });

        // تنظيف عند إلغاء التحميل
        return () => {
            // لا نحتاج لإلغاء التسجيل لأن الـ manager يدير ذلك
        };
    }, [shortcuts, handlers, enabled]);

    // تحديث معالجات الأحداث
    useEffect(() => {
        if (!enabled) return;

        shortcuts.forEach(shortcut => {
            const handler = handlers[shortcut.id];
            if (handler) {
                const action = keyboardShortcutManager['actions'].get(shortcut.id);
                if (action) {
                    action.handler = handler;
                }
            }
        });
    }, [handlers, shortcuts, enabled]);

    const registerShortcut = useCallback((action: ShortcutAction) => {
        keyboardShortcutManager.registerAction(action);
    }, []);

    const updateShortcut = useCallback((actionId: string, newKeys: string[]) => {
        return keyboardShortcutManager.updateBinding(actionId, newKeys);
    }, []);

    const toggleShortcut = useCallback((actionId: string, enabled: boolean) => {
        keyboardShortcutManager.toggleBinding(actionId, enabled);
    }, []);

    const resetShortcut = useCallback((actionId: string) => {
        return keyboardShortcutManager.resetToDefault(actionId);
    }, []);

    return {
        registerShortcut,
        updateShortcut,
        toggleShortcut,
        resetShortcut,
        manager: keyboardShortcutManager
    };
};

// Hook مبسط لاختصار واحد
export const useKeyboardShortcut = (
    shortcut: Omit<ShortcutAction, 'handler'>,
    handler: () => void,
    options: UseKeyboardShortcutsOptions = {}
) => {
    return useKeyboardShortcuts([shortcut], { [shortcut.id]: handler }, options);
};

// Hook للاختصارات العامة للتطبيق
export const useGlobalShortcuts = () => {
    const shortcuts = [
        {
            id: 'app.new-project',
            name: 'مشروع جديد',
            description: 'إنشاء مشروع جديد',
            category: 'ملف',
            defaultKeys: ['Ctrl', 'N']
        },
        {
            id: 'app.open-project',
            name: 'فتح مشروع',
            description: 'فتح مشروع موجود',
            category: 'ملف',
            defaultKeys: ['Ctrl', 'O']
        },
        {
            id: 'app.save-project',
            name: 'حفظ مشروع',
            description: 'حفظ المشروع الحالي',
            category: 'ملف',
            defaultKeys: ['Ctrl', 'S']
        },
        {
            id: 'app.save-as',
            name: 'حفظ باسم',
            description: 'حفظ المشروع باسم جديد',
            category: 'ملف',
            defaultKeys: ['Ctrl', 'Shift', 'S']
        },
        {
            id: 'app.export',
            name: 'تصدير',
            description: 'تصدير المشروع',
            category: 'ملف',
            defaultKeys: ['Ctrl', 'E']
        },
        {
            id: 'app.undo',
            name: 'تراجع',
            description: 'التراجع عن آخر عملية',
            category: 'تحرير',
            defaultKeys: ['Ctrl', 'Z']
        },
        {
            id: 'app.redo',
            name: 'إعادة',
            description: 'إعادة آخر عملية تم التراجع عنها',
            category: 'تحرير',
            defaultKeys: ['Ctrl', 'Y']
        },
        {
            id: 'app.copy',
            name: 'نسخ',
            description: 'نسخ العناصر المحددة',
            category: 'تحرير',
            defaultKeys: ['Ctrl', 'C']
        },
        {
            id: 'app.paste',
            name: 'لصق',
            description: 'لصق العناصر المنسوخة',
            category: 'تحرير',
            defaultKeys: ['Ctrl', 'V']
        },
        {
            id: 'app.delete',
            name: 'حذف',
            description: 'حذف العناصر المحددة',
            category: 'تحرير',
            defaultKeys: ['Delete']
        },
        {
            id: 'tool.select',
            name: 'أداة التحديد',
            description: 'تفعيل أداة التحديد',
            category: 'أدوات',
            defaultKeys: ['V']
        },
        {
            id: 'tool.wall',
            name: 'أداة الجدار',
            description: 'تفعيل أداة إنشاء الجدران',
            category: 'أدوات',
            defaultKeys: ['W']
        },
        {
            id: 'tool.floor',
            name: 'أداة الأرضية',
            description: 'تفعيل أداة إنشاء الأرضيات',
            category: 'أدوات',
            defaultKeys: ['F']
        },
        {
            id: 'tool.door',
            name: 'أداة الباب',
            description: 'تفعيل أداة إنشاء الأبواب',
            category: 'أدوات',
            defaultKeys: ['D']
        },
        {
            id: 'tool.window',
            name: 'أداة النافذة',
            description: 'تفعيل أداة إنشاء النوافذ',
            category: 'أدوات',
            defaultKeys: ['Shift', 'W']
        },
        {
            id: 'view.front',
            name: 'المنظور الأمامي',
            description: 'التبديل إلى المنظور الأمامي',
            category: 'عرض',
            defaultKeys: ['1']
        },
        {
            id: 'view.side',
            name: 'المنظور الجانبي',
            description: 'التبديل إلى المنظور الجانبي',
            category: 'عرض',
            defaultKeys: ['2']
        },
        {
            id: 'view.top',
            name: 'المنظور العلوي',
            description: 'التبديل إلى المنظور العلوي',
            category: 'عرض',
            defaultKeys: ['3']
        },
        {
            id: 'view.perspective',
            name: 'المنظور المنظوري',
            description: 'التبديل إلى المنظور المنظوري',
            category: 'عرض',
            defaultKeys: ['4']
        }
    ];

    const handlers = {
        'app.new-project': () => console.log('مشروع جديد'),
        'app.open-project': () => console.log('فتح مشروع'),
        'app.save-project': () => console.log('حفظ مشروع'),
        'app.save-as': () => console.log('حفظ باسم'),
        'app.export': () => console.log('تصدير'),
        'app.undo': () => console.log('تراجع'),
        'app.redo': () => console.log('إعادة'),
        'app.copy': () => console.log('نسخ'),
        'app.paste': () => console.log('لصق'),
        'app.delete': () => console.log('حذف'),
        'tool.select': () => console.log('أداة التحديد'),
        'tool.wall': () => console.log('أداة الجدار'),
        'tool.floor': () => console.log('أداة الأرضية'),
        'tool.door': () => console.log('أداة الباب'),
        'tool.window': () => console.log('أداة النافذة'),
        'view.front': () => console.log('المنظور الأمامي'),
        'view.side': () => console.log('المنظور الجانبي'),
        'view.top': () => console.log('المنظور العلوي'),
        'view.perspective': () => console.log('المنظور المنظوري')
    };

    return useKeyboardShortcuts(shortcuts, handlers);
};