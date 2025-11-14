import type {NextRequest} from "next/server"
import {parse} from "date-fns"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getCategoryLimitReport} from "@/lib/services/category-limit-service"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const search = request.nextUrl.searchParams
        const monthParam = search.get("month")
        let targetMonth = new Date()
        if (monthParam) {
            const parsed = parse(monthParam, "yyyy-MM", new Date())
            if (!Number.isNaN(parsed.getTime())) {
                targetMonth = parsed
            }
        }
        const report = await getCategoryLimitReport(auth.userId, targetMonth)
        return json(report)
    } catch (error) {
        return handleApiError(error)
    }
}
