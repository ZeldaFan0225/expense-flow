import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { listRecurringExpenses } from "@/lib/services/recurring-expense-service"
import { ensureDefaultCategories, listCategories } from "@/lib/services/category-service"
import { RecurringManager } from "@/components/recurring/recurring-manager"

export const dynamic = "force-dynamic"

export default async function RecurringPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  await ensureDefaultCategories(session.user.id)
  const [templatesRaw, categories] = await Promise.all([
    listRecurringExpenses(session.user.id),
    listCategories(session.user.id),
  ])
  const templates = templatesRaw.map((template) => ({
    ...template,
    lastGeneratedOn: template.lastGeneratedOn
      ? template.lastGeneratedOn.toISOString()
      : null,
  }))

  return (
    <DashboardShell
      heading="Recurring expenses"
      description="Automate predictable burn with split-by logic."
      user={session.user}
    >
      <RecurringManager
        templates={templates}
        categories={categories}
        currency={session.user.defaultCurrency}
      />
    </DashboardShell>
  )
}
