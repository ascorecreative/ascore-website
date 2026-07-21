import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import vertexShader from '@/shaders/iridescent.vert'
import fragmentShader from '@/shaders/iridescent.frag'

export default function MorphingSphere({ scrollProgress }) {
  const meshRef = useRef()
  const materialRef = useRef()
  const { camera } = useThree()

  // Lerped rotation target
  const targetRotation = useRef({ x: 0, y: 0 })
  const currentRotation = useRef({ x: 0, y: 0 })

  // Shader uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uDistortion: { value: 0.45 },
    uMorphProgress: { value: 0 },
    uCameraPosition: { value: camera.position.clone() },
  }), [camera.position])

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()
    const progress = scrollProgress?.current || 0

    if (!materialRef.current) return

    // Update uniforms
    materialRef.current.uniforms.uTime.value = t
    materialRef.current.uniforms.uMorphProgress.value = progress
    materialRef.current.uniforms.uCameraPosition.value.copy(camera.position)

    // Distortion decreases as we go toward precision state
    materialRef.current.uniforms.uDistortion.value = 0.45 - progress * 0.3

    // Cursor follow with subtle lerp
    targetRotation.current.y = pointer.x * 0.3
    targetRotation.current.x = -pointer.y * 0.2

    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.04
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.04

    if (meshRef.current) {
      meshRef.current.rotation.x = currentRotation.current.x
      meshRef.current.rotation.y = t * 0.1 + currentRotation.current.y

      const startX = 0
      const startY = 0
      const targetScale = 1.2

      meshRef.current.position.x += (startX - meshRef.current.position.x) * 0.05
      meshRef.current.position.y += (startY - meshRef.current.position.y) * 0.05
      meshRef.current.scale.setScalar(
        meshRef.current.scale.x + (targetScale - meshRef.current.scale.x) * 0.05
      )
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <icosahedronGeometry args={[1.5, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
