"use client"

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react"

type AdminContextType = {
  isAdmin: boolean
  adminPassword: string
  onLogoClick: () => void
  showPasswordDialog: boolean
  setShowPasswordDialog: (v: boolean) => void
  onPasswordSubmit: (password: string) => boolean
  logout: () => void
}

const AdminContext = createContext<AdminContextType | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const clickCount = useRef(0)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onLogoClick = useCallback(() => {
    if (isAdmin) return
    clickCount.current += 1
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => { clickCount.current = 0 }, 2000)
    if (clickCount.current >= 5) {
      clickCount.current = 0
      if (clickTimer.current) clearTimeout(clickTimer.current)
      setShowPasswordDialog(true)
    }
  }, [isAdmin])

  const onPasswordSubmit = useCallback((password: string) => {
    // We validate server-side; here we just store the password for use in the action call
    // Optimistically set admin — the server action will reject if wrong
    setAdminPassword(password)
    setIsAdmin(true)
    setShowPasswordDialog(false)
    return true
  }, [])

  const logout = useCallback(() => {
    setIsAdmin(false)
    setAdminPassword("")
  }, [])

  return (
    <AdminContext.Provider value={{ isAdmin, adminPassword, onLogoClick, showPasswordDialog, setShowPasswordDialog, onPasswordSubmit, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider")
  return ctx
}
