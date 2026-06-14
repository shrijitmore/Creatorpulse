/**
 * Auth abstraction layer.
 * CLERK_ENABLED=true → delegates to Clerk (ClerkBridge reads hooks, pushes into context)
 * CLERK_ENABLED=false → dev mode, always signed in as "Alex Romero"
 *
 * Components use useAuth() from here — never import @clerk/clerk-react directly.
 */
import React, { createContext, useContext } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'

export const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const DEV_USER = {
  id: 'dev-user',
  fullName: 'Alex Romero',
  firstName: 'Alex',
  primaryEmailAddress: { emailAddress: 'alex@influensa.in' },
  imageUrl: null,
}

const AuthCtx = createContext({
  isSignedIn: true,
  isLoaded: true,
  user: DEV_USER,
  getToken: async () => null,
})

// Dev provider — no Clerk, always logged in
export function DevAuthProvider({ children }) {
  return (
    <AuthCtx.Provider value={{ isSignedIn: true, isLoaded: true, user: DEV_USER, getToken: async () => null }}>
      {children}
    </AuthCtx.Provider>
  )
}

// Clerk bridge — reads Clerk state, pushes into shared context
// ONLY rendered when ClerkProvider is wrapping the tree (CLERK_ENABLED=true)
export function ClerkBridge({ children }) {
  const { isSignedIn, isLoaded, user } = useUser()
  const { getToken } = useClerkAuth()
  return (
    <AuthCtx.Provider value={{ isSignedIn, isLoaded, user, getToken }}>
      {children}
    </AuthCtx.Provider>
  )
}

// Single hook for all components
export function useAuth() {
  return useContext(AuthCtx)
}
