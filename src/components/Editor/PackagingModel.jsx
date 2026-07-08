import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Decal, RoundedBox } from '@react-three/drei';
import { useEditorStore } from '../../store/useEditorStore';

// ─── مكون الشعار (Decal) ───────────────────────────────────────────────
function DecalLogo() {
  const textureUrl = useEditorStore((s) => s.textureUrl);
  const decalScale = useEditorStore((s) => s.decalScale);
  const decalPositionX = useEditorStore((s) => s.decalPositionX);
  const decalPositionY = useEditorStore((s) => s.decalPositionY);

  const texture = useTexture(textureUrl);

  return (
    <Decal
      position={[decalPositionX, decalPositionY, 1.02]}
      rotation={[0, 0, 0]}
      scale={decalScale * 1.5}
      map={texture}
      depthTest={false}
    />
  );
}

// ─── المجسم الأسطواني ──────────────────────────────────────────────────
function CylinderModel({ materialProps, textureUrl }) {
  return (
    <mesh castShadow>
      <cylinderGeometry args={[1, 1, 2.5, 64]} />
      <meshStandardMaterial {...materialProps} />
      {textureUrl && (
        <Suspense fallback={null}>
          <DecalLogo />
        </Suspense>
      )}
    </mesh>
  );
}

// ─── المجسم الرئيسي ────────────────────────────────────────────────────
export default function PackagingModel() {
  const groupRef = useRef();

  const shape = useEditorStore((s) => s.shape);
  const color = useEditorStore((s) => s.color);
  const roughness = useEditorStore((s) => s.roughness);
  const metalness = useEditorStore((s) => s.metalness);
  const autoRotate = useEditorStore((s) => s.autoRotate);
  const textureUrl = useEditorStore((s) => s.textureUrl);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  const materialProps = { color, roughness, metalness };

  return (
    <group ref={groupRef}>
      {shape === 'box' && (
        <RoundedBox args={[2, 2.5, 2]} radius={0.06} smoothness={6} castShadow>
          <meshStandardMaterial {...materialProps} />
          {textureUrl && (
            <Suspense fallback={null}>
              <DecalLogo />
            </Suspense>
          )}
        </RoundedBox>
      )}

      {shape === 'cylinder' && (
        <CylinderModel materialProps={materialProps} textureUrl={textureUrl} />
      )}

      {shape === 'bag' && (
        <RoundedBox args={[1.8, 2.8, 0.6]} radius={0.12} smoothness={6} castShadow>
          <meshStandardMaterial {...materialProps} />
          {textureUrl && (
            <Suspense fallback={null}>
              <DecalLogo />
            </Suspense>
          )}
        </RoundedBox>
      )}
    </group>
  );
}
