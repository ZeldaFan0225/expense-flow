"use client"

import * as React from "react"
import {format} from "date-fns"

type AnalyticsContextType = {
    preset: string
    setPreset: (preset: string) => void
    selectedMonth: string
    setSelectedMonth: (value: string) => void
}

const AnalyticsContext = React.createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({children}: { children: React.ReactNode }) {
    const [preset, setPreset] = React.useState("6m")
    const [selectedMonth, setSelectedMonth] = React.useState(
        format(new Date(), "yyyy-MM")
    )

    return (
        <AnalyticsContext.Provider
            value={{preset, setPreset, selectedMonth, setSelectedMonth}}
        >
            {children}
        </AnalyticsContext.Provider>
    )
}

export function useAnalytics() {
    const context = React.useContext(AnalyticsContext)
    if (context === undefined) {
        throw new Error("useAnalytics must be used within an AnalyticsProvider")
    }
    return context
}
