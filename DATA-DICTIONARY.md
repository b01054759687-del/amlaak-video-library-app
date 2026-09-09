<div dir="rtl" style="text-align: right;">

# قاموس البيانات ومخطط الجداول — Amlaak Video Library Data Dictionary

يوثق هذا المستند الهيكل الدقيق لقاعدة البيانات السحابية المبنية على Google Sheets، موضحاً أسماء الأعمدة، نوع البيانات، والقيود الهندسية لكل تبويب.

---

## 1. جدول الوحدات والعملاء (`Units`)

يمثل كل سطر وحدة معمارية مستقلة للعميل (سكنية أو تجارية). الوحدة هي الكيان الأب (`Parent Record`) الذي ترتبط به الفيديوهات ومخططات التصميم.

| اسم العمود (Header) | نوع البيانات | القيود والوصف |
|---|---|---|
| `Unit ID` | String | المفتاح الأساسي للوحدة (Primary Key). فريد وغير قابل للتعديل (`U-0001`, `U-0002`). |
| `Client Name` | String | مطلوب. اسم العميل الكامل. |
| `Location` | String | مطلوب. المنطقة الجغرافية (نص حر مع إكمال تلقائي وتوحيد المسافات). |
| `Unit Type` | String | مطلوب. أحد الخيارات الـ 15 المعتمدة من القائمة. |
| `Area (SQM)` | Number | اختياري. مساحة الوحدة بالمتر المربع (رقم موجب). |
| `Created Date` | DateTime | تاريخ ووقت تسجيل الوحدة في المنظومة (`YYYY-MM-DD HH:mm:ss`). |
| `Created By` | String | البريد الإلكتروني للمستخدم الذي أنشأ الوحدة. |
| `Updated Date` | DateTime | تاريخ ووقت آخر تعديل على سجل الوحدة. |
| `Updated By` | String | البريد الإلكتروني للمستخدم الذي قام بآخر تعديل. |

> **قاعدة القرار C:** أي تعديل في الحقول (`Client Name`, `Location`, `Unit Type`, `Area`) ينتشر تلقائياً لجميع الصفوف في شيت الفيديوهات والـ PDFs التي تحمل نفس `Unit ID`.

---

## 2. جدول نسخ الفيديوهات (`Video Versions`)

يمثل كل سطر نسخة ملف فيديو فيزيائية حقيقية مخزنة على Google Drive.

| اسم العمود (Header) | نوع البيانات | القيود والوصف |
|---|---|---|
| `Video Number` | String | معرّف الفيديو المنطقي الموحد (`0001`, `0002`). تشترك فيه جميع نسخ نفس الفيديو. |
| `Version Number` | String | رقم النسخة الفيزيائية (`V01`, `V02`, `V03`). المفتاح المنطقي هو (`Video Number + Version Number`). |
| `Is Current Version` | String | `Yes` للنسخة الحالية النشطة، و `No` للنسخ السابقة. توجد نسخة واحدة فقط بحالة `Yes` لكل فيديو. |
| `Version Notes` | String | سبب التعديل أو وصف النسخة (مثلاً: تعديل ألوان، ريلز عمودي، إلخ). |
| `Video Name` | String | اسم الملف الفيزيائي المعتمد والمطابق لقواعد التسمية (§12) على Google Drive. |
| `Video Source` | String | مصدر الفيديو: إما `Project Video` أو `Marketing Content`. |
| `Unit ID` | String | كود الوحدة المرتبطة (إلزامي لفيديوهات المشاريع، وفارغ للمحتوى التسويقي). |
| `Content Type` | String | نوع المحتوى التسويقي (`Educational`, `Demonstration`, إلخ) — خاص بالماركتنج. |
| `Topic` | String | موضوع الفيديو التسويقي — خاص بالماركتنج. |
| `Client Name` | String | اسم العميل (نسخة ميتاداتا مستنسخة من الوحدة). |
| `Location` | String | المنطقة الجغرافية (نسخة ميتاداتا مستنسخة من الوحدة). |
| `Unit Type` | String | نوع الوحدة (نسخة ميتاداتا مستنسخة من الوحدة). |
| `Area (SQM)` | Number | مساحة الوحدة. |
| `Project Video Type` | String | مرحلة الفيديو الهندسية (`Red Brick`, `Phase 1`, `Final with Furniture`, إلخ). |
| `Space Type` | String | نوع الفراغ المعماري (`Reception`, `Kitchen`, `Full Unit`, إلخ). |
| `Work Category` | String | **القرار A (مؤكد):** تصنيف الأعمال المستقل (`Roof`, `Electrical`, `Gypsum Board`, إلخ). |
| `Shooting Date` | Date | تاريخ التصوير الفعلي للمحتوى (`YYYY-MM-DD`). |
| `Video Link` | String | الرابط المباشر للملف على Google Drive. |
| `Drive File ID` | String | معرّف الملف الفريد على Google Drive (Unique Key لمنع تكرار رفع نفس الملف). |
| `Original File Name`| String | اسم الملف الأصلي قبل إعادة التسمية بواسطة المنظومة. |
| `Duration` | String | مدة الفيديو (قد تكون فارغة وفق §7.2 ولا تعطل الحفظ). |
| `Orientation` | String | اتجاه الفيديو (`Landscape` أو `Portrait`)، يُستنتج فقط إذا توفر العرض والارتفاع. |
| `File Type` | String | نوع الـ MIME Type للملف (`video/mp4`, إلخ). |
| `File Size` | Number | حجم الملف بالبايت. |
| `Added Date` | DateTime | تاريخ ووقت تسجيل هذه النسخة في المنظومة. |
| `Added By` | String | إيميل المستخدم الذي سجل هذه النسخة. |
| `Updated Date` | DateTime | تاريخ آخر تعديل. |
| `Updated By` | String | إيميل القائم بآخر تعديل. |

---

## 3. جدول مخططات التصميم المعماري (`Unit Design PDFs`)

يمثل كل سطر مخطط تصميم هندسي (PDF) مرتبط بالوحدة مع حفظ سجل النسخ الكامل (وفق القرار B المؤكد).

| اسم العمود (Header) | نوع البيانات | القيود والوصف |
|---|---|---|
| `PDF Record ID` | String | معرّف سجل المستند الفريد (`DOC-U0001-V01`). |
| `Unit ID` | String | كود الوحدة الأب التي يتبعها التصميم (`U-0001`). |
| `Document Title` | String | عنوان المخطط الهندسي المعتمد. |
| `PDF Link` | String | رابط الملف على Google Drive. |
| `Drive File ID` | String | معرّف ملف الـ PDF الفريد على Google Drive. |
| `Original File Name`| String | اسم ملف الـ PDF الأصلي. |
| `File Type` | String | نوع الملف (`application/pdf`). |
| `File Size` | Number | حجم الملف بالبايت. |
| `PDF Number` | String | معرّف منطقي للمخطط (`PDF-0001`). |
| `PDF Version Number`| String | رقم النسخة للمخطط (`V01`, `V02`). |
| `Is Current Version`| String | `Yes` للنسخة الأحدث المعتمدة، و `No` للنسخ السابقة. |
| `Version Notes` | String | ملاحظات المراجعة المعمارية. |
| `Added Date` | DateTime | تاريخ الرفع والتسجيل. |
| `Added By` | String | إيميل المهندس الذي رفع المخطط. |
| `Updated Date` | DateTime | تاريخ آخر تعديل. |
| `Updated By` | String | إيميل القائم بالتعديل. |

---

## 4. الجداول المساندة (`Lists`, `Users`, `Audit`, `Config`)

- **`Lists`**: يحتوي أعمدة التصنيفات المعتمدة الستة (Video Source, Unit Type, Project Video Type, Space Type, Marketing Content Type, Work Category).
- **`Authorised Users`**: يحتوي `Email`, `Active` (Yes/No), `Role` (System Owner, Authorised User 1, Authorised User 2), `Added Date`.
- **`Audit Log`**: يحتوي `Timestamp`, `User`, `Action`, `Entity Type`, `Entity ID`, `Drive File ID`, `Result`, `Error Code`, `Safe Message`.
- **`System Config`**: يحتوي `Key`, `Value`, `Description`, `Updated Date`.

</div>
