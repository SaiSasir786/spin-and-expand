import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// --- Data: Tables with their PK/FK field nodes ---
interface TableNode {
  id: string;
  label: string;
  count: number;
  color: string;
  glow: string;
  position: [number, number, number];
  fields: FieldNode[];
}

interface FieldNode {
  id: string;
  label: string;
  type: "pk" | "fk";
  offset: [number, number, number]; // relative to parent
  size: number;
}

interface Connection {
  from: string; // field id
  to: string;   // field id
}

function sr(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const TABLES: TableNode[] = [
  {
    id: "doctor", label: "Doctor", count: 523, color: "#2563eb", glow: "#60a5fa",
    position: [-7, 2.5, 0],
    fields: [
      { id: "doctor_pk", label: "doctor_id (PK)", type: "pk", offset: [-2.5, 1.8, 1], size: 0.45 },
      { id: "doctor_name", label: "name", type: "pk", offset: [-3.2, -0.5, 1.5], size: 0.35 },
      { id: "doctor_spec", label: "specialty", type: "pk", offset: [-2, -1.8, -0.8], size: 0.3 },
      { id: "doctor_dept", label: "department_id (FK)", type: "fk", offset: [-3.5, 0.8, -1], size: 0.4 },
      { id: "doctor_lic", label: "license_no", type: "pk", offset: [-1.5, 2.5, -1.5], size: 0.25 },
      { id: "doctor_phone", label: "phone", type: "pk", offset: [-3.8, -1.5, 0.5], size: 0.22 },
      { id: "doctor_email", label: "email", type: "pk", offset: [-1, -2.2, 1.8], size: 0.28 },
      { id: "doctor_f1", label: "", type: "pk", offset: [-4.2, 1, 2], size: 0.18 },
      { id: "doctor_f2", label: "", type: "pk", offset: [-4.5, -0.2, -1.8], size: 0.2 },
      { id: "doctor_f3", label: "", type: "pk", offset: [-2, 3, 0.5], size: 0.15 },
      { id: "doctor_f4", label: "", type: "pk", offset: [-5, 0, 0], size: 0.22 },
      { id: "doctor_f5", label: "", type: "pk", offset: [-3, 2.5, -2], size: 0.17 },
    ],
  },
  {
    id: "patient", label: "Patient", count: 1240, color: "#16a34a", glow: "#4ade80",
    position: [7, 1, -1],
    fields: [
      { id: "patient_pk", label: "patient_id (PK)", type: "pk", offset: [2.5, 1.5, 1], size: 0.5 },
      { id: "patient_name", label: "name", type: "pk", offset: [3, -0.8, 1.2], size: 0.38 },
      { id: "patient_dob", label: "dob", type: "pk", offset: [2, -2, -0.5], size: 0.3 },
      { id: "patient_ins", label: "insurance_id (FK)", type: "fk", offset: [3.5, 0.5, -1.2], size: 0.42 },
      { id: "patient_addr", label: "address", type: "pk", offset: [1.5, 2.5, -1], size: 0.28 },
      { id: "patient_blood", label: "blood_type", type: "pk", offset: [3.8, -1.5, 0.8], size: 0.25 },
      { id: "patient_gender", label: "gender", type: "pk", offset: [2.8, 2, 2], size: 0.22 },
      { id: "patient_f1", label: "", type: "pk", offset: [4.2, 1, -2], size: 0.2 },
      { id: "patient_f2", label: "", type: "pk", offset: [4.5, -0.5, 2], size: 0.18 },
      { id: "patient_f3", label: "", type: "pk", offset: [1.5, -2.5, 1.5], size: 0.23 },
      { id: "patient_f4", label: "", type: "pk", offset: [5, 0, 0.5], size: 0.2 },
      { id: "patient_f5", label: "", type: "pk", offset: [3.5, 2.5, -0.5], size: 0.16 },
      { id: "patient_f6", label: "", type: "pk", offset: [4.8, -1, -1], size: 0.19 },
    ],
  },
  {
    id: "order", label: "Order", count: 850, color: "#d97706", glow: "#fbbf24",
    position: [0, 6, 1],
    fields: [
      { id: "order_pk", label: "order_id (PK)", type: "pk", offset: [1.5, 2, 0.8], size: 0.45 },
      { id: "order_doctor_fk", label: "doctor_id (FK)", type: "fk", offset: [-1.5, 1.8, 1.2], size: 0.42 },
      { id: "order_patient_fk", label: "patient_id (FK)", type: "fk", offset: [2, 1, -1], size: 0.4 },
      { id: "order_date", label: "order_date", type: "pk", offset: [-2, 0.5, -1.5], size: 0.3 },
      { id: "order_type", label: "type", type: "pk", offset: [0, 2.5, -1], size: 0.28 },
      { id: "order_status", label: "status", type: "pk", offset: [-2.5, 1.5, 0.5], size: 0.25 },
      { id: "order_visit_fk", label: "visit_id (FK)", type: "fk", offset: [0.5, -0.5, 1.8], size: 0.38 },
      { id: "order_f1", label: "", type: "pk", offset: [2.5, 2.2, 1.5], size: 0.18 },
      { id: "order_f2", label: "", type: "pk", offset: [-3, 0, 0], size: 0.2 },
      { id: "order_f3", label: "", type: "pk", offset: [1, 3, 0], size: 0.15 },
      { id: "order_f4", label: "", type: "pk", offset: [-1, 2.8, -0.5], size: 0.17 },
    ],
  },
  {
    id: "visit", label: "Visit", count: 1100, color: "#9333ea", glow: "#c084fc",
    position: [0, -4, 0],
    fields: [
      { id: "visit_pk", label: "visit_id (PK)", type: "pk", offset: [0, -2.2, 1], size: 0.48 },
      { id: "visit_doctor_fk", label: "doctor_id (FK)", type: "fk", offset: [-2, -1.5, 1.2], size: 0.4 },
      { id: "visit_patient_fk", label: "patient_id (FK)", type: "fk", offset: [2, -1.5, -0.8], size: 0.42 },
      { id: "visit_date", label: "visit_date", type: "pk", offset: [-1.5, -2.5, -1], size: 0.3 },
      { id: "visit_reason", label: "reason", type: "pk", offset: [1.5, -2.5, 1.5], size: 0.28 },
      { id: "visit_notes", label: "notes", type: "pk", offset: [-2.5, -0.5, -1.5], size: 0.25 },
      { id: "visit_duration", label: "duration", type: "pk", offset: [2.5, -0.5, 1], size: 0.22 },
      { id: "visit_f1", label: "", type: "pk", offset: [0, -3, -0.5], size: 0.2 },
      { id: "visit_f2", label: "", type: "pk", offset: [-3, -1.8, 0.5], size: 0.18 },
      { id: "visit_f3", label: "", type: "pk", offset: [3, -1, -0.5], size: 0.22 },
      { id: "visit_f4", label: "", type: "pk", offset: [-1, -3.2, 1.5], size: 0.16 },
      { id: "visit_f5", label: "", type: "pk", offset: [1, -3.5, -1], size: 0.19 },
    ],
  },
];

// FK connections between tables
const FK_CONNECTIONS: Connection[] = [
  { from: "order_doctor_fk", to: "doctor_pk" },
  { from: "order_patient_fk", to: "patient_pk" },
  { from: "order_visit_fk", to: "visit_pk" },
  { from: "visit_doctor_fk", to: "doctor_pk" },
  { from: "visit_patient_fk", to: "patient_pk" },
  { from: "doctor_dept", to: "patient_ins" },
];

// --- 3D Components ---

function TableEllipsoid({ table, isSelected, onClick }: { table: TableNode; isSelected: boolean; onClick: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.2 + table.position[0] * 0.5) * 0.04;
    const s = (hovered ? 1.08 : 1) * (isSelected ? 1.12 : 1) * pulse;
    meshRef.current.scale.set(s * 1.6, s, s * 0.7);
  });

  return (
    <group ref={groupRef} position={table.position}>
      {/* Outer glow ellipsoid */}
      <mesh scale={[2.8, 1.7, 1.2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={table.glow} transparent opacity={isSelected ? 0.15 : 0.07} />
      </mesh>
      {/* Mid glow */}
      <mesh scale={[2.2, 1.35, 0.95]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={table.glow} transparent opacity={isSelected ? 0.2 : 0.1} />
      </mesh>
      {/* Main ellipsoid */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color={table.color}
          emissive={table.color}
          emissiveIntensity={hovered ? 1.2 : 0.6}
          roughness={0.2}
          metalness={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Rim light ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.65, 0.72, 1]}>
        <torusGeometry args={[1, 0.02, 16, 64]} />
        <meshBasicMaterial color={table.glow} transparent opacity={0.5} />
      </mesh>
      {/* Label */}
      <Html center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <div style={{
          color: "white",
          textAlign: "center",
          fontFamily: "'Inter', system-ui, sans-serif",
          textShadow: `0 0 20px ${table.color}, 0 0 40px ${table.color}, 0 2px 8px rgba(0,0,0,0.8)`,
          whiteSpace: "nowrap",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{table.label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 2 }}>{table.count.toLocaleString()}</div>
        </div>
      </Html>

      {/* Field nodes (PK/FK spheres) */}
      {table.fields.map((field) => (
        <FieldSphere key={field.id} field={field} tableColor={table.color} tableGlow={table.glow} />
      ))}

      {/* Lines from table center to each field */}
      {table.fields.map((field) => (
        <LocalEdge key={`edge-${field.id}`} to={field.offset} color={table.color} />
      ))}
    </group>
  );
}

function FieldSphere({ field, tableColor, tableGlow }: { field: FieldNode; tableColor: string; tableGlow: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 2 + field.offset[0] * 3 + field.offset[1] * 2) * 0.03;
    ref.current.position.set(field.offset[0], field.offset[1] + bob, field.offset[2]);
    ref.current.scale.setScalar(field.size * (hovered ? 1.4 : 1));
  });

  const isFk = field.type === "fk";

  return (
    <group>
      {/* Glow */}
      <mesh position={field.offset}>
        <sphereGeometry args={[field.size * 2, 12, 12]} />
        <meshBasicMaterial color={tableGlow} transparent opacity={isFk ? 0.12 : 0.06} />
      </mesh>
      <mesh
        ref={ref}
        position={field.offset}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={isFk ? "#ffffff" : tableColor}
          emissive={isFk ? tableGlow : tableColor}
          emissiveIntensity={hovered ? 1 : isFk ? 0.8 : 0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {/* Tooltip on hover */}
      {hovered && field.label && (
        <Html position={field.offset} center distanceFactor={18} style={{ pointerEvents: "none" }}>
          <div style={{
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace, system-ui",
            whiteSpace: "nowrap",
            border: `1px solid ${tableColor}`,
            boxShadow: `0 0 12px ${tableColor}40`,
          }}>
            {field.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function LocalEdge({ to, color }: { to: [number, number, number]; color: string }) {
  const geo = useMemo(() => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...to)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [to]);

  return (
    <line geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.25} />
    </line>
  );
}

// Global FK connection lines between tables
function FKConnections({ tables }: { tables: TableNode[] }) {
  const fieldPositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    tables.forEach((t) => {
      t.fields.forEach((f) => {
        map.set(f.id, new THREE.Vector3(
          t.position[0] + f.offset[0],
          t.position[1] + f.offset[1],
          t.position[2] + f.offset[2],
        ));
      });
    });
    return map;
  }, [tables]);

  return (
    <group>
      {FK_CONNECTIONS.map((conn, i) => {
        const from = fieldPositions.get(conn.from);
        const to = fieldPositions.get(conn.to);
        if (!from || !to) return null;
        return <FKLine key={i} from={from} to={to} />;
      })}
    </group>
  );
}

function FKLine({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const ref = useRef<THREE.Line>(null);
  
  const geo = useMemo(() => {
    // Create a curved line via quadratic bezier
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += 1.5;
    mid.z += 1;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(32);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [from, to]);

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });

  return (
    <line ref={ref} geometry={geo}>
      <lineBasicMaterial color="#fbbf24" transparent opacity={0.2} />
    </line>
  );
}

// Animated particles flowing along FK connections
function FlowParticles({ tables }: { tables: TableNode[] }) {
  const count = 60;
  const ref = useRef<THREE.Points>(null);

  const { paths, initialT } = useMemo(() => {
    const fieldPositions = new Map<string, THREE.Vector3>();
    tables.forEach((t) => {
      t.fields.forEach((f) => {
        fieldPositions.set(f.id, new THREE.Vector3(
          t.position[0] + f.offset[0],
          t.position[1] + f.offset[1],
          t.position[2] + f.offset[2],
        ));
      });
    });

    const curves: THREE.QuadraticBezierCurve3[] = [];
    FK_CONNECTIONS.forEach((conn) => {
      const from = fieldPositions.get(conn.from);
      const to = fieldPositions.get(conn.to);
      if (from && to) {
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
        mid.y += 1.5; mid.z += 1;
        curves.push(new THREE.QuadraticBezierCurve3(from, mid, to));
      }
    });

    const paths: THREE.QuadraticBezierCurve3[] = [];
    const initialT: number[] = [];
    for (let i = 0; i < count; i++) {
      paths.push(curves[i % curves.length]);
      initialT.push(sr(i * 7));
    }
    return { paths, initialT };
  }, [tables]);

  const positions = useMemo(() => new Float32Array(count * 3), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const prog = (initialT[i] + t * (0.15 + sr(i * 11) * 0.1)) % 1;
      const pt = paths[i].getPoint(prog);
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color="#fde68a" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

function GridPlane() {
  return (
    <group>
      <gridHelper args={[60, 40, "#1e3a5f", "#0f1f33"]} position={[0, -10, 0]} />
      <gridHelper args={[60, 40, "#1e3a5f", "#0f1f33"]} position={[0, 0, -15]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

function Scene() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 12, 10]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-8, -4, -8]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[8, -6, 5]} intensity={0.4} color="#22c55e" />
      <pointLight position={[0, 8, -5]} intensity={0.3} color="#f59e0b" />
      <pointLight position={[0, -8, 3]} intensity={0.3} color="#9333ea" />

      <Stars radius={60} depth={60} count={3000} factor={3} saturation={0.3} fade speed={0.3} />
      <GridPlane />

      <FKConnections tables={TABLES} />
      <FlowParticles tables={TABLES} />

      {TABLES.map((table) => (
        <TableEllipsoid
          key={table.id}
          table={table}
          isSelected={selectedId === table.id}
          onClick={() => setSelectedId(selectedId === table.id ? null : table.id)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.4}
        minDistance={10}
        maxDistance={50}
      />
    </>
  );
}

function StatsBar() {
  const totalEntities = TABLES.reduce((s, t) => s + t.count, 0);
  const totalFields = TABLES.reduce((s, t) => s + t.fields.length, 0);
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-4 border-t border-border bg-card/80 backdrop-blur-sm z-10">
      <span className="text-sm font-medium tracking-wide text-muted-foreground">
        Graph Neural Network Analysis
      </span>
      <div className="flex gap-8 text-sm">
        <span className="text-muted-foreground">
          Entities: <span className="font-bold text-foreground">{totalEntities.toLocaleString()}</span>
        </span>
        <span className="text-muted-foreground">
          Connections: <span className="font-bold text-foreground">15,840</span>
        </span>
        <span className="text-muted-foreground">
          Fields: <span className="font-bold text-foreground">{totalFields}</span>
        </span>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute top-6 right-6 flex flex-col gap-2 bg-card/60 backdrop-blur-md rounded-lg px-5 py-4 border border-border z-10">
      <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">Tables</span>
      {TABLES.map((t) => (
        <div key={t.id} className="flex items-center gap-2.5 text-xs text-foreground">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }} />
          <span className="font-medium">{t.label}</span>
          <span className="text-muted-foreground ml-auto">{t.count.toLocaleString()}</span>
        </div>
      ))}
      <div className="border-t border-border mt-1 pt-2 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-foreground/60" /> Primary Key
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-accent" /> Foreign Key
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="w-4 h-px bg-accent" /> FK Relationship
        </div>
      </div>
    </div>
  );
}

function HelpHint() {
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60 z-10">
      Drag to rotate · Scroll to zoom · Hover fields for details
    </div>
  );
}

export default function GraphNetwork3D() {
  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      <Legend />
      <HelpHint />
      <Canvas
        camera={{ position: [0, 2, 24], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "hsl(220, 25%, 3%)" }}
      >
        <Scene />
      </Canvas>
      <StatsBar />
    </div>
  );
}
