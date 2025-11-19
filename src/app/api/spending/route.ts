import type {NextRequest} from "next/server"
import {authenticateRequest} from "@/lib/api-auth"
import {handleApiError, json} from "@/lib/http"
import {getAvailableBalanceSeries, getPeriodComparison} from "@/lib/services/analytics-service"
import {type RangePreset} from "@/lib/time"

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request, ["analytics_read"])
        const params = new URL(request.url).searchParams
        const presetParam = params.get("preset") as RangePreset | null
        const preset: RangePreset = presetParam ?? "6m"
        const startParam = params.get("start")
        const endParam = params.get("end")
        const start = startParam ? new Date(startParam) : undefined
        const end = endParam ? new Date(endParam) : undefined
        const comparisonMonth = preset === "month" && start ? start : undefined

        const [series, comparison] = await Promise.all([
            getAvailableBalanceSeries(auth.userId, {preset, start, end}),
            getPeriodComparison(auth.userId, {month: comparisonMonth}),
        ])

        return json({series, comparison})
    } catch (error) {
        return handleApiError(error)
    }
}
