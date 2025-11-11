import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency"

type ExpenseFeedProps = {
  expenses: Array<{
    id: string
    occurredOn: Date
    description: string
    amount: number
    category?: {
      id: string
      name: string
      color: string
    } | null
  }>
  currency?: string
}

export function ExpenseFeed({
  expenses,
  currency = "USD",
}: ExpenseFeedProps) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="pb-4">
        <CardTitle>Recent expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/40 text-sm font-medium text-muted-foreground">
                {format(expense.occurredOn, "MMM d")}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-medium text-foreground">
                  {expense.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expense.category?.name ?? "Uncategorized"}
                </p>
              </div>
              <p className="text-sm font-semibold">
                {formatCurrency(expense.amount, currency)}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
