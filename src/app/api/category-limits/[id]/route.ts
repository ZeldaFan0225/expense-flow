import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {deleteCategoryLimit} from "@/lib/services/category-limit-service"

type ParamsContext = { params: Promise<{ id: string }> }

export async function DELETE(
    request: NextRequest,
    context: ParamsContext
) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const {id} = await context.params
        if (!id) {
            return json({error: "Missing id"}, {status: 400})
        }
        await deleteCategoryLimit(auth.userId, id)
        return json({success: true})
    } catch (error) {
        return handleApiError(error)
    }
}
