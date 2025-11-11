import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getFinancialActivityFeed } from "@/lib/services/feed-service"
import { FeedTimeline } from "@/components/feed/feed-timeline"

export const dynamic = "force-dynamic"

export default async function FeedPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const feed = await getFinancialActivityFeed(session.user.id)

  return (
    <DashboardShell
      heading="Financial feed"
      description="Chronological log of expenses, income, and other cash-impacting events."
      user={session.user}
    >
      <FeedTimeline
        feed={feed}
        currency={session.user.defaultCurrency}
        title="Financial activity"
        description="Expenses, income, and other ledger entries."
        emptyState="No financial activity yet. Add an expense or income entry to get started."
      />
    </DashboardShell>
  )
}
