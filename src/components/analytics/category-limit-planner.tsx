"use client"

import * as React from "react"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {z} from "zod"
import {format, parse} from "date-fns"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Select} from "@/components/ui/select"
import {useToast} from "@/components/providers/toast-provider"
import {formatCurrency} from "@/lib/currency"
import type {CategoryLimitReport, CategoryLimitSummary} from "@/lib/services/category-limit-service"
import {cn} from "@/lib/utils"
import {AlertTriangle, Loader2, Pencil, ShieldCheck, Target, Trash2} from "lucide-react"

type CategoryOption = {
    id: string
    name: string
    color: string
}

type CategoryLimitPlannerProps = {
    categories: CategoryOption[]
    initialReport: CategoryLimitReport
    currency: string
}

const formSchema = z.object({
    categoryId: z.string().min(1, "Pick a category"),
    limit: z.coerce.number().positive("Limit must be above 0"),
})

export function CategoryLimitPlanner({
                                         categories,
                                         initialReport,
                                         currency,
                                     }: CategoryLimitPlannerProps) {
    const {showToast} = useToast()
    const [report, setReport] = React.useState<CategoryLimitReport>(initialReport)
    const [month, setMonth] = React.useState(initialReport.month)
    const [loadingReport, setLoadingReport] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categoryId: "",
            limit: 0,
        },
    })

    const monthLabel = React.useMemo(() => {
        const parsed = parse(`${month}-01`, "yyyy-MM-dd", new Date())
        return format(parsed, "MMMM yyyy")
    }, [month])

    const limitLookup = React.useMemo(() => {
        return report.rows.reduce<Record<string, CategoryLimitSummary>>((acc, row) => {
            acc[row.categoryId] = {
                id: row.id,
                categoryId: row.categoryId,
                categoryName: row.categoryName,
                color: row.color,
                limit: row.limit,
            }
            return acc
        }, {})
    }, [report.rows])

    const categoriesWithoutLimit = React.useMemo(
        () => categories.filter((category) => !limitLookup[category.id]),
        [categories, limitLookup]
    )

    const utilizationPct = React.useMemo(() => {
        if (report.totals.limit <= 0) return 0
        return Math.min((report.totals.spent / report.totals.limit) * 100, 300)
    }, [report.totals.limit, report.totals.spent])

    const coveragePct = React.useMemo(() => {
        if (categories.length === 0) return 0
        return Math.round((report.rows.length / categories.length) * 100)
    }, [categories.length, report.rows.length])

    const overBudgetCount = React.useMemo(
        () => report.rows.filter((row) => row.status === "over").length,
        [report.rows]
    )

    const [mostStressed, calmCategory] = React.useMemo(() => {
        if (report.rows.length === 0) return [null, null] as const
        const byPressure = [...report.rows].sort(
            (a, b) => getUtilizationRatio(b) - getUtilizationRatio(a)
        )
        const calm = [...report.rows].sort(
            (a, b) => getUtilizationRatio(a) - getUtilizationRatio(b)
        )
        return [byPressure[0], calm[0]] as const
    }, [report.rows])

    const suggestedCategory = categoriesWithoutLimit[0]

    const maxValue = React.useMemo(() => {
        const values = report.rows.map((row) => Math.max(row.limit, row.spent))
        return values.length ? Math.max(...values, 1) : 1
    }, [report.rows])

    const refreshReport = React.useCallback(
        async (nextMonth: string) => {
            setLoadingReport(true)
            try {
                const params = new URLSearchParams({month: nextMonth})
                const response = await fetch(`/api/analytics/category-limits?${params.toString()}`)
                if (!response.ok) {
                    throw new Error("Failed to load limit data")
                }
                const data = await response.json()
                setReport(data)
            } catch (error) {
                console.error(error)
                showToast({
                    title: "Could not refresh limits",
                    description: error instanceof Error ? error.message : "Please retry.",
                    variant: "destructive",
                })
            } finally {
                setLoadingReport(false)
            }
        },
        [showToast]
    )

    const handleMonthChange = React.useCallback(
        async (value: string) => {
            const next = value || initialReport.month
            setMonth(next)
            await refreshReport(next)
        },
        [initialReport.month, refreshReport]
    )

    const onSubmit = form.handleSubmit(async (values) => {
        setSubmitting(true)
        try {
            const response = await fetch("/api/category-limits", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(values),
            })
            if (!response.ok) {
                throw new Error("Failed to save limit")
            }
            await refreshReport(month)
            form.reset({categoryId: values.categoryId, limit: values.limit})
            showToast({
                title: limitLookup[values.categoryId] ? "Limit updated" : "Limit created",
                description: `${categories.find((c) => c.id === values.categoryId)?.name ?? "Category"} capped at ${formatCurrency(values.limit, currency)}`,
                variant: "success",
            })
        } catch (error) {
            console.error(error)
            showToast({
                title: "Save failed",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    })

    const handleDelete = React.useCallback(
        async (id: string) => {
            setDeletingId(id)
            try {
                const response = await fetch(`/api/category-limits/${id}`, {
                    method: "DELETE",
                })
                if (!response.ok) {
                    throw new Error("Failed to delete limit")
                }
                await refreshReport(month)
                showToast({
                    title: "Limit removed",
                })
            } catch (error) {
                console.error(error)
                showToast({
                    title: "Delete failed",
                    description: error instanceof Error ? error.message : "Please retry.",
                    variant: "destructive",
                })
            } finally {
                setDeletingId(null)
            }
        },
        [month, refreshReport, showToast]
    )

    const populateForm = React.useCallback(
        (categoryId: string) => {
            const record = limitLookup[categoryId]
            if (!record) return
            form.setValue("categoryId", categoryId)
            form.setValue("limit", record.limit, {shouldValidate: true})
        },
        [form, limitLookup]
    )

    return (
        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
            <div className="space-y-6">
                <Card className="rounded-3xl">
                    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <CardTitle>Monthly guardrails</CardTitle>
                            <CardDescription>
                                Monitor spend vs. the ceilings you have set for each category.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Month
                            </Label>
                            <Input
                                type="month"
                                value={month}
                                onChange={(event) => handleMonthChange(event.target.value)}
                                className="w-40"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-inner">
                            <div className="flex flex-wrap items-baseline justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Overall utilization
                                    </p>
                                    <p className="text-3xl font-semibold">
                                        {Math.round(utilizationPct)}%
                                    </p>
                                </div>
                                <StatusBadge
                                    tone={utilizationPct > 100 ? "danger" : "safe"}
                                    label={utilizationPct > 100 ? "Over budget" : "Within guardrail"}
                                />
                            </div>
                            <ProgressBar value={utilizationPct} isOver={utilizationPct > 100}/>
                            <p className="text-xs text-muted-foreground">
                                Tracking {formatCurrency(report.totals.spent, currency)} of{" "}
                                {formatCurrency(report.totals.limit, currency)} allocated.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <SummaryStat
                                label="Total limits"
                                value={formatCurrency(report.totals.limit, currency)}
                            />
                            <SummaryStat
                                label="Actual spend"
                                value={formatCurrency(report.totals.spent, currency)}
                            />
                            <SummaryStat
                                label="Over budget"
                                value={formatCurrency(report.totals.overage, currency)}
                                accent="destructive"
                            />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border px-4 py-3 text-sm shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Category coverage
                                </p>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-2xl font-semibold">{coveragePct}%</p>
                                    <p className="text-xs text-muted-foreground">
                                        {report.rows.length} / {categories.length || 0} capped
                                    </p>
                                </div>
                                <ProgressBar value={coveragePct} compact/>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm">
                                {overBudgetCount ? (
                                    <AlertTriangle className="size-5 text-destructive"/>
                                ) : (
                                    <ShieldCheck className="size-5 text-emerald-500"/>
                                )}
                                <div>
                                    <p className="text-sm font-medium">
                                        {overBudgetCount ? "Spikes detected" : "All clear"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {overBudgetCount
                                            ? `${overBudgetCount} ${overBudgetCount === 1 ? "category" : "categories"} above guardrail`
                                            : "No categories exceeding their caps"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {loadingReport
                                ? "Refreshing…"
                                : `Viewing ${monthLabel}. Bars scale to the largest category this month.`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl">
                    <CardHeader>
                        <CardTitle>Category pressure</CardTitle>
                        <CardDescription>Bars show how close each category is to its limit.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {report.rows.length === 0 ? (
                            <EmptyState message="No limits yet. Use the form to add your first guardrail."/>
                        ) : (
                            report.rows.map((row) => (
                                <LimitRow
                                    key={row.id}
                                    row={row}
                                    currency={currency}
                                    maxValue={maxValue}
                                    onEdit={() => populateForm(row.categoryId)}
                                    onDelete={() => handleDelete(row.id)}
                                    isDeleting={deletingId === row.id}
                                />
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="rounded-3xl">
                    <CardHeader>
                        <CardTitle>Define a limit</CardTitle>
                        <CardDescription>Encrypted caps help analytics stay accurate.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    {...form.register("categoryId")}
                                    aria-invalid={form.formState.errors.categoryId ? "true" : "false"}
                                >
                                    <option value="">Select a category</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </Select>
                                {form.formState.errors.categoryId ? (
                                    <p className="text-xs text-destructive">
                                        {form.formState.errors.categoryId.message}
                                    </p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label>Monthly ceiling</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...form.register("limit", {valueAsNumber: true})}
                                        aria-invalid={form.formState.errors.limit ? "true" : "false"}
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                                        {currency}
                                    </span>
                                </div>
                                {form.formState.errors.limit ? (
                                    <p className="text-xs text-destructive">
                                        {form.formState.errors.limit.message}
                                    </p>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin"/>
                                            Saving…
                                        </>
                                    ) : limitLookup[form.watch("categoryId")] ? (
                                        "Update limit"
                                    ) : (
                                        "Create limit"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => form.reset({categoryId: "", limit: 0})}
                                >
                                    Clear
                                </Button>
                            </div>
                        </form>
                        <div className="flex items-start gap-3 rounded-2xl border border-dashed px-4 py-4 text-sm">
                            <div className="rounded-full border border-dashed border-current/40 p-2 text-muted-foreground">
                                <Target className="size-4"/>
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    {categoriesWithoutLimit.length === 0 ? "Fully covered" : "Next guardrail"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {categoriesWithoutLimit.length === 0
                                        ? "Every category has a limit—great job staying disciplined."
                                        : `Start with ${suggestedCategory?.name ?? "any category"} and work through the remaining ${categoriesWithoutLimit.length} bucket${categoriesWithoutLimit.length === 1 ? "" : "s"}.`}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl">
                    <CardHeader>
                        <CardTitle>Insights</CardTitle>
                        <CardDescription>Quick signals so you know where to focus.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <InsightRow
                            icon={<AlertTriangle className="size-4"/>}
                            title="Most stressed"
                            description={
                                mostStressed
                                    ? `${Math.round(getUtilizationRatio(mostStressed) * 100)}% of its guardrail is used.`
                                    : "Add a limit to surface pressure trends."
                            }
                            highlight={mostStressed ? mostStressed.categoryName : "Awaiting data"}
                            tone={mostStressed?.status === "over" ? "danger" : "neutral"}
                        />
                        <InsightRow
                            icon={<ShieldCheck className="size-4"/>}
                            title="Calmest category"
                            description={
                                calmCategory
                                    ? `${Math.round(Math.max(getUtilizationRatio(calmCategory), 0) * 100)}% utilized.`
                                    : "We will highlight your steadiest bucket once data flows in."
                            }
                            highlight={calmCategory ? calmCategory.categoryName : "No limits yet"}
                            tone="safe"
                        />
                        <InsightRow
                            icon={<Target className="size-4"/>}
                            title="Setup queue"
                            description={
                                categoriesWithoutLimit.length === 0
                                    ? "Every category is protected."
                                    : `${categoriesWithoutLimit.length} categorie${categoriesWithoutLimit.length === 1 ? "y" : "s"} still need attention.`
                            }
                            highlight={suggestedCategory?.name ?? "All caught up"}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function SummaryStat({
                         label,
                         value,
                         accent,
                     }: {
    label: string
    value: string
    accent?: "destructive"
}) {
    return (
        <div
            className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                accent === "destructive" ? "border-destructive/40 bg-destructive/5 text-destructive" : ""
            )}
        >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
        </div>
    )
}

function LimitRow({
                      row,
                      currency,
                      maxValue,
                      onEdit,
                      onDelete,
                      isDeleting,
                  }: {
    row: CategoryLimitReport["rows"][number]
    currency: string
    maxValue: number
    onEdit: () => void
    onDelete: () => void
    isDeleting: boolean
}) {
    const limitPct = row.limit > 0 ? (row.limit / maxValue) * 100 : 0
    const spentPct = row.spent > 0 ? (row.spent / maxValue) * 100 : 0
    const overshootPct = spentPct > limitPct ? spentPct - limitPct : 0
    const percentOfLimit = row.limit > 0 ? Math.round((row.spent / row.limit) * 100) : null

    return (
        <div className="space-y-3 rounded-3xl border bg-card/40 p-4 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{backgroundColor: row.color}}/>
                        <p className="text-sm font-semibold">{row.categoryName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(row.spent, currency)} / {formatCurrency(row.limit, currency)} used
                    </p>
                </div>
                <StatusBadge
                    tone={row.status === "over" ? "danger" : "safe"}
                    label={
                        row.status === "over"
                            ? `Over by ${formatCurrency(Math.abs(row.variance), currency)}`
                            : `Room for ${formatCurrency(Math.abs(row.variance), currency)}`
                    }
                />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Limit {formatCurrency(row.limit, currency)}</span>
                    <span>
                        {percentOfLimit !== null ? `${Math.min(percentOfLimit, 999)}% used` : "Tracking spend"}
                    </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                    <div
                        className="absolute inset-y-0 left-0 rounded-full bg-border/70"
                        style={{width: `${Math.min(limitPct, 100)}%`}}
                    />
                    <div
                        className={cn(
                            "absolute inset-y-0 left-0 rounded-full",
                            row.status === "over" ? "bg-destructive/70" : ""
                        )}
                        style={{
                            width: `${Math.min(spentPct, 100)}%`,
                            backgroundColor: row.status === "over" ? undefined : row.color,
                        }}
                    />
                    {overshootPct > 0 ? (
                        <div
                            className="absolute inset-y-0 rounded-r-full bg-destructive"
                            style={{
                                left: `${Math.min(limitPct, 100)}%`,
                                width: `${Math.min(overshootPct, 100 - Math.min(limitPct, 100))}%`,
                            }}
                        />
                    ) : null}
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="flex-1"
                >
                    <Pencil className="size-3.5"/>
                    Tune limit
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="flex-1 text-destructive hover:text-destructive"
                >
                    {isDeleting ? (
                        <>
                            <Loader2 className="size-3.5 animate-spin"/>
                            Removing…
                        </>
                    ) : (
                        <>
                            <Trash2 className="size-3.5"/>
                            Remove
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}

function EmptyState({message}: { message: string }) {
    return (
        <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {message}
        </div>
    )
}

type StatusTone = "danger" | "safe" | "neutral"

function StatusBadge({tone = "neutral", label}: { tone?: StatusTone; label: string }) {
    const toneClasses: Record<StatusTone, string> = {
        danger: "border-destructive/40 bg-destructive/10 text-destructive",
        safe: "border-emerald-500/50 bg-emerald-500/10 text-emerald-600",
        neutral: "border-border bg-muted text-foreground/70",
    }
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                toneClasses[tone]
            )}
        >
            {label}
        </span>
    )
}

function ProgressBar({
                         value,
                         isOver,
                         compact,
                     }: {
    value: number
    isOver?: boolean
    compact?: boolean
}) {
    const width = Math.min(Math.max(value, 0), 100)
    return (
        <div
            className={cn(
                "relative w-full overflow-hidden rounded-full bg-muted",
                compact ? "h-2" : "h-3"
            )}
        >
            <div
                className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all",
                    isOver ? "bg-destructive" : "bg-primary"
                )}
                style={{width: `${width}%`}}
            />
        </div>
    )
}

type InsightRowProps = {
    icon: React.ReactNode
    title: string
    description: string
    highlight: string
    tone?: StatusTone
}

function InsightRow({icon, title, description, highlight, tone = "neutral"}: InsightRowProps) {
    const toneClasses: Record<StatusTone, string> = {
        danger: "border-destructive/30 bg-destructive/5",
        safe: "border-emerald-500/30 bg-emerald-500/5",
        neutral: "border-border/70 bg-card",
    }
    return (
        <div className={cn("flex items-start gap-3 rounded-2xl border px-3 py-3", toneClasses[tone])}>
            <div className="rounded-full bg-background/80 p-2 text-foreground/70">{icon}</div>
            <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
                <p className="text-sm font-semibold text-foreground">{highlight}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    )
}

function getUtilizationRatio(row?: CategoryLimitReport["rows"][number]) {
    if (!row) return 0
    if (row.limit <= 0) {
        return row.spent > 0 ? 2 : 0
    }
    return row.spent / row.limit
}
