import {useEffect,useState} from 'react'
import {STATIC_RELEASE} from './releaseMode'
export function useBackendAvailability(){
 const [availability,setAvailability]=useState(STATIC_RELEASE?'unavailable':'checking')
 const [attempt,setAttempt]=useState(0)
 useEffect(()=>{
  if(STATIC_RELEASE)return
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000)
  let active=true
  setAvailability('checking')
  fetch('/api/health',{signal:controller.signal,cache:'no-store'}).then(async response=>{
   if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Unavailable')
   const result=await response.json()
   if(result.status!=='ok'||!['sqlite','mariadb'].includes(result.storage))throw Error('Unavailable')
   if(active)setAvailability('available')
  }).catch(()=>{if(active)setAvailability('unavailable')}).finally(()=>clearTimeout(timeout))
  return()=>{active=false;clearTimeout(timeout);controller.abort()}
 },[attempt])
 return {availability,setAvailability,checkAgain:()=>setAttempt(value=>value+1)}
}
