"use client"

import * as React from "react"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Select} from "@/components/ui/select"
import {Button} from "@/components/ui/button"
import {formatCurrency} from "@/lib/currency"

type ScenarioCategory = {
    id: string
    name: string
}

type ScenarioPlannerProps = {
    categories: ScenarioCategory[]
    currency: string
}

export function ScenarioPlanner({
                                    categories,
                                    currency,
                                }: ScenarioPlannerProps) {
    const [incomeDelta, setIncomeDelta] = React.useState("0")
    const [expenseDelta, setExpenseDelta] = React.useState("0")
    const [categoryId, setCategoryId] = React.useState("")
    const [categoryDelta, setCategoryDelta] = React.useState("0")
    const [result, setResult] = React.useState<null | {
        projectedIncome: number
        projectedExpenses: number
        projectedRemaining: number
    }>(null)
    const [submitting, setSubmitting] = React.useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSubmitting(true)
        try {
            const payload: Record<string, unknown> = {
                incomeDelta: Number(incomeDelta || 0),
                expenseDelta: Number(expenseDelta || 0),
            }
            if (categoryId) {
                payload.categoryOverrides = [
                    {categoryId, delta: Number(categoryDelta || 0)},
                ]
            }
            const response = await fetch("/api/analytics/scenario", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            })
            if (!response.ok) throw new Error("Scenario failed")
            const data = await response.json()
            setResult({
                projectedIncome: data.projectedIncome,
                projectedExpenses: data.projectedExpenses,
                projectedRemaining: data.projectedRemaining,
            })
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <CardTitle>Scenario planner</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Simulate income or category adjustments
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Income delta"
                            input={
                                <Input
                                    type="number"
                                    value={incomeDelta}
                                    onChange={(event) => setIncomeDelta(event.target.value)}
                                />
                            }
                            hint="Adds to current income"
                        />
                        <Field
                            label="Expense delta"
                            input={
                                <Input
                                    type="number"
                                    value={expenseDelta}
                                    onChange={(event) => setExpenseDelta(event.target.value)}
                                />
                            }
                            hint="Applies to total expenses"
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Category override"
                            input={
                                <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                                    <option value="">Skip</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </Select>
                            }
                        />
                        <Field
                            label="Category delta"
                            input={
                                <Input
                                    type="number"
                                    value={categoryDelta}
                                    onChange={(event) => setCategoryDelta(event.target.value)}
                                />
                            }
                            hint="Positive = spend more"
                        />
                    </div>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? "Calculating…" : "Simulate"}
                    </Button>
                </form>
                {result ? (
                    <div className="mt-4 rounded-2xl border p-4 text-sm">
                        <p className="font-medium">Projection</p>
                        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                            <div>
                                <p>Income</p>
                                <p className="text-base font-semibold text-foreground">
                                    {formatCurrency(result.projectedIncome, currency)}
                                </p>
                            </div>
                            <div>
                                <p>Expenses</p>
                                <p className="text-base font-semibold text-foreground">
                                    {formatCurrency(result.projectedExpenses, currency)}
                                </p>
                            </div>
                            <div>
                                <p>Remaining</p>
                                <p className="text-base font-semibold text-foreground">
                                    {formatCurrency(result.projectedRemaining, currency)}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
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
