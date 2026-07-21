import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import MorphingSphere from './MorphingSphere'
import ParticleField from './ParticleField'
import ServicesOrbit from './ServicesOrbit'

function SceneLoader() {
  return null // Suspense fallback handled by HTML overlay
}

export default function Scene({ scrollProgress, showServices = false }) {
  const isMobile = window.innerWidth < 768

  // Don't render WebGL on very small devices to preserve battery/perf
  if (isMobile) return null

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <PerformanceMonitor onDecline={() => console.log('GPU pressure detected')} />
        <AdaptiveDpr pixelated />

        <Suspense fallback={<SceneLoader />}>
          {/* Ambient + directional lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#7B5EA7" />
          <pointLight position={[0, 3, 2]} intensity={1.5} color="#C084FC" />
          <pointLight position={[0, -3, 2]} intensity={1.0} color="#0EA5E9" />

          {/* Environment IBL */}
          <Environment preset="city" />

          {/* Particle Field background */}

          {/* Clean ambient scene */}

          {/* Services orbit — appears in services section */}
          {showServices && <ServicesOrbit />}
        </Suspense>
      </Canvas>
    </div>
  )
}
