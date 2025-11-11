import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import {
  deleteRecurringExpense,
  toggleRecurringExpense,
  updateRecurringExpense,
} from "@/lib/services/recurring-expense-service"

type Params = {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["expenses_write"])
    const payload = await request.json()
    const template = await updateRecurringExpense(
      auth.userId,
      params.id,
      payload
    )
    return json(template)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["expenses_write"])
    const template = await toggleRecurringExpense(auth.userId, params.id)
    return json(template)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["expenses_write"])
    await deleteRecurringExpense(auth.userId, params.id)
    return json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
