let csrf = null
export async function portalRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, {
    method, credentials:'same-origin', headers:{ ...(body ? {'Content-Type':'application/json'} : {}), ...(csrf && method !== 'GET' ? {'X-CSRF-Token':csrf} : {}) },
    ...(body ? { body:JSON.stringify(body) } : {})
  })
  let data
  try { data = await response.json() } catch { throw Object.assign(Error('The portal server is unavailable. Please contact info@ascore.ae for assistance.'),{unavailable:true}) }
  if (!response.ok) { const error = new Error(data.error || 'The request could not be completed.'); error.status=response.status; throw error }
  if(path==='/auth/session'&&(!data||!Object.hasOwn(data,'user')||!(data.user===null||typeof data.user==='object')))throw Object.assign(Error('The portal server is unavailable. Please contact info@ascore.ae for assistance.'),{unavailable:true})
  if ('csrf' in data) csrf = data.csrf
  return data
}
export const authService = {
  getCurrentSession:() => portalRequest('/auth/session'),
  loginWithEmail:(identifier,password) => portalRequest('/auth/login',{method:'POST',body:{identifier,password}}),
  signup:data => portalRequest('/auth/register',{method:'POST',body:data}),
  setupAdmin:data => portalRequest('/auth/admin-setup',{method:'POST',body:data}),
  logout:async () => { await portalRequest('/auth/logout',{method:'POST'}); csrf=null }
}

export async function portalUpload(path,file) {
  const response=await fetch(`/api${path}`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/pdf',...(csrf?{'X-CSRF-Token':csrf}:{})},body:file})
  let data
  try{data=await response.json()}catch{throw Error('The private upload could not be confirmed. Please try again.')}
  if(!response.ok)throw Error(data.error||'The private upload could not be completed.')
  return data
}
