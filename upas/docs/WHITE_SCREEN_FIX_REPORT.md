# تقرير تحليل عطل الشاشة البيضاء — Phase 5K

## المشكلة

عند الضغط على "إنشاء مشروع جديد" أو "تحميل مشروع تجريبي" تظهر شاشة بيضاء بدلاً من واجهة العمل.

## الأسباب الجذرية (5 أسباب مترابطة)

### 1. 🔴 ملف `_redirects` مفقود — سبب رئيسي على Netlify
UPAS تطبيق صفحة واحدة (SPA) يعتمد على التنقل داخل المتصفح بدون إعادة تحميل. Netlify بدون ملف `_redirects` يُرجع 404 لأي مسار داخلي، مما يُبيّض الشاشة.

**الإصلاح**: إنشاء `public/_redirects` بمحتوى `/* /index.html 200`

### 2. 🔴 `AnalysisView` يُفرض بيانات Demo على كل مشروع جديد
الملف `AnalysisView/index.tsx` كان يحتوي على `useEffect` يُحمّل بيانات تجريبية تلقائيًا عند كل فتح، مما يُستبدل بيانات المشروع الجديد ويرغم المشهد ثلاثي الأبعاد على التقديم فورًا — حتى لو لم يكن المستخدم قد أدخل أي بيانات. هذا يُفعل مشهد 3D فارغ أو به بيانات غير متوافقة.

**الإصلاح**: إزالة `useEffect` التلقائي بالكامل. بيانات Demo تُحمّل فقط عند الضغط على زر "تحميل مشروع تجريبي".

### 3. 🔴 `CameraController` يستخدم API خاطئ — يُنهي التطبيق
السطر 92 كان يستدعي `useUIStore.getState().set({...})` — لكن `set` ليست دالة على كائن state المُرجَع من `getState()`. الدالة الصحيحة هي `useUIStore.setState({...})`. هذا يسبب `TypeError` يُنهي شجرة React بالكامل.

**الإصلاح**: تغيير `.set(` → `.setState(`

### 4. 🟡 `PropertiesPanel` يصل لخصائص غير موجودة
عند اختيار جزء من المنشأ (سقف/جدار/أرضية)، الكود كان يصل لخصائص مثل `safetyFactor` و `appliedPressure` على أنواع بيانات قد لا تحتويها — مما قد يسبب `TypeError` وقت التشغيل.

**الإصلاح**: إضافة type guards بالتحقق من وجود الخاصية قبل الوصول إليها.

### 5. 🟡 لا يوجد Error Boundary — أي خطأ يُبيّض التطبيق
لم يكن هناك أي `ErrorBoundary` في شجرة المكونات. أي خطأ في أي مكون يُزيل شجرة React بالكامل ويُظهر `<div id="root">` فارغ (شاشة بيضاء).

**الإصلاح**: إضافة `AppErrorBoundary` يلتف حول التطبيق كاملًا ويعرض رسالة خطأ مع زر "العودة للوحة التحكم".

## الملفات المُعدّلة

| الملف | التغيير |
|-------|--------|
| `public/_redirects` | **新建** — إضافة قاعدة SPA routing لـ Netlify |
| `src/App.tsx` | إضافة `AppErrorBoundary` class component |
| `src/components/screens/AnalysisView/index.tsx` | إزالة `useEffect` التلقائي لتحميل Demo |
| `src/engine/scene/CameraController.tsx` | `.set()` → `.setState()` |
| `src/components/ui/PropertiesPanel.tsx` | إضافة type guards للوصول الآمن |
| `src/components/screens/Dashboard/index.tsx` | إزالة `createNewProject()` المكرر من handleCreateProject |

## الملفات التي لم تُعدّل (المحرك الحسابي)

لم يُمسَّ أي ملف في:
- `src/calculations/` — المحرك الحسابي
- `src/design/` — محرك التصميم
- `src/analysis/` — خدمات التحليل
- `src/__tests__/` — الاختبارات

## نتيجة الاختبار الداخلي

| الفحص | النتيجة |
|-------|--------|
| Dev server يُرجع HTML 200 | ✅ |
| HTML يحتوي `id="root"` | ✅ |
| HTML يحتوي `type="module"` لل JS | ✅ |
| `AnalysisView` لا يستورد `createDemoProject` | ✅ |
| `AnalysisView` لا يحتوي `useEffect` | ✅ |
| `CameraController` يستخدم `.setState()` | ✅ |
| `_redirects` موجود في `public/` | ✅ |
| `AppErrorBoundary` يلتف بالتطبيق | ✅ |
| `Dashboard` لا يُنشيء مشروعًا مكررًا | ✅ |
| `vite build` ينجح بدون أخطاء | ✅ |
| `_redirects` موجود في `dist/` | ✅ |

## حالة النشر

**لم يُعاد النشر على Netlify بعد.** الإصلاحات جاهزة في الكود المحلي بانتظار الموافقة.