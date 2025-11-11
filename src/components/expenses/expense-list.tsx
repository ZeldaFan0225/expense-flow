"use client"

import * as React from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/currency"
import { useToast } from "@/components/providers/toast-provider"

type ExpenseListProps = {
  initialExpenses: Array<{
    id: string
    description: string
    occurredOn: string
    category: string
    amount: number
    impactAmount: number
    groupTitle?: string | null
    splitBy?: number | null
  }>
  currency: string
}

export function ExpenseList({ initialExpenses, currency }: ExpenseListProps) {
  const [expenses, setExpenses] = React.useState(initialExpenses)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const { showToast } = useToast()

  const deleteExpense = async (id: string) => {
    const target = expenses.find((expense) => expense.id === id)
    if (!target) return
    const confirmed = window.confirm(
      `Delete "${target.description}" from ${format(new Date(target.occurredOn), "MMM d, yyyy")}?`
    )
    if (!confirmed) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete expense")
      }
      setExpenses((prev) => prev.filter((expense) => expense.id !== id))
      showToast({
        title: "Expense deleted",
        description: target.description,
      })
    } catch (error) {
      showToast({
        title: "Unable to delete expense",
        description: error instanceof Error ? error.message : "Try again shortly",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>All expenses</CardTitle>
          <p className="text-sm text-muted-foreground">
            {expenses.length} tracked entr{expenses.length === 1 ? "y" : "ies"}. Delete items you no longer need.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 pr-3 text-right font-medium">Impact</th>
                  <th className="pb-2 pr-3 text-right font-medium">Original</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((expense) => {
                  const dateLabel = format(new Date(expense.occurredOn), "MMM d, yyyy")
                  const differs = Math.abs(expense.amount - expense.impactAmount) > 0.005
                  const splitLabel = expense.splitBy && expense.splitBy > 1 ? `${expense.splitBy}-way split` : null
                  return (
                    <tr key={expense.id} className="align-middle">
                      <td className="py-3">
                        <p className="font-medium text-foreground">{expense.description}</p>
                        {expense.groupTitle ? (
                          <p className="text-xs text-muted-foreground">Group: {expense.groupTitle}</p>
                        ) : null}
                        {splitLabel ? (
                          <p className="text-xs text-muted-foreground">{splitLabel}</p>
                        ) : null}
                      </td>
                      <td className="py-3 text-muted-foreground">{dateLabel}</td>
                      <td className="py-3">
                        <span className="text-muted-foreground">{expense.category}</span>
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-rose-500">
                        {formatCurrency(expense.impactAmount, currency)}
                      </td>
                      <td className="py-3 pr-3 text-right text-muted-foreground">
                        {differs ? formatCurrency(expense.amount, currency) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteExpense(expense.id)}
                          disabled={deletingId === expense.id}
                        >
                          {deletingId === expense.id ? "Deleting…" : "Delete"}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
