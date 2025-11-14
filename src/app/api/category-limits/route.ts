import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {categoryLimitSchema} from "@/lib/validation"
import {
    listCategoryLimits,
    upsertCategoryLimit,
} from "@/lib/services/category-limit-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const limits = await listCategoryLimits(auth.userId)
        return json({limits})
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const payload = await request.json()
        const data = categoryLimitSchema.parse(payload)
        const limit = await upsertCategoryLimit(auth.userId, data)
        return json(limit)
    } catch (error) {
        return handleApiError(error)
    }
}
