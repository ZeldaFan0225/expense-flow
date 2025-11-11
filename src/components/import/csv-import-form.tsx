"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { ImportPreviewTable, type PreviewRow } from "@/components/import/import-preview-table"

const templateOptions = [
  { value: "default", label: "Default (columns: date, description, category, amount)" },
  { value: "monzo", label: "Monzo export" },
  { value: "chase", label: "Chase export" },
]

export function CsvImportForm() {
  const [mode, setMode] = React.useState<"expenses" | "income">("expenses")
  const [template, setTemplate] = React.useState("default")
  const [file, setFile] = React.useState<File | null>(null)
  const [rows, setRows] = React.useState<PreviewRow[]>([])
  const [previewing, setPreviewing] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handlePreview = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    if (!file) {
      setError("Select a CSV file first.")
      return
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("mode", mode)
    formData.append("template", template)
    setPreviewing(true)
    try {
      const response = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Preview failed")
      }
      setRows(data.rows ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed")
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/import/rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, rows }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Import failed")
      }
      setMessage(`Imported ${data.imported} records`)
      setRows([])
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const handleRowChange = (id: string, updates: Partial<PreviewRow>) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }

  const handleRowRemove = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id))
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>CSV import</CardTitle>
        <p className="text-sm text-muted-foreground">
          Preview → edit → import up to 50 rows at a time
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={mode}
                onChange={(event) => setMode(event.target.value as "expenses" | "income")}
              >
                <option value="expenses">Expenses</option>
                <option value="income">Income</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bank template</Label>
              <Select value={template} onChange={(event) => setTemplate(event.target.value)}>
                {templateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>CSV file</Label>
            <input
              type="file"
              accept=".csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>

          <Button type="submit" disabled={previewing}>
            {previewing ? "Generating preview…" : "Preview rows"}
          </Button>
        </form>

        {rows.length ? (
          <div className="space-y-4">
            <ImportPreviewTable
              rows={rows}
              onChange={handleRowChange}
              onRemove={handleRowRemove}
            />
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing…" : `Import ${rows.length} rows`}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            After previewing, you can edit rows inline before final import.
          </p>
        )}

        {message ? (
          <p className="text-sm text-emerald-600">{message}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
