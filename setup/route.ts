import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: فحص حالة قاعدة البيانات
export async function GET() {
  try {
    const programCount = await db.program.count()
    const deptCount = await db.department.count()
    const empCount = await db.employee.count()

    if (programCount > 0 || deptCount > 0) {
      return NextResponse.json({
        status: 'initialized',
        message: 'قاعدة البيانات جاهزة',
        stats: { programs: programCount, departments: deptCount, employees: empCount }
      })
    }

    return NextResponse.json({
      status: 'empty',
      message: 'قاعدة البيانات فارغة - تحتاج تهيئة'
    })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'فشل في الاتصال بقاعدة البيانات'
    }, { status: 500 })
  }
}

// POST: تهيئة قاعدة البيانات بالبيانات الافتراضية
export async function POST() {
  try {
    const existingCount = await db.program.count()
    if (existingCount > 0) {
      return NextResponse.json({
        status: 'already_initialized',
        message: 'قاعدة البيانات مهيأة مسبقًا'
      })
    }

    // ═══ 1. إنشاء الأقسام ═══
    const departments = await Promise.all([
      db.department.create({ data: { name: 'الإدارة المدرسية', color: '#10b981', order: 1 } }),
      db.department.create({ data: { name: 'البيئة المدرسية', color: '#14b8a6', order: 2 } }),
      db.department.create({ data: { name: 'التوجيه الطلابي', color: '#8b5cf6', order: 3 } }),
      db.department.create({ data: { name: 'الشؤون التعليمية', color: '#0ea5e9', order: 4 } }),
      db.department.create({ data: { name: 'النشاط الطلابي', color: '#e11d48', order: 5 } }),
    ])
    const deptMap: Record<string, string> = {}
    departments.forEach(d => { deptMap[d.name] = d.id })

    // ═══ 2. إنشاء الموظفين ═══
    const employees = await Promise.all([
      db.employee.create({ data: { name: 'منصور القحطاني', position: 'مدير المدرسة', progress: 23, departmentId: deptMap['الإدارة المدرسية'] } }),
      db.employee.create({ data: { name: 'محمد المنقاشي', position: 'وكيل المدرسة', progress: 41, departmentId: deptMap['الإدارة المدرسية'] } }),
      db.employee.create({ data: { name: 'أحمد بديوي', position: 'مسؤول الأمن والسلامة', progress: 79, departmentId: deptMap['البيئة المدرسية'] } }),
      db.employee.create({ data: { name: 'محمد القرني', position: 'مسؤول الصيانة', progress: 71, departmentId: deptMap['البيئة المدرسية'] } }),
      db.employee.create({ data: { name: 'معاذ عسيري', position: 'مشرف عام', progress: 53, departmentId: deptMap['التوجيه الطلابي'] } }),
      db.employee.create({ data: { name: 'هشام محرم', position: 'مشرف الموهبة', progress: 32, departmentId: deptMap['التوجيه الطلابي'] } }),
      db.employee.create({ data: { name: 'خالد محمد عطية', position: 'وكيل الشؤون التعليمية', progress: 41, departmentId: deptMap['الشؤون التعليمية'] } }),
      db.employee.create({ data: { name: 'عبدالله مفتي', position: 'رائد النشاط الطلابي', progress: 31, departmentId: deptMap['النشاط الطلابي'] } }),
      db.employee.create({ data: { name: 'خالد شعبان', position: 'منسق الموهوبين', progress: 39, departmentId: deptMap['النشاط الطلابي'] } }),
      db.employee.create({ data: { name: 'أحمد عبدالعزيز', position: 'مسؤول الروبوت', progress: 49, departmentId: deptMap['النشاط الطلابي'] } }),
    ])
    const empMap: Record<string, string> = {}
    employees.forEach(e => { empMap[e.name] = e.id })

    // ═══ 3. إنشاء البرامج (117 برنامج) ═══
    const programs: Array<{ name: string; department: string; employee?: string; status: string; priority: string; progress: number; year: number; month: number }> = []

    // الإدارة المدرسية (11)
    programs.push(
      { name: 'متابعة انضباط الطلاب', department: 'الإدارة المدرسية', employee: 'منصور القحطاني', status: 'لم تبدأ', priority: 'عاجلة', progress: 0, year: 2025, month: 1 },
      { name: 'متابعة اشراف الفسحة', department: 'الإدارة المدرسية', employee: 'محمد المنقاشي', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 30, year: 2025, month: 1 },
      { name: 'متابعة الاشراف المسائي', department: 'الإدارة المدرسية', employee: 'محمد المنقاشي', status: 'قيد التنفيذ', priority: 'عالية', progress: 68, year: 2025, month: 1 },
      { name: 'متابعة الاشراف الصباحي', department: 'الإدارة المدرسية', employee: 'منصور القحطاني', status: 'لم تبدأ', priority: 'عالية', progress: 0, year: 2025, month: 2 },
      { name: 'الموارد البشرية', department: 'الإدارة المدرسية', employee: 'منصور القحطاني', status: 'لم تبدأ', priority: 'منخفضة', progress: 0, year: 2025, month: 3 },
      { name: 'الشؤون المالية', department: 'الإدارة المدرسية', employee: 'منصور القحطاني', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 29, year: 2025, month: 1 },
      { name: 'الانشطة والبرامج للمنسوبين', department: 'الإدارة المدرسية', employee: 'محمد المنقاشي', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 20, year: 2025, month: 4 },
      { name: 'البرامج التدريبية للمنسوبين', department: 'الإدارة المدرسية', employee: 'محمد المنقاشي', status: 'قيد التنفيذ', priority: 'عاجلة', progress: 90, year: 2025, month: 1 },
      { name: 'الانضباط الوظيفي', department: 'الإدارة المدرسية', employee: 'منصور القحطاني', status: 'مكتملة', priority: 'متوسطة', progress: 100, year: 2025, month: 1 },
      { name: 'متابعة الخطة التشغيلية', department: 'الإدارة المدرسية', employee: 'منصور القحطاني', status: 'مكتملة', priority: 'متوسطة', progress: 100, year: 2025, month: 1 },
      { name: 'اعداد الخطة التشغيلية', department: 'الإدارة المدرسية', employee: 'منصور القحطاني', status: 'لم تبدأ', priority: 'عالية', progress: 0, year: 2025, month: 2 },
    )

    // البيئة المدرسية (7)
    programs.push(
      { name: 'المقصف المدرسي', department: 'البيئة المدرسية', employee: 'أحمد بديوي', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 0, year: 2025, month: 1 },
      { name: 'اللوحات الارشادية والتحذيرية', department: 'البيئة المدرسية', employee: 'أحمد بديوي', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 1 },
      { name: 'تجربة الإخلاء', department: 'البيئة المدرسية', employee: 'أحمد بديوي', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 50, year: 2025, month: 3 },
      { name: 'ملف الأمن والسلامة', department: 'البيئة المدرسية', employee: 'محمد القرني', status: 'مكتملة', priority: 'منخفضة', progress: 100, year: 2025, month: 1 },
      { name: 'متابعة أعمال النظافة', department: 'البيئة المدرسية', employee: 'محمد القرني', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 1 },
      { name: 'صيانة أدوات الأمن والسلامة', department: 'البيئة المدرسية', employee: 'محمد القرني', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 60, year: 2025, month: 2 },
      { name: 'صيانة المبنى المدرسي', department: 'البيئة المدرسية', employee: 'محمد القرني', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 1 },
    )

    // التوجيه الطلابي (32)
    programs.push(
      { name: 'سجل المخالفات السلوكية', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'عالية', progress: 40, year: 2025, month: 1 },
      { name: 'خطة التوجيه الطلابي', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'لم تبدأ', priority: 'عاجلة', progress: 0, year: 2025, month: 1 },
      { name: 'متابعة متكرري الغياب والتأخير الصباحي', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 55, year: 2025, month: 1 },
      { name: 'لقاء أولياء الأمور', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'عالية', progress: 30, year: 2025, month: 3 },
      { name: 'زيارات توجيهية', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'لم تبدأ', priority: 'عاجلة', progress: 0, year: 2025, month: 4 },
      { name: 'جلسات فردية', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 45, year: 2025, month: 1 },
      { name: 'حماية الطفل', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'عالية', progress: 60, year: 2025, month: 2 },
      { name: 'مباشر لرصد السلوك', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'لم تبدأ', priority: 'عاجلة', progress: 0, year: 2025, month: 1 },
      { name: 'الاستعداد للاختبارات', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 35, year: 2025, month: 5 },
      { name: 'الأسبوع التمهيدي', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 1 },
      { name: 'نجم السلوك', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'عاجلة', progress: 70, year: 2025, month: 2 },
      { name: 'الغذاء الصحي', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'لم تبدأ', priority: 'عالية', progress: 0, year: 2025, month: 3 },
      { name: 'تكريم المتفوقين', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 1 },
      { name: 'دورة البحث العلمي', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'مكتملة', priority: 'منخفضة', progress: 100, year: 2025, month: 2 },
      { name: 'مبادرة أنا منضبط', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 25, year: 2025, month: 1 },
      { name: 'سجل الحالات الصعبة', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'عالية', progress: 50, year: 2025, month: 1 },
      { name: 'سجل الحالات الطارئة', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 1 },
      { name: 'سجل التواصل مع أولياء الأمور', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 1 },
      { name: 'تقارير الدعم الأكاديمي', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'لم تبدأ', priority: 'عاجلة', progress: 0, year: 2025, month: 5 },
      { name: 'مبادرة أنا قدوة', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 40, year: 2025, month: 2 },
      { name: 'تعزيز القيم الانسانية', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'عالية', progress: 55, year: 2025, month: 1 },
      { name: 'مجالس طلابية', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'لم تبدأ', priority: 'متوسطة', progress: 0, year: 2025, month: 4 },
      { name: 'سلوكي عنواني', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 30, year: 2025, month: 3 },
      { name: 'التقرير السلوكي الدوري', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'لم تبدأ', priority: 'عالية', progress: 0, year: 2025, month: 6 },
      { name: 'الصندوق السري', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 65, year: 2025, month: 1 },
      { name: 'التهيئة الارشادية', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'لم تبدأ', priority: 'متوسطة', progress: 0, year: 2025, month: 1 },
      { name: 'الفصل الذهبي', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'قيد التنفيذ', priority: 'عالية', progress: 45, year: 2025, month: 3 },
      { name: 'نجم الأسبوع', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 1 },
      { name: 'دورة الاسعافات الأولية', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 80, year: 2025, month: 2 },
      { name: 'دورة تدريب الموهوبين', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'عالية', progress: 60, year: 2025, month: 3 },
      { name: 'دورة أتحدث بطلاقة', department: 'التوجيه الطلابي', employee: 'معاذ عسيري', status: 'لم تبدأ', priority: 'متوسطة', progress: 0, year: 2025, month: 4 },
      { name: 'مبادرة راقي', department: 'التوجيه الطلابي', employee: 'هشام محرم', status: 'قيد التنفيذ', priority: 'عالية', progress: 35, year: 2025, month: 1 },
    )

    // الشؤون التعليمية (18)
    programs.push(
      { name: 'الاختبارات الوطنية والدولية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'لم تبدأ', priority: 'عالية', progress: 0, year: 2025, month: 5 },
      { name: 'التزام المعلمين بخطة المنهج', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 27, year: 2025, month: 1 },
      { name: 'اللقاءات الرأسية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 45, year: 2025, month: 1 },
      { name: 'اجتماعات الشعب', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 52, year: 2025, month: 1 },
      { name: 'تقديم التغذية الراجعة للمعلمين', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 50, year: 2025, month: 2 },
      { name: 'تطبيق استراتيجيات التدريس', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'عالية', progress: 55, year: 2025, month: 1 },
      { name: 'تكريم المعلمين', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 1 },
      { name: 'تدريب نافس الوطني', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'عالية', progress: 60, year: 2025, month: 2 },
      { name: 'الاختبارات النهائية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'لم تبدأ', priority: 'عاجلة', progress: 0, year: 2025, month: 6 },
      { name: 'الاختبارات الفترية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'لم تبدأ', priority: 'عالية', progress: 0, year: 2025, month: 4 },
      { name: 'معلم الشهر', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 40, year: 2025, month: 1 },
      { name: 'الرخصة المهنية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'عالية', progress: 79, year: 2025, month: 1 },
      { name: 'البرنامج المساند', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 50, year: 2025, month: 2 },
      { name: 'البرامج الاثرائية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'عالية', progress: 45, year: 2025, month: 3 },
      { name: 'الاختبار التشخيصي', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 1 },
      { name: 'الأنشطة الصفية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 55, year: 2025, month: 1 },
      { name: 'الأعمال التحريرية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 30, year: 2025, month: 1 },
      { name: 'الزيارات الصفية', department: 'الشؤون التعليمية', employee: 'خالد محمد عطية', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 40, year: 2025, month: 2 },
    )

    // النشاط الطلابي (49)
    programs.push(
      { name: 'مجلس التعاون الخليجي', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 50, year: 2025, month: 1 },
      { name: 'الشراكات الاجتماعية', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'عالية', progress: 40, year: 2025, month: 2 },
      { name: 'الدورة الاذاعية', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 1 },
      { name: 'مسابقة أقرأ بالعربية', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 60, year: 2025, month: 3 },
      { name: 'برنامج المقرأة الصباحية', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'عالية', progress: 45, year: 2025, month: 1 },
      { name: 'مسابقة الحديث الشريف', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 55, year: 2025, month: 2 },
      { name: 'مسابقة أوليمبياد الرياضيات', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'قيد التنفيذ', priority: 'عالية', progress: 30, year: 2025, month: 3 },
      { name: 'برنامج صوت قرطبة', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 65, year: 2025, month: 1 },
      { name: 'برنامج علمني الفاتحة', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 1 },
      { name: 'السلال الرمضانية', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 3 },
      { name: 'مسابقة نسمو', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'عالية', progress: 70, year: 2025, month: 2 },
      { name: 'لنجعلها خضراء', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'متوسطة', progress: 100, year: 2025, month: 3 },
      { name: 'مسابقة بيبراس', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'قيد التنفيذ', priority: 'عالية', progress: 55, year: 2025, month: 4 },
      { name: 'التاجر الصغير', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 40, year: 2025, month: 2 },
      { name: 'مهرجان اللغة الصينية', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'مكتملة', priority: 'منخفضة', progress: 100, year: 2025, month: 4 },
      { name: 'رحلة مواد الاعمار', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'مكتملة', priority: 'متوسطة', progress: 100, year: 2025, month: 2 },
      { name: 'رحلة مصنع يورك', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'مكتملة', priority: 'متوسطة', progress: 100, year: 2025, month: 3 },
      { name: 'رحلة الرياض', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 35, year: 2025, month: 4 },
      { name: 'رحلة المدينة المنورة', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'لم تبدأ', priority: 'متوسطة', progress: 0, year: 2025, month: 5 },
      { name: 'الافطار الجماعي', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 3 },
      { name: 'الاحتفال بعيد الفطر', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 3 },
      { name: 'اليوم العالمي للتسامح', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 50, year: 2025, month: 11 },
      { name: 'اليوم العالمي للغة العربية', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'عالية', progress: 60, year: 2025, month: 12 },
      { name: 'يوم التأسيس', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 2 },
      { name: 'خطة النشاط الطلابي', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 1 },
      { name: 'سجل التكريمات', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 45, year: 2025, month: 1 },
      { name: 'معرض السيرة النبوية', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 3 },
      { name: 'دوري كرة القدم', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 70, year: 2025, month: 2 },
      { name: 'مسابقة اقرأ', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'عالية', progress: 55, year: 2025, month: 4 },
      { name: 'مسابقة ختمة رمضان', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 3 },
      { name: 'برنامج أوليمبياد اللغة العربية', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 40, year: 2025, month: 5 },
      { name: 'برنامج أديب قرطبة', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'قيد التنفيذ', priority: 'عالية', progress: 50, year: 2025, month: 1 },
      { name: 'برنامج نعيش آية', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 65, year: 2025, month: 2 },
      { name: 'كسوة عائشة', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 3 },
      { name: 'الروبوت', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'قيد التنفيذ', priority: 'عالية', progress: 75, year: 2025, month: 1 },
      { name: 'مسابقة كاوست', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'قيد التنفيذ', priority: 'عالية', progress: 60, year: 2025, month: 3 },
      { name: 'مسابقة الكانجارو', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'قيد التنفيذ', priority: 'متوسطة', progress: 45, year: 2025, month: 4 },
      { name: 'اليوم العالمي للمهن', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'لم تبدأ', priority: 'متوسطة', progress: 0, year: 2025, month: 6 },
      { name: 'التاجر الذكي', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 30, year: 2025, month: 2 },
      { name: 'مهرجان الخريطة', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'ملغاة', priority: 'منخفضة', progress: 0, year: 2025, month: 4 },
      { name: 'رحلة مصنع ساجا للأدوية', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'مكتملة', priority: 'متوسطة', progress: 100, year: 2025, month: 3 },
      { name: 'رحلات ترفيهية', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'قيد التنفيذ', priority: 'منخفضة', progress: 25, year: 2025, month: 4 },
      { name: 'رحلة سيان', department: 'النشاط الطلابي', employee: 'أحمد عبدالعزيز', status: 'ملغاة', priority: 'منخفضة', progress: 0, year: 2025, month: 5 },
      { name: 'رحلة العمرة', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'عالية', progress: 50, year: 2025, month: 4 },
      { name: 'الاحتفال بعيد الاضحى', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'ملغاة', priority: 'متوسطة', progress: 0, year: 2025, month: 6 },
      { name: 'التهنئة بشهر رمضان', department: 'النشاط الطلابي', employee: 'خالد شعبان', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 2 },
      { name: 'يوم المعلم', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'قيد التنفيذ', priority: 'عالية', progress: 40, year: 2025, month: 10 },
      { name: 'يوم العلم', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'عالية', progress: 100, year: 2025, month: 9 },
      { name: 'اليوم الوطني', department: 'النشاط الطلابي', employee: 'عبدالله مفتي', status: 'مكتملة', priority: 'عاجلة', progress: 100, year: 2025, month: 9 },
    )

    for (const p of programs) {
      await db.program.create({
        data: {
          name: p.name,
          departmentId: deptMap[p.department],
          employeeId: p.employee ? empMap[p.employee] : null,
          status: p.status, priority: p.priority, progress: p.progress,
          year: p.year, month: p.month,
        }
      })
    }

    // ═══ 4. الإعدادات ═══
    await Promise.all([
      db.setting.upsert({ where: { key: 'school_name' }, update: { value: 'مدارس قرطبة الأهلية' }, create: { key: 'school_name', value: 'مدارس قرطبة الأهلية' } }),
      db.setting.upsert({ where: { key: 'current_year' }, update: { value: '2025' }, create: { key: 'current_year', value: '2025' } }),
      db.setting.upsert({ where: { key: 'logo_path' }, update: { value: '/logo-school.png' }, create: { key: 'logo_path', value: '/logo-school.png' } }),
    ])

    // ═══ 5. مستخدم مدير ═══
    await db.user.upsert({
      where: { email: 'admin@qurtubah.edu.sa' }, update: {},
      create: { name: 'مدير مدارس قرطبة', email: 'admin@qurtubah.edu.sa', role: 'admin', active: true }
    })

    // ═══ 6. أهداف شهرية ═══
    for (const g of [
      { title: 'إتمام البرامج المخطط لها', target: 20, achieved: 14, year: 2025, month: 1 },
      { title: 'عقد جلسات توجيهية', target: 30, achieved: 18, year: 2025, month: 1 },
      { title: 'تنفيذ أنشطة طلابية', target: 15, achieved: 10, year: 2025, month: 2 },
      { title: 'إتمام التدريبات', target: 8, achieved: 5, year: 2025, month: 2 },
      { title: 'تحقيق نسبة إنجاز 80%', target: 100, achieved: 65, year: 2025, month: 1 },
    ]) {
      await db.goal.create({ data: g })
    }

    return NextResponse.json({
      status: 'success',
      message: 'تم تهيئة قاعدة البيانات بنجاح ✅',
      stats: { departments: departments.length, employees: employees.length, programs: programs.length }
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'فشل في تهيئة قاعدة البيانات',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    }, { status: 500 })
  }
}
