"use client"

import * as React from "react"

type AnalyticsContextType = {
    preset: string
    setPreset: (preset: string) => void
}

const AnalyticsContext = React.createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({children}: { children: React.ReactNode }) {
    const [preset, setPreset] = React.useState("6m")

    return (
        <AnalyticsContext.Provider value={{preset, setPreset}}>
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
