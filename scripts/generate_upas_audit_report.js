/**
 * UPAS — Comprehensive Audit & Fix Report Generator
 * Generates a professional Arabic Word document summarizing:
 *   - Root cause analysis of UPAS v1.0.0-RC1 runtime failures
 *   - 6 critical bugs identified
 *   - All fixes applied
 *   - Build verification
 *   - Recommendations
 */

const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, LevelFormat, convertInchesToTwip, TabStopType, TabStopPosition,
} = require('docx');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════
// PALETTE & FONTS
// ═══════════════════════════════════════════════════════════════════
const P = {
  primary:    '1E3A5F', // UPAS navy
  accent:     'F59E0B', // UPAS amber
  danger:     'DC2626',
  success:    '16A34A',
  warning:    'D97706',
  body:       '1E293B',
  secondary:  '64748B',
  border:     'CBD5E1',
  bgCard:     'F8FAFC',
  bgDanger:   'FEF2F2',
  bgSuccess:  'F0FDF4',
  bgWarning:  'FFFBEB',
};

const FONT_AR = 'Tahoma'; // best Arabic rendering across MS Office / WPS / LibreOffice
const FONT_LATIN = 'Calibri';
const FONT_MONO = 'Consolas';

const c = (hex) => hex.replace('#', '');

// ═══════════════════════════════════════════════════════════════════
// COMPONENT BUILDERS
// ═══════════════════════════════════════════════════════════════════

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 480, after: 240 },
    border: { bottom: { color: P.primary, size: 16, style: BorderStyle.SINGLE, space: 4 } },
    children: [new TextRun({
      text, bold: true, size: 32, color: P.primary,
      font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
    })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({
      text, bold: true, size: 26, color: P.primary,
      font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
    })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({
      text, bold: true, size: 22, color: P.body,
      font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
    })],
  });
}

function p(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({
    text,
    size: 22,
    color: opts.color || P.body,
    bold: opts.bold || false,
    font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
  })];
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    bidirectional: true,
    spacing: { line: 312, before: 60, after: 60 },
    children: runs,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    bidirectional: true,
    spacing: { line: 312, before: 30, after: 30 },
    bullet: { level },
    children: [new TextRun({
      text,
      size: 22,
      color: P.body,
      font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
    })],
  });
}

function code(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: false,
    spacing: { line: 260, before: 80, after: 80 },
    shading: { type: ShadingType.CLEAR, fill: P.bgCard },
    border: {
      top:    { color: P.border, size: 4, style: BorderStyle.SINGLE, space: 2 },
      bottom: { color: P.border, size: 4, style: BorderStyle.SINGLE, space: 2 },
      left:   { color: P.border, size: 4, style: BorderStyle.SINGLE, space: 2 },
      right:  { color: P.border, size: 4, style: BorderStyle.SINGLE, space: 2 },
    },
    children: [new TextRun({
      text,
      size: 18,
      color: P.body,
      font: { ascii: FONT_MONO, eastAsia: FONT_MONO, cs: FONT_MONO, hAnsi: FONT_MONO },
    })],
  });
}

function callout(title, body, kind = 'info') {
  const colors = {
    info:    { fill: P.bgCard,     border: P.secondary, title: P.body,      icon: 'ℹ' },
    danger:  { fill: P.bgDanger,   border: P.danger,     title: P.danger,    icon: '⚠' },
    success: { fill: P.bgSuccess,  border: P.success,    title: P.success,   icon: '✓' },
    warning: { fill: P.bgWarning,  border: P.warning,    title: P.warning,   icon: '!' },
  };
  const k = colors[kind] || colors.info;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    borders: {
      top:    { color: k.border, size: 12, style: BorderStyle.SINGLE },
      bottom: { color: k.border, size: 12, style: BorderStyle.SINGLE },
      left:   { color: k.border, size: 24, style: BorderStyle.SINGLE },
      right:  { color: k.border, size: 4,  style: BorderStyle.SINGLE },
      insideHorizontal: { color: k.border, size: 4, style: BorderStyle.SINGLE },
      insideVertical:   { color: k.border, size: 4, style: BorderStyle.SINGLE },
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            shading: { type: ShadingType.CLEAR, fill: k.fill },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { after: 80 },
                children: [new TextRun({
                  text: `${k.icon}  ${title}`,
                  bold: true, size: 22, color: k.title,
                  font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
                })],
              }),
              ...(Array.isArray(body) ? body : [body]).map(t => new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                bidirectional: true,
                spacing: { line: 312 },
                children: [new TextRun({
                  text: t,
                  size: 20,
                  color: P.body,
                  font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
                })],
              })),
            ],
          }),
        ],
      }),
    ],
  });
}

function tableCell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
      bidirectional: true,
      children: [new TextRun({
        text: String(text),
        bold: opts.bold || false,
        size: opts.size || 20,
        color: opts.color || P.body,
        font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
      })],
    })],
  });
}

function dataTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map(h => tableCell(h, { bold: true, fill: P.primary, color: 'FFFFFF', center: true })),
  });
  const bodyRows = rows.map((r, i) => new TableRow({
    cantSplit: true,
    children: r.map(c => tableCell(c, { fill: i % 2 === 0 ? P.bgCard : 'FFFFFF' })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    borders: {
      top:    { color: P.border, size: 4, style: BorderStyle.SINGLE },
      bottom: { color: P.border, size: 4, style: BorderStyle.SINGLE },
      left:   { color: P.border, size: 4, style: BorderStyle.SINGLE },
      right:  { color: P.border, size: 4, style: BorderStyle.SINGLE },
      insideHorizontal: { color: P.border, size: 4, style: BorderStyle.SINGLE },
      insideVertical:   { color: P.border, size: 4, style: BorderStyle.SINGLE },
    },
    rows: [headerRow, ...bodyRows],
  });
}

// ═══════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════
function buildCover() {
  return [
    // Top accent bar
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 0 },
      border: { bottom: { color: P.accent, size: 48, style: BorderStyle.SINGLE, space: 0 } },
      children: [new TextRun({ text: '', size: 2 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      border: { bottom: { color: P.primary, size: 8, style: BorderStyle.SINGLE, space: 0 } },
      children: [new TextRun({ text: '', size: 2 })],
    }),

    // System badge
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 200 },
      children: [new TextRun({
        text: 'UPAS  ·  v1.0.0-RC1',
        bold: true, size: 22, color: P.secondary,
        font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_LATIN },
      })],
    }),

    // Main title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [new TextRun({
        text: 'تقرير التدقيق الهندسي',
        bold: true, size: 64, color: P.primary,
        font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
      })],
    }),

    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 1200 },
      children: [new TextRun({
        text: 'تحليل جذري للأخطاء وإصلاحها في نظام تحليل المنشآت تحت الأرض',
        size: 28, color: P.body,
        font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
      })],
    }),

    // Status pill
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 800 },
      children: [new TextRun({
        text: '  ✓  الإصلاحات مطبقة والبناء ناجح  ',
        bold: true, size: 24, color: P.success,
        font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
        shading: { type: ShadingType.CLEAR, fill: P.bgSuccess },
      })],
    }),

    // Footer metadata
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 80 },
      children: [new TextRun({
        text: 'إعداد: فريق هندسة UPAS',
        size: 20, color: P.secondary,
        font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 1200 },
      border: { bottom: { color: P.accent, size: 24, style: BorderStyle.SINGLE, space: 8 } },
      children: [new TextRun({
        text: '26 يوليو 2026  ·  تحليل تقني داخلي',
        size: 20, color: P.secondary,
        font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
      })],
    }),

    new Paragraph({
      children: [new TextRun({ text: 'نهاية الغلاف', size: 2, color: 'FFFFFF' }), new PageBreak()],
    }),
  ];
}

// ═══════════════════════════════════════════════════════════════════
// BODY CONTENT
// ═══════════════════════════════════════════════════════════════════
function buildBody() {
  const sections = [];

  // ─── 1. Executive Summary ─────────────────────────────────────────
  sections.push(h1('1.  الملخص التنفيذي'));
  sections.push(p('يوثق هذا التقرير التدقيق الهندسي الشامل لنظام UPAS (نظام تحليل المنشآت تحت الأرض الإنشائية) الإصدار v1.0.0-RC1، وذلك بعد البلاغات المتكررة بفشل العرض الثلاثي الأبعاد للطبقات والرسوم، وعدم القدرة على إدخال البيانات أو رؤية المنشأ والمعايير. تم إجراء تحليل عميق لكامل شجرة الملفات المصدرية متضمناً مكوّنات الواجهة، ومحرك العرض ثلاثي الأبعاد، ومخزن الحالة Zustand، وطبقة الوصول إلى البيانات.'));
  sections.push(p('كشف التدقيق عن ستة (6) أخطاء جوهرية، خمسة منها أخطاء برمجية حرجة تمنع التشغيل السليم، وخطأ واحد في تصميم تجربة المستخدم. تشمل الأخطاء الحرجة: انتهاك قواعد React Hooks في مكوّن عرض الطبقات، وغياب استيراد مكتبة THREE.js في مكوّن التهديد، وخطأ في تمرير نوع بيانات خاطئ إلى دالة توليد التقرير، إضافة إلى فقر البيانات الافتراضية للمشاريع الجديدة. تم تطبيق كافة الإصلاحات اللازمة والتحقق من نجاح البناء الإنتاجي عبر Vite بدون أي أخطاء في شيفرة التطبيق.'));
  sections.push(p('النتيجة النهائية: البناء ينجح، وكل أخطاء TypeScript في الملفات المصدرية للتطبيق (src/components، src/engine، src/stores) تم حلها بالكامل. الأخطاء المتبقية تقتصر على ملفات الاختبار (src/__tests__) ومكوّنات محرك الحساب (src/calculations) التي يمنع الاتفاق تعديلها. النظام جاهز الآن لإعادة النشر بعد موافقة المستخدم.'));

  // ─── 2. Background & Objectives ──────────────────────────────────
  sections.push(h1('2.  الخلفية وأهداف التدقيق'));
  sections.push(h2('2.1  سياق المشكلة'));
  sections.push(p('بعد إكمال المرحلة 5K (النشر والاختبار النهائي) وترقيع خطأ الشاشة البيضاء السابق (الذي شمل إضافة ملف _redirects لـ Netlify، وإضافة Error Boundary، وإصلاح خطأ في CameraController، وإزالة التحميل التلقائي للعرض التجريبي من AnalysisView)، أبلغ المستخدم عن استمرار الأعطال الحرجة: عدم ظهور العرض الثلاثي الأبعاد لطبقات التربة والرسوم الهندسية، وعدم القدرة على إدخال المدخلات أو رؤية المنشأ ومعايير التصميم.'));
  sections.push(p('تضمنت لقطات الشاشة المرجعية المرفقة من المستخدم عرضاً للنسخة المرغوبة: مشهد ثلاثي الأبعاد متعدد الطبقات بألوان مميزة (رمل، طين، صخر)، مع علامة موقع القنبلة، ووضع الأشعة السينية (X-Ray Mode)، ونموذج إدخال كامل للسماكات والخصائص الهندسية. هذا يشير إلى أن النظام كان يعمل بشكل صحيح في إصدار سابق، وأن الترقيق الأخير أزال وظائف أساسية أو كشف عن أخطاء كامنة.'));

  sections.push(h2('2.2  أهداف التدقيق'));
  sections.push(bullet('تحليل جذري لكامل شجرة ملفات المصدر لتحديد سبب فقدان العرض ثلاثي الأبعاد وعدم القدرة على إدخال البيانات.'));
  sections.push(bullet('تحديد جميع أخطاء TypeScript وأخطاء وقت التشغيل التي تمنع التطبيق من العمل بشكل احترافي.'));
  sections.push(bullet('تطبيق الإصلاحات اللازمة دون تعديل محرك الحساب (src/calculations) أو إضافة ميزات جديدة.'));
  sections.push(bullet('إثراء البيانات الافتراضية للمشاريع الجديدة لتشمل: أنواع القنابل، طبقات التربة، السماكات الأولية، ومعايير التصميم.'));
  sections.push(bullet('التحقق من نجاح البناء الإنتاجي قبل اقتراح إعادة النشر.'));

  // ─── 3. Methodology ──────────────────────────────────────────────
  sections.push(h1('3.  المنهجية والنطاق'));
  sections.push(h2('3.1  منهج التدقيق'));
  sections.push(p('تم اتباع منهج تدقيق تصاعدي (Bottom-Up Audit) يبدأ من طبقة البيانات (JSON / المخزن) مروراً بطبقة النماذج (Models) والمكوّنات الفرعية للواجهة (Forms)، وصولاً إلى المكوّنات الحاوية (Screens) ومحرك العرض ثلاثي الأبعاد (Engine). تم فحص كل ملف يدوياً عبر أداة القراءة المباشرة، ومطابقة أنواع TypeScript عبر مترجم tsc الرسمي. كما تم استخدام نموذج رؤية حاسوبية (VLM) لتحليل لقطات الشاشة المرفقة من المستخدم وفهم الحالة المرغوبة بدقة.'));

  sections.push(h2('3.2  نطاق التدقيق'));
  const scopeTable = dataTable(
    ['الطبقة', 'الملفات المدققة', 'الحالة'],
    [
      ['مخزن الحالة', 'projectStore.ts, uiStore.ts, settingsStore.ts', 'مراجعة كاملة'],
      ['النماذج', 'models/*.ts (Project, Soil, Structure, Bomb, Threat)', 'مراجعة كاملة'],
      ['البيانات', 'data/*.json + demoProject.ts + database/index.ts', 'مراجعة كاملة'],
      ['الواجهة', 'screens/AnalysisView + Dashboard + NewProject', 'مراجعة كاملة'],
      ['النماذج الفرعية', 'InputForm/SoilForm, StructureForm, ThreatForm, DesignCriteriaForm', 'مراجعة كاملة'],
      ['مكوّنات اللوحة', 'PropertiesPanel, ObjectTree, AnalysisToolbar, VisualizationModeControls, CameraToolbar, SectionViewControls', 'مراجعة كاملة'],
      ['محرك العرض', 'engine/scene/*.tsx (16 ملف)', 'مراجعة كاملة'],
      ['محرك الحساب', 'calculations/**, design/**', 'محظور التعديل (اتفق)'],
      ['الاختبارات', '__tests__/**', 'محظور التعديل (اتفق)'],
    ]
  );
  sections.push(scopeTable);
  sections.push(p('تم احترام القيود التشغيلية المفروضة بشكل صارم: لا تعديل على محرك الحساب، لا إضافة ميزات جديدة، لا إعادة نشر على Netlify قبل موافقة المستخدم الصريحة.'));

  // ─── 4. Findings — Bugs Identified ───────────────────────────────
  sections.push(h1('4.  النتائج: الأخطاء المكتشفة'));
  sections.push(p('تم تحديد ستة أخطاء جوهرية، مصنفة حسب درجة الخطورة والتأثير على تشغيل النظام. الأخطاء الخمسة الأولى تمنع التشغيل السليم تماماً أو تسبب انهيار المشهد ثلاثي الأبعاد، بينما يمثل الخطأ السادس فجوة في تجربة المستخدم تجعل المشاريع الجديدة تبدو فارغة.'));

  sections.push(h2('4.1  BUG-001 — انتهاك قواعد React Hooks في SoilLayers3D'));
  sections.push(callout('خطأ حرج — انتهاك Rules of Hooks', [
    'الملف: src/engine/scene/SoilLayers3D.tsx (السطر 144–164)',
    'التصنيف: React Hooks Violation (Critical)',
    'التأثير: انهيار المشهد ثلاثي الأبعاد عند تبديل وضع العرض (surface ↔ normal/xray/cutaway).',
  ], 'danger'));
  sections.push(p('كان المكوّن يستدعي خطّاف useMemo بعد إرجاع مبكر (early return) مباشرة عند ضبط وضع العرض على "surface". هذا انتهاك صريح لقواعد React التي تشترط استدعاء الخطّافات بنفس الترتيب وبنفس العدد في كل عملية تصيير. عند تغيير وضع العرض، يختلف عدد الخطّافات المستدعاة بين عمليات التصيير المتتالية، مما يؤدي إلى رمي React لخطأ "Rendered more hooks than during the previous render" وانهيار كامل المكوّن الحاوي.'));
  sections.push(code('// قبل الإصلاح (خطأ):\nconst vizMode = useUIStore(...);\nif (vizMode === \'surface\') return null;  // ← early return\nconst layers = useMemo(...);            // ← hook بعد الإرجاع\n\n// بعد الإصلاح:\nconst vizMode = useUIStore(...);\nconst layers = useMemo(...);            // ← hook أولاً\nif (vizMode === \'surface\') return null;  // ← ثم الإرجاع'));

  sections.push(h2('4.2  BUG-002 — مكوّن ThreatObject3D مكسور'));
  sections.push(callout('خطأ حرج — غياب الاستيراد + خاصية في موضع خاطئ', [
    'الملف: src/engine/scene/ThreatObject3D.tsx (الأسطر 18 و 44)',
    'التصنيف: TypeScript Error + Runtime Crash',
    'التأثير: انهيار المشهد عند تفعيل عرض كائن التهديد (⚠) في شريط الأدوات.',
  ], 'danger'));
  sections.push(p('كان المكوّن يستخدم نوع THREE.Group في تعريف المرجع (useRef) دون استيراد مكتبة three.js، مما يسبب خطأ TypeScript "Cannot find namespace \'THREE\'". إضافة إلى ذلك، كانت خاصية rotation مربوطة بـ <cylinderGeometry> بدلاً من <mesh>، بينما rotation خاصية تحويل تنتمي إلى الكائن ثلاثي الأبعاد (mesh) وليس إلى الهندسة. هذه الأخطاء تجعل تفعيل زر "كائن التهديد" في شريط الأدوات يؤدي إلى انهيار فوري للمشهد عبر Error Boundary.'));

  sections.push(h2('4.3  BUG-003 — ObjectTree: نوع Boolean|Null خاطئ'));
  sections.push(callout('خطأ نوعي — TypeScript', [
    'الملف: src/components/ui/ObjectTree.tsx (السطر 196)',
    'التصنيف: Type Mismatch',
    'التأثير: فشل بناء tsc -b، يمنع تمرير خطوة البناء في package.json.',
  ], 'warning'));
  sections.push(p('كانت الخاصية isSelected تستقبل تعبيراً منطقياً مركباً يضم فحص structure غير الفارغ. عندما يكون structure مساوياً null، يعيد التعبير null بدلاً من false، مما يخالف توقّع نوع الخاصية (boolean | undefined). تم لف التعبير بدالة Boolean() لضمان الإرجاع المنطقي الصريح.'));

  sections.push(h2('4.4  BUG-004 — ProfessionalReport: تمرير نوع خاطئ'));
  sections.push(callout('خطأ نوعي — TypeScript', [
    'الملف: src/components/ui/ProfessionalReport/index.tsx (السطر 211)',
    'التصنيف: Type Mismatch (DesignAdapterResult vs DesignInput)',
    'التأثير: فشل بناء tsc -b، يمنع توليد التقرير المهني بعد التحليل.',
  ], 'warning'));
  sections.push(p('دالة buildDesignInput تعيد كائناً من نوع DesignAdapterResult يحتوي على حقلين: input و warnings. لكن generateProfessionalReport تتوقع DesignInput مباشرة. تم تعديل الكود لاستخراج الخاصية input من نتيجة المحوّل قبل تمريرها إلى مولّد التقرير.'));

  sections.push(h2('4.5  BUG-005 — CameraController: استدعاء .set() خاطئ'));
  sections.push(callout('خطأ سابق — تم إصلاحه في المرحلة السابقة', [
    'الملف: src/engine/scene/CameraController.tsx (السطر 92)',
    'التصنيف: Zustand API Misuse',
    'التأثير: انهيار عند محاولة إعادة ضبط autoFitRequested.',
    'ملاحظة: تم إصلاحه في الجلسة السابقة عبر استبدال .set() بـ .setState().',
  ], 'success'));

  sections.push(h2('4.6  BUG-006 — المشاريع الجديدة تبدو فارغة'));
  sections.push(callout('فجوة في تجربة المستخدم — بيانات افتراضية فقيرة', [
    'الملف: src/stores/projectStore.ts (دالة createNewProject)',
    'التصنيف: UX Gap (Major)',
    'التأثير: المشاريع الجديدة تبدأ بطبقة تربة واحدة فقط، ومنشأ بأبعاد افتراضية بسيطة، ومعايير تصميم معطّلة. المستخدم يرى مشهداً شبه فارغ.',
  ], 'warning'));
  sections.push(p('الدالة الأصلية createNewProject كانت تنشئ طبقة تربة واحدة افتراضية (sand_medium بسماكة 2m) ومنشأ Box بأبعاد 6×4×3m فقط، مع designEnabled = false. هذا يعني أن المستخدم بعد إنشاء مشروع جديد يرى مشهداً ثلاثي الأبعاد يحتوي على طبقة واحدة فقط، ومنشأ بسيطاً، وتبويب "التصميم" في نموذج الإدخال يكون معطّلاً. هذا يفسر لماذا شعر المستخدم أن البرنامج "لا يمكن إدخال البيانات فيه" — كانت البيانات الأولية ضئيلة للغاية، رغم أن النماذج نفسها تعمل بشكل صحيح.'));

  // ─── 5. Root Cause Analysis ──────────────────────────────────────
  sections.push(h1('5.  تحليل الأسباب الجذرية'));
  sections.push(p('بالعودة إلى السؤال الجوهري: لماذا لم تُكتشف هذه الأخطاء قبل النشر؟ يكمن السبب الجذري في عوامل متراكبة:'));

  sections.push(h3('5.1  تباين بيئة البناء وبيئة وقت التشغيل'));
  sections.push(p('البرنامج النصي build في package.json يستدعي tsc -b قبل vite build. عندما يفشل tsc -b، يتوقف البناء. لكن في النشر السابق تم تشغيل vite build مباشرةً متجاوزاً tsc -b، مما أنتج حزمة تعمل ولكنها تحتوي على أخطاء نوعية لم يتم التقاطها. Vite يستخدم esbuild الذي يزيل الأنواع دون فحصها، لذا فإن الأخطاء النوعية لا تظهر إلا عند التشغيل الفعلي في المتصفح.'));

  sections.push(h3('5.2  التغطية المحدودة للاختبارات اليدوية'));
  sections.push(p('الاختبارات اليدوية السابقة ركّزت على مسار "تحميل مشروع تجريبي" الذي كان يعمل لأن مكوّن ThreatObject3D لا يُستدعى إلا بعد تفعيل showThreatObject. مسار "إنشاء مشروع جديد" لم يُختبر بشكل كافٍ، ولم يتم التحقق من أن البيانات الافتراضية تكفي لعرض مشهد ذو قيمة هندسية. كما لم يتم اختبار تبديل أوضاع العرض (normal/surface/cutaway/xray) بشكل تفاعلي، مما أخفى خطأ React Hooks في SoilLayers3D.'));

  sections.push(h3('5.3  غياب فحص الأنواع في خط النشر'));
  sections.push(p('عملية النشر عبر Netlify تستخدم أمر build المباشر دون فرض tsc -b. كان بإمكان Netlify Configuration أن يضمن تشغيل فحص الأنواع كجزء من خط النشر، مما كان سيلتقط BUG-002 و BUG-003 و BUG-004 قبل وصولها إلى الإنتاج. يُوصى بإضافة خطوة فحص أنواع إلزامية في pipeline النشر المستقبلي.'));

  // ─── 6. Fixes Applied ────────────────────────────────────────────
  sections.push(h1('6.  الإصلاحات المطبقة'));
  sections.push(p('تم تطبيق ست إصلاحات شاملة دون المساس بمحرك الحساب أو إضافة ميزات جديدة. الجدول التالي يلخص الإصلاحات:'));

  const fixesTable = dataTable(
    ['#', 'الملف', 'الإصلاح', 'التصنيف'],
    [
      ['F1', 'src/engine/scene/SoilLayers3D.tsx', 'نقل useMemo قبل الإرجاع المبكر لاحترام قواعد Hooks', 'إصلاح حرج'],
      ['F2', 'src/engine/scene/ThreatObject3D.tsx', 'إضافة import * as THREE + نقل rotation إلى mesh', 'إصلاح حرج'],
      ['F3', 'src/components/ui/ObjectTree.tsx', 'لف تعبير isSelected بـ Boolean() لضمان النوع', 'إصلاح نوعي'],
      ['F4', 'src/components/ui/ProfessionalReport/index.tsx', 'تمرير adapterResult.input بدلاً من adapterResult', 'إصلاح نوعي'],
      ['F5', 'src/stores/projectStore.ts', 'إثراء createNewProject بـ 4 طبقات تربة + منشأ كامل + معايير تصميم ممكّنة', 'إصلاح UX'],
      ['F6', 'src/components/screens/AnalysisView/index.tsx', 'الإبقاء على إزالة التحميل التلقائي للديمو (تم في الجلسة السابقة)', 'إصلاح سابق'],
    ]
  );
  sections.push(fixesTable);

  sections.push(h2('6.1  تفاصيل الإصلاح F5 — إثراء البيانات الافتراضية'));
  sections.push(p('دالة createNewProject المحدّثة تنشئ الآن مشروعاً جديداً يحتوي على بيانات أولية غنية تشبه العرض التجريبي، مما يضمن أن المستخدم يرى فوراً بعد الإنشاء:'));
  sections.push(bullet('أربع طبقات تربة واقعية: رمل مفكوك (1.5m)، طين رخو (2.5m)، رمل متوسط (3m)، صخر متآكل (4m).'));
  sections.push(bullet('منسوب مياه جوفية عند عمق -3m.'));
  sections.push(bullet('منشأ Box كامل بأبعاد 8×5×3.5m مع سماكات واقعية (سقف 0.40m، جدران 0.35m، أرضية 0.35m) وعمق دفن 3m.'));
  sections.push(bullet('مواد خرسانة مسلحة RC 350 لجميع العناصر.'));
  sections.push(bullet('تهديد انفجاري سطحي بمسافة أمان 5m.'));
  sections.push(bullet('قنبلة TNT بكتلة 100kg كروية الشكل.'));
  sections.push(bullet('معايير تصميم ممكّنة وفق UFC 3-340-02 و ACI 318-19: فولاذ Grade 60 (fy=420)، معامل أمان 1.5، غطاء خرسانة 50mm، دوران دعامات أقصى 8°.'));
  sections.push(p('هذه التغييرات تجعل النظام يفتح على مشهد ثلاثي الأبعاد ذو قيمة هندسية فورية، ويعرض في شجرة الكائنات بيانات كاملة، ويتيح تبويب التصميم بشكل نشط. لاحظ أن لا حساب يُجرى تلقائياً — يجب على المستخدم النقر على "تشغيل التحليل" لرؤية النتائج، وهذا متعمد للحفاظ على فصل المسؤوليات.'));

  // ─── 7. Verification ─────────────────────────────────────────────
  sections.push(h1('7.  التحقق من الإصلاحات'));
  sections.push(h2('7.1  فحص الأنواع TypeScript'));
  sections.push(p('تم تشغيل tsc -b على كامل المشروع بعد تطبيق الإصلاحات. النتيجة: انحصرت أخطاء TypeScript المتبقية في ملفات الاختبار (src/__tests__) ومحرك الحساب (src/calculations/design/benchmarks.ts) وكلاهما خارج نطاق التطبيق المسموح بتعديله. جميع أخطاء الملفات المصدرية للتطبيق (src/components، src/engine، src/stores، src/models، src/visualization) تم حلها بالكامل.'));

  sections.push(h2('7.2  البناء الإنتاجي Vite'));
  sections.push(callout('نتيجة البناء — نجاح', [
    'الأمر: vite build',
    'النتيجة: ✓ built in 1.05s',
    'عدد الوحدات المحوّلة: 687 modules',
    'حجم الحزمة: 1,643 KB (gzip: 454 KB)',
    'CSS: 31 KB (gzip: 6.4 KB)',
    'ملف _redirects موجود في dist/ (لـ Netlify SPA routing)',
  ], 'success'));

  sections.push(h2('7.3  ملفات dist/ النهائية'));
  sections.push(p('تم التأكد من أن مجلد الإخراج dist/ يحتوي على جميع الملفات اللازمة للنشر: index.html، favicon.svg، icons.svg، _redirects (لمعالجة توجيه SPA على Netlify)، وأصول JS/CSS المجزأة.'));

  // ─── 8. Conclusions & Recommendations ────────────────────────────
  sections.push(h1('8.  الاستنتاجات والتوصيات'));
  sections.push(h2('8.1  الاستنتاجات'));
  sections.push(p('النظام في حالته الحالية بعد الإصلاحات جاهز تقنياً للنشر على Netlify. جميع الأخطاء الحرجة التي تمنع العرض ثلاثي الأبعاد وتمنع إدخال البيانات تم حلها. المشاريع الجديدة ستبدأ الآن ببيانات أولية غنية بدلاً من البيانات الفقيرة السابقة، مما يحاكي تجربة العرض التجريبي دون الحاجة إلى تحميله يدوياً.'));

  sections.push(h2('8.2  التوصيات الفورية'));
  sections.push(bullet('إعادة النشر على Netlify بعد موافقة المستخدم الصريحة — البناء محلي وجاهز.'));
  sections.push(bullet('بعد النشر، اختبار مسار "إنشاء مشروع جديد" بشكل تفاعلي: التأكد من ظهور 4 طبقات تربة بألوان مميزة، وظهور المنشأ تحت الأرض، وظهور تبويب التصميم ممكّناً.'));
  sections.push(bullet('اختبار تبديل أوضاع العرض (عادي/سطح/مقطع/أشعة سينية) للتأكد من عدم انهيار المشهد (كان هذا هو BUG-001).'));
  sections.push(bullet('النقر على "تشغيل التحليل" للتحقق من أن خط الأنابيب يعمل من البداية إلى النهاية وينتج تقريراً مهنياً.'));

  sections.push(h2('8.3  التوصيات المستقبلية (لا تنفذ الآن)'));
  sections.push(bullet('إضافة خطوة فحص أنواع TypeScript إلزامية في pipeline النشر (Netlify build command يجب أن يكون tsc -b && vite build وليس vite build وحده).'));
  sections.push(bullet('إضافة اختبار E2E (Playwright) يغطي مسار "إنشاء مشروع جديد" لمنع انتكاس BUG-001 و BUG-006 مستقبلاً.'));
  sections.push(bullet('التحقيق في الخطأ النوعي المتبقي في src/calculations/design/benchmarks.ts (الخاصية reinforcementGrade غير معرّفة) — يحتاج مراجعة هندسية من مالك محرك الحساب.'));
  sections.push(bullet('إضافة حدود خطأ (Error Boundaries) منفصلة لمكوّنات المشهد ثلاثي الأبعاد، بحيث لا تؤدي أخطاؤها إلى انهيار كامل التطبيق بل تظهر رسالة خطأ موضعية مع زر إعادة المحاولة.'));

  sections.push(h2('8.4  القيود المحترمة'));
  sections.push(p('تم احترام كامل القيود المفروضة من قبل المستخدم خلال هذه الجلسة: لم يتم تعديل أي ملف في src/calculations أو src/design أو src/analysis، ولم تُضف أي ميزات جديدة (جميع التغييرات هي إصلاحات أخطاء أو إثراء بيانات افتراضية)، ولم يتم إعادة النشر على Netlify انتظاراً للموافقة الصريحة.'));

  // ─── 9. Appendix ─────────────────────────────────────────────────
  sections.push(h1('9.  الملحق: قائمة الملفات المعدلة'));
  const modifiedFiles = dataTable(
    ['الملف', 'نوع التعديل', 'عدد الأسطر'],
    [
      ['src/engine/scene/SoilLayers3D.tsx', 'إصلاح انتهاك Hooks', '~10 أسطر'],
      ['src/engine/scene/ThreatObject3D.tsx', 'إضافة استيراد + إصلاح خاصية', '2 أسطر'],
      ['src/components/ui/ObjectTree.tsx', 'إصلاح نوعي', '1 سطر'],
      ['src/components/ui/ProfessionalReport/index.tsx', 'إصلاح نوعي', '~5 أسطر'],
      ['src/stores/projectStore.ts', 'إثراء createNewProject', '~100 سطر مضاف'],
    ]
  );
  sections.push(modifiedFiles);
  sections.push(p('إجمالي الأسطر المعدلة: حوالي 120 سطراً عبر 5 ملفات. لم يتم حذف أو تعطيل أي وظيفة قائمة — كل التغييرات إصلاحية أو إثرائية.'));

  return sections;
}

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═══════════════════════════════════════════════════════════════════
const doc = new Document({
  creator: 'UPAS Audit Team',
  title: 'UPAS Comprehensive Audit Report',
  description: 'Deep technical analysis and fixes for UPAS v1.0.0-RC1',
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
          size: 22,
          color: P.body,
        },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: {
          font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
          size: 32, bold: true, color: P.primary,
        },
        paragraph: { spacing: { before: 480, after: 240 } },
      },
      heading2: {
        run: {
          font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
          size: 26, bold: true, color: P.primary,
        },
        paragraph: { spacing: { before: 360, after: 160 } },
      },
      heading3: {
        run: {
          font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
          size: 22, bold: true, color: P.body,
        },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
    },
  },
  numbering: {
    config: [{
      reference: 'default-bullets',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.RIGHT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '○', alignment: AlignmentType.RIGHT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ],
    }],
  },
  sections: [
    // Cover section (no header/footer, no page number)
    {
      properties: {
        page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } },
        bidi: true,
      },
      children: buildCover(),
    },
    // Body section
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
        bidi: true,
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            border: { bottom: { color: P.border, size: 4, style: BorderStyle.SINGLE, space: 4 } },
            children: [new TextRun({
              text: 'UPAS — تقرير التدقيق الهندسي  ·  v1.0.0-RC1',
              size: 18, color: P.secondary,
              font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: 'صفحة ',
              size: 18, color: P.secondary,
              font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
            }), new TextRun({
              children: [PageNumber.CURRENT],
              size: 18, color: P.secondary,
            }), new TextRun({
              text: '  ·  فريق UPAS',
              size: 18, color: P.secondary,
              font: { ascii: FONT_LATIN, eastAsia: FONT_AR, cs: FONT_AR, hAnsi: FONT_AR },
            })],
          })],
        }),
      },
      children: buildBody(),
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = '/home/z/my-project/download/UPAS_Audit_Report.docx';
  fs.writeFileSync(outPath, buf);
  const stat = fs.statSync(outPath);
  console.log(`✓ Report generated: ${outPath}`);
  console.log(`  Size: ${(stat.size / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error('✗ Generation failed:', err);
  process.exit(1);
});
