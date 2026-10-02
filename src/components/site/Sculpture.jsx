import { Suspense,useEffect,useMemo,useRef,useState } from 'react'
import { Canvas,useFrame,useLoader,useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

function StudioLight() {
  const {gl,scene,invalidate}=useThree()
  useEffect(()=>{
    const generator=new THREE.PMREMGenerator(gl),room=new RoomEnvironment()
    const environment=generator.fromScene(room,.04)
    scene.environment=environment.texture;scene.environmentIntensity=.8;invalidate()
    return()=>{scene.environment=null;scene.environmentIntensity=1;scene.environmentRotation.set(0,0,0);environment.dispose();room.dispose();generator.dispose()}
  },[gl,scene,invalidate])
  return <><ambientLight intensity={.35}/><directionalLight name="ascore-reflection-key" position={[-2.5,6,4]} intensity={1.6} color="#f5fbff"/><directionalLight position={[2,4,5]} intensity={1.7} color="#a2dadc"/><directionalLight position={[-4,-2,3]} intensity={1.1} color="#6496cf"/></>
}

function FitCamera() {
  const {camera,size,invalidate}=useThree()
  useEffect(()=>{camera.zoom=size.height/6.2;camera.updateProjectionMatrix();invalidate()},[camera,size.height,invalidate])
  return null
}

function CloudEngine({progress,visible,onReady}) {
  const gltf=useLoader(GLTFLoader,'/hero/ascore-unified-sculpted.glb')
  const scene=useMemo(()=>clone(gltf.scene),[gltf.scene])
  const mixer=useMemo(()=>new THREE.AnimationMixer(scene),[scene])
  const actions=useMemo(()=>gltf.animations.map(clip=>mixer.clipAction(clip)),[gltf.animations,mixer])
  const duration=useMemo(()=>Math.max(0,...gltf.animations.map(clip=>clip.duration)),[gltf.animations])
  const smoothed=useRef(progress),wrapper=useRef(),reflectionKey=useRef()
  const {invalidate,camera,size,scene:renderScene,gl}=useThree()
  const modelScale=useMemo(()=>{
    const size=new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3())
    return 4.25/Math.max(size.x,size.y,size.z,1)
  },[scene])
  const blades=useMemo(()=>{const result=[];scene.traverse(node=>{if(/^Aperture_blade_0[1-7]$/.test(node.name)||/^Aperture blade 0[1-7]$/.test(node.name))result.push({node,baked:node.position.clone(),center:node.worldToLocal(new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3())),offset:new THREE.Vector3()})});return result.sort((a,b)=>a.node.name.localeCompare(b.node.name))},[scene])
  const point=useMemo(()=>new THREE.Vector3(),[])
  useEffect(()=>{
    reflectionKey.current=renderScene.getObjectByName('ascore-reflection-key')
    actions.forEach(action=>{action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play()})
    const initial=smoothed.current
    mixer.setTime((initial<.45?initial/.45:1-(initial-.45)/.55)*duration);invalidate();onReady()
    return()=>{actions.forEach(action=>action.stop())}
  },[actions,mixer,scene,duration,invalidate,onReady,renderScene])
  useEffect(()=>{if(visible)invalidate()},[progress,visible,invalidate])
  useFrame((_,delta)=>{
    if(!visible)return
    const p=smoothed.current=THREE.MathUtils.damp(smoothed.current,progress,8,Math.min(delta,.05))
    // Every exported clip shares one scroll clock. No mixer.update(delta).
    actions.forEach(action=>{action.enabled=true;action.paused=false})
    // Restore the sampled position before asking the mixer to sample again.
    // This also avoids unchanged-track caching accumulating our viewport offsets.
    blades.forEach(({node,baked})=>node.position.copy(baked))
    const opening=p<.45?p/.45:1-(p-.45)/.55
    mixer.setTime(opening*duration)
    // Rotate the cached PBR environment lookup with the shared scroll clock. No cube recapture.
    renderScene.environmentRotation.y=opening*.32
    renderScene.environmentIntensity=.8+opening*.6
    gl.toneMappingExposure=.9+opening*.15
    if(reflectionKey.current){reflectionKey.current.position.set(-2.5+opening*5,6,4+opening);reflectionKey.current.intensity=1.6+opening*1.4}
    const compact=size.width<760
    const initial=compact?(size.height<650?.37:.4):.58
    wrapper.current.scale.setScalar(modelScale*initial)
    wrapper.current.updateWorldMatrix(true,true)
    const spread=THREE.MathUtils.smoothstep(opening,.18,.9)
    const positions=compact?[[-.72,.12],[.22,.5],[.62,-.15],[-.68,-.22],[.73,-.62],[-.24,.65],[.73,.35]]:[[-.73,.35],[.28,.52],[.56,-.08],[-.67,-.42],[.16,-.53],[-.14,.68],[.75,-.55]]
    blades.forEach(({node,baked,center:localCenter,offset},index)=>{
      baked.copy(node.position)
      const center=node.localToWorld(point.copy(localCenter)).project(camera)
      const [x,y]=positions[index]
      point.set(x,y,center.z).unproject(camera)
      node.parent.worldToLocal(point)
      const meshCenter=offset.copy(localCenter)
      meshCenter.applyQuaternion(node.quaternion).multiply(node.scale)
      point.sub(meshCenter)
      node.position.lerp(point,spread)
    })
    if(Math.abs(p-progress)>.0002)invalidate()
  })
  return <group ref={wrapper} scale={modelScale}><primitive object={scene} dispose={null}/></group>
}

export default function Sculpture({progress,visible}) {
  const [failed,setFailed]=useState(false),[ready,setReady]=useState(false)
  const onReady=useMemo(()=>()=>setReady(true),[])
  useEffect(()=>{
    if(!ready||failed)return
    const poster=document.querySelector('.idea-poster');poster?.classList.add('has-webgl')
    return()=>poster?.classList.remove('has-webgl')
  },[ready,failed])
  if(failed)return null
  return <div className="idea-canvas" aria-hidden="true"><Canvas orthographic frameloop="demand" dpr={[1,1.35]} camera={{position:[0,9,3],zoom:100,near:.1,far:50}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={null} onCreated={({gl})=>{gl.toneMappingExposure=.9;gl.domElement.addEventListener('webglcontextlost',()=>setFailed(true),{once:true})}}><FitCamera/><StudioLight/><Suspense fallback={null}><CloudEngine progress={progress} visible={visible} onReady={onReady}/></Suspense></Canvas></div>
}
