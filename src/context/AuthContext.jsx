import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/portalApi'
import { STATIC_RELEASE } from '../lib/releaseMode'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user,setUser] = useState(null)
  const [loading,setLoading] = useState(!STATIC_RELEASE)
  const [backendAvailable,setBackendAvailable]=useState(false)
  const [connectionError,setConnectionError] = useState('')
  useEffect(() => {
    if(STATIC_RELEASE)return
    let active=true
    authService.getCurrentSession().then(result => { if(active){setUser(result.user);setBackendAvailable(true)} }).catch(error => { if(active){setBackendAvailable(false);setConnectionError(error.message)} }).finally(() => { if(active) setLoading(false) })
    return () => { active=false }
  },[])
  const accept = async action => { if(!backendAvailable)throw Error('The client portal is awaiting activation. Contact info@ascore.ae for assistance.');try{const result = await action(); setUser(result.user);setConnectionError('');return result.user}catch(error){if(error instanceof TypeError||error.unavailable||error.status>=500)setBackendAvailable(false);throw error} }
  const logout = async () => { await authService.logout();setUser(null) }
  return <AuthContext.Provider value={{user,loading,connectionError,backendAvailable,isAuthenticated:!!user,isAdmin:user?.role==='admin',loginWithEmail:(id,pass) => accept(()=>authService.loginWithEmail(id,pass)),signup:data => accept(()=>authService.signup(data)),setupAdmin:data => accept(()=>authService.setupAdmin(data)),logout}}>{children}</AuthContext.Provider>
}
export function useAuth() { const context=useContext(AuthContext); if(!context) throw Error('useAuth requires AuthProvider');return context }
