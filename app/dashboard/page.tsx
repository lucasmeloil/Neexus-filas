"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import {
  Users,
  Clock,
  Activity,
  Target,
  Award,
  Bell,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
  TrendingDown,
  Timer,
  Wifi,
  RefreshCw,
} from "lucide-react"
import { useQueueStore, useRealtimeSync } from "@/lib/queue-store"
import { useAuthStore } from "@/lib/auth-store"
import { AuthGuard } from "@/components/auth-guard"
import Link from "next/link"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

const serviceTypeConfig = {
  normal: { label: "Normal", color: "#0088FE" },
  pregnant: { label: "Gestantes", color: "#FF8042" },
  elderly: { label: "Idosos 60+", color: "#00C49F" },
}

export default function DashboardPage() {
  const { queue, getServedToday, getWaitingCount, getWaitingCountByType, attendantStatus, currentNumbers } =
    useQueueStore()
  const { user } = useAuthStore()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Inicializar sincronização em tempo real
  useRealtimeSync()

  // Atualizar relógio e dados em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      setLastUpdate(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Simular conexão
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(true)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Atualizar quando dados mudarem
  useEffect(() => {
    setLastUpdate(new Date())
  }, [queue, attendantStatus, currentNumbers])

  // Dados para gráficos em tempo real
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    return date
  }).reverse()

  const dailyData = last7Days.map((date) => {
    const dayQueue = queue.filter((item) => item.timestamp.toDateString() === date.toDateString())
    const completed = dayQueue.filter((item) => item.status === "completed")
    const avgTime =
      completed.length > 0
        ? Math.round(completed.reduce((sum, item) => sum + (item.serviceTime || 0), 0) / completed.length)
        : 0

    return {
      day: date.toLocaleDateString("pt-BR", { weekday: "short" }),
      date: date.toLocaleDateString("pt-BR"),
      total: dayQueue.length,
      completed: completed.length,
      waiting: dayQueue.filter((item) => item.status === "waiting").length,
      avgTime,
      efficiency: dayQueue.length > 0 ? Math.round((completed.length / dayQueue.length) * 100) : 0,
    }
  })

  const serviceTypeData = Object.entries(serviceTypeConfig).map(([key, config]) => ({
    name: config.label,
    value: queue.filter((item) => item.serviceType === key).length,
    waiting: getWaitingCountByType(key as any),
    completed: queue.filter((item) => item.serviceType === key && item.status === "completed").length,
    color: config.color,
  }))

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourQueue = queue.filter((item) => {
      const itemHour = item.timestamp.getHours()
      return itemHour === hour && item.timestamp.toDateString() === today.toDateString()
    })
    const completed = hourQueue.filter((item) => item.status === "completed")
    return {
      hour: `${hour.toString().padStart(2, "0")}:00`,
      tickets: hourQueue.length,
      completed: completed.length,
      waiting: hourQueue.filter((item) => item.status === "waiting").length,
    }
  })

  // CORRIGIR: Dados de tendência das últimas 2 horas com dados reais
  const now = new Date()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

  // Criar intervalos de 10 minutos nas últimas 2 horas
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const intervalStart = new Date(twoHoursAgo.getTime() + i * 10 * 60 * 1000)
    const intervalEnd = new Date(intervalStart.getTime() + 10 * 60 * 1000)

    // Filtrar senhas criadas neste intervalo
    const intervalQueue = queue.filter((item) => {
      return item.timestamp >= intervalStart && item.timestamp < intervalEnd
    })

    const intervalCompleted = intervalQueue.filter((item) => item.status === "completed")

    return {
      time: intervalStart.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      tickets: intervalQueue.length,
      completed: intervalCompleted.length,
      waiting: intervalQueue.filter((item) => item.status === "waiting").length,
    }
  })

  // Dados de performance em tempo real
  const todayQueue = queue.filter((item) => item.timestamp.toDateString() === today.toDateString())
  const completedToday = todayQueue.filter((item) => item.status === "completed")
  const waitingToday = todayQueue.filter((item) => item.status === "waiting")

  const avgServiceTime =
    completedToday.length > 0
      ? Math.round(completedToday.reduce((sum, item) => sum + (item.serviceTime || 0), 0) / completedToday.length)
      : 0

  const efficiency = todayQueue.length > 0 ? Math.round((completedToday.length / todayQueue.length) * 100) : 0
  const activeAttendants = Object.values(attendantStatus).filter((status) => status === "busy").length
  const totalAttendants = Object.keys(attendantStatus).length

  // Métricas avançadas
  const peakHour = hourlyData.reduce((max, current) => (current.tickets > max.tickets ? current : max), hourlyData[0])
  const slowestService = completedToday.reduce(
    (max, current) => ((current.serviceTime || 0) > (max.serviceTime || 0) ? current : max),
    completedToday[0] || { serviceTime: 0 },
  )
  const fastestService = completedToday.reduce(
    (min, current) => ((current.serviceTime || 0) < (min.serviceTime || 0) ? current : min),
    completedToday[0] || { serviceTime: 0 },
  )

  // Status do sistema
  const systemHealth = {
    queueStatus: getWaitingCount() < 10 ? "good" : getWaitingCount() < 20 ? "warning" : "critical",
    serviceTime: avgServiceTime <= 5 ? "good" : avgServiceTime <= 8 ? "warning" : "critical",
    efficiency: efficiency >= 80 ? "good" : efficiency >= 60 ? "warning" : "critical",
    attendants: activeAttendants >= 2 ? "good" : activeAttendants >= 1 ? "warning" : "critical",
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 bg-green-50 border-green-200"
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "critical":
        return <XCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100">
        {/* Header Aprimorado */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  Dashboard Executivo
                </h1>
                <p className="text-gray-600">Monitoramento em tempo real • Sistema empresarial</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Status de Conexão */}
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-600" />
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Online
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 text-red-600" />
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Offline
                      </Badge>
                    </>
                  )}
                </div>

                {/* Usuário Logado */}
                <div className="text-right">
                  <div className="text-sm text-gray-500">Bem-vindo,</div>
                  <div className="font-semibold">{user?.name}</div>
                </div>

                {/* Relógio em Tempo Real */}
                <div className="text-right bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Agora</div>
                  <div className="font-mono font-bold text-blue-800">{currentTime.toLocaleTimeString("pt-BR")}</div>
                </div>

                {/* Última Atualização */}
                <div className="text-right">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Atualizado
                  </div>
                  <div className="text-xs font-mono">{lastUpdate.toLocaleTimeString("pt-BR")}</div>
                </div>

                <Link href="/management">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Status do Sistema em Tempo Real */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Status do Sistema em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg border ${getStatusColor(systemHealth.queueStatus)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(systemHealth.queueStatus)}
                    <span className="font-medium">Fila</span>
                  </div>
                  <div className="text-2xl font-bold">{getWaitingCount()}</div>
                  <div className="text-sm">pessoas aguardando</div>
                </div>

                <div className={`p-3 rounded-lg border ${getStatusColor(systemHealth.serviceTime)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(systemHealth.serviceTime)}
                    <span className="font-medium">Tempo Médio</span>
                  </div>
                  <div className="text-2xl font-bold">{avgServiceTime}min</div>
                  <div className="text-sm">por atendimento</div>
                </div>

                <div className={`p-3 rounded-lg border ${getStatusColor(systemHealth.efficiency)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(systemHealth.efficiency)}
                    <span className="font-medium">Eficiência</span>
                  </div>
                  <div className="text-2xl font-bold">{efficiency}%</div>
                  <div className="text-sm">taxa de conclusão</div>
                </div>

                <div className={`p-3 rounded-lg border ${getStatusColor(systemHealth.attendants)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(systemHealth.attendants)}
                    <span className="font-medium">Guichês</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {activeAttendants}/{totalAttendants}
                  </div>
                  <div className="text-sm">ativos agora</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs Principais Expandidos */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Senhas Hoje</CardTitle>
                <Users className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayQueue.length}</div>
                <p className="text-xs text-blue-100">
                  {todayQueue.length > 0
                    ? `+${todayQueue.length - (todayQueue.length - completedToday.length - waitingToday.length)}`
                    : "0"}{" "}
                  vs ontem
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
                <Target className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedToday.length}</div>
                <p className="text-xs text-green-100">{efficiency}% de eficiência</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgServiceTime}min</div>
                <p className="text-xs text-orange-100">Meta: ≤5min {avgServiceTime <= 5 ? "✓" : "✗"}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Na Fila</CardTitle>
                <Activity className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getWaitingCount()}</div>
                <p className="text-xs text-purple-100">aguardando agora</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pico do Dia</CardTitle>
                <Zap className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{peakHour?.hour || "--:--"}</div>
                <p className="text-xs text-indigo-100">{peakHour?.tickets || 0} senhas</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Avançados */}
          <Tabs defaultValue="realtime" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
              <TabsTrigger value="daily">Últimos 7 Dias</TabsTrigger>
              <TabsTrigger value="types">Por Tipo</TabsTrigger>
              <TabsTrigger value="hourly">Por Hora</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="realtime" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tendência - Últimas 2 Horas</CardTitle>
                    <CardDescription>Fluxo de senhas em tempo real (intervalos de 10 min)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => `Horário: ${value}`}
                          formatter={(value, name) => {
                            const labels = {
                              tickets: "Total de Senhas",
                              completed: "Atendidas",
                              waiting: "Aguardando",
                            }
                            return [value, labels[name as keyof typeof labels] || name]
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="tickets"
                          stackId="1"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                          name="tickets"
                        />
                        <Area
                          type="monotone"
                          dataKey="completed"
                          stackId="2"
                          stroke="#82ca9d"
                          fill="#82ca9d"
                          fillOpacity={0.6}
                          name="completed"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {trendData.every((item) => item.tickets === 0) && (
                      <div className="text-center text-gray-500 py-4">
                        <p>Nenhuma atividade nas últimas 2 horas</p>
                        <p className="text-sm">Gere algumas senhas para ver o gráfico</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição Atual por Tipo</CardTitle>
                    <CardDescription>Status em tempo real de cada categoria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceTypeData.map((item, index) => (
                        <div key={item.name} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            <div className="flex gap-2">
                              <Badge variant="outline" style={{ color: item.color, borderColor: item.color }}>
                                {item.waiting} aguardando
                              </Badge>
                              <Badge variant="default" style={{ backgroundColor: item.color }}>
                                {item.completed} atendidos
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={item.value > 0 ? (item.completed / item.value) * 100 : 0}
                            className="h-2"
                            style={{ backgroundColor: `${item.color}20` }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance dos Últimos 7 Dias</CardTitle>
                  <CardDescription>Análise comparativa de eficiência e volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="total" fill="#8884d8" name="Total" />
                      <Bar yAxisId="left" dataKey="completed" fill="#82ca9d" name="Atendidas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="types" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição Total por Tipo</CardTitle>
                    <CardDescription>Proporção geral de atendimentos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={serviceTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {serviceTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Métricas por Tipo</CardTitle>
                    <CardDescription>Detalhamento de performance por categoria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceTypeData.map((item) => {
                        const completionRate = item.value > 0 ? Math.round((item.completed / item.value) * 100) : 0
                        return (
                          <div key={item.name} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">{item.name}</h4>
                              <Badge style={{ backgroundColor: item.color, color: "white" }}>
                                {completionRate}% concluído
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <div className="text-gray-500">Total</div>
                                <div className="font-bold">{item.value}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Aguardando</div>
                                <div className="font-bold text-orange-600">{item.waiting}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Atendidos</div>
                                <div className="font-bold text-green-600">{item.completed}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="hourly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fluxo Detalhado por Hora - Hoje</CardTitle>
                  <CardDescription>Análise completa do movimento diário</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tickets" fill="#8884d8" name="Total" />
                      <Bar dataKey="completed" fill="#82ca9d" name="Atendidas" />
                      <Bar dataKey="waiting" fill="#ffc658" name="Aguardando" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Metas e Indicadores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Meta Diária: 100 atendimentos</span>
                        <span className="font-bold">{completedToday.length}/100</span>
                      </div>
                      <Progress value={(completedToday.length / 100) * 100} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Eficiência (Meta: ≥80%)</span>
                        <span className="font-bold">{efficiency}%</span>
                      </div>
                      <Progress value={efficiency} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Tempo Médio (Meta: ≤5min)</span>
                        <span className="font-bold">{avgServiceTime} min</span>
                      </div>
                      <Progress value={Math.min((5 / Math.max(avgServiceTime, 1)) * 100, 100)} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Guichês Ativos</span>
                        <span className="font-bold">
                          {activeAttendants}/{totalAttendants}
                        </span>
                      </div>
                      <Progress value={(activeAttendants / totalAttendants) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      Recordes do Dia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Atendimento Mais Rápido</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{fastestService?.serviceTime || 0} min</div>
                      <div className="text-sm text-green-600">Senha: {fastestService?.displayNumber || "N/A"}</div>
                    </div>

                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800">Atendimento Mais Lento</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{slowestService?.serviceTime || 0} min</div>
                      <div className="text-sm text-red-600">Senha: {slowestService?.displayNumber || "N/A"}</div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Horário de Pico</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{peakHour?.hour || "--:--"}</div>
                      <div className="text-sm text-blue-600">{peakHour?.tickets || 0} senhas geradas</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Alertas Inteligentes Expandidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Central de Alertas Inteligentes
              </CardTitle>
              <CardDescription>Monitoramento automático e sugestões do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Alerta de Fila Longa */}
                {getWaitingCount() > 15 && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Fila crítica:</strong> {getWaitingCount()} pessoas aguardando. Recomendação: Abrir todos
                      os guichês e considerar atendimento express.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerta de Tempo Alto */}
                {avgServiceTime > 8 && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Tempo elevado:</strong> Média de {avgServiceTime} minutos por atendimento. Meta: ≤5
                      minutos. Verificar processos dos guichês.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerta de Baixa Eficiência */}
                {efficiency < 70 && todayQueue.length > 5 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <TrendingDown className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Eficiência baixa:</strong> {efficiency}% de conclusão hoje. Investigar causas de abandono
                      ou demora nos atendimentos.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerta de Poucos Guichês */}
                {activeAttendants < 2 && getWaitingCount() > 5 && (
                  <Alert className="border-purple-200 bg-purple-50">
                    <Users className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-800">
                      <strong>Poucos guichês ativos:</strong> Apenas {activeAttendants} de {totalAttendants} guichês em
                      operação. Considere ativar mais posições de atendimento.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alertas Positivos */}
                {efficiency >= 90 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Excelente performance!</strong> {efficiency}% de eficiência hoje. Sistema funcionando
                      perfeitamente. Parabéns à equipe!
                    </AlertDescription>
                  </Alert>
                )}

                {getWaitingCount() === 0 && completedToday.length > 0 && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Fila zerada!</strong> Todos os {completedToday.length} clientes foram atendidos. Sistema
                      operando com máxima eficiência.
                    </AlertDescription>
                  </Alert>
                )}

                {avgServiceTime <= 3 && completedToday.length > 5 && (
                  <Alert className="border-emerald-200 bg-emerald-50">
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800">
                      <strong>Atendimento ultra-rápido!</strong> Tempo médio de apenas {avgServiceTime} minutos. Equipe
                      está superando todas as expectativas!
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerta quando não há alertas */}
                {getWaitingCount() <= 10 && avgServiceTime <= 8 && efficiency >= 70 && activeAttendants >= 1 && (
                  <Alert className="border-gray-200 bg-gray-50">
                    <Activity className="h-4 w-4 text-gray-600" />
                    <AlertDescription className="text-gray-800">
                      <strong>Sistema estável:</strong> Todos os indicadores dentro dos parâmetros normais. Operação
                      funcionando conforme esperado.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rodapé com Informações do Sistema */}
          <Card className="bg-gradient-to-r from-gray-50 to-blue-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold text-gray-800">NEXUS FILAS v3.2 - Dashboard Empresarial</p>
                  <p className="text-gray-600">
                    🔄 Atualização automática • 📊 Analytics em tempo real • 🔐 Sistema seguro • ⚡ Performance
                    otimizada
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">NEXUS SOFT TECH</p>
                  <p className="text-gray-600">© 2024 - Todos os direitos reservados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
