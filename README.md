<div dir="rtl" style="text-align: right;">

# منظومة مكتبة الفيديوهات والتصاميم الهندسية — Amlaak Video Library (Production v2.0)

منظومة سحابية متكاملة فائقة السرعة والأمان، تعتمد معمارية الإنتاج المنفصلة (Decoupled Production Architecture):
**GitHub Pages Frontend → Google Cloud Run REST API → Google Sheets Database + Google Drive Storage**

تم تطويرها خصيصاً لأرشفة وإدارة وتتبع نسخ (Versioning) فيديوهات مشاريع التشطيبات الفاخرة والمحتوى التسويقي ومخططات التصميم المعماري لشركة **أملاك ديزاين (Amlaak Design)**.

---

## 🌐 روابط ومعلومات التشغيل والإنتاج

- **رابط الواجهة الرئيسية (GitHub Pages)**:
  `https://b01054759687-del.github.io/amlaak-video-library-app/`
- **مستودع الأكواد (GitHub Repository)**:
  `https://github.com/b01054759687-del/amlaak-video-library-app`
- **منظومة الطوارئ والرجوع (Rollback Apps Script Web App)**:
  `https://script.google.com/macros/s/AKfycbzfCQrVU-9gHJqBYHFIGWVwWcWXeNWnV1dRe7HiCtY65xldx0AvO8iRObhR8pBrPLAjXg/exec`
- **معرف جدول البيانات (Google Spreadsheet ID)**:
  `1KLsNGiIGSyd2vTz95Qmfw0np6jayX-JJZWX3wmmgzZ4`
- **معرف مجلد التخزين (Google Drive Root Folder ID)**:
  `172YFf4GteBT5x_WxQxr-ldo79f0XuRrh`
- **حساب المالك الأساسي (System Owner)**:
  `louyashra@gmail.com`

---

## 🎯 الأهداف المعمارية والقرارات المعتمدة

1. **القرار (A) — تصنيف الأعمال الهندسية (Work Category):**
   - حقل مستقل تماماً ومنفصل عن نوع الفراغ (`Space Type`).
   - يتضمن 15 تصنيفاً هندسياً معتمداً لقطاع التشطيبات.
   - مستبعد تماماً وبشكل صارم من اسم الملف الفيزيائي على Google Drive، مع دعمه الكامل في الفلاتر والتقارير.

2. **القرار (B) — تتبع نسخ مخططات التصميم (Design PDF Versioning):**
   - مخطط التصميم (PDF) يتبع الوحدة المعمارية (`Unit ID`).
   - يحفظ سجل النسخ المتسلسل (`V01`, `V02`) مع حالة (`Current` مقابل `Previous`).
   - رفع نسخة جديدة يقلب النسخة السابقة إلى `Previous` دون حذف أو تعديل الملف الفيزيائي السابق على Drive.

3. **القرار (C) — نشر تعديلات الوحدة وإعادة التسمية المجمعة (Batch Rename):**
   - تحديث بيانات الوحدة الأساسية ينتشر تلقائياً لجميع الصفوف المرتبطة لمنع تباين البيانات.
   - التحقق وتأكيد إعادة تسمية الملفات على Drive بشاشة مراجعة مجمعة موحدة وتوثيقها في `Audit Log`.

4. **إزالة Play CDN والاعتماد على حزمة CSS مجمعة مسبقاً (Zero CDN Runtime):**
   - استبدال `cdn.tailwindcss.com` بملف `src/styles/main.css` خفيف الوزن ومستقل 100%.

5. **فصل الواجهة الثابتة عن الخادم والتحقق الصارم من الهوية (GIS + Cloud Run):**
   - صفر بيانات اعتماد أو مفاتيح سرية في المتصفح.
   - التحقق من الـ Bearer Token في كل طلب ومطابقة البريد مع جدول `Authorised_Users`.

---

## 🏗️ المعمارية التقنية للمنظومة

</div>

```
[ Client Browser (Desktop / Mobile) ]
                 |
                 | HTTPS / TLS 1.3
                 v
     +-----------------------+
     |  GitHub Pages CDN     |  <-- frontend/ (100% English LTR, Precompiled CSS)
     +-----------------------+
                 |
                 | REST API (/api/v1/...) with Bearer JWT
                 v
     +-----------------------+
     |   Google Cloud Run    |  <-- backend/ (Node.js Container, Google Auth)
     +-----------------------+
            |         |
            |         +----------------------------------+
            v                                            v
+------------------------+                   +------------------------+
| Google Sheets Database |                   |   Google Drive Store   |
| (1KLsNGiIGSyd...gzZ4)  |                   | (172YFf4GteBT...uRrh)  |
+------------------------+                   +------------------------+
```

<div dir="rtl" style="text-align: right;">

---

## 📁 هيكل المستودع بعد الترقية

- `frontend/`: كود الواجهة الأمامية المستقلة لـ GitHub Pages (HTML5, Vanilla JS Modules, Precompiled CSS, Google Identity Services).
- `backend/`: خادم الـ REST API المعبأ داخل حاوية Docker الجاهزة لـ Google Cloud Run.
- `.github/workflows/`: خطوط النشر المؤتمتة لـ GitHub Pages (`deploy-frontend.yml`) و Cloud Run (`deploy-backend.yml`).
- `dist/`: حزمة Apps Script المعتمدة المحفوظة كمنظومة رجوع وطوارئ كاملة.
- `tests/`: حزم الاختبارات المؤتمتة الشاملة (71 اختباراً ناجحاً بنسبة 100%).
- `ARCHITECTURE.md`: التوثيق المعماري الشامل وتدفق البيانات.
- `API-CONTRACT.md`: مواصفات نقاط اتصال الـ REST API ونماذج الطلبات والاستجابات.
- `AUTHENTICATION.md`: تفاصيل منظومة التوثيق والصلاحيات (GIS & Bearer Tokens).
- `SECURITY.md`: ميثاق الأمان وحماية البيانات والتحقق من الهوية.
- `ROLLBACK.md`: إجراءات الرجوع التشغيلي الفوري عند الطوارئ.

---

## 🧪 تشغيل الاختبارات المؤتمتة الشاملة

</div>

```bash
# 1. اختبارات الوحدة لمنطق التسمية والترقيم والقرارات الهندسية (44 اختباراً)
node tests/unit-tests.js

# 2. اختبارات المحاكاة التكاملية لـ Drive و Sheets ونشر البيانات (7 اختبارات)
node tests/integration-simulation.js

# 3. اختبارات الـ REST API ونقاط اتصال الخادم والأمان (13 اختباراً)
node backend/tests/backend.test.js

# 4. اختبارات الواجهة الأمامية المستقلة والـ LTR والأمان (7 اختبارات)
node frontend/tests/frontend.test.js
```

<div dir="rtl" style="text-align: right;">

**النتيجة الإجمالية**: 71 اختباراً مؤتمتاً ناجحاً بنسبة 100% بدون أي أخطاء أو انحراف عن المعايير المعتمدة.

</div>
