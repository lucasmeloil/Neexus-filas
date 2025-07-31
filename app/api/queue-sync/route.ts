import { type NextRequest, NextResponse } from "next/server"

// Armazenamento em memória para sincronização
let queueData: any = {
  queue: [],
  currentNumbers: { 1: null, 2: null, 3: null },
  attendantStatus: { 1: "available", 2: "available", 3: "available" },
  nextNumbers: { normal: 1, pregnant: 1, elderly: 1 },
  calledTickets: [],
  currentCalled: null,
  lastCalledByAttendant: { 1: null, 2: null, 3: null },
}

export async function GET() {
  return NextResponse.json(queueData)
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    // Atualizar dados baseado na ação
    switch (action) {
      case "GENERATE_TICKET":
      case "CALL_NEXT":
      case "CALL_AGAIN":
      case "COMPLETE_SERVICE":
        queueData = { ...queueData, ...data }
        break
      default:
        console.log("Ação desconhecida:", action)
    }

    return NextResponse.json({ success: true, data: queueData })
  } catch (error) {
    console.error("Erro na API:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
