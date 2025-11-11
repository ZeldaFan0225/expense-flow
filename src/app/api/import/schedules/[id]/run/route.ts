import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import { markImportScheduleRun } from "@/lib/services/import-service"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.source !== "session") {
      return json({ error: "Schedules require a signed-in session." }, { status: 403 })
    }
    const schedule = await markImportScheduleRun(auth.userId, params.id)
    return json({ schedule })
  } catch (error) {
    return handleApiError(error)
  }
}
