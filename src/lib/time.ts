import {
    endOfMonth,
    startOfMonth,
    startOfYear,
    subMonths,
} from "date-fns"

export type RangePreset =
    | "month"
    | "3m"
    | "6m"
    | "12m"
    | "ytd"
    | "custom"

export function resolveRange(params?: {
    preset?: RangePreset
    start?: Date
    end?: Date
}) {
    const now = new Date()
    const preset = params?.preset ?? "6m"

    if (preset === "custom" && params?.start && params?.end) {
        return {
            preset,
            start: params.start,
            end: params.end,
        }
    }

    if (preset === "month") {
        return {
            preset,
            start: startOfMonth(now),
            end: endOfMonth(now),
        }
    }

    if (preset === "3m") {
        return {
            preset,
            start: startOfMonth(subMonths(now, 2)),
            end: endOfMonth(now),
        }
    }

    if (preset === "6m") {
        return {
            preset,
            start: startOfMonth(subMonths(now, 5)),
            end: endOfMonth(now),
        }
    }

    if (preset === "12m") {
        return {
            preset,
            start: startOfMonth(subMonths(now, 11)),
            end: endOfMonth(now),
        }
    }

    if (preset === "ytd") {
        return {
            preset,
            start: startOfYear(now),
            end: endOfMonth(now),
        }
    }

    return {
        preset: "6m" as const,
        start: startOfMonth(subMonths(now, 5)),
        end: endOfMonth(now),
    }
}
