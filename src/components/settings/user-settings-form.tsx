"use client"

import * as React from "react"
import {signOut} from "next-auth/react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Input} from "@/components/ui/input"
import {Select} from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {useToast} from "@/components/providers/toast-provider"

const currencyOptions = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD"]

type UserSettingsFormProps = {
    defaultCurrency: string
    accentColor?: string | null
}

export function UserSettingsForm({
                                     defaultCurrency,
                                     accentColor,
                                 }: UserSettingsFormProps) {
    const [currency, setCurrency] = React.useState(defaultCurrency)
    const [accent, setAccent] = React.useState(accentColor ?? "#0ea5e9")
    const [saving, setSaving] = React.useState(false)
    const [deleteConfirm, setDeleteConfirm] = React.useState("")
    const [deleting, setDeleting] = React.useState(false)
    const [exporting, setExporting] = React.useState(false)
    const {showToast} = useToast()

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)
        try {
            const response = await fetch("/api/settings", {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    defaultCurrency: currency.toUpperCase(),
                    accentColor: accent,
                }),
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error ?? "Failed to update settings")
            }
            if (accent) {
                document.documentElement.style.setProperty("--user-accent", accent)
            }
            showToast({
                title: "Preferences saved",
                description: "Reload to sync across sessions.",
                variant: "success",
            })
        } catch (err) {
            showToast({
                title: "Failed to update settings",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== "DELETE") {
            showToast({
                title: "Type DELETE to confirm",
                description: "This safeguard prevents accidental deletion.",
                variant: "destructive",
            })
            return
        }

        if (
            typeof window !== "undefined" &&
            !window.confirm(
                "This will permanently delete your account, API keys, expenses, income, and automations. This cannot be undone. Continue?"
            )
        ) {
            return
        }

        setDeleting(true)
        try {
            const response = await fetch("/api/settings", {method: "DELETE"})
            if (!response.ok) {
                const data = await response.json().catch(() => null)
                throw new Error(data?.error ?? "Failed to delete account")
            }
            showToast({
                title: "Account deleted",
                description: "Signing you out…",
                variant: "success",
            })
            await signOut({callbackUrl: "/"})
        } catch (err) {
            showToast({
                title: "Failed to delete account",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
            })
        } finally {
            setDeleting(false)
        }
    }

    const handleExportAccount = async () => {
        setExporting(true)
        try {
            const response = await fetch("/api/export/account")
            if (!response.ok) {
                let message = "Failed to prepare export"
                const contentType = response.headers.get("Content-Type") ?? ""
                if (contentType.includes("application/json")) {
                    const data = await response.json().catch(() => null)
                    if (data?.error) {
                        message = data.error
                    }
                }
                throw new Error(message)
            }

            const blob = await response.blob()
            const disposition = response.headers.get("Content-Disposition")
            const filename =
                extractFilenameFromDisposition(disposition) ??
                `expense-flow-account-export-${new Date().toISOString()}.zip`

            const url = URL.createObjectURL(blob)
            const anchor = document.createElement("a")
            anchor.href = url
            anchor.download = filename
            anchor.style.display = "none"
            document.body.appendChild(anchor)
            anchor.click()
            document.body.removeChild(anchor)
            setTimeout(() => URL.revokeObjectURL(url), 1000)

            showToast({
                title: "Archive ready",
                description: "Check your downloads folder for the zip file.",
                variant: "success",
            })
        } catch (err) {
            showToast({
                title: "Export failed",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
            })
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="rounded-3xl">
                <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Currency formatting and workspace accent color.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Field
                            label="Default currency"
                            input={
                                <Select
                                    value={currency}
                                    onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                                >
                                    {currencyOptions.map((code) => (
                                        <option key={code} value={code}>
                                            {code}
                                        </option>
                                    ))}
                                </Select>
                            }
                            hint="Impacts dashboard + analytics formatting"
                        />
                        <div className="space-y-2">
                            <Label>Accent color</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="color"
                                    value={accent}
                                    onChange={(event) => setAccent(event.target.value)}
                                    className="h-10 w-20"
                                />
                                <Input
                                    value={accent}
                                    onChange={(event) => setAccent(event.target.value)}
                                    className="uppercase"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Used for quick actions + charts. Provide a valid hex code.
                            </p>
                        </div>
                        <Button type="submit" disabled={saving}>
                            {saving ? "Saving…" : "Save preferences"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="rounded-3xl">
                <CardHeader>
                    <CardTitle>Account archive</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Download a zip file containing JSON copies of your expenses, income, categories, API keys,
                        schedules, and preferences.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Exports decrypt all sensitive fields. Store the archive in a secure location and delete it if no
                        longer needed.
                    </p>
                    <Button type="button" variant="outline" onClick={handleExportAccount} disabled={exporting}>
                        {exporting ? "Preparing…" : "Download data zip"}
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-destructive/40">
                <CardHeader>
                    <CardTitle>Danger zone</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Delete your account and erase all encrypted data. This action cannot be undone.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
                        <Input
                            id="deleteConfirm"
                            value={deleteConfirm}
                            onChange={(event) => setDeleteConfirm(event.target.value.toUpperCase())}
                            placeholder="DELETE"
                            className="uppercase"
                            aria-describedby="deleteConfirmHelp"
                        />
                        <p id="deleteConfirmHelp" className="text-xs text-muted-foreground">
                            This protects against accidental clicks. All expenses, income, categories, API keys, and
                            schedules will be removed.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteConfirm !== "DELETE"}
                    >
                        {deleting ? "Deleting…" : "Delete account"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

function extractFilenameFromDisposition(disposition?: string | null) {
    if (!disposition) return null
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utfMatch?.[1]) {
        try {
            return decodeURIComponent(utfMatch[1])
        } catch (error) {
            return utfMatch[1]
        }
    }
    const basicMatch = disposition.match(/filename="?([^";]+)"?/i)
    if (basicMatch?.[1]) {
        return basicMatch[1]
    }
    return null
}

function Field({
                   label,
                   input,
                   hint,
               }: {
    label: string
    input: React.ReactNode
    hint?: string
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {input}
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    )
}
