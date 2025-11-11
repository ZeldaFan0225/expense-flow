import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import {
  updateImportSchedule,
  deleteImportSchedule,
} from "@/lib/services/import-service"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.source !== "session") {
      return json({ error: "Schedules require a signed-in session." }, { status: 403 })
    }
    const body = await request.json()
    const schedule = await updateImportSchedule(auth.userId, params.id, body)
    return json({ schedule })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.source !== "session") {
      return json({ error: "Schedules require a signed-in session." }, { status: 403 })
    }
    await deleteImportSchedule(auth.userId, params.id)
    return json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
