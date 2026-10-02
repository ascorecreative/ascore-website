import { useState } from 'react'
import { ArrowLeft,ArrowUpRight,LockKeyhole } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import '../../styles/portal-functional.css'

export default function AuthPage({ initialMode='login',onAuthSuccess }) {
  const {loginWithEmail,signup,setupAdmin,connectionError,backendAvailable} = useAuth()
  const [mode,setMode] = useState(initialMode)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const submit = async event => {
    event.preventDefault();if(!backendAvailable)return;setError('');setBusy(true)
    const data=Object.fromEntries(new FormData(event.currentTarget))
    try {
      if(mode==='login') await loginWithEmail(data.identifier,data.password)
      else {
        if(data.password!==data.confirmPassword) throw Error('The passwords do not match.')
        delete data.confirmPassword
        if(mode==='setup') await setupAdmin(data)
        else await signup(data)
      }
      onAuthSuccess?.()
    } catch(err) {setError(err.message)} finally {setBusy(false)}
  }
  return <main className="portal-entry">
    <header className="portal-entry-header"><a href="/" className="portal-entry-brand" aria-label="Ascore Creative home"><img src="/logo-white.png" alt="Ascore" /></a><a href="/" className="portal-entry-back"><ArrowLeft size={16}/>Back to site</a></header>
    <section className="portal-entry-content"><div className="portal-entry-copy"><p className="portal-entry-eyebrow"><LockKeyhole size={16}/>YOUR SPACE TO COLLABORATE</p><h1>A clearer view<br/>of what’s <em>next.</em></h1><p className="portal-entry-description">Projects, quotations and financial records in one place. Clients see their own work. The agency manages the bigger picture.</p><p className="portal-entry-note">Financial tracking only</p></div>
      <div className="portal-entry-card functional-auth"><span>ASCORE / {mode==='setup'?'AGENCY SETUP':mode==='signup'?'CLIENT REGISTRATION':'SIGN IN'}</span><h2>{mode==='setup'?'Set up your account.':mode==='signup'?'Let’s get started.':'Welcome back.'}</h2>
      {!backendAvailable&&<div className="portal-notice" role="status"><p>The client portal is awaiting activation. Sign-in, registration and account setup are not available yet.</p><p><a href="mailto:info@ascore.ae">Email info@ascore.ae</a> · <a href="https://wa.me/971568555626" target="_blank" rel="noopener noreferrer">WhatsApp</a></p></div>}
      <form onSubmit={submit} key={mode}><fieldset className="portal-auth-fields" disabled={!backendAvailable}>
        {mode==='login'?<label>Username or email<input name="identifier" autoComplete="username" required maxLength={254}/></label>:<>
          <label>Your name<input name="name" autoComplete="name" required maxLength={100}/></label>
          <label>Username<input name="username" autoComplete="username" required pattern="[A-Za-z][A-Za-z0-9_.\-]{2,39}" minLength={3} maxLength={40}/></label>
          {mode==='signup'&&<><label>Email<input type="email" name="email" autoComplete="email" required maxLength={254}/></label><label>Company<input name="company" autoComplete="organization" maxLength={160}/></label></>}
          {mode==='setup'&&<label>Approved setup token<input type="password" name="setupToken" autoComplete="off" required/><small>Activation is disabled until an operator approves a private, expiring setup grant. Admin login uses your username.</small></label>}
        </>}
        <label>Password<input type="password" name="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:15} maxLength={128}/>{mode!=='login'&&<small>Use at least 15 characters. Choose your password privately.</small>}</label>
        {mode!=='login'&&<label>Confirm password<input type="password" name="confirmPassword" autoComplete="new-password" required minLength={15} maxLength={128}/></label>}
        {backendAvailable&&(error||connectionError)&&<p className="portal-form-error" role="alert">{error||connectionError}</p>}
        <button type="submit" className="portal-submit" disabled={busy||!backendAvailable}>{!backendAvailable?'Portal awaiting activation':busy?'Please wait…':mode==='login'?'Sign in':mode==='setup'?'Activate approved account':'Register as a client'}<ArrowUpRight size={18}/></button>
      </fieldset></form>
      <div className="portal-auth-links"><button type="button" disabled={!backendAvailable} onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('')}}>{mode==='signup'?'Already registered? Sign in':'Create a client account'}</button><button type="button" disabled={!backendAvailable} onClick={()=>{setMode(mode==='setup'?'login':'setup');setError('')}}>{mode==='setup'?'Back to sign in':'Agency account setup'}</button></div>
      <p className="portal-recovery-note">Password recovery is not connected yet. Contact the agency for identity-verified assistance.</p>
      </div>
    </section><footer className="portal-entry-footer"><span>ASCORE CREATIVE / CLIENT & AGENCY PORTALS</span><span>MADE IN THE UAE</span></footer>
  </main>
}
