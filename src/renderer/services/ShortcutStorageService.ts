/**
 * خدمة حفظ واستعادة الاختصارات باستخدام electron-store
 */

import { ShortcutBinding } from './KeyboardShortcutManager';

export interface ShortcutStorageData {
    bindings: Record<string, ShortcutBinding>;
    version: string;
    lastModified: number;
}

export class ShortcutStorageService {
    private static readonly STORAGE_KEY = 'keyboard-shortcuts';
    private static readonly CURRENT_VERSION = '1.0.0';

    /**
     * حفظ الاختصارات
     */
    static async saveShortcuts(bindings: Map<string, ShortcutBinding>): Promise<void> {
        try {
            const data: ShortcutStorageData = {
                bindings: Object.fromEntries(bindings),
                version: this.CURRENT_VERSION,
                lastModified: Date.now()
            };

            // استخدام localStorage كبديل مؤقت
            // في التطبيق الحقيقي، سيتم استخدام electron-store
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

            // إشعار بالحفظ الناجح
            console.log('تم حفظ الاختصارات بنجاح');
        } catch (error) {
            console.error('فشل في حفظ الاختصارات:', error);
            throw new Error('فشل في حفظ الاختصارات');
        }
    }

    /**
     * تحميل الاختصارات
     */
    static async loadShortcuts(): Promise<Map<string, ShortcutBinding> | null> {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const data: ShortcutStorageData = JSON.parse(stored);

            // التحقق من إصدار البيانات
            if (data.version !== this.CURRENT_VERSION) {
                console.warn('إصدار بيانات الاختصارات غير متوافق، سيتم استخدام القيم الافتراضية');
                return null;
            }

            // تحويل البيانات إلى Map
            const bindings = new Map<string, ShortcutBinding>();
            for (const [actionId, binding] of Object.entries(data.bindings)) {
                bindings.set(actionId, binding);
            }

            console.log('تم تحميل الاختصارات بنجاح');
            return bindings;
        } catch (error) {
            console.error('فشل في تحميل الاختصارات:', error);
            return null;
        }
    }

    /**
     * حذف جميع الاختصارات المحفوظة
     */
    static async clearShortcuts(): Promise<void> {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('تم حذف الاختصارات المحفوظة');
        } catch (error) {
            console.error('فشل في حذف الاختصارات:', error);
            throw new Error('فشل في حذف الاختصارات');
        }
    }

    /**
     * التحقق من وجود اختصارات محفوظة
     */
    static hasStoredShortcuts(): boolean {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    }

    /**
     * الحصول على معلومات الاختصارات المحفوظة
     */
    static async getStorageInfo(): Promise<{
        hasData: boolean;
        version?: string;
        lastModified?: Date;
        bindingsCount?: number;
    }> {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                return { hasData: false };
            }

            const data: ShortcutStorageData = JSON.parse(stored);
            return {
                hasData: true,
                version: data.version,
                lastModified: new Date(data.lastModified),
                bindingsCount: Object.keys(data.bindings).length
            };
        } catch (error) {
            console.error('فشل في قراءة معلومات الاختصارات:', error);
            return { hasData: false };
        }
    }

    /**
     * تصدير الاختصارات إلى ملف JSON
     */
    static async exportShortcuts(bindings: Map<string, ShortcutBinding>): Promise<string> {
        const data: ShortcutStorageData = {
            bindings: Object.fromEntries(bindings),
            version: this.CURRENT_VERSION,
            lastModified: Date.now()
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * استيراد الاختصارات من ملف JSON
     */
    static async importShortcuts(jsonData: string): Promise<Map<string, ShortcutBinding>> {
        try {
            const data: ShortcutStorageData = JSON.parse(jsonData);

            // التحقق من صحة البيانات
            if (!data.bindings || typeof data.bindings !== 'object') {
                throw new Error('بيانات غير صالحة');
            }

            // تحويل البيانات إلى Map
            const bindings = new Map<string, ShortcutBinding>();
            for (const [actionId, binding] of Object.entries(data.bindings)) {
                // التحقق من صحة البيانات
                if (this.isValidBinding(binding)) {
                    bindings.set(actionId, binding);
                }
            }

            return bindings;
        } catch (error) {
            console.error('فشل في استيراد الاختصارات:', error);
            throw new Error('فشل في استيراد الاختصارات: بيانات غير صالحة');
        }
    }

    /**
     * التحقق من صحة بيانات الاختصار
     */
    private static isValidBinding(binding: any): binding is ShortcutBinding {
        return (
            binding &&
            typeof binding === 'object' &&
            typeof binding.actionId === 'string' &&
            Array.isArray(binding.keys) &&
            binding.keys.every((key: any) => typeof key === 'string') &&
            typeof binding.enabled === 'boolean'
        );
    }
}