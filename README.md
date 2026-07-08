# Packwave — 3D Packaging Editor

محرر تغليف ثلاثي الأبعاد احترافي مستوحى من [Pacdora](https://pacdora.com)، مبني بـ React + Three.js.

## ✨ المميزات

- **3D حقيقي** — WebGL عبر React Three Fiber
- **3 أشكال عبوات** — صندوق، أسطوانة، كيس مسطح
- **12 لون + منتقي مخصص** مع خامة PBR (خشونة + لمعان)
- **رفع الشعار (Decal)** — يلتصق بالمجسم ويدور معه
- **بيئتا إضاءة** — City (غامق) / Studio (فاتح)
- **تصدير PNG 1920×1080** مباشرةً من WebGL
- **توليد Dielines SVG** — قالب قطع وطي جاهز للطباعة
- **حفظ تلقائي** في LocalStorage

## 🚀 تشغيل محلي

> **متطلب:** Node.js v18+

```bash
npm install
npm run dev
```

افتح المتصفح على: **http://localhost:5173**

## 🛠️ التقنيات

| التقنية | الاستخدام |
|---------|-----------|
| React 18 + Vite 5 | البنية التحتية |
| @react-three/fiber | محرك WebGL |
| @react-three/drei | مكونات 3D جاهزة |
| Zustand v5 + persist | إدارة الحالة |
| Vanilla CSS | نظام التصميم |

## 📦 بنية المشروع

```
src/
├── store/
│   └── useEditorStore.js      # Zustand store
└── components/Editor/
    ├── Canvas3D.jsx           # مشهد WebGL
    ├── PackagingModel.jsx     # المجسمات ثلاثية الأبعاد
    ├── ControlPanel.jsx       # لوحة التحكم
    └── DielineGenerator.js   # مولّد SVG للطباعة
```

## 📄 رخصة

MIT
