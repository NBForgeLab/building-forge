# Building Forge Windows Installer Script (NSIS)

# Custom installer pages and functions

# Variables
Var StartMenuFolder

# Modern UI Configuration
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

# Welcome page
!define MUI_WELCOMEPAGE_TITLE "مرحباً بك في Building Forge"
!define MUI_WELCOMEPAGE_TEXT "سيقوم هذا المعالج بتثبيت Building Forge على جهازك.$\r$\n$\r$\nBuilding Forge هو تطبيق متقدم لتصميم المباني ثلاثية الأبعاد المحسنة للألعاب.$\r$\n$\r$\nيُنصح بإغلاق جميع التطبيقات الأخرى قبل المتابعة."

# License page
!define MUI_LICENSEPAGE_TEXT_TOP "يرجى مراجعة اتفاقية الترخيص قبل تثبيت Building Forge."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "إذا كنت توافق على شروط الاتفاقية، انقر على 'أوافق' للمتابعة. يجب أن توافق على الاتفاقية لتثبيت Building Forge."
!define MUI_LICENSEPAGE_BUTTON "أوافق"

# Directory page
!define MUI_DIRECTORYPAGE_TEXT_TOP "سيتم تثبيت Building Forge في المجلد التالي.$\r$\n$\r$\nلتثبيت في مجلد مختلف، انقر على 'تصفح' واختر مجلد آخر."

# Start Menu page
!define MUI_STARTMENUPAGE_TEXT_TOP "اختر مجلد قائمة ابدأ لإنشاء اختصارات البرنامج."
!define MUI_STARTMENUPAGE_DEFAULTFOLDER "Building Forge"

# Finish page
!define MUI_FINISHPAGE_TITLE "تم إكمال تثبيت Building Forge"
!define MUI_FINISHPAGE_TEXT "تم تثبيت Building Forge بنجاح على جهازك.$\r$\n$\r$\nانقر على 'إنهاء' لإغلاق هذا المعالج."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Building Forge.exe"
!define MUI_FINISHPAGE_RUN_TEXT "تشغيل Building Forge"
!define MUI_FINISHPAGE_LINK "زيارة موقع Building Forge"
!define MUI_FINISHPAGE_LINK_LOCATION "https://building-forge.com"

# Custom functions
Function .onInit
  # Check if application is already running
  System::Call 'kernel32::CreateMutexA(i 0, i 0, t "BuildingForgeMutex") i .r1 ?e'
  Pop $R0
  StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "Building Forge قيد التشغيل حالياً. يرجى إغلاقه قبل المتابعة."
    Abort
    
  # Check Windows version
  ${IfNot} ${AtLeastWin7}
    MessageBox MB_OK|MB_ICONSTOP "Building Forge يتطلب Windows 7 أو أحدث."
    Abort
  ${EndIf}
  
  # Check if .NET Framework is installed
  ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\" "Release"
  IntCmp $R0 461808 +3 0 +3 # .NET 4.7.2 or later
    MessageBox MB_YESNO|MB_ICONQUESTION "Building Forge يتطلب .NET Framework 4.7.2 أو أحدث.$\r$\nهل تريد تحميله الآن؟" IDYES +2
    Abort
    ExecShell "open" "https://dotnet.microsoft.com/download/dotnet-framework"
    Abort
FunctionEnd

Function .onInstSuccess
  # Create desktop shortcut if requested
  ${If} $mui.FinishPage.ShowReadme == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\Building Forge.lnk" "$INSTDIR\Building Forge.exe"
  ${EndIf}
  
  # Register file associations
  WriteRegStr HKCR ".bforge" "" "BuildingForge.Project"
  WriteRegStr HKCR "BuildingForge.Project" "" "Building Forge Project"
  WriteRegStr HKCR "BuildingForge.Project\DefaultIcon" "" "$INSTDIR\Building Forge.exe,0"
  WriteRegStr HKCR "BuildingForge.Project\shell\open\command" "" '"$INSTDIR\Building Forge.exe" "%1"'
  
  # Register application
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Building Forge.exe" "" "$INSTDIR\Building Forge.exe"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Building Forge.exe" "Path" "$INSTDIR"
  
  # Add to Programs and Features
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "DisplayName" "Building Forge"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "Publisher" "Building Forge Team"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "DisplayIcon" "$INSTDIR\Building Forge.exe"
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "NoModify" 1
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge" "NoRepair" 1
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "هل أنت متأكد من أنك تريد إلغاء تثبيت Building Forge؟" IDYES +2
  Abort
FunctionEnd

Function un.onUninstSuccess
  # Remove file associations
  DeleteRegKey HKCR ".bforge"
  DeleteRegKey HKCR "BuildingForge.Project"
  
  # Remove application registration
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Building Forge.exe"
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Building Forge"
  
  # Remove desktop shortcut
  Delete "$DESKTOP\Building Forge.lnk"
  
  MessageBox MB_OK "تم إلغاء تثبيت Building Forge بنجاح."
FunctionEnd

# Custom pages
!macro CUSTOM_PAGE_COMPONENTS
  !insertmacro MUI_PAGE_COMPONENTS
!macroend

# Component descriptions
LangString DESC_SecMain ${LANG_ENGLISH} "الملفات الأساسية لـ Building Forge"
LangString DESC_SecDesktop ${LANG_ENGLISH} "إنشاء اختصار على سطح المكتب"
LangString DESC_SecStartMenu ${LANG_ENGLISH} "إضافة Building Forge إلى قائمة ابدأ"

# Sections
Section "Building Forge (مطلوب)" SecMain
  SectionIn RO
  
  # Install main files
  SetOutPath "$INSTDIR"
  File /r "${BUILD_RESOURCES_DIR}\*.*"
  
  # Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "اختصار سطح المكتب" SecDesktop
  CreateShortCut "$DESKTOP\Building Forge.lnk" "$INSTDIR\Building Forge.exe"
SectionEnd

Section "قائمة ابدأ" SecStartMenu
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\Building Forge.lnk" "$INSTDIR\Building Forge.exe"
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\إلغاء التثبيت.lnk" "$INSTDIR\Uninstall.exe"
  !insertmacro MUI_STARTMENU_WRITE_END
SectionEnd

# Uninstaller sections
Section "Uninstall"
  # Remove files
  RMDir /r "$INSTDIR"
  
  # Remove start menu entries
  !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder
  Delete "$SMPROGRAMS\$StartMenuFolder\Building Forge.lnk"
  Delete "$SMPROGRAMS\$StartMenuFolder\إلغاء التثبيت.lnk"
  RMDir "$SMPROGRAMS\$StartMenuFolder"
SectionEnd

# Component descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} $(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu} $(DESC_SecStartMenu)
!insertmacro MUI_FUNCTION_DESCRIPTION_END