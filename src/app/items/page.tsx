import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ensureDefaultCategories, listCategories } from "@/lib/services/category-service"
import { getExpenseSuggestions } from "@/lib/services/expense-service"
import { ExpenseItemBuilder } from "@/components/expenses/expense-item-builder"

export const dynamic = "force-dynamic"

export default async function ItemsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  await ensureDefaultCategories(session.user.id)
  const [categories, suggestions] = await Promise.all([
    listCategories(session.user.id),
    getExpenseSuggestions(session.user.id, 5),
  ])

  return (
    <DashboardShell
      heading="Expense builder"
      description="Capture multiple transactions, group notes, and auto categorize."
      user={session.user}
    >
      <ExpenseItemBuilder categories={categories} suggestions={suggestions} />
    </DashboardShell>
  )
}
