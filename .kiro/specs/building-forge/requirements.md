# متطلبات Building Forge

## مقدمة

Building Forge هي أداة تصميم معماري ثلاثي الأبعاد مخصصة لإنشاء مباني قابلة للاستخدام في ألعاب الفيديو. تتيح الأداة بناء الجدران والأرضيات وإضافة الأبواب والنوافذ مع إمكانية التصدير بصيغ متوافقة مع محركات الألعاب الحديثة.

## المصطلحات

- **Building_Forge**: النظام الرئيسي لأداة تصميم المباني
- **Viewport**: العارض ثلاثي الأبعاد المركزي
- **Building_Element**: أي عنصر في المبنى (جدار، أرضية، باب، نافذة)
- **Tool**: أداة تفاعلية لإنشاء أو تعديل العناصر
- **Material**: خصائص المظهر والنسيج للعناصر
- **BForge_Project**: ملف المشروع بصيغة .bforge الأصلية
- **Game_Export**: تصدير محسن لمحركات الألعاب
- **PBR_Material**: مادة فيزيائية الأساس للعرض الواقعي
- **Transform**: موقع وتدوير وحجم العنصر في الفضاء ثلاثي الأبعاد

## المتطلبات

### المتطلب 1: واجهة المستخدم الأساسية

**قصة المستخدم:** كمصمم مباني، أريد واجهة مستخدم واضحة ومنظمة، حتى أتمكن من الوصول لجميع الأدوات والميزات بسهولة.

#### معايير القبول

1. THE Building_Forge SHALL display a central 3D viewport occupying the majority of the screen
2. THE Building_Forge SHALL provide a right sidebar containing tool controls and properties panels
3. THE Building_Forge SHALL include a top toolbar with main tools and menu options
4. THE Building_Forge SHALL show a bottom status bar with project information and coordinates
5. WHEN the interface loads, THE Building_Forge SHALL display all UI components in their default positions

### المتطلب 2: أدوات البناء الأساسية

**قصة المستخدم:** كمصمم مباني، أريد أدوات لإنشاء العناصر الأساسية للمبنى، حتى أتمكن من بناء هياكل معمارية متكاملة.

#### معايير القبول

1. WHEN a user selects the wall tool, THE Building_Forge SHALL enable wall creation by click and drag
2. WHEN creating a wall, THE Building_Forge SHALL allow specification of thickness and height parameters
3. WHEN a user selects the floor tool, THE Building_Forge SHALL enable floor creation with support for complex shapes
4. WHEN a user selects the door tool, THE Building_Forge SHALL allow placement of doors with customizable dimensions
5. WHEN a user selects the window tool, THE Building_Forge SHALL allow placement of windows with various sizes
6. THE Building_Forge SHALL provide a cutting tool for creating precise openings in walls

### المتطلب 3: أدوات التحديد والتعديل

**قصة المستخدم:** كمصمم مباني، أريد تحديد وتعديل العناصر الموجودة، حتى أتمكن من تطوير وتحسين التصميم.

#### معايير القبول

1. WHEN a user clicks on an element, THE Building_Forge SHALL select that element and highlight it visually
2. WHEN an element is selected, THE Building_Forge SHALL display its properties in the properties panel
3. WHEN a user uses the move tool, THE Building_Forge SHALL allow precise movement of selected elements along axes
4. WHEN a user uses the rotate tool, THE Building_Forge SHALL allow rotation of selected elements at specified angles
5. WHEN a user uses the scale tool, THE Building_Forge SHALL allow resizing of selected elements while maintaining proportions
6. THE Building_Forge SHALL support multi-selection of elements for batch operations

### المتطلب 4: نظام المواد والنسيج

**قصة المستخدم:** كمصمم مباني، أريد تطبيق مواد ونسيج واقعية على العناصر، حتى أحصل على معاينة دقيقة للنتيجة النهائية.

#### معايير القبول

1. THE Building_Forge SHALL provide a materials library optimized for game engines
2. WHEN a user selects a material, THE Building_Forge SHALL display real-time preview on selected elements
3. THE Building_Forge SHALL support PBR materials with Albedo, Normal, Roughness, and Metallic properties
4. WHEN applying materials, THE Building_Forge SHALL manage UV mapping automatically for proper texture alignment
5. THE Building_Forge SHALL allow custom material creation and modification
6. THE Building_Forge SHALL save material settings with the project for consistency

### المتطلب 5: أدوات القياس والدقة

**قصة المستخدم:** كمصمم مباني، أريد أدوات قياس دقيقة متوافقة مع محركات الألعاب، حتى أضمن الأبعاد الصحيحة للاستخدام في الألعاب.

#### معايير القبول

1. THE Building_Forge SHALL support measurement units compatible with game engines (Unity Units, Unreal Units)
2. WHEN measuring distances, THE Building_Forge SHALL provide a ruler tool with precise measurements
3. THE Building_Forge SHALL display dimensions automatically with visual guides
4. THE Building_Forge SHALL calculate areas and volumes for performance optimization
5. THE Building_Forge SHALL provide snap-to-grid functionality for precise alignment
6. WHEN working with elements, THE Building_Forge SHALL show real-time coordinate information

### المتطلب 6: عرض وتصور متقدم

**قصة المستخدم:** كمصمم مباني، أريد خيارات عرض متنوعة، حتى أتمكن من فحص التصميم من زوايا مختلفة وبطرق متنوعة.

#### معايير القبول

1. THE Building_Forge SHALL support multiple view perspectives (front, side, top, perspective)
2. THE Building_Forge SHALL provide dynamic lighting for realistic final result preview
3. WHEN switching view modes, THE Building_Forge SHALL toggle between wireframe and solid rendering
4. THE Building_Forge SHALL implement camera controls for smooth navigation in 3D space
5. THE Building_Forge SHALL provide zoom and pan functionality with smooth transitions
6. WHEN rendering the scene, THE Building_Forge SHALL maintain consistent performance across different view modes

### المتطلب 7: نظام المشاريع BForge

**قصة المستخدم:** كمصمم مباني، أريد حفظ واستيراد مشاريعي بصيغة أصلية، حتى أتمكن من العودة للتعديل لاحقاً.

#### معايير القبول

1. WHEN saving a project, THE Building_Forge SHALL create a .bforge file containing all project data
2. THE Building_Forge SHALL include complete building elements with their properties in the project file
3. THE Building_Forge SHALL save materials and textures used in the project
4. THE Building_Forge SHALL preserve tool settings and view configurations
5. WHEN loading a .bforge file, THE Building_Forge SHALL restore the complete project state
6. THE Building_Forge SHALL support project compression to reduce file size
7. THE Building_Forge SHALL maintain project metadata including author, creation date, and version

### المتطلب 8: تصدير للألعاب

**قصة المستخدم:** كمطور ألعاب، أريد تصدير المباني بصيغ محسنة للألعاب، حتى أتمكن من استخدامها مباشرة في محرك الألعاب.

#### معايير القبول

1. THE Building_Forge SHALL export models in GLB format optimized for modern game engines
2. THE Building_Forge SHALL export models in OBJ format for compatibility with legacy tools
3. WHEN exporting for games, THE Building_Forge SHALL provide quality level options (high, medium, low)
4. THE Building_Forge SHALL compress textures according to specified resolution (256x256, 512x512, 1024x1024, 2048x2048)
5. THE Building_Forge SHALL optimize polygon count for game performance
6. THE Building_Forge SHALL generate collision meshes for physics simulation
7. WHEN exporting, THE Building_Forge SHALL embed PBR materials with proper game engine compatibility

### المتطلب 9: تحسين الأداء

**قصة المستخدم:** كمصمم مباني، أريد أداءً سلساً أثناء العمل، حتى أتمكن من التركيز على التصميم دون انقطاع.

#### معايير القبول

1. THE Building_Forge SHALL implement occlusion culling to hide non-visible elements
2. THE Building_Forge SHALL use texture atlasing to reduce draw calls
3. THE Building_Forge SHALL optimize mesh geometry for better rendering performance
4. WHEN the scene becomes complex, THE Building_Forge SHALL maintain responsive user interaction
5. THE Building_Forge SHALL implement level-of-detail (LOD) for distant objects
6. THE Building_Forge SHALL provide performance metrics and optimization suggestions

### المتطلب 10: تجربة المستخدم المحسنة

**قصة المستخدم:** كمصمم مباني، أريد تجربة مستخدم سهلة ومريحة، حتى أتمكن من العمل بكفاءة عالية.

#### معايير القبول

1. THE Building_Forge SHALL provide customizable keyboard shortcuts for all tools
2. THE Building_Forge SHALL display interactive tooltips for user guidance
3. THE Building_Forge SHALL implement multi-level undo/redo system
4. WHEN working with elements, THE Building_Forge SHALL support drag and drop with snap-to-grid
5. THE Building_Forge SHALL enable copy and paste of elements with their properties
6. THE Building_Forge SHALL provide auto-save functionality to prevent data loss
7. THE Building_Forge SHALL support template rooms for common architectural patterns

### المتطلب 11: التحقق من صحة البيانات

**قصة المستخدم:** كمصمم مباني، أريد التأكد من صحة التصميم، حتى أتجنب المشاكل عند الاستخدام في الألعاب.

#### معايير القبول

1. WHEN creating elements, THE Building_Forge SHALL validate geometric constraints
2. THE Building_Forge SHALL detect and warn about overlapping or intersecting elements
3. THE Building_Forge SHALL verify material assignments before export
4. WHEN exporting, THE Building_Forge SHALL validate model integrity for game engine compatibility
5. THE Building_Forge SHALL check for missing textures or broken material references
6. THE Building_Forge SHALL provide detailed error reports with suggested fixes

### المتطلب 12: إدارة الأصول

**قصة المستخدم:** كمصمم مباني، أريد إدارة فعالة للنسيج والمواد، حتى أحافظ على تنظيم المشروع وجودة الأصول.

#### معايير القبول

1. THE Building_Forge SHALL provide an asset browser for textures and materials
2. THE Building_Forge SHALL support common texture formats (PNG, JPG, TGA, EXR)
3. WHEN importing textures, THE Building_Forge SHALL automatically generate appropriate material properties
4. THE Building_Forge SHALL detect and reuse duplicate textures to optimize memory usage
5. THE Building_Forge SHALL provide texture compression options for different quality levels
6. THE Building_Forge SHALL maintain asset references and update them when files are moved or renamed