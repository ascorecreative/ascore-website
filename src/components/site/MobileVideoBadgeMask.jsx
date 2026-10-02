import { useEffect, useRef } from 'react'

// Presentation-only interpolation of the badge region. The signed source stays byte-identical.
const area={x:560,y:1120,w:80,h:80}
let kernel
function interpolationKernel(){
 if(kernel)return kernel
 const entries=[],{w,h}=area
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const alpha=Math.max(0,Math.min(1,(33-Math.hypot(x-40,y-40))/6))
  if(!alpha)continue
  const fx=x/(w-1),fy=y/(h-1)
  entries.push({i:(y*w+x)*4,alpha:Math.round(alpha*255),indices:[y*w*4,(y*w+w-1)*4,x*4,((h-1)*w+x)*4,0,(w-1)*4,(h-1)*w*4,(h*w-1)*4],weights:[1-fx,fx,1-fy,fy,-(1-fx)*(1-fy),-fx*(1-fy),-(1-fx)*fy,-fx*fy]})
 }
 return kernel=entries
}
export default function MobileVideoBadgeMask({active,playing}){
 const ref=useRef(null)
 useEffect(()=>{
  const canvas=ref.current,section=canvas.closest('.original-video-hero')
  const context=canvas.getContext('2d',{willReadFrequently:true})
  if(!context)return
  const entries=interpolationKernel(),frame=context.createImageData(area.w,area.h)
  let callback=0,raf=0,stopped=false,last=-1
  const video=section.querySelector('video')
  const place=()=>{const {width,height}=section.getBoundingClientRect(),scale=Math.max(width/720,height/1280);canvas.style.left=`${(width-720*scale)/2+area.x*scale}px`;canvas.style.top=`${(height-1280*scale)/2+area.y*scale}px`;canvas.style.width=`${area.w*scale}px`;canvas.style.height=`${area.h*scale}px`}
  const draw=()=>{
   const source=video?.readyState>=2?video:section.querySelector('.original-video-poster')
   if(!source||!(source.videoWidth||source.naturalWidth))return
   context.drawImage(source,area.x,area.y,area.w,area.h,0,0,area.w,area.h)
   const original=context.getImageData(0,0,area.w,area.h).data
   for(const {i,alpha,indices,weights} of entries){
    frame.data[i+3]=alpha
    for(let c=0;c<3;c++){
     let value=0
     for(let j=0;j<8;j++)value+=original[indices[j]+c]*weights[j]
     frame.data[i+c]=value
    }
   }
   context.putImageData(frame,0,0);canvas.classList.add('is-ready')
  }
  const cancel=()=>{if(callback&&video?.cancelVideoFrameCallback)video.cancelVideoFrameCallback(callback);cancelAnimationFrame(raf);callback=raf=0}
  const tick=()=>{if(stopped||document.hidden||!active||!playing)return;if(video?.requestVideoFrameCallback)callback=video.requestVideoFrameCallback(()=>{draw();tick()});else raf=requestAnimationFrame(()=>{if(video&&video.currentTime!==last){last=video.currentTime;draw()}tick()})}
  const visibility=()=>{cancel();if(!document.hidden){draw();tick()}}
  const observer=new ResizeObserver(place);observer.observe(section)
  place();draw();tick();section.addEventListener('load',draw,true);section.addEventListener('loadeddata',draw,true);section.addEventListener('seeked',draw,true);document.addEventListener('visibilitychange',visibility)
  return()=>{stopped=true;cancel();observer.disconnect();section.removeEventListener('load',draw,true);section.removeEventListener('loadeddata',draw,true);section.removeEventListener('seeked',draw,true);document.removeEventListener('visibilitychange',visibility)}
 },[active,playing])
 return <canvas ref={ref} className="mobile-video-badge-mask" width={area.w} height={area.h} aria-hidden="true"/>
}
