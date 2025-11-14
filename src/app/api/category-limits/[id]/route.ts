import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {deleteCategoryLimit} from "@/lib/services/category-limit-service"

export async function DELETE(
    request: NextRequest,
    {params}: { params: { id: string } }
) {
    try {
        const auth = await authenticateRequest(request, ["expenses_write"])
        const id = params.id
        if (!id) {
            return json({error: "Missing id"}, {status: 400})
        }
        await deleteCategoryLimit(auth.userId, id)
        return json({success: true})
    } catch (error) {
        return handleApiError(error)
    }
}
