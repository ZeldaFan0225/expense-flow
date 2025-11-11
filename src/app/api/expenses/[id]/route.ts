import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"
import { handleApiError, json } from "@/lib/http"
import {
  deleteExpense,
  getExpense,
  updateExpense,
} from "@/lib/services/expense-service"

type Params = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["expenses_read"])
    const expense = await getExpense(auth.userId, params.id)
    if (!expense) {
      return json({ error: "Not found" }, { status: 404 })
    }
    return json(expense)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["expenses_write"])
    const payload = await request.json()
    const expense = await updateExpense(auth.userId, params.id, payload)
    return json(expense)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await authenticateRequest(request, ["expenses_write"])
    await deleteExpense(auth.userId, params.id)
    return json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
