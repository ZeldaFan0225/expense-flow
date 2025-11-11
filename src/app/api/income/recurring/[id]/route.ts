import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import {
  deleteRecurringIncome,
  updateRecurringIncome,
} from "@/lib/services/recurring-income-service"

type Params = {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["income_write"])
    const payload = await request.json()
    const template = await updateRecurringIncome(
      auth.userId,
      params.id,
      payload
    )
    return json(template)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["income_write"])
    await deleteRecurringIncome(auth.userId, params.id)
    return json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
