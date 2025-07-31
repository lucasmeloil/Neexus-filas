"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Clock,
  UserCheck,
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  Baby,
  Volume2,
  RotateCcw,
  FileText,
  Download,
  Timer,
  Filter,
  X,
  TrendingUp,
} from "lucide-react"
import { useQueueStore, useRealtimeSync, type ServiceType } from "@/lib/queue-store"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { useAuthStore } from "@/lib/auth-store"

const serviceTypeConfig = {
  normal: {
    label: "Normal",
    icon: Users,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  pregnant: {
    label: "Gestante",
    icon: Baby,
    color: "bg-pink-500",
    textColor: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  elderly: {
    label: "Idoso",
    icon: UserCheck,
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
  },
}

// Função para formatar data brasileira com dia da semana
const formatBrazilianDate = (date: Date) => {
  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
  const dayOfWeek = diasSemana[date.getDay()]
  const formattedDate = date.toLocaleDateString("pt-BR")
  const formattedTime = date.toLocaleTimeString("pt-BR")

  return {
    dayOfWeek,
    date: formattedDate,
    time: formattedTime,
    full: `${dayOfWeek}, ${formattedDate} às ${formattedTime}`,
  }
}

// Função para filtrar dados por período
const filterByDateRange = (items: any[], startDate?: string, endDate?: string, serviceType?: ServiceType) => {
  return items.filter((item) => {
    let passesFilter = true

    if (startDate) {
      const start = new Date(startDate + "T00:00:00")
      passesFilter = passesFilter && item.timestamp >= start
    }

    if (endDate) {
      const end = new Date(endDate + "T23:59:59")
      passesFilter = passesFilter && item.timestamp <= end
    }

    if (serviceType) {
      passesFilter = passesFilter && item.serviceType === serviceType
    }

    return passesFilter
  })
}

export default function ManagementPanel() {
  const {
    queue,
    currentNumbers,
    attendantStatus,
    callNext,
    callAgain,
    completeService,
    getWaitingCount,
    getWaitingCountByType,
    getServedToday,
    getPriorityQueue,
    getCompletedWithTime,
    calledTickets,
    lastCalledByAttendant,
  } = useQueueStore()
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const { user, logout } = useAuthStore()

  // Estados para filtros
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterServiceType, setFilterServiceType] = useState<ServiceType | "">("normal")
  const [showFilters, setShowFilters] = useState(false)

  // Estados para filtros do PDF
  const [pdfStartDate, setPdfStartDate] = useState("")
  const [pdfEndDate, setPdfEndDate] = useState("")
  const [pdfServiceType, setPdfServiceType] = useState<ServiceType | "">("normal")
  const [showPdfFilters, setShowPdfFilters] = useState(false)

  // Inicializar sincronização em tempo real
  useRealtimeSync()

  // Atualizar timestamp quando dados mudarem
  useEffect(() => {
    setLastUpdate(new Date())
  }, [queue, currentNumbers, attendantStatus])

  // Simular status de conexão
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(true)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Definir data de hoje como padrão para os filtros
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setFilterStartDate(today)
    setFilterEndDate(today)
    setPdfStartDate(today)
    setPdfEndDate(today)
  }, [])

  const handleCallNext = (attendantId: number) => {
    const waitingCount = getWaitingCount()

    if (waitingCount === 0) {
      toast({
        title: "Fila vazia",
        description: "Não há clientes aguardando",
        variant: "destructive",
      })
      return
    }

    const priorityQueue = getPriorityQueue()
    const nextCustomer = priorityQueue[0]

    callNext(attendantId)

    toast({
      title: `Guichê ${attendantId}`,
      description: `Chamando senha ${nextCustomer.displayNumber} (${serviceTypeConfig[nextCustomer.serviceType].label})`,
    })
  }

  const handleCallAgain = (attendantId: number) => {
    const lastCalled = lastCalledByAttendant[attendantId]

    if (!lastCalled) {
      toast({
        title: "Nenhuma senha para repetir",
        description: `Guichê ${attendantId} não possui senha anterior`,
        variant: "destructive",
      })
      return
    }

    callAgain(attendantId)

    toast({
      title: `Guichê ${attendantId}`,
      description: `Chamando novamente senha ${lastCalled.displayNumber} (${serviceTypeConfig[lastCalled.serviceType].label})`,
    })
  }

  const handleCompleteService = (attendantId: number) => {
    const currentNumber = currentNumbers[attendantId]

    if (!currentNumber) return

    completeService(attendantId)

    toast({
      title: `Guichê ${attendantId}`,
      description: `Atendimento da senha ${currentNumber} finalizado`,
    })
  }

  // Limpar filtros
  const clearFilters = () => {
    setFilterStartDate("")
    setFilterEndDate("")
    setFilterServiceType("normal")
  }

  const clearPdfFilters = () => {
    setPdfStartDate("")
    setPdfEndDate("")
    setPdfServiceType("normal")
  }

  // Aplicar filtros aos atendimentos concluídos
  const getFilteredCompletedItems = () => {
    const completedItems = getCompletedWithTime()
    if (!filterStartDate && !filterEndDate && filterServiceType === "normal") {
      return completedItems
    }
    return filterByDateRange(completedItems, filterStartDate, filterEndDate, filterServiceType as ServiceType)
  }

  // Função para exportar relatório em PDF com filtros
  const handleExportPDF = () => {
    const startDate = pdfStartDate ? new Date(pdfStartDate + "T00:00:00") : null
    const endDate = pdfEndDate ? new Date(pdfEndDate + "T23:59:59") : null

    // Filtrar dados pelo período selecionado
    let filteredQueue = queue
    if (startDate || endDate || pdfServiceType) {
      filteredQueue = filterByDateRange(queue, pdfStartDate, pdfEndDate, pdfServiceType as ServiceType)
    }

    const filteredCompleted = filteredQueue.filter((item) => item.status === "completed")
    const filteredWaiting = filteredQueue.filter((item) => item.status === "waiting")
    const filteredCalled = filteredQueue.filter((item) => item.status === "called")

    // Calcular tempo médio de atendimento
    const completedWithTime = filteredCompleted.filter((item) => item.serviceTime !== undefined)
    const averageServiceTime =
      completedWithTime.length > 0
        ? Math.round(
            completedWithTime.reduce((sum, item) => sum + (item.serviceTime || 0), 0) / completedWithTime.length,
          )
        : 0

    // Estatísticas por tipo
    const statsByType = Object.keys(serviceTypeConfig).map((type) => {
      const typeQueue = filteredQueue.filter((item) => item.serviceType === type)
      const typeCompleted = typeQueue.filter((item) => item.status === "completed")
      const typeCompletedWithTime = typeCompleted.filter((item) => item.serviceTime !== undefined)
      const typeAvgTime =
        typeCompletedWithTime.length > 0
          ? Math.round(
              typeCompletedWithTime.reduce((sum, item) => sum + (item.serviceTime || 0), 0) /
                typeCompletedWithTime.length,
            )
          : 0

      return {
        type: serviceTypeConfig[type as ServiceType].label,
        total: typeQueue.length,
        completed: typeCompleted.length,
        waiting: typeQueue.filter((item) => item.status === "waiting").length,
        avgTime: typeAvgTime,
      }
    })

    // Definir período do relatório
    const periodText =
      startDate && endDate
        ? `${formatBrazilianDate(startDate).date} a ${formatBrazilianDate(endDate).date}`
        : startDate
          ? `A partir de ${formatBrazilianDate(startDate).date}`
          : endDate
            ? `Até ${formatBrazilianDate(endDate).date}`
            : "Todos os registros"

    const serviceTypeText = pdfServiceType ? ` - ${serviceTypeConfig[pdfServiceType].label}` : ""

    // Criar conteúdo HTML para PDF
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório - NEXUS FILAS</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .company {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            margin-bottom: 5px;
          }
          .system {
            font-size: 18px;
            font-weight: bold;
            color: #666;
            margin-bottom: 10px;
          }
          .period {
            font-size: 14px;
            color: #666;
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-card {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            background: #f9f9f9;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .table th,
          .table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
          .day-column {
            font-weight: bold;
            color: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">NEXUS SOFT TECH</div>
          <div class="system">NEXUS FILAS</div>
          <div class="period">
            <strong>Período do Relatório:</strong> ${periodText}${serviceTypeText}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Resumo Geral</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${filteredQueue.length}</div>
              <div class="stat-label">Total de Senhas Geradas</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${filteredCompleted.length}</div>
              <div class="stat-label">Atendimentos Finalizados</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${filteredWaiting.length}</div>
              <div class="stat-label">Aguardando Atendimento</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${averageServiceTime} min</div>
              <div class="stat-label">Tempo Médio de Atendimento</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Estatísticas por Tipo de Atendimento</div>
          <table class="table">
            <thead>
              <tr>
                <th>Tipo de Atendimento</th>
                <th>Total Geradas</th>
                <th>Finalizadas</th>
                <th>Aguardando</th>
                <th>Taxa de Conclusão</th>
                <th>Tempo Médio</th>
              </tr>
            </thead>
            <tbody>
              ${statsByType
                .map(
                  (stat) => `
                <tr>
                  <td>${stat.type}</td>
                  <td>${stat.total}</td>
                  <td>${stat.completed}</td>
                  <td>${stat.waiting}</td>
                  <td>${stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0}%</td>
                  <td>${stat.avgTime} min</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Atendimentos Finalizados com Tempo de Serviço</div>
          <table class="table">
            <thead>
              <tr>
                <th>Senha</th>
                <th>Tipo</th>
                <th>Dia da Semana</th>
                <th>Data/Hora Chamada</th>
                <th>Data/Hora Finalizada</th>
                <th>Guichê</th>
                <th>Tempo</th>
              </tr>
            </thead>
            <tbody>
              ${completedWithTime
                .slice(0, 30)
                .map((item) => {
                  const calledFormat = item.calledAt ? formatBrazilianDate(item.calledAt) : null
                  const completedFormat = item.completedAt ? formatBrazilianDate(item.completedAt) : null

                  return `
                    <tr>
                      <td>${item.displayNumber}</td>
                      <td>${serviceTypeConfig[item.serviceType].label}</td>
                      <td class="day-column">${completedFormat?.dayOfWeek || "-"}</td>
                      <td>${calledFormat?.full || "-"}</td>
                      <td>${completedFormat?.full || "-"}</td>
                      <td>Guichê ${item.attendant || "-"}</td>
                      <td><strong>${item.serviceTime || 0} min</strong></td>
                    </tr>
                  `
                })
                .join("")}
            </tbody>
          </table>
          ${completedWithTime.length > 30 ? `<p style="margin-top: 10px; font-style: italic;">Mostrando apenas os primeiros 30 registros de ${completedWithTime.length} total.</p>` : ""}
        </div>

        <div class="footer">
          <p>Relatório gerado em ${formatBrazilianDate(new Date()).full}</p>
          <p>NEXUS FILAS v3.1 - Sistema de Controle de Filas</p>
          <p>NEXUS SOFT TECH - Soluções em Tecnologia</p>
        </div>
      </body>
      </html>
    `

    // Abrir nova janela para impressão/PDF
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(reportContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 500)

      toast({
        title: "Relatório Gerado",
        description: `Relatório do período ${periodText} foi gerado com sucesso!`,
      })
    }
  }

  const waitingCount = getWaitingCount()
  const servedToday = getServedToday()
  const filteredCompleted = getFilteredCompletedItems()
  const averageWaitTime =
    filteredCompleted.length > 0
      ? `${Math.round(filteredCompleted.reduce((sum, item) => sum + (item.serviceTime || 0), 0) / filteredCompleted.length)} min`
      : "0 min"
  const activeAttendants = Object.values(attendantStatus).filter((status) => status === "busy").length

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
        {/* Header com Branding */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="text-center mb-3">
              <h1
                className="text-xl md:text-2xl font-black text-white tracking-wider"
                style={{
                  textShadow: "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)",
                  fontFamily: "Arial Black, sans-serif",
                }}
              >
                NEXUS SOFT TECH
              </h1>
              {user && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    👤 {user.name}
                  </Badge>
                  <Button onClick={logout} variant="outline" size="sm">
                    Sair
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">NEXUS FILAS</h2>
                <p className="text-gray-600">Painel de Gerenciamento</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Botão Filtros PDF */}
                <Button
                  onClick={() => setShowPdfFilters(!showPdfFilters)}
                  variant="outline"
                  className="bg-green-50 border-green-200 hover:bg-green-100"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar PDF
                </Button>

                {/* Botão Exportar PDF */}
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="bg-green-50 border-green-200 hover:bg-green-100"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <Download className="h-3 w-3 mr-1" />
                  Relatório PDF
                </Button>

                {/* Status de Conexão */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <Wifi className="h-4 w-4 text-green-600" />
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Sincronizado
                        </Badge>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4 text-red-600" />
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          Desconectado
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="text-gray-500">
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    {lastUpdate.toLocaleTimeString()}
                  </div>
                </div>

                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>

                <Link href="/">
                  <Button variant="outline" size="sm">
                    <Monitor className="h-4 w-4 mr-2" />
                    Painel Cliente
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros para PDF */}
        {showPdfFilters && (
          <div className="bg-green-50 border-b border-green-200 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros para Relatório PDF
                </h3>
                <Button onClick={() => setShowPdfFilters(false)} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="pdf-start-date">Data Início</Label>
                  <Input
                    id="pdf-start-date"
                    type="date"
                    value={pdfStartDate}
                    onChange={(e) => setPdfStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pdf-end-date">Data Fim</Label>
                  <Input
                    id="pdf-end-date"
                    type="date"
                    value={pdfEndDate}
                    onChange={(e) => setPdfEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pdf-service-type">Tipo de Atendimento</Label>
                  <Select
                    value={pdfServiceType}
                    onValueChange={(value) => setPdfServiceType(value as ServiceType | "normal")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="pregnant">Gestantes</SelectItem>
                      <SelectItem value="elderly">Idosos 60+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={clearPdfFilters} variant="outline" className="w-full bg-transparent">
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Aguardando</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{waitingCount}</div>
                <p className="text-xs text-muted-foreground">na fila atual</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atendidos Hoje</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{servedToday}</div>
                <p className="text-xs text-muted-foreground">finalizados</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{averageWaitTime}</div>
                <p className="text-xs text-muted-foreground">por atendimento</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Guichês Ativos
                  <Badge variant={activeAttendants === 3 ? "default" : "secondary"}>
                    {activeAttendants === 3 ? "Disponível" : "Ocupado"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{activeAttendants}/3</div>
                <p className="text-sm text-gray-600">em atendimento</p>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle>Fila por Tipo de Atendimento</CardTitle>
              <CardDescription>Distribuição atual da fila por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(serviceTypeConfig).map(([type, config]) => {
                  const Icon = config.icon
                  const count = getWaitingCountByType(type as ServiceType)

                  return (
                    <div
                      key={type}
                      className={`${config.bgColor} p-4 rounded-lg border-l-4 ${config.color.replace("bg-", "border-")}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-5 w-5 ${config.textColor}`} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className={`text-2xl font-bold ${config.textColor}`}>{count}</div>
                      <p className="text-sm text-gray-600">aguardando</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guichês de Atendimento */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((attendantId) => {
                  const lastCalled = lastCalledByAttendant[attendantId]

                  return (
                    <Card key={attendantId} className="relative shadow-lg">
                      <div
                        className={`absolute top-0 left-0 w-full h-1 ${
                          attendantStatus[attendantId] === "available" ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          Guichê {attendantId}
                          <Badge variant={attendantStatus[attendantId] === "available" ? "default" : "secondary"}>
                            {attendantStatus[attendantId] === "available" ? "Disponível" : "Ocupado"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Senha Atual</div>
                          <div className="text-4xl font-bold text-blue-600 py-2 min-h-[60px] flex items-center justify-center">
                            {currentNumbers[attendantId] || "---"}
                          </div>
                        </div>

                        {/* Última senha chamada */}
                        {lastCalled && (
                          <div className="text-center bg-gray-50 p-2 rounded-lg">
                            <div className="text-xs text-gray-500">Última chamada</div>
                            <div className="text-sm font-medium text-gray-700">{lastCalled.displayNumber}</div>
                            <div className="text-xs text-gray-500">
                              {formatBrazilianDate(lastCalled.timestamp).time}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Button
                            onClick={() => handleCallNext(attendantId)}
                            disabled={attendantStatus[attendantId] === "busy" || waitingCount === 0}
                            className="w-full"
                            variant="outline"
                            size="lg"
                          >
                            <Volume2 className="h-4 w-4 mr-2" />
                            Chamar Próximo
                          </Button>

                          {/* Botão Chamar Novamente */}
                          <Button
                            onClick={() => handleCallAgain(attendantId)}
                            disabled={!lastCalled}
                            className="w-full"
                            variant="outline"
                            size="sm"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Chamar Novamente
                          </Button>

                          <Button
                            onClick={() => handleCompleteService(attendantId)}
                            disabled={!currentNumbers[attendantId]}
                            className="w-full"
                            size="lg"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Finalizar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Fila Prioritária */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Fila Prioritária
                  <Badge variant="outline">{waitingCount} aguardando</Badge>
                </CardTitle>
                <CardDescription>Ordem de atendimento por prioridade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getPriorityQueue().length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum cliente na fila</p>
                      <p className="text-sm">Aguardando novos atendimentos</p>
                    </div>
                  ) : (
                    getPriorityQueue().map((item, index) => {
                      const config = serviceTypeConfig[item.serviceType]
                      const Icon = config.icon
                      const formatted = formatBrazilianDate(item.timestamp)

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${config.color.replace("bg-", "border-")} ${config.bgColor}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-medium text-gray-700 shadow">
                              {index + 1}
                            </div>
                            <Icon className={`h-5 w-5 ${config.textColor}`} />
                            <div>
                              <div className="font-medium">{item.displayNumber}</div>
                              <div className="text-sm text-gray-500">
                                {formatted.dayOfWeek}, {formatted.time}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className={config.textColor}>
                            {config.label}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Atendimentos Finalizados com Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Últimos Atendimentos Finalizados
                </div>
                <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </CardTitle>
              <CardDescription>
                Histórico com tempo de atendimento e dias da semana brasileiros (🔊🔊 = Som duplo)
              </CardDescription>
            </CardHeader>

            {/* Painel de Filtros */}
            {showFilters && (
              <div className="mx-6 mb-4 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="filter-start-date">Data Início</Label>
                    <Input
                      id="filter-start-date"
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-end-date">Data Fim</Label>
                    <Input
                      id="filter-end-date"
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-service-type">Tipo</Label>
                    <Select
                      value={filterServiceType}
                      onValueChange={(value) => setFilterServiceType(value as ServiceType | "normal")}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="pregnant">Gestantes</SelectItem>
                        <SelectItem value="elderly">Idosos 60+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={clearFilters} variant="outline" className="w-full bg-transparent">
                      <X className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <CardContent>
              <div className="space-y-2">
                {filteredCompleted.slice(0, 10).map((item, index) => {
                  const config = serviceTypeConfig[item.serviceType]
                  const Icon = config.icon
                  const completedFormat = item.completedAt ? formatBrazilianDate(item.completedAt) : null

                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        <Icon className={`h-4 w-4 ${config.textColor}`} />
                        <div>
                          <div className="font-medium">✅ Senha {item.displayNumber}</div>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-blue-600">{completedFormat?.dayOfWeek}</span>
                            {" • "}
                            Guichê {item.attendant} - {completedFormat?.date} às {completedFormat?.time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={config.textColor}>
                          {config.label}
                        </Badge>
                        <div className="text-sm font-bold text-green-600 mt-1 flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {item.serviceTime || 0} min
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredCompleted.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum atendimento encontrado</p>
                    <p className="text-sm">Ajuste os filtros ou aguarde novos atendimentos</p>
                  </div>
                )}

                {filteredCompleted.length > 10 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-500">
                      Mostrando 10 de {filteredCompleted.length} registros encontrados
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rodapé com Branding */}
          <div className="text-center text-sm text-gray-500 bg-white p-4 rounded-lg">
            <p className="font-semibold">NEXUS FILAS v3.1 - 3 Tipos de Atendimento + Filtros Avançados</p>
            <p>
              🔊🔊 Som duplo • ⏱️ Tempo de atendimento • 📅 Dias da semana BR • 🗂️ Filtros por data • 📄 Relatórios PDF •
              NEXUS SOFT TECH
            </p>
            <p>Última atualização: {formatBrazilianDate(lastUpdate).full}</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
