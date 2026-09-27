"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { UserCircle } from "@phosphor-icons/react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./img-sphere.module.css";

export type ImageData = {
  id: string;
  src: string | null;
  alt: string;
  /* `title` menamai tombolnya untuk screen reader; `caption` yang tampil di layar. */
  title: string;
  caption?: string;
  description?: string;
};

type Props = {
  images: ImageData[];
  ready: boolean;
  reduced?: boolean;
  sphereRadius?: number;
  dragSensitivity?: number;
  momentumDecay?: number;
  hoverScale?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  fallback?: ReactNode;
};

type SphereProps = Required<Pick<Props,
  | "images"
  | "reduced"
  | "sphereRadius"
  | "dragSensitivity"
  | "momentumDecay"
  | "hoverScale"
  | "autoRotate"
  | "autoRotateSpeed"
>>;

function spherePositions(count: number, radius: number) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / Math.max(1, count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * index + 0.36;

    return [
      Math.cos(theta) * ring * radius,
      y * radius,
      Math.sin(theta) * ring * radius,
    ] as [number, number, number];
  });
}

function connectionPairs(positions: [number, number, number][]) {
  const pairs = new Set<string>();

  positions.forEach((point, index) => {
    const nearest = positions
      .map((candidate, candidateIndex) => ({
        candidateIndex,
        distance:
          (point[0] - candidate[0]) ** 2 +
          (point[1] - candidate[1]) ** 2 +
          (point[2] - candidate[2]) ** 2,
      }))
      .filter(({ candidateIndex }) => candidateIndex !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    nearest.forEach(({ candidateIndex }) => {
      const [from, to] = index < candidateIndex
        ? [index, candidateIndex]
        : [candidateIndex, index];
      pairs.add(`${from}:${to}`);
    });
  });

  return Array.from(pairs, (pair) => pair.split(":").map(Number) as [number, number]);
}

function PhotoCard({ item, hoverScale }: { item: ImageData; hoverScale: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      className={styles.card}
      aria-label={item.title}
      style={{ "--hover-scale": hoverScale } as CSSProperties}
    >
      <span className={styles.photo}>
        {item.src && !failed ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.src} alt={item.alt} onError={() => setFailed(true)} />
        ) : (
          <UserCircle aria-hidden="true" weight="light" />
        )}
      </span>
      <span className={styles.caption}>{item.caption ?? item.title}</span>
    </button>
  );
}

function Sphere({
  images,
  reduced,
  sphereRadius,
  dragSensitivity,
  momentumDecay,
  hoverScale,
  autoRotate,
  autoRotateSpeed,
}: SphereProps) {
  const positions = useMemo(
    () => spherePositions(images.length, sphereRadius),
    [images.length, sphereRadius]
  );
  const connections = useMemo(() => connectionPairs(positions), [positions]);
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <ambientLight intensity={1.2} />
      <group rotation={[0.08, -0.22, 0]}>
        <mesh>
          <sphereGeometry args={[sphereRadius, 24, 16]} />
          <meshBasicMaterial color="#f2f2f4" transparent opacity={0.045} />
        </mesh>
        <mesh>
          <sphereGeometry args={[sphereRadius, 18, 12]} />
          <meshBasicMaterial
            color="#8f8f8f"
            transparent
            opacity={0.18}
            wireframe
          />
        </mesh>
        {connections.map(([from, to]) => (
          <Line
            key={`${from}-${to}`}
            points={[positions[from], positions[to]]}
            color="#5b7cff"
            transparent
            opacity={0.34}
            lineWidth={0.7}
          />
        ))}
        {images.map((item, index) => (
          <group key={item.id} position={positions[index]}>
            <Html center transform sprite distanceFactor={2.35} zIndexRange={[30, 0]}>
              <PhotoCard item={item} hoverScale={hoverScale} />
            </Html>
          </group>
        ))}
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={!reduced}
        enableDamping
        dampingFactor={1 - momentumDecay}
        rotateSpeed={dragSensitivity}
        autoRotate={autoRotate && !reduced && !dragging}
        autoRotateSpeed={autoRotateSpeed}
        minPolarAngle={Math.PI * 0.24}
        maxPolarAngle={Math.PI * 0.76}
        onStart={() => setDragging(true)}
        onEnd={() => setDragging(false)}
      />
    </>
  );
}

export default function SphereImageGrid({
  images,
  ready,
  reduced = false,
  sphereRadius = 2.15,
  dragSensitivity = 0.72,
  momentumDecay = 0.92,
  hoverScale = 1.08,
  autoRotate = true,
  autoRotateSpeed = 0.2,
  fallback,
}: Props) {
  if (!ready || images.length === 0) return null;

  return (
    <div className={styles.root} aria-label="Kumpulan foto alumni dalam bentuk bola interaktif">
      <Canvas
        camera={{ position: [0, 0, 6.7], fov: 34 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        fallback={fallback}
      >
        <Sphere
          images={images}
          reduced={reduced}
          sphereRadius={sphereRadius}
          dragSensitivity={dragSensitivity}
          momentumDecay={momentumDecay}
          hoverScale={hoverScale}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
        />
      </Canvas>
    </div>
  );
}
