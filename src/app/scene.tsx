"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import {
  CanvasTexture,
  MathUtils,
  SRGBColorSpace,
  Shape,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Texture,
} from "three";

type Vec3 = [number, number, number];

const WRAP = ["#c62828", "#1b7a45", "#e0b43a", "#f4efe4", "#8d1d2c"];

// ---------- Santa ----------

// 0-3 run, 4-5 stand, 6 shush. All sprites face right; flip with scale.x.
const FRAMES = ["run_01", "run_02", "run_03", "run_04", "stand_01", "stand_02", "shush"];
const SANTA_H = 2.1;
const SANTA_Z = 1.3;
const SPEED = 3.4;

type Stop = { x: number; wait?: number; pose?: "stand" | "shush" };
// Loops: sneaks in from the right, checks the coast, hits the house, bolts
// off left, then comes back for the sleigh. First and last stop are offscreen.
const ROUTE: Stop[] = [
  { x: 9.5 },
  { x: 2.4, wait: 1.8, pose: "shush" },
  { x: -0.4, wait: 1, pose: "stand" },
  { x: -3, wait: 2.4, pose: "shush" },
  { x: -9.5 },
  { x: 3.4, wait: 1.6, pose: "stand" },
  { x: 9.5 },
];

const prepTextures = (t: Texture | Texture[]) =>
  [t].flat().forEach((x) => (x.colorSpace = SRGBColorSpace));

function Santa({ x: xRef, frozen }: { x: { current: number }; frozen: boolean }) {
  const tex = useTexture(FRAMES.map((f) => `/santa/${f}.png`), prepTextures);
  const mesh = useRef<Mesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const s = useRef({
    i: 1,
    wait: 0,
    t: 0,
    face: -1,
    pose: (frozen ? "shush" : "run") as "run" | "stand" | "shush",
  });

  useFrame((_, delta) => {
    if (frozen || !mesh.current || !mat.current) return;
    const dt = Math.min(delta, 0.05);
    const st = s.current;
    st.t += dt;

    if (st.wait > 0) {
      st.wait -= dt;
      if (st.wait <= 0) st.pose = "run";
    } else {
      const stop = ROUTE[st.i]!;
      const d = stop.x - xRef.current;
      const step = SPEED * dt;
      if (Math.abs(d) <= step) {
        xRef.current = stop.x;
        st.wait = stop.wait ?? 0;
        if (st.wait) st.pose = stop.pose ?? "stand";
        st.i = (st.i + 1) % ROUTE.length;
      } else {
        st.face = Math.sign(d);
        xRef.current += st.face * step;
      }
    }

    const frame =
      st.pose === "run"
        ? Math.floor(st.t * 10) % 4
        : st.pose === "shush"
          ? 6
          : 4 + (Math.floor(st.t * 1.5) % 2);
    mat.current.map = tex[frame]!;
    mesh.current.position.x = xRef.current;
    mesh.current.scale.x = st.face;
  });

  return (
    <mesh
      ref={mesh}
      position={[frozen ? 0.8 : 9.5, SANTA_H / 2 - 0.15, SANTA_Z]}
      scale-x={-1}
    >
      <planeGeometry args={[SANTA_H * 0.75, SANTA_H]} />
      <meshBasicMaterial
        ref={mat}
        map={tex[frozen ? 6 : 0]!}
        transparent
        alphaTest={0.02}
        color="#d9dcef"
      />
    </mesh>
  );
}

// ---------- Props ----------

function Tree({ position, scale = 1 }: { position: Vec3; scale?: number }) {
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

function Gift({ position, color, scale = 1 }: { position: Vec3; color: string; scale?: number }) {
  return (
    <group position={position} scale={scale}>
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

// Block-letter M, 0.9 x 0.85, origin at its bottom-left corner.
const M_SHAPE = new Shape();
[
  [0, 0], [0.2, 0], [0.2, 0.5], [0.45, 0.2], [0.7, 0.5], [0.7, 0], [0.9, 0], [0.9, 0.85],
  [0.7, 0.85], [0.45, 0.5], [0.2, 0.85], [0, 0.85],
].forEach(([x, y], i) => (i ? M_SHAPE.lineTo(x!, y!) : M_SHAPE.moveTo(x!, y!)));

function makeLabel() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  const fill = g.createLinearGradient(0, 40, 0, 125);
  fill.addColorStop(0, "#fff3c4");
  fill.addColorStop(1, "#f0c14a");
  g.fillStyle = fill;
  g.font = "bold 118px Georgia, 'Times New Roman', serif";
  g.fillText("Central", 6, 125);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function Smoke({ position, frozen }: { position: Vec3; frozen: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (frozen || !ref.current) return;
    ref.current.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.25 + i / 5) % 1;
      const m = c as Mesh;
      m.position.set(Math.sin(t * 5 + i) * 0.12 + t * 0.5, t * 1.8, 0);
      m.scale.setScalar(0.12 + t * 0.35);
      (m.material as MeshBasicMaterial).opacity = 0.5 * (1 - t);
    });
  });
  if (frozen) return null;
  return (
    <group ref={ref} position={position}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#cfd8e3" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Hotel({ frozen }: { frozen: boolean }) {
  const tv = useRef<MeshStandardMaterial>(null);
  const label = useMemo(() => makeLabel(), []);
  useFrame(({ clock }) => {
    if (frozen || !tv.current) return;
    const t = clock.elapsedTime;
    tv.current.emissiveIntensity = 0.55 + 0.3 * Math.sin(t * 6.1) * Math.sin(t * 2.3);
  });

  return (
    <group position={[-4.6, 0, -3.2]} rotation={[0, 0.08, 0]}>
      {/* body, floor band, snowy flat roof */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[3.6, 4.8, 2.4]} />
        <meshStandardMaterial color="#7d4338" />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[3.7, 0.1, 2.5]} />
        <meshStandardMaterial color="#e9d8bd" />
      </mesh>
      <mesh position={[0, 4.84, 0]}>
        <boxGeometry args={[3.8, 0.16, 2.6]} />
        <meshStandardMaterial color="#e9d8bd" />
      </mesh>
      <mesh position={[0, 4.97, 0]}>
        <boxGeometry args={[3.7, 0.12, 2.5]} />
        <meshStandardMaterial color="#f7fbff" />
      </mesh>
      <mesh position={[1.1, 5.2, -0.5]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#555b63" />
      </mesh>
      <Smoke position={[1.1, 5.45, -0.5]} frozen={frozen} />

      {/* the sign: big gold M, smaller "Central" */}
      <mesh position={[0, 4.28, 1.2]}>
        <boxGeometry args={[3.4, 0.98, 0.06]} />
        <meshStandardMaterial color="#e0b43a" emissive="#e0b43a" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 4.28, 1.23]}>
        <boxGeometry args={[3.28, 0.86, 0.06]} />
        <meshStandardMaterial color="#14161c" />
      </mesh>
      <mesh position={[-1.28, 3.98, 1.27]} scale={[0.7, 0.7, 1]}>
        <extrudeGeometry args={[M_SHAPE, { depth: 0.08, bevelEnabled: false }]} />
        <meshStandardMaterial color="#f0c14a" emissive="#f0c14a" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0.56, 4.177, 1.28]}>
        <planeGeometry args={[2.24, 0.7]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>
      {/* string of lights under the sign */}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-1.5 + i * 0.3, 3.82, 1.27]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial
            color={WRAP[i % 3]!}
            emissive={WRAP[i % 3]!}
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}

      {/* lobby: glass doors + canopy */}
      <mesh position={[0, 0.6, 1.2]}>
        <boxGeometry args={[1, 1.1, 0.04]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 1.35, 1.5]}>
        <boxGeometry args={[1.7, 0.08, 0.75]} />
        <meshStandardMaterial color="#a3202c" />
      </mesh>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.8, 1.2]}>
          <boxGeometry args={[0.7, 0.6, 0.04]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={0.8} />
        </mesh>
      ))}

      {/* guest windows: 3 floors x 3, some lit, one flickering TV */}
      {[1.9, 2.65, 3.4].flatMap((y, r) =>
        [-1.1, 0, 1.1].map((x, c) => {
          const lit = (r * 3 + c * 5) % 4 !== 0;
          const isTv = r === 1 && c === 2;
          return (
            <mesh key={`${r}-${c}`} position={[x, y, 1.2]}>
              <boxGeometry args={[0.55, 0.5, 0.04]} />
              <meshStandardMaterial
                ref={isTv ? tv : undefined}
                color={isTv ? "#bcd6ff" : lit ? "#ffd27a" : "#1b2a3a"}
                emissive={isTv ? "#7aa7ff" : lit ? "#ffb347" : "#0b1520"}
                emissiveIntensity={lit ? 0.85 : 0.2}
              />
            </mesh>
          );
        }),
      )}

      <pointLight position={[0, 1.3, 2.4]} color="#ffb347" intensity={9} distance={8} />
      <Gift position={[-0.95, 0, 1.6]} color={WRAP[0]!} scale={0.8} />
      <Gift position={[-1.35, 0, 1.45]} color={WRAP[1]!} scale={0.6} />
      <Gift position={[1.0, 0, 1.55]} color={WRAP[2]!} scale={0.7} />
    </group>
  );
}

function Sleigh() {
  return (
    <group position={[4.7, 0, -1]} rotation={[0, -0.25, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.2, 0.35, 0.95]} />
        <meshStandardMaterial color="#a3202c" />
      </mesh>
      <mesh position={[1, 0.85, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.95]} />
        <meshStandardMaterial color="#8d1d2c" />
      </mesh>
      <mesh position={[-1.25, 0.82, 0]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.55, 0.12, 0.95]} />
        <meshStandardMaterial color="#a3202c" />
      </mesh>
      {[-0.38, 0.38].map((z) => (
        <group key={z}>
          <mesh position={[0, 0.12, z]}>
            <boxGeometry args={[2.7, 0.07, 0.07]} />
            <meshStandardMaterial color="#e0b43a" />
          </mesh>
          <mesh position={[-1.45, 0.22, z]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.35, 0.07, 0.07]} />
            <meshStandardMaterial color="#e0b43a" />
          </mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x, 0.3, z]}>
              <boxGeometry args={[0.07, 0.4, 0.07]} />
              <meshStandardMaterial color="#e0b43a" />
            </mesh>
          ))}
        </group>
      ))}
      {/* the loot */}
      <mesh position={[0.35, 1.0, 0]} scale={[0.85, 0.8, 0.7]}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshStandardMaterial color="#c9a56a" />
      </mesh>
      <mesh position={[0.35, 1.5, 0]}>
        <coneGeometry args={[0.16, 0.3, 8]} />
        <meshStandardMaterial color="#c9a56a" />
      </mesh>
      <Gift position={[-0.45, 0.66, 0.2]} color={WRAP[3]!} scale={0.6} />
      <Gift position={[-0.5, 0.66, -0.25]} color={WRAP[1]!} scale={0.55} />
      <Gift position={[-0.5, 1.0, -0.02]} color={WRAP[0]!} scale={0.45} />
    </group>
  );
}

const SNOWMAN: Vec3 = [0.9, 0, -0.9];

// Turns on the spot to keep an eye on Santa.
function Snowman({ target, frozen }: { target: { current: number }; frozen: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const goal = Math.atan2(target.current - SNOWMAN[0], SANTA_Z - SNOWMAN[2]);
    ref.current.rotation.y = frozen ? goal : MathUtils.damp(ref.current.rotation.y, goal, 5, delta);
  });

  return (
    <group ref={ref} position={SNOWMAN}>
      {(
        [
          [0.5, 0.5],
          [1.2, 0.36],
          [1.7, 0.26],
        ] as const
      ).map(([y, r]) => (
        <mesh key={y} position={[0, y, 0]}>
          <sphereGeometry args={[r, 14, 14]} />
          <meshStandardMaterial color="#f7fbff" />
        </mesh>
      ))}
      <mesh position={[0, 1.72, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.3, 6]} />
        <meshStandardMaterial color="#e8731c" />
      </mesh>
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 1.8, 0.23]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.07, 6, 14]} />
        <meshStandardMaterial color="#c62828" />
      </mesh>
      <mesh position={[0, 1.96, 0]}>
        <cylinderGeometry args={[0.17, 0.2, 0.3, 10]} />
        <meshStandardMaterial color="#1a1a1f" />
      </mesh>
      <mesh position={[0, 1.83, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 10]} />
        <meshStandardMaterial color="#1a1a1f" />
      </mesh>
    </group>
  );
}

function Lamp() {
  return (
    <group position={[-1.7, 0, -0.3]}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#22262b" />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.6} />
      </mesh>
      <pointLight position={[0, 2.4, 0.4]} color="#ffcf80" intensity={7} distance={7} />
    </group>
  );
}

const FENCE_X = Array.from({ length: 19 }, (_, i) => -7.6 + i * 0.3).filter(
  (x) => x < -5.5 || x > -3.7,
);

function Fence() {
  return (
    <group position={[0, 0, -0.6]}>
      {FENCE_X.map((x) => (
        <mesh key={x} position={[x, 0.3, 0]}>
          <boxGeometry args={[0.12, 0.6, 0.05]} />
          <meshStandardMaterial color="#f3ecdf" />
        </mesh>
      ))}
      {(
        [
          [-6.55, 2.1],
          [-2.95, 1.5],
        ] as const
      ).flatMap(([x, len]) =>
        [0.2, 0.45].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, y, -0.04]}>
            <boxGeometry args={[len, 0.06, 0.04]} />
            <meshStandardMaterial color="#d9cfbd" />
          </mesh>
        )),
      )}
    </group>
  );
}

// [x, z, scale]
const FOREST: Vec3[] = Array.from({ length: 14 }, (_, i) => [
  -15 + i * 2.3 + ((i * 7) % 5) * 0.25,
  -8 - ((i * 5) % 5),
  1 + ((i * 3) % 4) * 0.18,
]);

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
      {Array.from({ length: 110 }, (_, i) => (
        <mesh
          key={i}
          position={[((i * 47) % 260) / 10 - 13, (i * 1.37) % 9, ((i * 29) % 260) / 10 - 18]}
        >
          <sphereGeometry args={[0.028 + (i % 4) * 0.012, 5, 5]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// Keeps the camera centred on the village on wide screens. On narrow
// (portrait) screens it can't fit everything, so it follows Santa instead.
const LOOK_Y = -0.2;
function Rig({ target, frozen }: { target: { current: number }; frozen: boolean }) {
  useFrame(({ camera, size }, delta) => {
    const halfW = Math.tan(MathUtils.degToRad(26)) * 10 * (size.width / size.height);
    const limit = Math.max(0, 6.9 - halfW);
    const goal = MathUtils.clamp(target.current * 0.85, -limit, limit);
    camera.position.x = frozen ? goal : MathUtils.damp(camera.position.x, goal, 2, delta);
    // Landscape has empty ground below the scene, so aim higher (scene sits
    // lower). Portrait keeps it up top, clear of the hero text.
    const aspect = size.width / size.height;
    const lookY = MathUtils.clamp(MathUtils.mapLinear(aspect, 0.8, 1.4, LOOK_Y, 0.8), LOOK_Y, 0.8);
    camera.lookAt(camera.position.x, lookY, 0);
  });
  return null;
}

function World({ frozen }: { frozen: boolean }) {
  const santaX = useRef(frozen ? 0.8 : 9.5);

  return (
    <>
      <mesh position={[6, 6.2, -17]}>
        <sphereGeometry args={[0.55, 20, 20]} />
        <meshStandardMaterial color="#f7fbff" emissive="#d5e4ff" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[6, 6.2, -17.1]}>
        <sphereGeometry args={[1.1, 20, 20]} />
        <meshBasicMaterial color="#d5e4ff" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
        <planeGeometry args={[60, 50]} />
        <meshStandardMaterial color="#e7f3f8" />
      </mesh>
      {/* trampled path Santa keeps using */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, SANTA_Z]}>
        <planeGeometry args={[40, 1.6]} />
        <meshStandardMaterial color="#c3d7e4" />
      </mesh>

      {FOREST.map(([x, z, s]) => (
        <Tree key={x} position={[x, 0, z]} scale={s * 1.3} />
      ))}
      <Tree position={[-7.4, 0, -4.4]} scale={1.6} />
      <Tree position={[-1.6, 0, -4.8]} scale={1.1} />
      <Tree position={[8.2, 0, -2.6]} scale={1.4} />

      <Hotel frozen={frozen} />
      <Fence />
      <Lamp />
      <Snowman target={santaX} frozen={frozen} />
      <Sleigh />
      <Santa x={santaX} frozen={frozen} />
      <Snow frozen={frozen} />
      <Rig target={santaX} frozen={frozen} />
    </>
  );
}

export function Scene({ frozen }: { frozen: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 2, 10], fov: 52 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      frameloop={frozen ? "demand" : "always"}
    >
      <color attach="background" args={["#07140f"]} />
      <fog attach="fog" args={["#07140f", 14, 36]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[-6, 8, 4]} intensity={1.15} color="#d7e6ff" />
      <Stars radius={60} depth={24} count={400} factor={2.5} fade speed={frozen ? 0 : 0.25} />
      <World frozen={frozen} />
    </Canvas>
  );
}
