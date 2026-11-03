// providers/auth-provider.tsx
import { createContext, useContext, type ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'

type Session = ReturnType<typeof authClient.useSession>

const AuthContext = createContext<Session | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession()

  return (
    <AuthContext.Provider value={session}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}