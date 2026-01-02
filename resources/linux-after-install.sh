#!/bin/bash

# Building Forge Linux Post-Install Script

echo "تكوين Building Forge بعد التثبيت..."

# إنشاء مجلدات المستخدم
USER_HOME=$(eval echo ~$SUDO_USER)
BUILDING_FORGE_DIR="$USER_HOME/.building-forge"

if [ ! -d "$BUILDING_FORGE_DIR" ]; then
    mkdir -p "$BUILDING_FORGE_DIR"
    chown $SUDO_USER:$SUDO_USER "$BUILDING_FORGE_DIR"
    echo "تم إنشاء مجلد إعدادات المستخدم: $BUILDING_FORGE_DIR"
fi

# إنشاء مجلد المشاريع
PROJECTS_DIR="$USER_HOME/Building Forge Projects"
if [ ! -d "$PROJECTS_DIR" ]; then
    mkdir -p "$PROJECTS_DIR"
    chown $SUDO_USER:$SUDO_USER "$PROJECTS_DIR"
    echo "تم إنشاء مجلد المشاريع: $PROJECTS_DIR"
fi

# تحديث قاعدة بيانات التطبيقات
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications
    echo "تم تحديث قاعدة بيانات التطبيقات"
fi

# تحديث ذاكرة التخزين المؤقت للأيقونات
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor
    echo "تم تحديث ذاكرة التخزين المؤقت للأيقونات"
fi

# تسجيل أنواع الملفات
if command -v xdg-mime >/dev/null 2>&1; then
    # تسجيل نوع ملف .bforge
    cat > /usr/share/mime/packages/building-forge.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-building-forge">
    <comment>Building Forge Project</comment>
    <comment xml:lang="ar">مشروع Building Forge</comment>
    <glob pattern="*.bforge"/>
    <icon name="building-forge"/>
  </mime-type>
</mime-info>
EOF

    # تحديث قاعدة بيانات MIME
    update-mime-database /usr/share/mime
    
    # ربط نوع الملف بالتطبيق
    cat > /usr/share/applications/building-forge-project.desktop << EOF
[Desktop Entry]
Type=Application
Name=Building Forge Project
Name[ar]=مشروع Building Forge
Comment=Open Building Forge project files
Comment[ar]=فتح ملفات مشروع Building Forge
Icon=building-forge
Exec=building-forge %f
MimeType=application/x-building-forge;
NoDisplay=true
EOF
    
    echo "تم تسجيل أنواع الملفات"
fi

# إعداد الأذونات
chmod +x /opt/Building\ Forge/building-forge
chmod +x /usr/bin/building-forge

# إنشاء رابط رمزي في /usr/bin إذا لم يكن موجوداً
if [ ! -L /usr/bin/building-forge ]; then
    ln -sf "/opt/Building Forge/building-forge" /usr/bin/building-forge
    echo "تم إنشاء الرابط الرمزي في /usr/bin"
fi

# التحقق من المتطلبات
echo "التحقق من المتطلبات..."

# التحقق من OpenGL
if command -v glxinfo >/dev/null 2>&1; then
    if glxinfo | grep -q "direct rendering: Yes"; then
        echo "✓ دعم OpenGL متاح"
    else
        echo "⚠ تحذير: دعم OpenGL قد لا يكون متاحاً"
    fi
fi

# التحقق من مكتبات النظام المطلوبة
REQUIRED_LIBS=("libgtk-3.so.0" "libglib-2.0.so.0" "libx11.so.6" "libxss.so.1")
MISSING_LIBS=()

for lib in "${REQUIRED_LIBS[@]}"; do
    if ! ldconfig -p | grep -q "$lib"; then
        MISSING_LIBS+=("$lib")
    fi
done

if [ ${#MISSING_LIBS[@]} -eq 0 ]; then
    echo "✓ جميع المكتبات المطلوبة متاحة"
else
    echo "⚠ مكتبات مفقودة: ${MISSING_LIBS[*]}"
    echo "يرجى تثبيت الحزم المطلوبة باستخدام مدير الحزم الخاص بك"
fi

# إنشاء ملف معلومات النظام
cat > "$BUILDING_FORGE_DIR/system-info.txt" << EOF
Building Forge System Information
Generated: $(date)

OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown Linux")
Kernel: $(uname -r)
Architecture: $(uname -m)
Desktop Environment: ${XDG_CURRENT_DESKTOP:-Unknown}
OpenGL Vendor: $(glxinfo 2>/dev/null | grep "OpenGL vendor" | cut -d: -f2 | xargs || echo "Unknown")
OpenGL Renderer: $(glxinfo 2>/dev/null | grep "OpenGL renderer" | cut -d: -f2 | xargs || echo "Unknown")
OpenGL Version: $(glxinfo 2>/dev/null | grep "OpenGL version" | cut -d: -f2 | xargs || echo "Unknown")
EOF

chown $SUDO_USER:$SUDO_USER "$BUILDING_FORGE_DIR/system-info.txt"

echo "تم إكمال تكوين Building Forge بنجاح!"
echo "يمكنك الآن تشغيل Building Forge من قائمة التطبيقات أو بكتابة 'building-forge' في الطرفية"