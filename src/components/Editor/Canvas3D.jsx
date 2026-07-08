import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';
import { Suspense } from 'react';
import PackagingModel from './PackagingModel';
import { useEditorStore } from '../../store/useEditorStore';

// ─── معالج التصدير (داخل سياق Canvas) ─────────────────────────────────
function CaptureHandler() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const isExporting = useEditorStore((s) => s.isExporting);
  const finishExport = useEditorStore((s) => s.finishExport);

  useFrame(() => {
    if (!isExporting) return;

    // ارسم المشهد بدقة عالية
    gl.setSize(1920, 1080, false);
    gl.render(scene, camera);

    const dataURL = gl.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'packwave-render.png';
    link.click();

    // أعد الحجم الأصلي
    gl.setSize(gl.domElement.parentElement?.clientWidth || window.innerWidth, gl.domElement.parentElement?.clientHeight || window.innerHeight, false);

    finishExport();
  });

  return null;
}

// ─── المشهد الرئيسي ────────────────────────────────────────────────────
export default function Canvas3D() {
  const showGrid = useEditorStore((s) => s.showGrid);
  const sceneTheme = useEditorStore((s) => s.sceneTheme);

  const isDark = sceneTheme === 'dark';
  const bgColor = isDark ? '#0f0e0c' : '#f0ede8';
  const gridColor = isDark ? '#2a2a2a' : '#c5bfba';
  const gridSectionColor = isDark ? '#444' : '#8a8480';

  return (
    <Canvas
      shadows
      camera={{ position: [4, 3, 5], fov: 50 }}
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
      style={{ background: bgColor }}
    >
      <ambientLight intensity={isDark ? 0.4 : 0.8} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={isDark ? 1.8 : 1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 3, -3]} intensity={0.3} />

      <Suspense fallback={null}>
        <PackagingModel />
        <Environment preset={isDark ? 'city' : 'studio'} />
      </Suspense>

      <ContactShadows
        position={[0, -1.6, 0]}
        opacity={isDark ? 0.6 : 0.3}
        scale={20}
        blur={2.5}
        far={5}
      />

      {showGrid && (
        <Grid
          position={[0, -1.62, 0]}
          args={[40, 40]}
          cellSize={0.8}
          cellThickness={0.4}
          cellColor={gridColor}
          sectionSize={4}
          sectionThickness={1}
          sectionColor={gridSectionColor}
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid
        />
      )}

      <CaptureHandler />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}
