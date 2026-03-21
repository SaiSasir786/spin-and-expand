import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// --- Data ---
interface NodeData {
  id: string;
  label: string;
  count: number;
  color: string;
  glowColor: string;
  position: [number, number, number];
  size: number;
  category: "primary" | "secondary" | "tertiary";
}

interface EdgeData {
  from: string;
  to: string;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateNodes(): NodeData[] {
  const primaryNodes: NodeData[] = [
    { id: "doctor", label: "Doctor", count: 523, color: "#3b82f6", glowColor: "#60a5fa", position: [-6, 2, 0], size: 2.2, category: "primary" },
    { id: "patient", label: "Patient", count: 1240, color: "#22c55e", glowColor: "#4ade80", position: [6, 1, -1], size: 2.5, category: "primary" },
    { id: "order", label: "Order", count: 850, color: "#f59e0b", glowColor: "#fbbf24", position: [0, 5, 1], size: 2.0, category: "primary" },
    { id: "visit", label: "Visit", count: 1100, color: "#a855f7", glowColor: "#c084fc", position: [0, -3, 0], size: 2.3, category: "primary" },
    { id: "medication", label: "Medication", count: 2340, color: "#06b6d4", glowColor: "#22d3ee", position: [-4, -5, 2], size: 2.1, category: "primary" },
    { id: "diagnosis", label: "Diagnosis", count: 1890, color: "#ec4899", glowColor: "#f472b6", position: [5, -4, -2], size: 2.0, category: "primary" },
    { id: "lab_result", label: "Lab Result", count: 3100, color: "#10b981", glowColor: "#34d399", position: [-2, 6, -3], size: 2.4, category: "primary" },
    { id: "insurance", label: "Insurance", count: 670, color: "#f97316", glowColor: "#fb923c", position: [7, 5, 2], size: 1.8, category: "primary" },
  ];

  const secondaryLabels = [
    { label: "Nurse", color: "#38bdf8", glowColor: "#7dd3fc" },
    { label: "Ward", color: "#4ade80", glowColor: "#86efac" },
    { label: "Pharmacy", color: "#facc15", glowColor: "#fde047" },
    { label: "Billing", color: "#fb923c", glowColor: "#fdba74" },
    { label: "Referral", color: "#c084fc", glowColor: "#d8b4fe" },
    { label: "Procedure", color: "#2dd4bf", glowColor: "#5eead4" },
    { label: "Imaging", color: "#818cf8", glowColor: "#a5b4fc" },
    { label: "Allergy", color: "#fb7185", glowColor: "#fda4af" },
    { label: "Vitals", color: "#34d399", glowColor: "#6ee7b7" },
    { label: "Appointment", color: "#fbbf24", glowColor: "#fcd34d" },
    { label: "Discharge", color: "#a78bfa", glowColor: "#c4b5fd" },
    { label: "Emergency", color: "#f87171", glowColor: "#fca5a5" },
    { label: "Surgery", color: "#22d3ee", glowColor: "#67e8f9" },
    { label: "Therapy", color: "#a3e635", glowColor: "#bef264" },
    { label: "Consent", color: "#e879f9", glowColor: "#f0abfc" },
    { label: "Chart Note", color: "#38bdf8", glowColor: "#7dd3fc" },
  ];

  const secondaryNodes: NodeData[] = secondaryLabels.map((s, i) => {
    const angle = (i / secondaryLabels.length) * Math.PI * 2;
    const radius = 9 + seededRandom(i * 7) * 3;
    const y = (seededRandom(i * 13) - 0.5) * 10;
    return {
      id: s.label.toLowerCase().replace(/\s/g, "_"),
      label: s.label,
      count: Math.floor(50 + seededRandom(i * 31) * 500),
      color: s.color,
      glowColor: s.glowColor,
      position: [
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius,
      ] as [number, number, number],
      size: 0.8 + seededRandom(i * 17) * 0.6,
      category: "secondary" as const,
    };
  });

  // Tertiary small nodes scattered around
  const tertiaryNodes: NodeData[] = [];
  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899", "#10b981", "#f97316"];
  for (let i = 0; i < 80; i++) {
    const angle = seededRandom(i * 3) * Math.PI * 2;
    const radius = 4 + seededRandom(i * 7) * 12;
    const y = (seededRandom(i * 11) - 0.5) * 16;
    const z = (seededRandom(i * 19) - 0.5) * 12;
    const ci = Math.floor(seededRandom(i * 23) * colors.length);
    tertiaryNodes.push({
      id: `t_${i}`,
      label: "",
      count: 0,
      color: colors[ci],
      glowColor: colors[ci],
      position: [Math.cos(angle) * radius, y, z] as [number, number, number],
      size: 0.15 + seededRandom(i * 29) * 0.35,
      category: "tertiary",
    });
  }

  return [...primaryNodes, ...secondaryNodes, ...tertiaryNodes];
}

function generateEdges(nodes: NodeData[]): EdgeData[] {
  const edges: EdgeData[] = [];
  const primary = nodes.filter((n) => n.category === "primary");
  const secondary = nodes.filter((n) => n.category === "secondary");
  const tertiary = nodes.filter((n) => n.category === "tertiary");

  // Connect all primary nodes to each other
  for (let i = 0; i < primary.length; i++) {
    for (let j = i + 1; j < primary.length; j++) {
      edges.push({ from: primary[i].id, to: primary[j].id });
    }
  }

  // Connect secondary to nearest primary nodes
  secondary.forEach((s, i) => {
    const p1 = primary[i % primary.length];
    const p2 = primary[(i + 3) % primary.length];
    edges.push({ from: s.id, to: p1.id });
    edges.push({ from: s.id, to: p2.id });
    // Some secondary-to-secondary
    if (i > 0) edges.push({ from: s.id, to: secondary[i - 1].id });
  });

  // Connect tertiary to nearby nodes
  tertiary.forEach((t, i) => {
    const target = i % 2 === 0 
      ? primary[Math.floor(seededRandom(i * 41) * primary.length)] 
      : secondary[Math.floor(seededRandom(i * 43) * secondary.length)];
    edges.push({ from: t.id, to: target.id });
    // Some tertiary-to-tertiary
    if (i > 0 && seededRandom(i * 53) > 0.5) {
      edges.push({ from: t.id, to: tertiary[i - 1].id });
    }
  });

  return edges;
}

// --- 3D Components ---

function GlowingSphere({ node, onClick, isSelected }: { node: NodeData; onClick: () => void; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = node.category === "primary" ? 1 + Math.sin(t * 1.5 + node.position[0]) * 0.06 : 1;
    const s = node.size * pulse * (hovered ? 1.15 : 1) * (isSelected ? 1.2 : 1);
    meshRef.current.scale.setScalar(s);
  });

  return (
    <group position={node.position}>
      {/* Glow */}
      <mesh>
        <sphereGeometry args={[node.size * 1.6, 16, 16]} />
        <meshBasicMaterial color={node.glowColor} transparent opacity={isSelected ? 0.18 : 0.08} />
      </mesh>
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* Label */}
      {node.category !== "tertiary" && (
        <Html center distanceFactor={15} style={{ pointerEvents: "none" }}>
          <div
            style={{
              color: "white",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              textShadow: `0 0 12px ${node.color}, 0 0 24px ${node.color}`,
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontSize: node.category === "primary" ? 14 : 10, fontWeight: 700 }}>
              {node.label}
            </div>
            {node.count > 0 && (
              <div style={{ fontSize: node.category === "primary" ? 18 : 12, fontWeight: 800, marginTop: 2 }}>
                {node.count.toLocaleString()}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function Edges({ edges, nodeMap }: { edges: EdgeData[]; nodeMap: Map<string, NodeData> }) {
  const lineSegments = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    edges.forEach((edge) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return;

      positions.push(...from.position, ...to.position);

      const fc = new THREE.Color(from.color);
      const tc = new THREE.Color(to.color);
      colors.push(fc.r, fc.g, fc.b, tc.r, tc.g, tc.b);
    });

    return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
  }, [edges, nodeMap]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[lineSegments.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[lineSegments.colors, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.2} />
    </lineSegments>
  );
}

function FloatingParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#4488ff" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function Scene() {
  const nodes = useMemo(() => generateNodes(), []);
  const edges = useMemo(() => generateEdges(nodes), [nodes]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -5, -10]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[0, -10, 5]} intensity={0.4} color="#a855f7" />

      <Stars radius={50} depth={50} count={2000} factor={3} saturation={0.5} fade speed={0.5} />
      <FloatingParticles />

      <Edges edges={edges} nodeMap={nodeMap} />
      {nodes.map((node) => (
        <GlowingSphere
          key={node.id}
          node={node}
          isSelected={selectedId === node.id}
          onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={8}
        maxDistance={45}
      />
    </>
  );
}

// --- Stats bar ---
function StatsBar() {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-4 border-t border-border bg-card/80 backdrop-blur-sm z-10">
      <span className="text-sm font-medium tracking-wide text-muted-foreground">
        Graph Neural Network Analysis
      </span>
      <div className="flex gap-8 text-sm">
        <span className="text-muted-foreground">
          Entities: <span className="font-bold text-foreground">4,813</span>
        </span>
        <span className="text-muted-foreground">
          Connections: <span className="font-bold text-foreground">18,420</span>
        </span>
        <span className="text-muted-foreground">
          Categories: <span className="font-bold text-foreground">8</span>
        </span>
      </div>
    </div>
  );
}

// --- Legend ---
function Legend() {
  const items = [
    { label: "Doctor", color: "#3b82f6" },
    { label: "Patient", color: "#22c55e" },
    { label: "Order", color: "#f59e0b" },
    { label: "Visit", color: "#a855f7" },
    { label: "Medication", color: "#06b6d4" },
    { label: "Diagnosis", color: "#ec4899" },
    { label: "Lab Result", color: "#10b981" },
    { label: "Insurance", color: "#f97316" },
  ];
  return (
    <div className="absolute top-6 right-6 flex flex-col gap-1.5 bg-card/60 backdrop-blur-md rounded-lg px-4 py-3 border border-border z-10">
      <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">Legend</span>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 text-xs text-foreground">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: it.color, boxShadow: `0 0 6px ${it.color}` }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

export default function GraphNetwork3D() {
  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      <Legend />
      <Canvas
        camera={{ position: [0, 0, 22], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "hsl(220, 20%, 4%)" }}
      >
        <Scene />
      </Canvas>
      <StatsBar />
    </div>
  );
}
