import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './design.css'
import App from './App.jsx'
import { DevAuthProvider, ClerkBridge } from './lib/auth.jsx'

// Remove stale api-keys that were previously stored in localStorage.
// Secrets must never live in the browser — they belong in backend/.env only.
localStorage.removeItem('trendforge_api_keys')

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn('[auth] VITE_CLERK_PUBLISHABLE_KEY not set — auth disabled, running in dev mode')
}

function Root() {
  if (!PUBLISHABLE_KEY) {
    return (
      <DevAuthProvider>
        <App/>
      </DevAuthProvider>
    )
  }
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/sign-in">
      <ClerkBridge>
        <App/>
      </ClerkBridge>
    </ClerkProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root/>
  </React.StrictMode>
)
