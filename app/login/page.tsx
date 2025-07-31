"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, User, Shield, Clock, AlertCircle } from "lucide-react"
import { useAuthStore } from "@/lib/auth-store"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { login, isAuthenticated, getLoginHistory } = useAuthStore()
  const router = useRouter()

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/management")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(username, password)

      if (success) {
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo ao NEXUS FILAS`,
        })
        router.push("/management")
      } else {
        setError("Usuário ou senha incorretos")
        toast({
          title: "Erro no login",
          description: "Credenciais inválidas",
          variant: "destructive",
        })
      }
    } catch (error) {
      setError("Erro interno do sistema")
    } finally {
      setIsLoading(false)
    }
  }

  const loginHistory = getLoginHistory().slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header com Branding */}
        <div className="text-center space-y-2">
          <h1
            className="text-3xl font-black text-white tracking-wider"
            style={{
              textShadow: "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)",
              fontFamily: "Arial Black, sans-serif",
            }}
          >
            NEXUS SOFT TECH
          </h1>
          <h2 className="text-xl font-bold text-gray-800">NEXUS FILAS</h2>
          <p className="text-gray-600">Sistema de Controle de Filas</p>
        </div>

        {/* Card de Login */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-6 w-6" />
              <CardTitle className="text-2xl">Acesso Administrativo</CardTitle>
            </div>
            <CardDescription className="text-blue-100">
              Entre com suas credenciais para acessar o painel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Histórico de Logins Recentes */}
        {loginHistory.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Últimos Acessos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loginHistory.map((login, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${login.success ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="font-medium">{login.username}</span>
                  </div>
                  <div className="text-gray-500">{login.timestamp.toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rodapé */}
        <div className="text-center text-sm text-gray-500">
          <p>NEXUS FILAS v3.2 - Sistema Empresarial</p>
          <p>© 2024 NEXUS SOFT TECH - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  )
}
