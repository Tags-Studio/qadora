import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEditorStore = create(
  persist(
    (set) => ({
      // الشكل والمظهر
      shape: 'box',
      color: '#ff6b35',
      roughness: 0.4,
      metalness: 0.2,
      autoRotate: true,

      // الشعار (Decal)
      textureUrl: null,
      decalScale: 1,
      decalPositionX: 0,
      decalPositionY: 0,

      // بيئة المشهد
      showGrid: true,
      sceneTheme: 'dark', // 'dark' | 'studio'

      // التصدير
      isExporting: false,

      // ── الدوال ──
      setShape: (shape) => set({ shape }),
      setColor: (color) => set({ color }),
      setRoughness: (roughness) => set({ roughness }),
      setMetalness: (metalness) => set({ metalness }),
      toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),

      setTextureUrl: (textureUrl) => set({ textureUrl }),
      setDecalScale: (decalScale) => set({ decalScale }),
      setDecalPositionX: (decalPositionX) => set({ decalPositionX }),
      setDecalPositionY: (decalPositionY) => set({ decalPositionY }),

      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      setSceneTheme: (sceneTheme) => set({ sceneTheme }),

      triggerExport: () => set({ isExporting: true }),
      finishExport: () => set({ isExporting: false }),

      resetProject: () =>
        set({
          shape: 'box',
          color: '#ff6b35',
          roughness: 0.4,
          metalness: 0.2,
          autoRotate: true,
          textureUrl: null,
          decalScale: 1,
          decalPositionX: 0,
          decalPositionY: 0,
          showGrid: true,
          sceneTheme: 'dark',
          isExporting: false,
        }),
    }),
    {
      name: 'packwave-editor-storage',
      // نستثني isExporting من الحفظ
      partialize: (state) => ({
        shape: state.shape,
        color: state.color,
        roughness: state.roughness,
        metalness: state.metalness,
        autoRotate: state.autoRotate,
        textureUrl: state.textureUrl,
        decalScale: state.decalScale,
        decalPositionX: state.decalPositionX,
        decalPositionY: state.decalPositionY,
        showGrid: state.showGrid,
        sceneTheme: state.sceneTheme,
      }),
    }
  )
);
