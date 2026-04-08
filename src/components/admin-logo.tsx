"use client"

import { useState } from "react"
import { useAdmin } from "@/components/admin-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { verifyAdminPassword } from "@/lib/actions"

export function AdminLogo() {
  const { isAdmin, onLogoClick, showPasswordDialog, setShowPasswordDialog, onPasswordSubmit, logout } = useAdmin()
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit() {
    if (!password) return
    setPending(true)
    setError(false)
    try {
      const valid = await verifyAdminPassword(password)
      if (valid) {
        onPasswordSubmit(password)
        setPassword("")
      } else {
        setError(true)
      }
    } finally {
      setPending(false)
    }
  }

  function handleClose() {
    setShowPasswordDialog(false)
    setPassword("")
    setError(false)
  }

  return (
    <>
      <div className="flex flex-col cursor-default select-none" onClick={onLogoClick}>
        <span
          className="text-xl sm:text-3xl tracking-tight whitespace-nowrap"
          style={{ color: "black" }}
        >
          ⚽ AtosBaby{isAdmin && <span className="hidden sm:inline ml-2 text-xs font-semibold text-red-500 align-middle">ADMIN</span>}
        </span>
        {isAdmin && (
          <span className="sm:hidden text-xs font-semibold text-red-500 leading-none">ADMIN</span>
        )}
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={handleClose}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Mode administrateur</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">Entrez le mot de passe pour activer le mode admin.</p>
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              aria-invalid={error}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">Mot de passe incorrect.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={pending}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Vérification…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
