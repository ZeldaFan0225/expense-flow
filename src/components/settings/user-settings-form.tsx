"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

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
  const [status, setStatus] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    setError(null)
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCurrency: currency.toUpperCase(),
          accentColor: accent,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Failed to update settings")
      }
      setStatus("Settings updated. Reload to sync across sessions.")
      if (accent) {
        document.documentElement.style.setProperty("--user-accent", accent)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  return (
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
          {status ? <p className="text-sm text-emerald-600">{status}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  )
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
