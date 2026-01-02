#!/bin/bash

# Building Forge Linux Post-Remove Script

echo "تنظيف Building Forge بعد الإزالة..."

# إزالة الرابط الرمزي
if [ -L /usr/bin/building-forge ]; then
    rm -f /usr/bin/building-forge
    echo "تم حذف الرابط الرمزي من /usr/bin"
fi

# إزالة تسجيل أنواع الملفات
if [ -f /usr/share/mime/packages/building-forge.xml ]; then
    rm -f /usr/share/mime/packages/building-forge.xml
    echo "تم حذف تسجيل أنواع الملفات"
fi

if [ -f /usr/share/applications/building-forge-project.desktop ]; then
    rm -f /usr/share/applications/building-forge-project.desktop
    echo "تم حذف ملف desktop للمشاريع"
fi

# تحديث قواعد البيانات
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications
    echo "تم تحديث قاعدة بيانات التطبيقات"
fi

if command -v update-mime-database >/dev/null 2>&1; then
    update-mime-database /usr/share/mime
    echo "تم تحديث قاعدة بيانات MIME"
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor
    echo "تم تحديث ذاكرة التخزين المؤقت للأيقونات"
fi

# سؤال المستخدم عن حذف البيانات الشخصية
USER_HOME=$(eval echo ~$SUDO_USER)
BUILDING_FORGE_DIR="$USER_HOME/.building-forge"
PROJECTS_DIR="$USER_HOME/Building Forge Projects"

if [ -d "$BUILDING_FORGE_DIR" ] || [ -d "$PROJECTS_DIR" ]; then
    echo ""
    echo "تم العثور على بيانات شخصية لـ Building Forge:"
    [ -d "$BUILDING_FORGE_DIR" ] && echo "  - إعدادات التطبيق: $BUILDING_FORGE_DIR"
    [ -d "$PROJECTS_DIR" ] && echo "  - مجلد المشاريع: $PROJECTS_DIR"
    echo ""
    echo "هذه البيانات لم يتم حذفها تلقائياً للحفاظ على مشاريعك وإعداداتك."
    echo "إذا كنت تريد حذفها نهائياً، يمكنك تشغيل الأوامر التالية:"
    [ -d "$BUILDING_FORGE_DIR" ] && echo "  sudo rm -rf '$BUILDING_FORGE_DIR'"
    [ -d "$PROJECTS_DIR" ] && echo "  sudo rm -rf '$PROJECTS_DIR'"
    echo ""
fi

echo "تم إكمال تنظيف Building Forge"