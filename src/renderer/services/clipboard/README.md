# نظام النسخ واللصق المتقدم

# Advanced Copy & Paste System

نظام شامل لإدارة عمليات النسخ واللصق في Building Forge مع دعم تاريخ الحافظة والعمليات الذكية.

## الميزات الرئيسية

### 🔄 نسخ ولصق العناصر

- نسخ العناصر مع جميع خصائصها
- لصق مع إزاحة تلقائية لتجنب التداخل
- دعم النسخ المتعدد والمواد المرتبطة

### 📚 تاريخ الحافظة

- حفظ آخر 10 عمليات نسخ
- التنقل بين إدخالات التاريخ
- حذف إدخالات محددة من التاريخ

### 🎯 العمليات الذكية

- نسخ ذكي حسب السياق
- لصق ذكي مع تحديد الموقع
- دعم اللصق المتعدد مع مسافات محددة

### 💾 الحفظ المحلي

- حفظ تلقائي في localStorage
- تنظيف الإدخالات القديمة (أكثر من 24 ساعة)
- استعادة الحافظة عند إعادة تشغيل التطبيق

## الاستخدام

### الاستخدام الأساسي

```typescript
import { useClipboard } from '../hooks/useClipboard'

function MyComponent() {
    const {
        copy,
        paste,
        canPaste,
        hasContent,
        duplicate
    } = useClipboard()

    const handleCopy = async () => {
        try {
            await copy()
            console.log('تم النسخ بنجاح')
        } catch (error) {
            console.error('فشل في النسخ:', error)
        }
    }

    const handlePaste = async () => {
        try {
            const elementIds = await paste()
            console.log('تم اللصق:', elementIds)
        } catch (error) {
            console.error('فشل في اللصق:', error)
        }
    }

    return (
        <div>
            <button onClick={handleCopy}>نسخ</button>
            <button onClick={handlePaste} disabled={!canPaste}>
                لصق
            </button>
            <button onClick={duplicate}>تكرار</button>
        </div>
    )
}
```

### استخدام الخدمة مباشرة

```typescript
import { clipboardService } from '../services/ClipboardService'

// نسخ عناصر
const entryId = clipboardService.copyElements(elements, materials, {
  includeMaterials: true,
  offsetPosition: { x: 1, y: 0, z: 1 },
})

// لصق
const entry = clipboardService.paste({
  offsetPosition: { x: 5, y: 0, z: 5 },
})

// لصق متعدد
const entries = clipboardService.multiPaste(3, { x: 2, y: 0, z: 2 })
```

### مكونات الواجهة

```typescript
import { ClipboardToolbar } from '../components/ui/ClipboardToolbar'
import { ClipboardManagerDialog } from '../components/dialogs/ClipboardManagerDialog'

function MyApp() {
    return (
        <div>
            {/* شريط أدوات النسخ واللصق */}
            <ClipboardToolbar
                showLabels={true}
                context="viewport"
            />

            {/* مدير الحافظة */}
            <ClipboardManagerDialog
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
            />
        </div>
    )
}
```

## الاختصارات

| الاختصار       | الوظيفة               |
| -------------- | --------------------- |
| `Ctrl+C`       | نسخ العناصر المحددة   |
| `Ctrl+V`       | لصق من الحافظة        |
| `Ctrl+D`       | تكرار العناصر المحددة |
| `Ctrl+Shift+V` | فتح مدير الحافظة      |
| `Ctrl+Shift+C` | مسح الحافظة           |

## البنية

```
clipboard/
├── ClipboardService.ts          # الخدمة الرئيسية
├── clipboardSlice.ts           # إدارة الحالة
├── useClipboard.ts             # Hook مخصص
├── ClipboardToolbar.tsx        # شريط الأدوات
├── ClipboardManagerDialog.tsx  # مدير الحافظة
└── __tests__/                  # الاختبارات
    ├── ClipboardService.test.ts
    └── clipboard.property.test.ts
```

## واجهة برمجة التطبيقات

### ClipboardService

#### الطرق الرئيسية

- `copyElements(elements, materials?, options?)` - نسخ عناصر
- `copyMaterials(materials)` - نسخ مواد
- `paste(options?)` - لصق من الحافظة
- `multiPaste(count, spacing)` - لصق متعدد
- `smartCopy(elements, materials, context)` - نسخ ذكي
- `smartPaste(context, cursorPosition?)` - لصق ذكي

#### إدارة التاريخ

- `getHistory()` - الحصول على تاريخ الحافظة
- `navigateHistory(direction)` - التنقل في التاريخ
- `removeEntry(entryId)` - حذف إدخال
- `clear()` - مسح الحافظة

#### معلومات الحالة

- `hasContent()` - التحقق من وجود محتوى
- `getContentType()` - نوع المحتوى
- `getContentStats()` - إحصائيات المحتوى
- `getCurrentEntry()` - الإدخال الحالي

### خيارات النسخ واللصق

```typescript
interface ClipboardOptions {
  includeProperties?: boolean // تضمين الخصائص
  includeMaterials?: boolean // تضمين المواد
  preserveIds?: boolean // الحفاظ على المعرفات
  offsetPosition?: Vector3 // إزاحة الموقع
}
```

### أنواع البيانات

```typescript
interface ClipboardEntry {
  id: string
  type: 'elements' | 'materials' | 'mixed'
  timestamp: number
  data: {
    elements?: BuildingElement[]
    materials?: Material[]
    metadata?: {
      source: string
      description: string
      elementCount: number
      materialCount: number
    }
  }
}
```

## الاختبارات

### اختبارات الوحدة

```bash
npm test src/renderer/services/__tests__/ClipboardService.test.ts
```

### اختبارات الخصائص

```bash
npm test src/renderer/__tests__/properties/clipboard.property.test.ts
```

## الأداء

- **الذاكرة**: محدودة بـ 10 إدخالات كحد أقصى
- **التخزين**: تنظيف تلقائي للإدخالات القديمة
- **الأداء**: محسن للمشاريع الكبيرة (حتى 100 عنصر)

## الأمان

- **عزل البيانات**: نسخ عميقة لتجنب تعديل البيانات الأصلية
- **التحقق**: فحص صحة البيانات قبل العمليات
- **معالجة الأخطاء**: استعادة آمنة من الأخطاء

## التطوير المستقبلي

- [ ] دعم التصدير/الاستيراد للحافظة
- [ ] مزامنة الحافظة بين النوافذ المتعددة
- [ ] ضغط البيانات للمشاريع الكبيرة
- [ ] دعم العمليات المتقدمة (دمج، تقسيم)
- [ ] تكامل مع الحافظة السحابية

## المساهمة

عند إضافة ميزات جديدة:

1. أضف اختبارات وحدة شاملة
2. أضف اختبارات خصائص مع fast-check
3. حدث التوثيق والأمثلة
4. تأكد من الأداء والأمان
5. اتبع معايير TypeScript الصارمة

## الترخيص

جزء من مشروع Building Forge - MIT License
