"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import type { Group } from "three";

const WRAP = ["#c62828", "#1b7a45", "#e0b43a", "#f4efe4", "#8d1d2c"];

function Tree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 0.55, 6]} />
        <meshStandardMaterial color="#6b3a1f" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.62, 1.05, 8]} />
        <meshStandardMaterial color="#145c34" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[0.46, 0.9, 8]} />
        <meshStandardMaterial color="#1d7a45" />
      </mesh>
      <mesh position={[0, 2.08, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#f0c14a" emissive="#f0c14a" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function Gift({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.1, 0.58, 0.58]} />
        <meshStandardMaterial color="#f0c14a" />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.58, 0.58, 0.1]} />
        <meshStandardMaterial color="#f0c14a" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.22, 0.12, 0.16]} />
        <meshStandardMaterial color="#f0c14a" />
      </mesh>
    </group>
  );
}

function Cottage() {
  return (
    <group position={[0, 0, -6]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.4, 1.4, 1.8]} />
        <meshStandardMaterial color="#f3e6d0" />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <coneGeometry args={[1.85, 1.15, 4]} />
        <meshStandardMaterial color="#8d1d2c" />
      </mesh>
      <mesh position={[0.7, 1.85, 0.15]}>
        <boxGeometry args={[0.28, 0.55, 0.28]} />
        <meshStandardMaterial color="#6b3a1f" />
      </mesh>
      <mesh position={[0, 0.48, 0.92]}>
        <boxGeometry args={[0.46, 0.9, 0.06]} />
        <meshStandardMaterial color="#6b2a1a" />
      </mesh>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.95, 0.92]}>
          <boxGeometry args={[0.4, 0.42, 0.06]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={0.85} />
        </mesh>
      ))}
      <pointLight position={[0, 1.1, 1.4]} color="#ffb347" intensity={8} distance={8} />
    </group>
  );
}

function Snow({ frozen }: { frozen: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (frozen || !ref.current) return;
    ref.current.children.forEach((flake, i) => {
      flake.position.y -= delta * (0.45 + (i % 6) * 0.16);
      if (flake.position.y < 0) flake.position.y = 9;
    });
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 80 }, (_, i) => (
        <mesh
          key={i}
          position={[((i * 47) % 180) / 10 - 9, (i * 1.37) % 9, ((i * 29) % 260) / 10 - 18]}
        >
          <sphereGeometry args={[0.028 + (i % 4) * 0.012, 5, 5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

function World({
  progress,
  frozen,
}: {
  progress: { current: number };
  frozen: boolean;
}) {
  const village = useRef<Group>(null);

  useFrame(() => {
    if (frozen || !village.current) return;
    village.current.position.z = progress.current * 14;
  });

  const gifts: [number, number, number][] = [
    [-1.4, 0, 1.6],
    [1.25, 0, 0.3],
    [-1.55, 0, -2.1],
    [1.6, 0, -3.1],
    [1.7, 0, -8.4],
    [-1.7, 0, -9.2],
  ];

  return (
    <>
      <mesh position={[-6.5, 6.4, -16]}>
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshStandardMaterial color="#f7fbff" emissive="#d5e4ff" emissiveIntensity={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
        <planeGeometry args={[30, 50]} />
        <meshStandardMaterial color="#e7f3f8" />
      </mesh>
      <group ref={village}>
        <Cottage />
        <Tree position={[0, 0, -13.5]} scale={1.75} />
        {Array.from({ length: 7 }, (_, i) => (
          <Tree
            key={`l-${i}`}
            position={[-3.6, 0, 5 - i * 3.5]}
            scale={0.85 + (i % 3) * 0.12}
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <Tree
            key={`r-${i}`}
            position={[3.6, 0, 3.2 - i * 3.5]}
            scale={0.8 + (i % 2) * 0.22}
          />
        ))}
        {gifts.map((position, i) => (
          <Gift key={i} position={position} color={WRAP[i % WRAP.length]!} />
        ))}
      </group>
      <Snow frozen={frozen} />
    </>
  );
}

export function Scene({
  progress,
  frozen,
}: {
  progress: { current: number };
  frozen: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.6, 8.2], fov: 52 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      frameloop={frozen ? "demand" : "always"}
    >
      <color attach="background" args={["#07140f"]} />
      <fog attach="fog" args={["#07140f", 12, 34]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[-6, 8, 4]} intensity={1.15} color="#d7e6ff" />
      <pointLight position={[0, 3.2, -12]} color="#f0c14a" intensity={10} distance={14} />
      <Stars radius={60} depth={24} count={400} factor={2.5} fade speed={frozen ? 0 : 0.25} />
      <World progress={progress} frozen={frozen} />
    </Canvas>
  );
}
