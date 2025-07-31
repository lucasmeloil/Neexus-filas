"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Shield className="h-12 w-12 text-blue-600 animate-pulse" />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">Verificando acesso...</h2>
              <p className="text-gray-600 mt-2">Redirecionando para login</p>
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
