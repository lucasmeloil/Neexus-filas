"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Ticket, Settings, Printer, Wifi, WifiOff, Baby, UserCheck, Volume2, Users, Monitor } from "lucide-react"
import { useQueueStore, useRealtimeSync, type ServiceType } from "@/lib/queue-store"
import Link from "next/link"

// Configuração dos tipos de serviço otimizada
const serviceTypeConfig = {
  normal: {
    label: "Normal",
    icon: Users,
    gradient: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-500",
    prefix: "N",
  },
  pregnant: {
    label: "Gestantes",
    icon: Baby,
    gradient: "from-pink-500 to-pink-600",
    bgColor: "bg-pink-50",
    textColor: "text-pink-700",
    borderColor: "border-pink-500",
    prefix: "G",
  },
  elderly: {
    label: "Idosos 60+",
    icon: UserCheck,
    gradient: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-500",
    prefix: "I",
  },
}

export default function ClientPanel() {
  const { generateTicket, nextNumbers, currentCalled, clearCurrentCalled, queue, currentNumbers, attendantStatus } =
    useQueueStore()
  const [lastTicket, setLastTicket] = useState<any>(null)
  const [showTicket, setShowTicket] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [showCalledModal, setShowCalledModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Inicializar sincronização em tempo real
  useRealtimeSync()

  // Atualizar relógio
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Mostrar modal quando uma senha for chamada
  useEffect(() => {
    if (currentCalled) {
      setShowCalledModal(true)
      setTimeout(() => {
        setShowCalledModal(false)
        clearCurrentCalled()
      }, 8000)
    }
  }, [currentCalled, clearCurrentCalled])

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(true)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleGenerateTicket = (serviceType: ServiceType) => {
    const ticket = generateTicket(serviceType)
    setLastTicket(ticket)
    setShowTicket(true)
    setTimeout(() => {
      setShowTicket(false)
    }, 8000)
  }

  const handlePrint = () => {
    if (lastTicket) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Senha de Atendimento</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; background: white; color: black; font-size: 12px; line-height: 1.2; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .company { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .subtitle { font-size: 10px; margin-bottom: 4px; }
            .ticket-number { font-size: 32px; font-weight: bold; text-align: center; margin: 10px 0; border: 2px solid #000; padding: 8px; }
            .service-type { text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0; padding: 4px; border: 1px solid #000; }
            .info { margin: 6px 0; font-size: 11px; }
            .footer { text-align: center; border-top: 2px dashed #000; padding-top: 8px; margin-top: 8px; font-size: 10px; }
            .datetime { text-align: center; font-size: 10px; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">NEXUS FILAS</div>
            <div class="subtitle">Senha de Atendimento</div>
          </div>
          <div class="ticket-number">${lastTicket.displayNumber}</div>
          <div class="service-type">${serviceTypeConfig[lastTicket.serviceType].label.toUpperCase()}</div>
          <div class="info">
            <div>Data: ${lastTicket.timestamp.toLocaleDateString("pt-BR")}</div>
            <div>Hora: ${lastTicket.timestamp.toLocaleTimeString("pt-BR")}</div>
          </div>
          <div class="info">
            <div>Aguarde ser chamado</div>
            <div>Fique atento ao painel</div>
          </div>
          <div class="footer">
            <div>NEXUS SOFT TECH</div>
            <div>Sistema v3.2</div>
          </div>
          <div class="datetime">${new Date().toLocaleString("pt-BR")}</div>
        </body>
        </html>
      `

      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  // Obter senhas em atendimento no momento
  const currentlyBeingServed = Object.entries(currentNumbers)
    .filter(([attendantId, ticketNumber]) => ticketNumber !== null)
    .map(([attendantId, ticketNumber]) => {
      const queueItem = queue.find(
        (item) => item.displayNumber === ticketNumber && item.attendant === Number.parseInt(attendantId),
      )
      return {
        attendantId: Number.parseInt(attendantId),
        ticketNumber,
        serviceType: queueItem?.serviceType || "normal",
        calledAt: queueItem?.calledAt || new Date(),
        status: attendantStatus[Number.parseInt(attendantId)] || "available",
      }
    })

  // Estatísticas em tempo real
  const waitingCount = queue.filter((item) => item.status === "waiting").length
  const servedToday = queue.filter(
    (item) => item.status === "completed" && item.timestamp.toDateString() === new Date().toDateString(),
  ).length

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 overflow-hidden">
      {/* Header Compacto */}
      <div className="bg-white shadow-md border-b border-blue-300 px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              NEXUS FILAS
            </h1>
            <div className="text-xs text-gray-600">Sistema Inteligente</div>
          </div>

          <div className="flex items-center gap-3">
            {/* Relógio Compacto */}
            <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-mono">
              {currentTime.toLocaleTimeString("pt-BR")}
            </div>

            {/* Status */}
            <div className="flex items-center gap-1">
              {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
            </div>

            <Link href="/management">
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Settings className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Layout Principal - TUDO EM UMA TELA */}
      <div className="h-[calc(100vh-60px)] p-3 grid grid-cols-12 grid-rows-12 gap-3">
        {/* PAINEL DE ATENDIMENTOS - Parte Superior Esquerda */}
        <div className="col-span-8 row-span-5">
          <Card className="h-full border-2 border-green-500 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="h-5 w-5 animate-pulse" />
                ATENDIMENTOS AGORA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-[calc(100%-60px)] overflow-hidden">
              {currentlyBeingServed.length === 0 ? (
                <div className="text-center text-gray-500 h-full flex flex-col justify-center">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-bold">Nenhum Atendimento</p>
                  <p className="text-sm">Aguardando chamadas</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 h-full">
                  {currentlyBeingServed.map((service) => {
                    const config = serviceTypeConfig[service.serviceType]
                    const Icon = config.icon
                    const timeInService = Math.floor((new Date().getTime() - service.calledAt.getTime()) / (1000 * 60))

                    return (
                      <div
                        key={service.attendantId}
                        className={`p-3 rounded-lg border-2 ${config.borderColor} ${config.bgColor} animate-pulse`}
                      >
                        <div className="text-center mb-2">
                          <div className="text-2xl font-bold text-gray-800">{service.ticketNumber}</div>
                          <Badge className="text-xs bg-red-500 text-white animate-bounce">EM ATENDIMENTO</Badge>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between bg-white rounded p-1">
                            <span>Guichê:</span>
                            <span className="font-bold text-green-600">{service.attendantId}</span>
                          </div>
                          <div className="flex justify-between bg-white rounded p-1">
                            <span>Tempo:</span>
                            <span className="font-bold text-orange-600">{timeInService}min</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ESTATÍSTICAS RÁPIDAS - Parte Superior Direita */}
        <div className="col-span-4 row-span-5 grid grid-rows-4 gap-2">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-2 text-center">
              <div className="text-xl font-bold">{waitingCount}</div>
              <div className="text-xs opacity-90">Na Fila</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-2 text-center">
              <div className="text-xl font-bold">{servedToday}</div>
              <div className="text-xs opacity-90">Atendidos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-2 text-center">
              <div className="text-xl font-bold">{currentlyBeingServed.length}</div>
              <div className="text-xs opacity-90">Atendendo</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-2 text-center">
              <div className="text-xl font-bold">
                {Object.values(attendantStatus).filter((s) => s === "available").length}
              </div>
              <div className="text-xs opacity-90">Livres</div>
            </CardContent>
          </Card>
        </div>

        {/* TÍTULO CENTRAL */}
        <div className="col-span-12 row-span-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">🎫 RETIRE SUA SENHA</h2>
            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mt-1"></div>
          </div>
        </div>

        {/* BOTÕES DE RETIRAR SENHA - Parte Inferior */}
        <div className="col-span-12 row-span-6 grid grid-cols-3 gap-4">
          {Object.entries(serviceTypeConfig).map(([type, config]) => {
            const Icon = config.icon
            const nextNumber = nextNumbers[type as ServiceType]
            const waitingForType = queue.filter((item) => item.status === "waiting" && item.serviceType === type).length

            return (
              <Card
                key={type}
                className={`h-full border-2 ${config.borderColor} ${config.bgColor} hover:scale-[1.02] transition-all duration-200 shadow-lg`}
              >
                <CardContent className="p-4 h-full flex flex-col">
                  {/* Ícone e Título */}
                  <div className="text-center mb-3">
                    <div className={`p-2 rounded-full bg-white shadow-md mx-auto w-fit mb-2`}>
                      <Icon className={`h-6 w-6 ${config.textColor}`} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">{config.label}</h3>
                  </div>

                  {/* Próxima Senha */}
                  <div className="bg-white rounded-lg p-3 mb-3 text-center shadow-sm">
                    <div className="text-xs text-gray-600 mb-1">Próxima:</div>
                    <div className={`text-3xl font-bold ${config.textColor}`}>
                      {config.prefix}
                      {nextNumber.toString().padStart(3, "0")}
                    </div>
                  </div>

                  {/* Aguardando */}
                  <div className="bg-white rounded-lg p-2 mb-3 text-center shadow-sm">
                    <div className="text-xs text-gray-600">Aguardando:</div>
                    <div className="text-xl font-bold text-gray-700">{waitingForType}</div>
                  </div>

                  {/* Botão */}
                  <Button
                    onClick={() => handleGenerateTicket(type as ServiceType)}
                    className={`w-full h-12 text-sm font-bold text-white bg-gradient-to-r ${config.gradient} hover:scale-105 transition-all duration-200 mt-auto`}
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    RETIRAR
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Modal da Senha Chamada - Compacto */}
      {showCalledModal && currentCalled && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full bg-white shadow-2xl animate-in zoom-in-95 duration-500 border-4 border-red-500 mx-4">
            <CardHeader className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4">
              <div className="text-center">
                <Volume2 className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <CardTitle className="text-2xl font-bold">SENHA CHAMADA!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-center p-6 space-y-4">
              <div className="text-6xl font-bold text-red-600 animate-pulse">{currentCalled.displayNumber}</div>

              <div className="text-4xl font-bold text-green-600 bg-green-50 rounded-xl py-4 border-2 border-green-200">
                GUICHÊ {currentCalled.attendant}
              </div>

              <Badge className={`${serviceTypeConfig[currentCalled.serviceType].textColor} text-lg px-4 py-2`}>
                {serviceTypeConfig[currentCalled.serviceType].label}
              </Badge>

              <Button
                onClick={() => {
                  setShowCalledModal(false)
                  clearCurrentCalled()
                }}
                className="w-full text-lg py-3"
              >
                ENTENDI
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal da Senha Gerada - Compacto */}
      {showTicket && lastTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <Card className="max-w-md w-full bg-white shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-green-500 mx-4">
            <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
              <CardTitle className="text-xl font-bold text-center">✅ Senha Retirada!</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-4 space-y-4">
              <div className="text-5xl font-bold text-green-600 animate-pulse">{lastTicket.displayNumber}</div>

              <Badge className={`${serviceTypeConfig[lastTicket.serviceType].textColor} text-base px-3 py-2`}>
                {serviceTypeConfig[lastTicket.serviceType].label}
              </Badge>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p>🕐 {lastTicket.timestamp.toLocaleTimeString()}</p>
                <p>🔊 Aguarde ser chamado</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowTicket(false)} className="flex-1">
                  Fechar
                </Button>
                <Button variant="outline" onClick={handlePrint} className="flex-1 bg-transparent">
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
