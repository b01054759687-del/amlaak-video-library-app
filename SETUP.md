<div dir="rtl" style="text-align: right;">

# دليل التثبيت والتهيئة — Amlaak Video Library Setup Guide

يوضح هذا الدليل الخطوات الهندسية التفصيلية لتشغيل وتهيئة منظومة مكتبة الفيديوهات على حساب Google الخاص بشركة أملاك ديزاين.

---

## 🛠️ نمطا التهيئة المعتمدان (Setup Modes)

### النمط (A) — الربط بموارد قائمة مسبقاً (Connect Existing Resources)
إذا كان لديك بالفعل جدول Google Spreadsheet ومجلد Google Drive تم إنشاؤهما مسبقاً:
1. افتح محرر Apps Script.
2. انتقل إلى **Project Settings (علامة الترس) -> Script Properties**.
3. أضف المفاتيح التالية:
   - `SPREADSHEET_ID`: معرّف جدول البيانات.
   - `ROOT_FOLDER_ID`: معرّف مجلد `Amlaak Video Library`.
   - `PROJECT_VIDEOS_FOLDER_ID`: معرّف مجلد `Project Videos`.
   - `MARKETING_CONTENT_FOLDER_ID`: معرّف مجلد `Marketing Content`.
   - `UNIT_DESIGN_PDFS_FOLDER_ID`: معرّف مجلد `Unit Design PDFs`.
   - `TIMEZONE`: `Africa/Cairo`.
   - `SYSTEM_INITIALIZED`: `TRUE`.

---

### النمط (B) — التهيئة الذاتية التلقائية (Automated Setup via `setupSystem`)
وهي الطريقة الموصى بها والمضمونة هندسياً، حيث تقوم المنظومة بإنشاء أو فحص وضبط كافة الجداول والمجلدات تلقائياً بشكل تكراري آمن (Idempotent):

1. أنشئ مشروع Apps Script جديد في [Google Apps Script Console](https://script.google.com).
2. انسخ جميع ملفات المشروع (`.gs` و `.html` و `appsscript.json`) إلى المشروع.
3. في محرر الكود، اختر دالة `Setup.setupSystem` من شريط الأدوات العلوي واضغط **Run**.
4. سيطلب Google منح الصلاحيات (Drive, Spreadsheets, Email) — قم بالموافقة عليها من الحساب المالك (Owner).
5. ستقوم الدالة بالآتي تلقائياً:
   - إنشاء جدول بيانات باسم `Amlaak Video Library — Master Database` بكافة التبويبات الـ 7 والتنسيقات الهندسية وتثبيت شريط العناوين.
   - إنشاء مجلد `Amlaak Video Library` على Google Drive والمجلدات الفرعية الثلاثة:
     * `Project Videos`
     * `Marketing Content`
     * `Unit Design PDFs`
   - تخزين كافة المعرفات الناتجة في `Script Properties`.
   - تسجيل إيميل المنفذ تلقائياً كـ `System Owner` في تبويب `Authorised Users`.
   - تسجيل عملية التهيئة بنجاح في `Audit Log`.

---

## 🔐 متطلب الصلاحيات المسبق على Google Drive (Permission Prerequisite)

</div>

> [!IMPORTANT]
> المنظومة تقوم بإعادة تسمية ونقل **الملف الأصلي نفسه** المرفوع من قِبل المهندس أو المصور (ولا تنشئ نسخة مكررة لتوفير مساحة التخزين ومنع الازدواجية).
> 
> **الشرط الحاسم:** يجب أن يمتلك حساب Google الذي يعمل به تطبيق Apps Script (حساب النشر `Execute-as`) صلاحية **Editor** على ملف الفيديو أو المجلد الذي يحتوي عليه قبل حفظ الرابط داخل المنظومة.
> إذا لم تتوفر هذه الصلاحية، سيرفض النظام حفظ الفيديو مع إظهار رسالة الخطأ المحددة:
> `This file isn't shared with the app account yet — share it with <execute-as email> as Editor and try again`

<div dir="rtl" style="text-align: right;">

---

## 🌐 خطوات النشر كتطبيق ويب (Deploy as Web App)

1. في محرر Apps Script، اضغط على زر **Deploy (نشر)** في الزاوية العلوية اليمنى واختر **New deployment**.
2. اختر النوع: **Web app**.
3. قم بضبط الإعدادات بدقة كالتالي:
   - **Description:** `Amlaak Video Library v2.0 Production`
   - **Execute as:** `Me (المالك / حساب التطبيق)`
   - **Who has access:** `Anyone (الوصول مقيد ومحمي برمجياً بقائمة الإيميلات المعتمدة داخل السيرفر Auth.gs)`
4. اضغط **Deploy**.
5. انسخ رابط تطبيق الويب الناتج (**Web App URL**) واستخدمه للدخول إلى المنظومة.

---

## 👥 إدارة المستخدمين المصرح لهم (Authorised Users)

يتم التحكم في صلاحيات الوصول عبر شيت `Authorised Users` المباشر:

| Email | Active | Role | Added Date |
|---|---|---|---|
| `owner@amlaakdesign.com` | `Yes` | `System Owner` | `2026-09-09 20:00:00` |
| `engineer@amlaakdesign.com` | `Yes` | `Authorised User 1` | `2026-09-09 20:00:00` |
| `marketing@amlaakdesign.com` | `Yes` | `Authorised User 2` | `2026-09-09 20:00:00` |

- لإضافة مستخدم جديد: أضف سطراً جديداً ببريده على Google مع تعيين `Active = Yes`.
- لإلغاء صلاحية أي حساب فوراً: غيّر `Active` إلى `No`.

</div>
