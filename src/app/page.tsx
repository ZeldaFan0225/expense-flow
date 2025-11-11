import Link from "next/link"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth-server"
import { LandingHero } from "@/components/landing-hero"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getDashboardData } from "@/lib/services/dashboard-service"
import { MonthlyOverviewCard } from "@/components/dashboard/monthly-overview-card"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { CashHistoryChart } from "@/components/dashboard/cash-history-chart"
import { ExpenseFeed } from "@/components/dashboard/expense-feed"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    return <LandingHero />
  }

  const dashboard = await getDashboardData(session.user.id)
  const checklist = [
    {
      id: "expense",
      label: "Record your first expense",
      description: "Use the bulk builder to log a transaction",
      href: "/items",
      completed: dashboard.recentExpenses.length > 0,
    },
    {
      id: "recurring",
      label: "Automate a recurring expense",
      description: "Templates keep fixed costs in sync",
      href: "/recurring",
      completed: dashboard.recurringExpenses.length > 0,
    },
    {
      id: "api",
      label: "Generate an API key",
      description: "Script imports or integrate automations",
      href: "/api-keys",
      completed: dashboard.apiKeyCount > 0,
    },
  ]

  return (
    <DashboardShell
      heading="Unified dashboard"
      description="Encrypted expenses, recurring income, and API insights."
      user={session.user}
      actions={
        <Button asChild size="sm">
          <Link href="/items">New expense</Link>
        </Button>
      }
    >
      <OnboardingChecklist items={checklist} />

      <MonthlyOverviewCard
        overview={dashboard.overview}
        currency={session.user.defaultCurrency}
      />

      <QuickStats
        stats={[
          {
            label: "Active templates",
            value: `${dashboard.recurringExpenses.length}`,
            hint: "Recurring expenses ready to auto-post",
          },
          {
            label: "Categories",
            value: `${dashboard.categories.length}`,
            hint: "Custom color-coded buckets",
          },
          {
            label: "Cash history",
            value: `${dashboard.cashHistory.length} months`,
            hint: "Tracked in analytics",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CashHistoryChart
          data={dashboard.cashHistory}
          currency={session.user.defaultCurrency}
        />
        <ExpenseFeed
          expenses={dashboard.recentExpenses}
          currency={session.user.defaultCurrency}
        />
      </div>
    </DashboardShell>
  )
}
