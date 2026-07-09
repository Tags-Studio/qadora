# QADORA — Master Prompt / Handoff

> انسخ الملف ده بالكامل في أي شات جديد عشان تكمّل الشغل من غير ما تعيد أي خطوة.
> Repo: **https://github.com/Tags-Studio/qadora** (branch `main`). Push عن طريق GitHub integration
> tool `github.create_or_update_file` (owner=`Tags-Studio`, repo_name=`qadora`, branch=`main`, files=[{path,content}]).

---

## 1) الهدف من المشروع
تطبيق ويب (Vite + React + Three.js) يحاكي **pacdora.com/dielines**:
- صفحة رئيسية فيها كروت، وصفحة قائمة (`DielinePage`) فيها 1928 كارت dieline.
- كل كارت لما يتفتح يودّي **صفحة إيديتور داخلية** (`DielineDetailPage`) زي "Dieline Generator" بتاع pacdora:
  رسمة الـ dieline (Bleed أخضر / Trim أزرق / Crease أحمر) + موديل 3D + أدوات المقاس (L/W/H) والخامة والسماكة + تحميل.

### المشكلة الأصلية اللي اتحلّت
كل الكروت كانت بتفتح **نفس التصميم** لأن الإيديتور كان بيستخدم 6 مولّدات parametric عامة وبيقع على `mailer` fallback.
**الحل النهائي:** نسحب **الهندسة الحقيقية** بتاعة كل dieline من pacdora نفسها (مش صور، مش تخمين).

---

## 2) إزاي استخرجنا الدايلاين من pacdora (الأهم) 🔑

### أ) صفحة القائمة
- `https://www.pacdora.com/dielines` — SPA بيحمّل الداتا وقت التشغيل من API.

### ب) الـ API العام (بدون تسجيل دخول)
Base: `https://www.pacdora.com/api/v2/`

1. **قائمة الموديلات (مصفّحة، عامة):**
   ```
   GET https://www.pacdora.com/api/v2/models?pageSize=100&current=<N>
   ```
   بيرجّع `data[]` وكل عنصر فيه:
   - `num` → رقم القالب الحقيقي في pacdora (المفتاح لكل حاجة)
   - `knife` → صورة الـ dieline (`//cdn.pacdora.com/model/<uuid>.png` أو `.../admin-materials/<uuid>.png` أو `.../preview/dieline-<num>.png`)
   - `image` → رندر 3D
   - `length` / `width` / `height` → **الأبعاد الحقيقية بالمليمتر** ✅
   - `name`, `nameKey`, `keywords`, `demoProjectDataUrl`
   - التصفّح بـ `current=1,2,3...` (كل صفحة 100، مفيش تكرار). الصفحة الفاضية = خلصنا.

2. `GET /api/v2/models/ctree` → شجرة التصنيفات (عام).
3. ⚠️ `GET /api/v2/models/<num>` أو `/details` → **بيطلب Authentication (401/422)** — متستخدمهاش.

### ج) الهندسة الكاملة (2D + 3D) — عامة و CORS مفتوح `*`
```
GET https://cloud.pacdora.com/demoProject/<num>.json     (~5MB, access-control-allow-origin: *)
```
JSON عبارة عن **THREE.js scene** (`Object3D.toJSON` v4.5):
- top-level: `totalX`, `totalY` = مقاس الفرخ (mm)
- `scene`:
  - `scene.shapes[]` = مصفوفة `THREE.Shape`؛ كل شكل `curves[]` فيها `LineCurve {v1,v2}` و `EllipseCurve {aX,aY,xRadius,yRadius,aStartAngle,aEndAngle,aClockwise,aRotation}` — **دي خطوط الـ dieline الحقيقية بالمليمتر → نرسمها SVG vector**.
  - `scene.geometries[]` = ExtrudeGeometry للأوجه.
  - `scene.object` = الموديل 3D المطوي؛ يتحمّل بـ `new THREE.ObjectLoader().parse(scene, onLoad)`.
  - `materials/textures/images` = الخامات (base64 مدمجة).
- بعض الـ nums بترجّع **404** (مش كل قالب عنده demoProject) → نرجع parametric fallback.

### د) صور الـ CDN
```
https://cdn.pacdora.com/image-resize/<N>xauto_outside/...   (N=300 افتراضي؛ ممكن 800/1000/1600/2000)
```
- ملفات مش صور (svg/dxf/json على مسار الصور) بترجّع **403**.

### هـ) مطابقة كروتنا الـ 1928 برقم `num`
- لو `dieline_image` فيه `dieline-<num>` → `num` مباشرة (كان 972، بقى 1023 مع `mockup-<num>`).
- الباقي صورته `model/<uuid>` أو `admin-materials/<uuid>` → نطابق الـ **UUID** مع `knife` في نتائج الـ API ونجيب الـ `num` + الأبعاد.
- الخريطة اتبنت بتعداد صفحات الـ API (helper scripts, مش في الريبو): `/home/user/knife_map.json` (uuid→{num,L,W,H}) و `/home/user/num_map.json` (num→{L,W,H}).

---

## 3) اللي اتعمل (الحالة الحالية)

### الداتا
- `src/data/pacdora_dielines.json` (1928 عنصر). أضفنا لكل عنصر:
  - `num` → **1927/1928** ✅ (باقي id=1378 رابطه فاضي)
  - `L`,`W`,`H` (أبعاد pacdora الحقيقية) → **1908/1928** ✅ (الباقي ~20 معظمهم أكياس pouches num=43xxxx)

### الإيديتور — `src/components/DielineDetailPage.jsx`
- عند فتح كارت: لو عنده `num` → `fetch(https://cloud.pacdora.com/demoProject/<num>.json)`:
  - **2D حقيقي**: يرسم `scene.shapes` كـ SVG paths (LineCurve→L, EllipseCurve→عيّنات). زووم/تحريك.
  - **3D حقيقي**: `THREE.ObjectLoader().parse(scene)` + framing بالـ bounding box.
  - **أبعاد حقيقية**: من `dieline.L/W/H` (والا من bbox).
  - شارة خضرا "Real pacdora structure".
- لو مفيش `num` أو الـ fetch فشل → **parametric fallback** (شارة "Parametric approx.").

### المولّدات (fallback) — `src/utils/dielineGenerators.js`
- 12 مولّد parametric (mailer, straight/reverse tuck, auto-lock, tray, two-piece, window, hexagonal, pillow, sleeve, gable, hanger).
- `deriveDefaults(dieline)`: أبعاد ثابتة seeded من id+name (تُستخدم لو مفيش أبعاد حقيقية).
- `refineType(dieline)`: يخمّن النوع من كلمات الاسم. **مهم:** فحص `handle/carry → gable` قبل `snap/auto lock`.
- `buildParametric3D()` جوه الكومبوننت لموديل الـ fallback.

### باقي الملفات
- `src/App.jsx` (راوتنج بسيط: home/dieline list/detail/editor).
- `src/components/DielinePage.jsx` (القائمة + الفلاتر). `HomePage.jsx`.
- `src/components/Editor/*` (Canvas3D/ControlPanel/PackagingModel) — سيكشن الماكيت المنفصل (@react-three/fiber).

### سجل الـ commits (main)
1. رسم أولي بالصور (اترفض).
2. `399c590` إيديتور parametric.
3. `be5c589` أبعاد مشتقة لكل كارت + refineType.
4. `b8449ad` نسخة الصور الحقيقية (اترفض).
5. `7c49726` رجوع للـ parametric + إصلاح handle→gable.
6. `c3cf230` تحميل الهندسة الحقيقية من demoProject (2D+3D).
7. `26a877b` مطابقة num + أبعاد حقيقية (batch 1: 2000 موديل).

---

## 4) الشغل الباقي (Next steps)
1. **الـ 20 كارت من غير أبعاد**: معظمهم pouches (`num` 43xxxx) — الأبعاد مش L/W/H عادية؛ ممكن تتاخد من `demoProject.totalX/totalY` أو تنسّق شكل خاص للأكياس. + كارت id=1378 رابطه فاضي (يتشال أو يتربط يدوي).
2. **تمييز Crease (أحمر) عن Trim (أزرق)** في الـ 2D الحقيقي: دلوقتي كل خطوط `shapes` بتترسم Trim. لازم نتحقق هل معلومات الطي في `geometries`/طبقة تانية في الـ JSON.
3. **الأداء**: ملف الـ demoProject ~5MB لكل كارت. يُفضّل precompute مسارات الـ 2D وتخزينها (أو proxy/cache) بدل fetch وقت التشغيل.
4. **تأكيد نسبة توفّر demoProject** عبر كل الـ nums (بعضها 404 → fallback).
5. **الأبعاد القابلة للتعديل**: دلوقتي تغيير L/W/H مابيعيدش توليد الشكل الحقيقي (هندسة ثابتة)؛ لو مطلوب تعديل فعلي محتاج parametric حقيقي أو Editor API بتاع pacdora (enterprise/مدفوع).

---

## 5) تعليمات للشات الجديد
- **متعيدش** رسم المولّدات ولا سحب البيانات من الأول — كله متعمل ومرفوع على `main`.
- لو محتاج تعيد بناء خريطة num: عدّي على `GET /api/v2/models?pageSize=100&current=N` واجمع `knife`(uuid)+`num`+`length/width/height`.
- ابدأ من قراءة `src/components/DielineDetailPage.jsx` و `src/data/pacdora_dielines.json`.
- Build check: `cd qadora && npm install && npm run build` (Vite، لازم يعدّي بدون أخطاء).
- Push أي تعديل عبر `github.create_or_update_file` (كذا ملف في commit واحد).
