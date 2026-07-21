import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Edges } from '@react-three/drei'
import * as THREE from 'three'

// Digital Growth — Fluid blob
function FluidBlob({ position, scale }) {
  const meshRef = useRef()
  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshDistortMaterial
        color="#C084FC"
        speed={3}
        distort={0.55}
        roughness={0}
        metalness={0.1}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}

// Web & App Dev — Wireframe Torus Knot
function WireframeKnot({ position, scale }) {
  const meshRef = useRef()
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.4
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.6
    }
  })
  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <torusKnotGeometry args={[0.7, 0.22, 128, 16]} />
      <meshStandardMaterial
        color="#38BDF8"
        wireframe
        transparent
        opacity={0.7}
        emissive="#0EA5E9"
        emissiveIntensity={0.4}
      />
    </mesh>
  )
}

// Compliance & Tax — Crystalline Octahedron
function CrystalOctahedron({ position, scale }) {
  const meshRef = useRef()
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3
      meshRef.current.rotation.z = clock.getElapsedTime() * 0.15
    }
  })
  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#34D399"
        metalness={0.8}
        roughness={0.1}
        emissive="#10B981"
        emissiveIntensity={0.3}
      />
      <Edges color="#6EE7B7" lineWidth={1.5} />
    </mesh>
  )
}

export default function ServicesOrbit() {
  const groupRef = useRef()

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.12
    }
  })

  const radius = 3.5

  return (
    <group ref={groupRef} position={[0, 0, -1]}>
      {/* Digital Growth at 0° */}
      <FluidBlob
        position={[radius, 0, 0]}
        scale={0.55}
      />
      {/* Web Dev at 120° */}
      <WireframeKnot
        position={[
          Math.cos((2 * Math.PI) / 3) * radius,
          0,
          Math.sin((2 * Math.PI) / 3) * radius,
        ]}
        scale={0.6}
      />
      {/* Tax at 240° */}
      <CrystalOctahedron
        position={[
          Math.cos((4 * Math.PI) / 3) * radius,
          0,
          Math.sin((4 * Math.PI) / 3) * radius,
        ]}
        scale={0.65}
      />
    </group>
  )
}
