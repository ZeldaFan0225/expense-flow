import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ExpenseList } from "@/components/expenses/expense-list"
import { listExpenses } from "@/lib/services/expense-service"
import { requireOnboardingCompletion } from "@/lib/onboarding"

export const dynamic = "force-dynamic"

export default async function ExpensesPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  requireOnboardingCompletion(session)

  const expensesRaw = await listExpenses(session.user.id, { take: 200 })
  const expenses = expensesRaw.map((expense) => ({
    id: expense.id,
    description: expense.description,
    occurredOn: expense.occurredOn.toISOString(),
    category: expense.category?.name ?? "Uncategorized",
    amount: expense.amount,
    impactAmount: expense.impactAmount,
    groupTitle: expense.group?.title ?? null,
    splitBy: expense.group?.splitBy ?? null,
  }))

  return (
    <DashboardShell
      heading="Expenses"
      description="Review and remove any expense entries that no longer belong in your ledger."
      user={session.user}
    >
      <ExpenseList
        initialExpenses={expenses}
        currency={session.user.defaultCurrency}
      />
    </DashboardShell>
  )
}
