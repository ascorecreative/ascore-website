import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/portalApi'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user,setUser] = useState(null)
  const [loading,setLoading] = useState(true)
  const [connectionError,setConnectionError] = useState('')
  useEffect(() => {
    let active=true
    authService.getCurrentSession().then(result => { if(active) setUser(result.user) }).catch(error => { if(active) setConnectionError(error.message) }).finally(() => { if(active) setLoading(false) })
    return () => { active=false }
  },[])
  const accept = async promise => { const result = await promise; setUser(result.user);setConnectionError('');return result.user }
  const logout = async () => { await authService.logout();setUser(null) }
  return <AuthContext.Provider value={{user,loading,connectionError,isAuthenticated:!!user,isAdmin:user?.role==='admin',loginWithEmail:(id,pass) => accept(authService.loginWithEmail(id,pass)),signup:data => accept(authService.signup(data)),setupAdmin:data => accept(authService.setupAdmin(data)),logout}}>{children}</AuthContext.Provider>
}
export function useAuth() { const context=useContext(AuthContext); if(!context) throw Error('useAuth requires AuthProvider');return context }
