let csrf = null
export async function portalRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, {
    method, credentials:'same-origin', headers:{ ...(body ? {'Content-Type':'application/json'} : {}), ...(csrf && method !== 'GET' ? {'X-CSRF-Token':csrf} : {}) },
    ...(body ? { body:JSON.stringify(body) } : {})
  })
  let data
  try { data = await response.json() } catch { throw Error('The portal server is unavailable. Start the local API and try again.') }
  if (!response.ok) { const error = new Error(data.error || 'The request could not be completed.'); error.status=response.status; throw error }
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
