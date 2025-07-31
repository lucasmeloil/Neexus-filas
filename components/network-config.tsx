"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff, Server, Monitor, Settings, CheckCircle, AlertTriangle } from "lucide-react"
import { useNetworkQueueStore } from "@/lib/network-queue-store"

export function NetworkConfig() {
  const { serverUrl, isServer, isConnected, setServerUrl, setIsServer, connectToServer } = useNetworkQueueStore()

  const [tempUrl, setTempUrl] = useState(serverUrl)
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    // Auto-conectar quando a página carrega
    if (!isServer) {
      connectToServer()
    }
  }, [isServer, connectToServer])

  const handleSaveConfig = () => {
    setServerUrl(tempUrl)
    if (!isServer) {
      connectToServer()
    }
    setShowConfig(false)
  }

  const getLocalIP = () => {
    return window.location.hostname
  }

  return (
    <div className="space-y-4">
      {/* Status de Conexão */}
      <Card className={`border-2 ${isConnected ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? <Wifi className="h-6 w-6 text-green-600" /> : <WifiOff className="h-6 w-6 text-red-600" />}
              <div>
                <div className="font-bold text-lg">{isServer ? "Servidor Ativo" : "Cliente Conectado"}</div>
                <div className="text-sm text-gray-600">
                  {isServer ? `Rodando em: ${getLocalIP()}:3000` : `Conectado a: ${serverUrl}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="text-sm">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Online
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>

              <Button onClick={() => setShowConfig(!showConfig)} variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Rede */}
      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Rede
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Modo Servidor/Cliente */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Modo de Operação</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch id="server-mode" checked={isServer} onCheckedChange={setIsServer} />
                  <Label htmlFor="server-mode" className="flex items-center gap-2">
                    {isServer ? <Server className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    {isServer ? "Servidor (Administração)" : "Cliente (Painel)"}
                  </Label>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  {isServer ? (
                    <>
                      <strong>Modo Servidor:</strong> Este computador será o servidor principal. Outros computadores se
                      conectarão a ele. Use este modo no computador da administração.
                    </>
                  ) : (
                    <>
                      <strong>Modo Cliente:</strong> Este computador se conectará ao servidor. Use este modo no
                      computador do painel do cliente.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </div>

            {/* URL do Servidor (apenas para clientes) */}
            {!isServer && (
              <div className="space-y-3">
                <Label htmlFor="server-url" className="text-base font-medium">
                  Endereço do Servidor
                </Label>
                <Input
                  id="server-url"
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="http://192.168.0.102:3000"
                  className="font-mono"
                />
                <div className="text-sm text-gray-600">
                  Digite o IP e porta do computador servidor (ex: http://192.168.0.102:3000)
                </div>
              </div>
            )}

            {/* Informações de Rede */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Informações de Rede</Label>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 font-mono text-sm">
                <div>
                  <strong>IP Local:</strong> {getLocalIP()}
                </div>
                <div>
                  <strong>Porta:</strong> 3000
                </div>
                <div>
                  <strong>URL Completa:</strong> http://{getLocalIP()}:3000
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <Button onClick={handleSaveConfig} className="flex-1">
                Salvar Configurações
              </Button>
              <Button onClick={connectToServer} variant="outline" disabled={isServer} className="flex-1 bg-transparent">
                Reconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">📋 Instruções de Configuração</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 space-y-2">
          <div>
            <strong>1. Computador Servidor (192.168.0.102):</strong>
          </div>
          <div className="ml-4">• Ative o "Modo Servidor"</div>
          <div className="ml-4">
            • Execute: <code className="bg-blue-100 px-2 py-1 rounded">npm run dev</code>
          </div>
          <div className="ml-4">• Acesse o painel administrativo normalmente</div>

          <div className="mt-4">
            <strong>2. Computador Cliente:</strong>
          </div>
          <div className="ml-4">• Mantenha o "Modo Cliente"</div>
          <div className="ml-4">• Configure o IP do servidor: http://192.168.0.102:3000</div>
          <div className="ml-4">• Acesse apenas o painel do cliente</div>

          <div className="mt-4">
            <strong>3. Sincronização:</strong>
          </div>
          <div className="ml-4">• Os dados são sincronizados automaticamente a cada 2 segundos</div>
          <div className="ml-4">• Senhas geradas no cliente aparecem na administração</div>
          <div className="ml-4">• Chamadas da administração aparecem no cliente</div>
        </CardContent>
      </Card>
    </div>
  )
}
