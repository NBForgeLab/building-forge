/**
 * نظام إدارة اختصارات لوحة المفاتيح القابلة للتخصيص - الإصدار المحدث
 * يدعم تخصيص الاختصارات، كشف التعارضات، والحفظ في electron-store
 */

import { ShortcutStorageService } from './ShortcutStorageService';

export interface ShortcutAction {
    id: string;
    name: string;
    description: string;
    category: string;
    defaultKeys: string[];
    handler: () => void;
}

export interface ShortcutBinding {
    actionId: string;
    keys: string[];
    enabled: boolean;
}

export interface ShortcutConflict {
    keys: string[];
    conflictingActions: string[];
}

export class KeyboardShortcutManager {
    private actions = new Map<string, ShortcutAction>();
    private bindings = new Map<string, ShortcutBinding>();
    private keyListeners = new Map<string, (event: KeyboardEvent) => void>();
    private isEnabled = true;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    /**
     * تهيئة النظام
     */
    private async initialize(): Promise<void> {
        this.setupDefaultActions();
        await this.loadBindings();
        this.attachGlobalListeners();
        this.isInitialized = true;
    }

    /**
     * التحقق من التهيئة
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error('KeyboardShortcutManager لم يتم تهيئته بعد');
        }
    }

    /**
     * تسجيل إجراء جديد قابل للاختصار
     */
    registerAction(action: ShortcutAction): void {
        this.actions.set(action.id, action);

        // إنشاء binding افتراضي إذا لم يكن موجوداً
        if (!this.bindings.has(action.id)) {
            this.bindings.set(action.id, {
                actionId: action.id,
                keys: action.defaultKeys,
                enabled: true
            });
        }
    }

    /**
     * تحديث اختصار لإجراء معين
     */
    async updateBinding(actionId: string, newKeys: string[]): Promise<boolean> {
        const conflicts = this.detectConflicts(newKeys, actionId);
        if (conflicts.length > 0) {
            return false; // يوجد تعارض
        }

        const binding = this.bindings.get(actionId);
        if (binding) {
            // إزالة المستمعات القديمة
            this.removeKeyListeners(binding.keys);

            // تحديث الاختصار
            binding.keys = newKeys;
            this.bindings.set(actionId, binding);

            // إضافة المستمعات الجديدة
            this.addKeyListeners(newKeys, actionId);

            // حفظ التغييرات
            await this.saveBindings();
            return true;
        }
        return false;
    }

    /**
     * كشف التعارضات في الاختصارات
     */
    detectConflicts(keys: string[], excludeActionId?: string): ShortcutConflict[] {
        const conflicts: ShortcutConflict[] = [];
        const keyString = keys.join('+');

        for (const [actionId, binding] of this.bindings) {
            if (actionId === excludeActionId || !binding.enabled) continue;

            const bindingKeyString = binding.keys.join('+');
            if (bindingKeyString === keyString) {
                conflicts.push({
                    keys,
                    conflictingActions: [actionId, excludeActionId || ''].filter(Boolean)
                });
            }
        }

        return conflicts;
    }

    /**
     * الحصول على جميع الاختصارات المتاحة
     */
    getAllShortcuts(): Array<{
        action: ShortcutAction;
        binding: ShortcutBinding;
        conflicts: ShortcutConflict[];
    }> {
        const shortcuts: Array<{
            action: ShortcutAction;
            binding: ShortcutBinding;
            conflicts: ShortcutConflict[];
        }> = [];

        for (const [actionId, action] of this.actions) {
            const binding = this.bindings.get(actionId);
            if (binding) {
                const conflicts = this.detectConflicts(binding.keys, actionId);
                shortcuts.push({ action, binding, conflicts });
            }
        }

        return shortcuts;
    }

    /**
     * تفعيل أو إلغاء تفعيل اختصار
     */
    async toggleBinding(actionId: string, enabled: boolean): Promise<void> {
        const binding = this.bindings.get(actionId);
        if (binding) {
            binding.enabled = enabled;

            if (enabled) {
                this.addKeyListeners(binding.keys, actionId);
            } else {
                this.removeKeyListeners(binding.keys);
            }

            await this.saveBindings();
        }
    }

    /**
     * إعادة تعيين اختصار إلى القيم الافتراضية
     */
    async resetToDefault(actionId: string): Promise<boolean> {
        const action = this.actions.get(actionId);
        if (action) {
            return await this.updateBinding(actionId, action.defaultKeys);
        }
        return false;
    }

    /**
     * إعادة تعيين جميع الاختصارات إلى القيم الافتراضية
     */
    async resetAllToDefaults(): Promise<void> {
        for (const [actionId, action] of this.actions) {
            const binding = this.bindings.get(actionId);
            if (binding) {
                this.removeKeyListeners(binding.keys);
                binding.keys = [...action.defaultKeys];
                binding.enabled = true;
                this.addKeyListeners(binding.keys, actionId);
            }
        }
        await this.saveBindings();
    }

    /**
     * تفعيل أو إلغاء تفعيل النظام بالكامل
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * تصدير الاختصارات
     */
    async exportShortcuts(): Promise<string> {
        return await ShortcutStorageService.exportShortcuts(this.bindings);
    }

    /**
     * استيراد الاختصارات
     */
    async importShortcuts(jsonData: string): Promise<boolean> {
        try {
            const importedBindings = await ShortcutStorageService.importShortcuts(jsonData);

            // إزالة المستمعات القديمة
            for (const binding of this.bindings.values()) {
                this.removeKeyListeners(binding.keys);
            }

            // تطبيق الاختصارات المستوردة
            this.bindings = importedBindings;

            // إضافة المستمعات الجديدة
            for (const [actionId, binding] of this.bindings) {
                if (binding.enabled) {
                    this.addKeyListeners(binding.keys, actionId);
                }
            }

            await this.saveBindings();
            return true;
        } catch (error) {
            console.error('فشل في استيراد الاختصارات:', error);
            return false;
        }
    }

    /**
     * إعداد الإجراءات الافتراضية
     */
    private setupDefaultActions(): void {
        // سيتم تعبئة هذه من خلال التطبيق
    }

    /**
     * تحميل الاختصارات المحفوظة
     */
    private async loadBindings(): Promise<void> {
        try {
            const savedBindings = await ShortcutStorageService.loadShortcuts();
            if (savedBindings) {
                this.bindings = savedBindings;
                console.log('تم تحميل الاختصارات المحفوظة');
            }
        } catch (error) {
            console.warn('فشل في تحميل الاختصارات المحفوظة:', error);
        }
    }

    /**
     * حفظ الاختصارات
     */
    private async saveBindings(): Promise<void> {
        try {
            await ShortcutStorageService.saveShortcuts(this.bindings);
        } catch (error) {
            console.error('فشل في حفظ الاختصارات:', error);
        }
    }

    /**
     * ربط المستمعات العامة
     */
    private attachGlobalListeners(): void {
        document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
    }

    /**
     * معالجة الضغط على المفاتيح
     */
    private handleGlobalKeyDown(event: KeyboardEvent): void {
        if (!this.isEnabled) return;

        const keys = this.getKeysFromEvent(event);
        const keyString = keys.join('+');

        for (const [actionId, binding] of this.bindings) {
            if (!binding.enabled) continue;

            const bindingKeyString = binding.keys.join('+');
            if (bindingKeyString === keyString) {
                const action = this.actions.get(actionId);
                if (action) {
                    event.preventDefault();
                    event.stopPropagation();
                    action.handler();
                    break;
                }
            }
        }
    }

    /**
     * استخراج المفاتيح من حدث لوحة المفاتيح
     */
    private getKeysFromEvent(event: KeyboardEvent): string[] {
        const keys: string[] = [];

        if (event.ctrlKey) keys.push('Ctrl');
        if (event.altKey) keys.push('Alt');
        if (event.shiftKey) keys.push('Shift');
        if (event.metaKey) keys.push('Meta');

        // إضافة المفتاح الأساسي
        if (event.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
            keys.push(event.key.toUpperCase());
        }

        return keys;
    }

    /**
     * إضافة مستمعات للمفاتيح
     */
    private addKeyListeners(keys: string[], actionId: string): void {
        const keyString = keys.join('+');
        const listener = (event: KeyboardEvent) => {
            const eventKeys = this.getKeysFromEvent(event);
            const eventKeyString = eventKeys.join('+');

            if (eventKeyString === keyString) {
                const action = this.actions.get(actionId);
                if (action && this.isEnabled) {
                    event.preventDefault();
                    action.handler();
                }
            }
        };

        this.keyListeners.set(keyString, listener);
    }

    /**
     * إزالة مستمعات المفاتيح
     */
    private removeKeyListeners(keys: string[]): void {
        const keyString = keys.join('+');
        this.keyListeners.delete(keyString);
    }

    /**
     * تنظيف الموارد
     */
    dispose(): void {
        document.removeEventListener('keydown', this.handleGlobalKeyDown.bind(this));
        this.keyListeners.clear();
        this.actions.clear();
        this.bindings.clear();
    }
}

// مثيل مفرد للاستخدام في التطبيق
export const keyboardShortcutManager = new KeyboardShortcutManager();